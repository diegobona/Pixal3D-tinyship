import { getEnvForService } from './utils';

export const authConfig = {
  requireEmailVerification: false,
  socialProviders: {
    google: {
      get clientId() {
        return getEnvForService('GOOGLE_CLIENT_ID', 'Google Auth');
      },
      get clientSecret() {
        return getEnvForService('GOOGLE_CLIENT_SECRET', 'Google Auth');
      },
    },
  },
} as const;
