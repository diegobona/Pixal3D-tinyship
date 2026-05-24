import { getEnv, requireEnvForService } from './utils';

const privateOwnership = 'Asset ownership: private';
const standardGenerationResolution =
  '3D generation resolution: up to 1024';
const highGenerationResolution = '3D generation resolution: up to 1536';
const sampleTextureSize = 'PBR texture size: up to 1K';
const starterTextureSize = 'PBR texture size: up to 2K';
const creatorTextureSize = 'PBR texture size: up to 4K';
const proTextureSize = 'PBR texture size: up to 8K';

export const paymentConfig = {
  providers: {
    stripe: {
      get secretKey() {
        return requireEnvForService('STRIPE_SECRET_KEY', 'Stripe');
      },
      get publicKey() {
        return requireEnvForService('STRIPE_PUBLIC_KEY', 'Stripe');
      },
      get webhookSecret() {
        return requireEnvForService('STRIPE_WEBHOOK_SECRET', 'Stripe');
      },
    },
  },

  plans: {
    free: {
      provider: 'free',
      id: 'free',
      amount: 0,
      currency: 'USD',
      duration: { months: 1, type: 'recurring' },
      i18n: {
        en: {
          name: 'Free',
          description: 'No credit card needed.',
          duration: 'month',
          features: [
            '300 monthly credits',
            '1 concurrent task',
            '2 downloads per day',
            'Limited queue priority',
            'Asset ownership: shared sample license',
            standardGenerationResolution,
            sampleTextureSize,
            'No saved model history',
          ],
        },
        'zh-CN': {
          name: 'Free',
          description: 'No credit card needed.',
          duration: 'month',
          features: [
            '300 monthly credits',
            '1 concurrent task',
            '2 downloads per day',
            'Limited queue priority',
            'Asset ownership: shared sample license',
            standardGenerationResolution,
            sampleTextureSize,
            'No saved model history',
          ],
        },
      },
    },
    starterMonthly: {
      provider: 'stripe',
      id: 'starterMonthly',
      amount: 9,
      currency: 'USD',
      credits: 10000,
      duration: { months: 1, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_STARTER_MONTHLY') || getEnv('STRIPE_PRICE_STARTER') || 'price_starter_monthly_replace_me',
      i18n: {
        en: {
          name: 'Starter',
          description: 'A practical starter plan for light image-to-3D work.',
          duration: 'month',
          features: [
            '10,000 monthly credits',
            '1 concurrent task',
            '20 downloads per day',
            'Standard queue priority',
            privateOwnership,
            standardGenerationResolution,
            starterTextureSize,
            '30-day model history',
          ],
        },
        'zh-CN': {
          name: 'Starter',
          description: 'A practical starter plan for light image-to-3D work.',
          duration: 'month',
          features: [
            '10,000 monthly credits',
            '1 concurrent task',
            '20 downloads per day',
            'Standard queue priority',
            privateOwnership,
            standardGenerationResolution,
            starterTextureSize,
            '30-day model history',
          ],
        },
      },
    },
    creatorMonthly: {
      provider: 'stripe',
      id: 'creatorMonthly',
      amount: 19,
      currency: 'USD',
      credits: 30000,
      recommended: true,
      duration: { months: 1, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_CREATOR_MONTHLY') || getEnv('STRIPE_PRICE_CREATOR') || 'price_creator_monthly_replace_me',
      i18n: {
        en: {
          name: 'Creator',
          description: 'Best value for regular creators and production-ready assets.',
          duration: 'month',
          features: [
            '30,000 monthly credits',
            '2 concurrent tasks',
            'Unlimited downloads per day',
            'Priority queue',
            privateOwnership,
            highGenerationResolution,
            creatorTextureSize,
            'Long-term model history',
          ],
        },
        'zh-CN': {
          name: 'Creator',
          description: 'Best value for regular creators and production-ready assets.',
          duration: 'month',
          features: [
            '30,000 monthly credits',
            '2 concurrent tasks',
            'Unlimited downloads per day',
            'Priority queue',
            privateOwnership,
            highGenerationResolution,
            creatorTextureSize,
            'Long-term model history',
          ],
        },
      },
    },
    proMonthly: {
      provider: 'stripe',
      id: 'proMonthly',
      amount: 49,
      currency: 'USD',
      credits: 100000,
      duration: { months: 1, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_PRO_MONTHLY') || getEnv('STRIPE_PRICE_PRO') || 'price_pro_monthly_replace_me',
      i18n: {
        en: {
          name: 'Pro',
          description: 'For high-volume teams that need the highest texture detail.',
          duration: 'month',
          features: [
            '100,000 monthly credits',
            '4 concurrent tasks',
            'Unlimited downloads per day',
            'Maximum queue priority',
            privateOwnership,
            highGenerationResolution,
            proTextureSize,
            'Permanent model history',
          ],
        },
        'zh-CN': {
          name: 'Pro',
          description: 'For high-volume teams that need the highest texture detail.',
          duration: 'month',
          features: [
            '100,000 monthly credits',
            '4 concurrent tasks',
            'Unlimited downloads per day',
            'Maximum queue priority',
            privateOwnership,
            highGenerationResolution,
            proTextureSize,
            'Permanent model history',
          ],
        },
      },
    },
    starterYearly: {
      provider: 'stripe',
      id: 'starterYearly',
      amount: 72,
      currency: 'USD',
      credits: 10000,
      duration: { months: 12, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_STARTER_YEARLY') || 'price_starter_yearly_replace_me',
      i18n: {
        en: {
          name: 'Starter',
          description: 'A practical starter plan for light image-to-3D work.',
          duration: 'year',
          features: [
            '10,000 monthly credits',
            '1 concurrent task',
            '20 downloads per day',
            'Standard queue priority',
            privateOwnership,
            standardGenerationResolution,
            starterTextureSize,
            '30-day model history',
          ],
        },
        'zh-CN': {
          name: 'Starter',
          description: 'A practical starter plan for light image-to-3D work.',
          duration: 'year',
          features: [
            '10,000 monthly credits',
            '1 concurrent task',
            '20 downloads per day',
            'Standard queue priority',
            privateOwnership,
            standardGenerationResolution,
            starterTextureSize,
            '30-day model history',
          ],
        },
      },
    },
    creatorYearly: {
      provider: 'stripe',
      id: 'creatorYearly',
      amount: 156,
      currency: 'USD',
      credits: 30000,
      recommended: true,
      duration: { months: 12, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_CREATOR_YEARLY') || 'price_creator_yearly_replace_me',
      i18n: {
        en: {
          name: 'Creator',
          description: 'Best value for regular creators and production-ready assets.',
          duration: 'year',
          features: [
            '30,000 monthly credits',
            '2 concurrent tasks',
            'Unlimited downloads per day',
            'Priority queue',
            privateOwnership,
            highGenerationResolution,
            creatorTextureSize,
            'Long-term model history',
          ],
        },
        'zh-CN': {
          name: 'Creator',
          description: 'Best value for regular creators and production-ready assets.',
          duration: 'year',
          features: [
            '30,000 monthly credits',
            '2 concurrent tasks',
            'Unlimited downloads per day',
            'Priority queue',
            privateOwnership,
            highGenerationResolution,
            creatorTextureSize,
            'Long-term model history',
          ],
        },
      },
    },
    proYearly: {
      provider: 'stripe',
      id: 'proYearly',
      amount: 408,
      currency: 'USD',
      credits: 100000,
      duration: { months: 12, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_PRO_YEARLY') || 'price_pro_yearly_replace_me',
      i18n: {
        en: {
          name: 'Pro',
          description: 'For high-volume teams that need the highest texture detail.',
          duration: 'year',
          features: [
            '100,000 monthly credits',
            '4 concurrent tasks',
            'Unlimited downloads per day',
            'Maximum queue priority',
            privateOwnership,
            highGenerationResolution,
            proTextureSize,
            'Permanent model history',
          ],
        },
        'zh-CN': {
          name: 'Pro',
          description: 'For high-volume teams that need the highest texture detail.',
          duration: 'year',
          features: [
            '100,000 monthly credits',
            '4 concurrent tasks',
            'Unlimited downloads per day',
            'Maximum queue priority',
            privateOwnership,
            highGenerationResolution,
            proTextureSize,
            'Permanent model history',
          ],
        },
      },
    },
  },
} as const;
