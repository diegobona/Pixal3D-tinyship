# Pixal3D Next.js Cloudflare Workers Deployment

This project deploys the Next.js app to Cloudflare Workers through OpenNext.
Local Windows builds are not the source of truth for production. Production
builds should run in Cloudflare/GitHub Linux build environments.

## Target

- App: `apps/next-app`
- Platform: Cloudflare Workers
- Adapter: `@opennextjs/cloudflare`
- Config: `apps/next-app/wrangler.jsonc`
- OpenNext config: `apps/next-app/open-next.config.ts`

Do not deploy this Next.js app as a static Cloudflare Pages site. It uses API
routes, auth, Stripe webhooks, database access, and server-side logic.

## Cloudflare Build

Use a GitHub-connected Cloudflare Workers deployment. The recommended build
command is:

```bash
corepack pnpm install --frozen-lockfile && corepack pnpm deploy:next:cf
```

If Cloudflare separates install and deploy steps, use:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm deploy:next:cf
```

The deploy command runs the Next/OpenNext build and then deploys with Wrangler.

## Required Environment Variables

Set these in Cloudflare, not in source control:

```env
APP_BASE_URL=https://your-domain.com
BETTER_AUTH_URL=https://your-domain.com
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_CREATOR_MONTHLY=price_...
STRIPE_PRICE_CREATOR_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
```

Add other provider keys only when the feature is enabled, such as fal.ai or
storage provider credentials.

## Stripe Webhook

In Stripe Dashboard, set the production webhook endpoint to:

```text
https://your-domain.com/api/payment/webhook/stripe
```

Listen to at least:

```text
checkout.session.completed
invoice.paid
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Local Development

Use local Next dev for product work:

```powershell
corepack pnpm --filter @tinyship/next-app dev
```

Use Cloudflare/OpenNext build locally only as a best-effort smoke test. Windows
and non-ASCII project paths can break OpenNext build steps even when production
Linux builds are fine.

## Useful Commands

```bash
corepack pnpm --filter @tinyship/next-app typecheck
corepack pnpm --filter @tinyship/next-app build
corepack pnpm build:next:cf
corepack pnpm deploy:next:cf
```

## Deployment Checklist

1. Push the repository to GitHub.
2. Connect the GitHub repository in Cloudflare Workers.
3. Use Workers, not Pages.
4. Set the build/deploy command above.
5. Add production environment variables in Cloudflare.
6. Add the production Stripe webhook endpoint.
7. Deploy.
8. Test sign-in, pricing, Stripe checkout, webhook credit grant, and dashboard
   credits on the production URL.
