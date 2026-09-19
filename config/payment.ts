import { getEnv, requireEnvForService } from './utils';

const privateOwnership = 'Asset ownership: private';
const highGenerationResolution = '3D generation resolution: up to 1536';
const sampleTextureSize = 'PBR texture size: up to 1K';
const starterTextureSize = 'PBR texture size: up to 4K';
const creatorTextureSize = 'PBR texture size: up to 8K';
const proTextureSize = 'PBR texture size: up to 8K';
const zhPrivateOwnership = '资产所有权：私有';
const zhHighGenerationResolution = '3D 生成分辨率：最高 1536';
const zhSampleTextureSize = 'PBR 纹理尺寸：最高 1K';
const zhStarterTextureSize = 'PBR 纹理尺寸：最高 4K';
const zhCreatorTextureSize = 'PBR 纹理尺寸：最高 8K';
const zhProTextureSize = 'PBR 纹理尺寸：最高 8K';

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
            '1 concurrent task',
            'Limited queue priority',
            sampleTextureSize,
            'No saved model history',
          ],
        },
        'zh-CN': {
          name: '免费版',
          description: '无需绑定信用卡。',
          duration: '月',
          features: [
            '同时运行 1 个任务',
            '基础队列优先级',
            zhSampleTextureSize,
            '不保存模型历史记录',
          ],
        },
      },
    },
    starterMonthly: {
      provider: 'stripe',
      id: 'starterMonthly',
      amount: 9,
      currency: 'USD',
      credits: 15000,
      duration: { months: 1, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_STARTER_MONTHLY') || getEnv('STRIPE_PRICE_STARTER') || 'price_starter_monthly_replace_me',
      i18n: {
        en: {
          name: 'Starter',
          description: 'A practical starter plan for light image-to-3D work.',
          duration: 'month',
          features: [
            '15,000 credits/month',
            '2 concurrent tasks',
            'Unlimited downloads per day',
            'Standard queue priority',
            privateOwnership,
            highGenerationResolution,
            starterTextureSize,
            '30-day model history',
          ],
        },
        'zh-CN': {
          name: '入门版',
          description: '适合轻量图片转 3D 工作的实用入门套餐。',
          duration: '月',
          features: [
            '每月 15,000 积分',
            '同时运行 2 个任务',
            '每日不限下载次数',
            '标准队列优先级',
            zhPrivateOwnership,
            zhHighGenerationResolution,
            zhStarterTextureSize,
            '保留 30 天模型历史',
          ],
        },
      },
    },
    creatorMonthly: {
      provider: 'stripe',
      id: 'creatorMonthly',
      amount: 19,
      currency: 'USD',
      credits: 40000,
      duration: { months: 1, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_CREATOR_MONTHLY') || getEnv('STRIPE_PRICE_CREATOR') || 'price_creator_monthly_replace_me',
      i18n: {
        en: {
          name: 'Creator',
          description: 'Best value for regular creators and production-ready assets.',
          duration: 'month',
          features: [
            '40,000 credits/month',
            '4 concurrent tasks',
            'Unlimited downloads per day',
            'Priority queue',
            privateOwnership,
            highGenerationResolution,
            creatorTextureSize,
            'Long-term model history',
          ],
        },
        'zh-CN': {
          name: '创作者版',
          description: '面向经常创作和制作级资产的高性价比套餐。',
          duration: '月',
          features: [
            '每月 40,000 积分',
            '同时运行 4 个任务',
            '每日不限下载次数',
            '优先队列',
            zhPrivateOwnership,
            zhHighGenerationResolution,
            zhCreatorTextureSize,
            '长期保留模型历史',
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
      showInPricing: false,
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
          name: '专业版',
          description: '适合需要最高纹理细节和大用量的团队。',
          duration: '月',
          features: [
            '每月 100,000 积分',
            '同时运行 4 个任务',
            '每日不限下载次数',
            '最高队列优先级',
            zhPrivateOwnership,
            zhHighGenerationResolution,
            zhProTextureSize,
            '永久保留模型历史',
          ],
        },
      },
    },
    starterYearly: {
      provider: 'stripe',
      id: 'starterYearly',
      amount: 84,
      currency: 'USD',
      credits: 15000,
      duration: { months: 12, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_STARTER_YEARLY') || 'price_starter_yearly_replace_me',
      i18n: {
        en: {
          name: 'Starter',
          description: 'A practical starter plan for light image-to-3D work.',
          duration: 'year',
          features: [
            '15,000 credits/month',
            'Credits refresh monthly',
            '2 concurrent tasks',
            'Unlimited downloads per day',
            'Standard queue priority',
            privateOwnership,
            highGenerationResolution,
            starterTextureSize,
            '30-day model history',
          ],
        },
        'zh-CN': {
          name: '入门版',
          description: '适合轻量图片转 3D 工作的实用入门套餐。',
          duration: '年',
          features: [
            '每月 15,000 积分',
            '积分每月刷新',
            '同时运行 2 个任务',
            '每日不限下载次数',
            '标准队列优先级',
            zhPrivateOwnership,
            zhHighGenerationResolution,
            zhStarterTextureSize,
            '保留 30 天模型历史',
          ],
        },
      },
    },
    creatorYearly: {
      provider: 'stripe',
      id: 'creatorYearly',
      amount: 180,
      currency: 'USD',
      credits: 40000,
      duration: { months: 12, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_CREATOR_YEARLY') || 'price_creator_yearly_replace_me',
      i18n: {
        en: {
          name: 'Creator',
          description: 'Best value for regular creators and production-ready assets.',
          duration: 'year',
          features: [
            '40,000 credits/month',
            'Credits refresh monthly',
            '4 concurrent tasks',
            'Unlimited downloads per day',
            'Priority queue',
            privateOwnership,
            highGenerationResolution,
            creatorTextureSize,
            'Long-term model history',
          ],
        },
        'zh-CN': {
          name: '创作者版',
          description: '面向经常创作和制作级资产的高性价比套餐。',
          duration: '年',
          features: [
            '每月 40,000 积分',
            '积分每月刷新',
            '同时运行 4 个任务',
            '每日不限下载次数',
            '优先队列',
            zhPrivateOwnership,
            zhHighGenerationResolution,
            zhCreatorTextureSize,
            '长期保留模型历史',
          ],
        },
      },
    },
    proYearly: {
      provider: 'stripe',
      id: 'proYearly',
      amount: 469,
      currency: 'USD',
      credits: 100000,
      showInPricing: false,
      duration: { months: 12, type: 'recurring' },
      stripePriceId: getEnv('STRIPE_PRICE_PRO_YEARLY') || 'price_pro_yearly_replace_me',
      i18n: {
        en: {
          name: 'Pro',
          description: 'For high-volume teams that need the highest texture detail.',
          duration: 'year',
          features: [
            '100,000 credits/month',
            'Credits refresh monthly',
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
          name: '专业版',
          description: '适合需要最高纹理细节和大用量的团队。',
          duration: '年',
          features: [
            '每月 100,000 积分',
            '积分每月刷新',
            '同时运行 4 个任务',
            '每日不限下载次数',
            '最高队列优先级',
            zhPrivateOwnership,
            zhHighGenerationResolution,
            zhProTextureSize,
            '永久保留模型历史',
          ],
        },
      },
    },
  },
} as const;
