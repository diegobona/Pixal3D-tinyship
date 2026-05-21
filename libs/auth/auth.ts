import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { config } from "@config";
import { account, db, session, user, verification } from "@libs/database";

export { toNextJsHandler } from "better-auth/next-js";

export const auth = betterAuth({
  appName: "Pixal3D",
  trustedOrigins: [
    ...(process.env.APP_BASE_URL ? [process.env.APP_BASE_URL] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      account,
      session,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: config.auth.socialProviders.google.clientId!,
      clientSecret: config.auth.socialProviders.google.clientSecret!,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  rateLimit: {
    enabled: true,
  },
});
