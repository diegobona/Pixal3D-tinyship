import { config } from '@config';
import { db } from '@libs/database';
import { creditTransaction } from '@libs/database/schema/credit-transaction';
import {
  paymentTypes,
  subscription as subscriptionTable,
  subscriptionStatus,
} from '@libs/database/schema/subscription';
import { creditService, TransactionTypeCode } from '@libs/credits';
import { and, eq, gt, inArray, sql } from 'drizzle-orm';

export type YearlySubscriptionCreditCandidate = {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId: string | null;
  periodStart: Date;
  periodEnd: Date;
};

export type YearlyCreditGrant = {
  userId: string;
  planId: string;
  subscriptionRecordId: string;
  subscriptionId: string;
  amount: number;
  cycle: number;
  grantKey: string;
  periodStart: Date;
  periodEnd: Date;
};

export type YearlyCreditRefreshResult = {
  checked: number;
  granted: number;
  skipped: number;
  grants: Array<{
    subscriptionId: string;
    planId: string;
    amount: number;
    cycle: number;
  }>;
};

export type RefreshYearlySubscriptionCreditsOptions = {
  now?: Date;
  findSubscriptions?: (now: Date) => Promise<YearlySubscriptionCreditCandidate[]>;
  findGrantedCycles?: (subscriptionId: string) => Promise<number[]>;
  grantCredits?: (grant: YearlyCreditGrant) => Promise<void>;
};

const MONTHS_IN_YEAR = 12;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, daysInTargetMonth));

  return result;
}

export function getYearlyCreditRefreshPlanIds(): string[] {
  return Object.entries(config.payment.plans)
    .filter(([, plan]) => (
      plan.duration.type === 'recurring' &&
      plan.duration.months === MONTHS_IN_YEAR &&
      ('credits' in plan ? plan.credits : 0) > 0
    ))
    .map(([planId]) => planId);
}

export function getPlanMonthlyCreditAmount(planId: string): number {
  const plan = config.payment.plans[planId as keyof typeof config.payment.plans];
  if (!plan || plan.duration.type !== 'recurring' || plan.duration.months !== MONTHS_IN_YEAR) {
    return 0;
  }

  return 'credits' in plan ? plan.credits : 0;
}

export function getDueYearlyCreditGrantCycles(input: {
  periodStart: Date;
  periodEnd: Date;
  now: Date;
  grantedCycles: number[];
}): number[] {
  if (input.now < input.periodStart || input.now >= input.periodEnd) {
    return [];
  }

  const granted = new Set(input.grantedCycles);
  const dueCycles: number[] = [];

  for (let cycle = 1; cycle < MONTHS_IN_YEAR; cycle++) {
    const cycleStart = addMonths(input.periodStart, cycle);

    if (cycleStart > input.now || cycleStart >= input.periodEnd) {
      continue;
    }

    if (!granted.has(cycle)) {
      dueCycles.push(cycle);
    }
  }

  return dueCycles;
}

async function findDefaultYearlySubscriptions(now: Date): Promise<YearlySubscriptionCreditCandidate[]> {
  const yearlyPlanIds = getYearlyCreditRefreshPlanIds();

  if (yearlyPlanIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: subscriptionTable.id,
      userId: subscriptionTable.userId,
      planId: subscriptionTable.planId,
      stripeSubscriptionId: subscriptionTable.stripeSubscriptionId,
      periodStart: subscriptionTable.periodStart,
      periodEnd: subscriptionTable.periodEnd,
    })
    .from(subscriptionTable)
    .where(and(
      eq(subscriptionTable.status, subscriptionStatus.ACTIVE),
      eq(subscriptionTable.paymentType, paymentTypes.RECURRING),
      gt(subscriptionTable.periodEnd, now),
      inArray(subscriptionTable.planId, yearlyPlanIds)
    ));

  return rows.map((row) => ({
    ...row,
    periodStart: new Date(row.periodStart),
    periodEnd: new Date(row.periodEnd),
  }));
}

async function findDefaultGrantedCycles(subscriptionId: string): Promise<number[]> {
  const rows = await db
    .select({
      cycle: sql<string | null>`${creditTransaction.metadata}->>'subscriptionCreditCycle'`,
    })
    .from(creditTransaction)
    .where(sql`${creditTransaction.type} = 'purchase'
      AND ${creditTransaction.metadata}->>'subscriptionId' = ${subscriptionId}
      AND ${creditTransaction.metadata}->>'subscriptionCreditCycle' IS NOT NULL`);

  return rows
    .map((row) => Number(row.cycle))
    .filter((cycle) => Number.isInteger(cycle) && cycle >= 0 && cycle < MONTHS_IN_YEAR);
}

async function grantDefaultCredits(grant: YearlyCreditGrant): Promise<void> {
  const grantMonthStart = addMonths(grant.periodStart, grant.cycle);
  const nextMonthStart = addMonths(grant.periodStart, grant.cycle + 1);
  const grantMonthEnd = nextMonthStart < grant.periodEnd ? nextMonthStart : grant.periodEnd;

  await creditService.addCredits({
    userId: grant.userId,
    amount: grant.amount,
    type: 'purchase',
    description: TransactionTypeCode.PURCHASE,
    metadata: {
      provider: 'stripe',
      planId: grant.planId,
      subscriptionId: grant.subscriptionId,
      subscriptionRecordId: grant.subscriptionRecordId,
      subscriptionCreditGrantKind: 'yearly_refresh',
      subscriptionCreditCycle: grant.cycle,
      subscriptionCreditGrantKey: grant.grantKey,
      periodStart: grant.periodStart.toISOString(),
      periodEnd: grant.periodEnd.toISOString(),
      grantMonthStart: grantMonthStart.toISOString(),
      grantMonthEnd: grantMonthEnd.toISOString(),
    },
  });
}

export async function refreshYearlySubscriptionCredits(
  options: RefreshYearlySubscriptionCreditsOptions = {}
): Promise<YearlyCreditRefreshResult> {
  const now = options.now ?? new Date();
  const findSubscriptions = options.findSubscriptions ?? findDefaultYearlySubscriptions;
  const findGrantedCycles = options.findGrantedCycles ?? findDefaultGrantedCycles;
  const grantCredits = options.grantCredits ?? grantDefaultCredits;
  const subscriptions = await findSubscriptions(now);
  const result: YearlyCreditRefreshResult = {
    checked: subscriptions.length,
    granted: 0,
    skipped: 0,
    grants: [],
  };

  for (const subscription of subscriptions) {
    const subscriptionId = subscription.stripeSubscriptionId;
    const amount = getPlanMonthlyCreditAmount(subscription.planId);

    if (!subscriptionId || amount <= 0) {
      result.skipped++;
      continue;
    }

    const grantedCycles = await findGrantedCycles(subscriptionId);
    const dueCycles = getDueYearlyCreditGrantCycles({
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
      now,
      grantedCycles,
    });

    if (dueCycles.length === 0) {
      result.skipped++;
      continue;
    }

    for (const cycle of dueCycles) {
      const grantKey = `${subscriptionId}:${cycle}`;

      await grantCredits({
        userId: subscription.userId,
        planId: subscription.planId,
        subscriptionRecordId: subscription.id,
        subscriptionId,
        amount,
        cycle,
        grantKey,
        periodStart: subscription.periodStart,
        periodEnd: subscription.periodEnd,
      });

      result.granted++;
      result.grants.push({
        subscriptionId,
        planId: subscription.planId,
        amount,
        cycle,
      });
    }
  }

  return result;
}
