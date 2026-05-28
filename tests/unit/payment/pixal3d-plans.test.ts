import { describe, expect, it } from 'vitest';
import { config } from '../../../config';

describe('Pixal3D pricing plans', () => {
  it('exposes Free plus monthly and yearly Pixal3D credit plans', () => {
    const plans = Object.values(config.payment.plans);

    expect(plans.map((plan) => plan.id)).toEqual([
      'free',
      'starterMonthly',
      'creatorMonthly',
      'proMonthly',
      'starterYearly',
      'creatorYearly',
      'proYearly',
    ]);

    const freePlan = config.payment.plans.free;
    expect(freePlan.amount).toBe(0);
    expect(freePlan.provider).toBe('free');
    expect(freePlan.i18n.en.features).not.toContain('300 monthly credits');
    expect(freePlan.i18n.en.features).toContain('1 concurrent task');
    expect(freePlan.i18n.en.features).not.toContain('Asset ownership: shared sample license');
    expect(freePlan.i18n.en.features).not.toContain('3D generation resolution: up to 1024');

    const paidPlans = plans.filter((plan) => plan.id !== 'free');
    expect(paidPlans.every((plan) => plan.provider === 'stripe')).toBe(true);
    expect(paidPlans.every((plan) => plan.duration.type === 'recurring')).toBe(true);
    expect(paidPlans.filter((plan) => plan.duration.months === 1)).toHaveLength(3);
    expect(paidPlans.filter((plan) => plan.duration.months === 12)).toHaveLength(3);

    expect(config.payment.plans.starterYearly.amount).toBe(72);
    expect(config.payment.plans.creatorYearly.amount).toBe(156);
    expect(config.payment.plans.proYearly.amount).toBe(408);
    expect(config.payment.plans.starterYearly.amount % 12).toBe(0);
    expect(config.payment.plans.creatorYearly.amount % 12).toBe(0);
    expect(config.payment.plans.proYearly.amount % 12).toBe(0);

    expect(plans.every((plan) => plan.i18n.en.name.includes('Stripe'))).toBe(false);
    expect(paidPlans.every((plan) => plan.i18n.en.features.some((feature) => feature.includes('credits')))).toBe(true);
    expect(plans.every((plan) => plan.i18n.en.features.some((feature) => feature.includes('concurrent')))).toBe(true);
    expect(paidPlans.every((plan) => plan.i18n.en.features.some((feature) => feature.includes('downloads')))).toBe(true);
    expect(paidPlans.every((plan) => plan.i18n.en.features.some((feature) => feature.includes('Asset ownership')))).toBe(true);
    expect(plans.every((plan) => !plan.i18n.en.features.some((feature) => feature.includes('Commercial use')))).toBe(true);
  });
});
