import { requireEnvForService } from './config/utils';
import { authConfig } from './config/auth';
import { paymentConfig } from './config/payment';
import { creditsConfig } from './config/credits';
import { databaseConfig } from './config/database';
import { ai3dConfig } from './config/ai3d';

export type { RecurringPlan, OneTimePlan, CreditPlan, Plan } from './config/types';

export const config = {
  app: {
    name: 'Pixal3D',
    logo: {
      iconUrl: '/logo.svg',
      fullLogoUrl: '' as string | undefined,
      iconClassName: '' as string,
    },
    get baseUrl() {
      return requireEnvForService('APP_BASE_URL', 'Application', 'http://localhost:7001');
    },
    theme: {
      defaultTheme: 'dark' as const,
      defaultColorScheme: 'claude' as const,
      storageKey: 'tinyship-ui-theme',
    },
    i18n: {
      defaultLocale: 'en' as const,
      locales: ['en', 'zh-CN'] as const,
      cookieKey: 'NEXT_LOCALE',
      autoDetect: false,
    },
    payment: {
      get successUrl() {
        return `${config.app.baseUrl}/payment-success`;
      },
      get cancelUrl() {
        return `${config.app.baseUrl}/payment-cancel`;
      },
    },
  },
  auth: authConfig,
  payment: paymentConfig,
  credits: creditsConfig,
  database: databaseConfig,
  ai3d: ai3dConfig,
} as const;
