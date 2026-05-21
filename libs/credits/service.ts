import { db } from '@libs/database';
import { user } from '@libs/database/schema/user';
import { creditTransaction, creditTransactionTypes } from '@libs/database/schema/credit-transaction';
import { eq, sql } from 'drizzle-orm';
import type {
  AddCreditsParams,
  ConsumeCreditsParams,
  ConsumeCreditsResult,
  RevokeCreditsParams,
} from './types';
import type { CreditTransaction } from '@libs/database/schema/credit-transaction';

export class CreditService {
  async getBalance(userId: string): Promise<number> {
    const result = await db
      .select({ creditBalance: user.creditBalance })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return parseFloat(result[0]?.creditBalance ?? '0') || 0;
  }

  async addCredits(params: AddCreditsParams): Promise<CreditTransaction> {
    const { userId, amount, type, orderId, description, metadata } = params;

    if (amount <= 0) {
      throw new Error('Amount must be positive when adding credits');
    }

    return db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(user)
        .set({
          creditBalance: sql`${user.creditBalance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
        .returning({ creditBalance: user.creditBalance });

      if (!updatedUser) {
        throw new Error(`User not found: ${userId}`);
      }

      const [transaction] = await tx
        .insert(creditTransaction)
        .values({
          id: `txn_${crypto.randomUUID()}`,
          userId,
          type,
          amount: amount.toString(),
          balance: (parseFloat(updatedUser.creditBalance) || 0).toString(),
          orderId: orderId || null,
          description: description || `${type} credits`,
          metadata: metadata || null,
        })
        .returning();

      return transaction;
    });
  }

  async consumeCredits(params: ConsumeCreditsParams): Promise<ConsumeCreditsResult> {
    const { userId, amount, description, metadata } = params;

    if (amount <= 0) {
      return {
        success: false,
        newBalance: await this.getBalance(userId),
        error: 'Amount must be positive when consuming credits',
      };
    }

    try {
      return await db.transaction(async (tx) => {
        const [updatedUser] = await tx
          .update(user)
          .set({
            creditBalance: sql`${user.creditBalance} - ${amount}`,
            updatedAt: new Date(),
          })
          .where(sql`${user.id} = ${userId} AND ${user.creditBalance} >= ${amount}`)
          .returning({ creditBalance: user.creditBalance });

        if (!updatedUser) {
          return {
            success: false,
            newBalance: await this.getBalance(userId),
            error: 'Insufficient credits',
          };
        }

        const newBalance = parseFloat(updatedUser.creditBalance) || 0;
        const transactionId = `txn_${crypto.randomUUID()}`;

        await tx.insert(creditTransaction).values({
          id: transactionId,
          userId,
          type: creditTransactionTypes.CONSUMPTION,
          amount: (-amount).toString(),
          balance: newBalance.toString(),
          description: description || 'Credits consumed',
          metadata: metadata || null,
        });

        return {
          success: true,
          newBalance,
          transactionId,
        };
      });
    } catch (error) {
      console.error('Error consuming credits:', error);
      return {
        success: false,
        newBalance: await this.getBalance(userId),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async revokeCredits(params: RevokeCreditsParams): Promise<CreditTransaction | null> {
    const { userId, amount, transactionId, orderId, description, metadata } = params;

    if (amount <= 0) {
      return null;
    }

    return db.transaction(async (tx) => {
      const [currentUser] = await tx
        .select({ creditBalance: user.creditBalance })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!currentUser) {
        throw new Error(`User not found: ${userId}`);
      }

      const currentBalance = parseFloat(currentUser.creditBalance) || 0;
      const revokeAmount = Math.min(amount, currentBalance);

      if (revokeAmount <= 0) {
        return null;
      }

      const id = transactionId || `txn_${crypto.randomUUID()}`;

      await tx.insert(creditTransaction).values({
        id,
        userId,
        type: creditTransactionTypes.ADJUSTMENT,
        amount: (-revokeAmount).toString(),
        balance: currentBalance.toString(),
        orderId: orderId || null,
        description: description || 'Credits revoked',
        metadata: metadata || null,
      });

      const [updatedUser] = await tx
        .update(user)
        .set({
          creditBalance: sql`${user.creditBalance} - ${revokeAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
        .returning({ creditBalance: user.creditBalance });

      const [transaction] = await tx
        .update(creditTransaction)
        .set({
          balance: (parseFloat(updatedUser.creditBalance) || 0).toString(),
        })
        .where(eq(creditTransaction.id, id))
        .returning();

      return transaction;
    });
  }

  async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    return (await this.getBalance(userId)) >= amount;
  }

  async getStatus(userId: string): Promise<{
    balance: number;
    totalPurchased: number;
    totalConsumed: number;
  }> {
    const balance = await this.getBalance(userId);
    const stats = await db
      .select({
        type: creditTransaction.type,
        total: sql<string>`SUM(ABS(${creditTransaction.amount}))`,
      })
      .from(creditTransaction)
      .where(eq(creditTransaction.userId, userId))
      .groupBy(creditTransaction.type);

    let totalPurchased = 0;
    let totalConsumed = 0;

    for (const stat of stats) {
      const amount = parseFloat(stat.total) || 0;
      if (stat.type === 'purchase' || stat.type === 'bonus') {
        totalPurchased += amount;
      } else if (stat.type === 'consumption') {
        totalConsumed += amount;
      }
    }

    return {
      balance,
      totalPurchased,
      totalConsumed,
    };
  }
}

export const creditService = new CreditService();
