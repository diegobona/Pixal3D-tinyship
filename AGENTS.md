# AGENTS.md

## Purpose

Universal feature-delivery checklist for this monorepo.
Use this file as the default instruction when implementing any new feature, so repeated manual prompts are not required.

## Scope

- The active product is `apps/next-app` (Next.js — React, App Router).
- `apps/nuxt-app` and `apps/tanstack-app` are inactive template/reference code. Do not modify, build, test, or copy assets into them unless the user explicitly asks for that app.
- Shared capability and business logic used by Next.js should be implemented in `libs/*` and `config/*` when appropriate, then wired into `apps/next-app`.
- React-specific shared components and hooks live in `libs/react-shared`.

## Golden Rules

1. No hardcoded user-facing strings in pages/components; use i18n keys.
2. Implement and verify Next.js only unless another app is explicitly requested.
3. API routes are thin adapters; core logic belongs to shared libraries.
4. Any user-accessed API/page must be checked for auth and permission consistency.
5. If a feature consumes credits/money, ensure charge/refund path and transaction labels are complete.
6. Always finish with typecheck + build verification.
7. A feature is **not done** until its relevant Next.js E2E tests pass.

## Development Workflow (Spec First, Code First)

Each feature follows five phases. The key idea: define **what to verify** before coding,
but write the **actual test code** after the UI exists (E2E selectors depend on real DOM).

```
┌─────────┐   ┌─────────┐   ┌──────────┐   ┌─────────┐   ┌─────────┐
│  SPEC   │──▶│  CODE   │──▶│  VERIFY  │──▶│  TEST   │──▶│  GREEN  │
│         │   │         │   │          │   │         │   │         │
│ Define  │   │ Implement│  │ agent-   │   │ Write   │   │ E2E pass│
│ accept- │   │ feature  │  │ browser  │   │ E2E     │   │ Next =  │
│ ance    │   │ code     │  │ visual   │   │ specs   │   │ DONE    │
│ criteria│   │ (Next)   │  │ walkthru │   │ against │   │         │
│ in plain│   │          │  │          │   │ real UI │   │         │
│ language│   │         │   │          │   │         │   │         │
└─────────┘   └─────────┘   └──────────┘   └─────────┘   └─────────┘
```

### Phase details

| # | Phase | What | Output |
|---|-------|------|--------|
| 1 | **Spec** | Write acceptance scenarios in `tests/e2e/TEST-CATALOG.md` (plain language, no Playwright code). Define what pages/flows to test, what URL params to check, what UI states to verify. | TEST-CATALOG.md entry in backlog |
| 2 | **Code** | Implement the feature following the checklist below (libs → config → Next.js → i18n → permissions). | Working Next.js feature |
| 3 | **Verify** | Use `agent-browser` to walk through the key user flows on the running app. Catch visual/UX issues before writing tests. | Visual confirmation |
| 4 | **Test** | Write Playwright E2E specs based on the real DOM structure. Use selectors discovered during the Verify phase. | `tests/e2e/specs/*.spec.ts` |
| 5 | **Green** | Run the relevant Next.js E2E tests (`pnpm test:e2e`). Passing tests = feature complete. Record results in TEST-CATALOG.md. | Updated test results table |

### Why not pure BDD (E2E first)?

E2E tests are tightly coupled to DOM structure (`[data-slot="select-trigger"]`, `role="combobox"`,
`.nth(1)`), URL patterns, and i18n text. These are unknowable before the UI exists.
Next.js selectors and URL/i18n behavior often only become clear after implementation. Writing E2E first would produce throwaway code.

The BDD **mindset** (think about acceptance criteria first) is preserved in the Spec phase.

### When to run E2E

| Trigger | Scope | Command |
|---------|-------|---------|
| Finished a feature | Related spec files only | `npx playwright test <spec-file>` |
| Before release | Full Next.js suite | Start Next.js on port 7001, run `pnpm test:e2e` |
| Large refactor | Full Next.js suite | Same as above |
| CI (every push) | **No E2E** — typecheck + build only | `pnpm typecheck && pnpm build` |

> E2E is a **local regression net**, not a CI gate. Payment tests need Stripe CLI,
> AI tests need provider API keys, and the full suite takes ~6 min per app.

## New Feature Checklist (Copy/Paste Friendly)

### 0) Requirement framing

- [ ] Confirm feature goal, supported providers/modes, and non-goals.
- [ ] Identify if this is: UI only / API only / full-stack / provider integration.
- [ ] Confirm the default Next.js scope; touch another app only when explicitly requested.
- [ ] Write acceptance scenarios in `tests/e2e/TEST-CATALOG.md` (Spec phase).

### 1) Architecture placement

- [ ] Put provider/domain logic in `libs/*` (not duplicated in app routes).
- [ ] Put static options and defaults in `config/*`.
- [ ] Keep Next.js route handlers (`apps/next-app/app/api`) as orchestration only.
- [ ] Reuse existing abstractions before adding new env vars or new config keys.

### 2) API design and consistency

- [ ] Validate request input (required fields, enum/mode constraints, file limits if needed).
- [ ] Normalize provider-specific parameters into a shared options type.
- [ ] Implement failure-safe flow (e.g., task creation + polling + timeout + clear error).
- [ ] Ensure the Next.js API response shape is stable.
- [ ] Log useful debug context (provider/model/request id) without leaking secrets.

### 3) Permissions and auth

- [ ] Add/verify protected page routes in Next middleware.
- [ ] Ensure API has reliable user resolution (`context.user` and/or session fallback).
- [ ] Compare with an existing protected Next.js feature (example: image generation) for consistency.

### 4) i18n and UI text

- [ ] Add keys in `libs/i18n/locales/en.ts` first (source of truth).
- [ ] Mirror same key structure in `libs/i18n/locales/zh-CN.ts`.
- [ ] Add model names, mode labels, errors, helper texts, and button labels.
- [ ] Verify all new Next.js UI texts use translation keys only.

### 5) Credits and billing safety (if applicable)

- [ ] Define/adjust cost mapping in `config/credits.ts`.
- [ ] Use canonical transaction codes from `libs/credits/utils.ts`.
- [ ] Add `dashboard.credits.descriptions.*` translations for new transaction description codes.
- [ ] Consume credits before execution when needed; refund on provider failure.
- [ ] Include metadata for reconciliation (provider/model/task id/error summary).

### 6) Upload/storage constraints (if applicable)

- [ ] Reuse `libs/storage` upload flow and provider config.
- [ ] Enforce documented constraints (size, mime, dimensions, count).
- [ ] Prefer URL-based downstream API inputs where provider accepts URLs.
- [ ] Add preview UX if image/video input materially affects result quality.

### 7) Environment variable hygiene

- [ ] Add only truly new env vars to `env.example`.
- [ ] Reuse existing env names where possible; avoid alias sprawl.
- [ ] Validate base URL/origin handling carefully for provider endpoints.
- [ ] Remove obsolete env vars and dead fallback logic.

### 8) Documentation updates

- [ ] Update implementation docs under `docs/implementation/*` for new API behaviors.
- [ ] Update user docs under `docs/user-guide/*` when user-visible behavior changes.
- [ ] Keep provider parameter examples aligned with actual request payload format.

### 9) Verification before handoff

- [ ] Run Next typecheck: `pnpm --filter @tinyship/next-app typecheck`
- [ ] Run Next build: `pnpm --filter @tinyship/next-app build`
- [ ] Use `agent-browser` to walk through the key user flow (Verify phase).

### 10) E2E tests

- [ ] Write Playwright E2E specs in `tests/e2e/specs/` (Test phase).
- [ ] Run E2E against Next.js: `npx playwright test --config=tests/e2e/playwright.config.ts <spec>`
- [ ] Next.js green → update `tests/e2e/TEST-CATALOG.md` results table (Green phase).
- [ ] See `tests/e2e/AGENTS.md` for E2E conventions and helpers.

### 11) Delivery format

- [ ] Summarize changed files grouped by: shared libs / Next / config / docs.
- [ ] Mention other apps only if the request explicitly included them.
- [ ] Include verification command results and any warnings that remain.

## Feature Delivery Matrix (Recommended)

When adding a new capability, track these rows explicitly:

- [ ] Shared domain (`libs/*`)
- [ ] Config (`config/*`)
- [ ] Next page/component
- [ ] Next API route
- [ ] Middleware/permissions
- [ ] i18n EN + ZH
- [ ] Credits/transactions
- [ ] E2E tests (Next.js green)
- [ ] Docs

## Key Project References

- Structure guideline: `.cursor/rules/project-structure.mdc`
- i18n conventions: `libs/i18n/AGENTS.md`
- AI provider implementation patterns: `libs/ai/AGENTS.md`
- Credits lifecycle: `libs/credits/AGENTS.md`
- Permissions model: `libs/permissions/AGENTS.md`
- Auth middleware design: `docs/implementation/auth-middleware-design.md`
- Build verification notes: `docs/implementation/build-verification.md`
- Storage upload guide: `docs/user-guide/storage.md`
- Credits user guide: `docs/user-guide/credits.md`
- E2E test conventions: `tests/e2e/AGENTS.md`
- E2E test catalog: `tests/e2e/TEST-CATALOG.md`

## Suggested Prompt Shortcut

When asking any coding model to build a feature in this repo, prepend:

`Please follow /AGENTS.md as the default implementation checklist and work in apps/next-app unless I explicitly request another app.`
