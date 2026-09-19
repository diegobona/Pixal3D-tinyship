# Pixal3D Genuine Bilingual Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a genuinely localized English/Simplified Chinese Next.js experience with automatic first-visit language selection, persistent manual choice, localized product copy and formats, and correct bilingual SEO.

**Architecture:** Keep English on clean canonical URLs and Simplified Chinese on `/zh-CN/*`. Resolve a locale from explicit URL/cookie first, then weighted browser `Accept-Language`, then deployment country headers (`CF-IPCountry`, `x-vercel-ip-country`, `CloudFront-Viewer-Country`) as a weak fallback. Put the pure negotiation logic in `libs/i18n`, keep the Next middleware as an adapter, and retain a one-year explicit-choice cookie.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, shared `libs/i18n`, Vitest, Playwright.

**Working-tree note:** The repository already contains uncommitted user-requested changes. Preserve them and do not create intermediate commits unless the user asks.

---

## File map

- Create `libs/i18n/locale-negotiation.ts`: framework-independent locale signal parsing and precedence.
- Modify `libs/i18n/index.ts`: export locale negotiation helpers and shared locale types.
- Modify `apps/next-app/middleware.ts`: URL/cookie/browser/country routing, cookie persistence, cache-vary headers.
- Modify `apps/next-app/next.config.ts`: remove duplicate locale redirects/rewrites so middleware is the single routing authority.
- Create `apps/next-app/app/api/locale/route.ts`: validated manual-preference endpoint that owns cookie attributes.
- Modify `config.ts`: enable documented automatic detection.
- Modify `libs/i18n/locales/en.ts`: add missing UI labels and pricing/error copy keys.
- Replace `libs/i18n/locales/zh-CN.ts`: complete standalone Chinese product localization with no English dictionary spread fallback.
- Modify `config/payment.ts`: culturally natural Chinese plan names, descriptions, durations, and feature lists.
- Modify `libs/blog/static-posts.ts` and create localized blog-content helpers as needed: localize all five legacy static posts and honor localized database-post metadata without English leakage.
- Create `libs/blog/localized-post-metadata.ts`: typed runtime validation for database `metadata.locales` payloads.
- Modify `apps/next-app/components/global-header.tsx`: make the language switcher available to signed-out and signed-in users and localize accessibility labels.
- Modify `apps/next-app/components/notify-host.tsx`, `apps/next-app/components/my-assets-grid.tsx`, `apps/next-app/lib/pixal3d-generate-disabled-reason.ts`, and payment result pages: remove locale-fixed labels/formatting.
- Modify `apps/next-app/lib/pixal3d-surface-visibility.ts`: enable the language selector.
- Modify `apps/next-app/app/[lang]/(root)/pricing/page.tsx`: remove hardcoded English and localize price/billing presentation.
- Modify `apps/next-app/app/[lang]/(root)/dashboard/page.tsx`: localize currency, numbers, billing cycles, and order statuses.
- Create `apps/next-app/lib/localized-metadata.ts` and modify indexable public route metadata generators: path-specific canonical/hreflang/Open Graph locale metadata; mark private/transient routes noindex.
- Create `docs/implementation/i18n-routing.md` and `docs/user-guide/language-selection.md`: document routing, detection, cache, URL, and manual preference behavior.
- Modify `tests/e2e/TEST-CATALOG.md`: acceptance scenarios and final results.
- Create `tests/unit/i18n/locale-negotiation.test.ts`: negotiation precedence and parser coverage.
- Create `tests/unit/i18n/localization-completeness.test.ts`: dictionary parity and representative localization checks.
- Modify `tests/unit/next/global-header-navigation.test.ts`: switcher visibility and accessibility coverage.
- Modify `tests/e2e/specs/i18n-switching.spec.ts`: automatic selection, manual override, cookie persistence, and localized-content flows.

---

### Task 1: Specify locale negotiation behavior

- [ ] Add acceptance scenarios to `tests/e2e/TEST-CATALOG.md`:
  - explicit `/zh-CN` URL remains Chinese;
  - `NEXT_LOCALE` cookie wins over all automatic signals;
  - weighted `Accept-Language` chooses `zh-CN` for Chinese and English otherwise;
  - country header chooses Chinese only when browser language is unsupported and country is `CN`;
  - automatic detection never writes the one-year manual preference cookie;
  - manual language selection persists across pages;
  - signed-out users can always access the switcher.
- [ ] Create `tests/unit/i18n/locale-negotiation.test.ts` with failing tests for the desired API:

```ts
expect(resolvePreferredLocale({ cookieLocale: "en", acceptLanguage: "zh-CN" })).toBe("en");
expect(resolvePreferredLocale({ acceptLanguage: "zh-CN,zh;q=0.9,en;q=0.8" })).toBe("zh-CN");
expect(resolvePreferredLocale({ acceptLanguage: "fr-FR", countryCode: "CN" })).toBe("zh-CN");
expect(resolvePreferredLocale({ acceptLanguage: "fr-FR", countryCode: "US" })).toBe("en");
```

- [ ] Cover out-of-order weights, ties, `q=0`, wildcard-only/unsupported-only values, malformed weights, whitespace/casing, invalid cookies, and Traditional Chinese tags. Policy: the only Chinese UI is Simplified Chinese, so all browser-declared Chinese variants (`zh`, `zh-Hans`, `zh-Hant`, `zh-TW`, `zh-HK`) resolve to the available Chinese UI; IP fallback itself remains limited to `CN`.

- [ ] Run the focused Vitest file and verify RED because `locale-negotiation.ts` does not exist.

### Task 2: Implement the pure locale resolver

- [ ] Create `libs/i18n/locale-negotiation.ts` with:
  - normalization for `en`, `en-*`, `zh`, `zh-*`, and exact supported locale values;
  - weighted `Accept-Language` parsing;
  - precedence `cookie > browser > country > en`;
  - country fallback restricted to mainland China (`CN`) because the available Chinese locale is Simplified Chinese.
- [ ] Export helpers from `libs/i18n/index.ts`.
- [ ] Run the focused unit test and verify GREEN.
- [ ] Refactor names only while keeping the test green.

### Task 3: Route first visits without overriding user intent

- [ ] Add failing middleware/source tests proving:
  - clean English URLs are internally rewritten to `/en/*`;
  - Chinese preference redirects clean URLs to `/zh-CN/*`;
  - `/en/*` redirects to clean English without creating a manual-preference cookie;
  - `/zh-CN/*` controls that request but does not create a manual-preference cookie;
  - automatic redirects/rewrites carry `Cache-Control: private, no-store` plus appropriate `Vary` headers;
  - clean URLs, `/en`, `/zh-CN`, protected/hidden routes, query strings, and trailing paths do not loop.
- [ ] Run the focused tests and verify RED against the current unconditional English rewrite.
- [ ] Update `apps/next-app/middleware.ts` to use the pure resolver for locale, auth, and hidden-page redirects.
- [ ] Persist a locale cookie only from an actual manual selector action. Automatic detection and direct locale URL visits must never promote themselves into a one-year manual override.
- [ ] Set `Cache-Control: private, no-store` and a cache-safe `Vary` header on signal-dependent redirects/rewrites so CDN caches cannot leak one visitor's locale choice to another.
- [ ] Remove the duplicate English redirects and clean-URL rewrites from `apps/next-app/next.config.ts`; middleware becomes the sole locale-routing authority.
- [ ] Set `config.app.i18n.autoDetect` to `true`.
- [ ] Run the focused tests and verify GREEN.

### Task 4: Audit every reachable Next surface and make Chinese independent

- [ ] Inventory every user-visible string and locale-fixed formatter reachable from `apps/next-app`, including static blogs, gallery/sample names, header fallback user name and number formatting, notifications, My Assets, generator helpers, pricing, dashboard, and payment success/cancel states. Exclude inactive generic shared primitives only when their callers always supply localized labels.
- [ ] Create a failing completeness test that recursively compares all leaf paths in `en` and `zhCN`, rejects `...en` in `zh-CN.ts`, and rejects identical English/Chinese leaf strings except a reviewed path/token allowlist for brands and technical tokens.
- [ ] Run it and verify RED because the current Chinese file inherits nearly all English strings.
- [ ] Replace `libs/i18n/locales/zh-CN.ts` with a complete dictionary matching the English structure.
- [ ] Use Chinese product writing rather than literal translation:
  - action-first CTAs;
  - Chinese punctuation and concise helper text;
  - terms familiar to Chinese 3D creators (`参考图`, `贴图`, `面数`, `GLB`, `PBR`);
  - search metadata based on Chinese search intent (`图片转3D`, `AI 3D模型生成器`, `GLB模型`).
- [ ] Preserve technical/brand tokens where translation would reduce clarity (`Pixal3D`, `GLB`, `PBR`, `Google`).
- [ ] Localize the five legacy static blog posts instead of returning the same English post for both locales.
- [ ] For database posts, read optional localized content from `metadata.locales[locale]`; on Chinese listing/detail pages do not silently show English-only records. Keep English as the content-authoring default and document the metadata contract.
- [ ] Add a typed runtime validator for `metadata.locales`: include `metadata` in list/detail/sitemap queries, accept only a non-empty localized `title` and `content` (with optional `excerpt`), and treat malformed data as unavailable rather than rendering partial English.
- [ ] Localize/filter database posts before merging and paginating so Chinese totals/page counts cannot include English-only records; return `notFound()` for untranslated Chinese detail routes.
- [ ] Move gallery/sample display names into the translation dictionaries so localized ARIA labels are also Chinese.
- [ ] Run completeness and existing i18n-dependent unit tests; verify GREEN.

### Task 5: Localize pricing and account data, not only labels

- [ ] Add failing tests for Chinese plan content, Chinese billing-cycle labels, locale-aware number/currency formatting, and removal of hardcoded English pricing headings/buttons.
- [ ] Run focused tests and verify RED.
- [ ] Add missing keys to both locale files for pricing title, description, cycle buttons, price suffix, current-plan/subscribe labels, and checkout errors.
- [ ] Localize every `zh-CN` plan in `config/payment.ts`, including feature lists and duration text.
- [ ] Update pricing to use translations and `Intl.NumberFormat` for the active locale.
- [ ] Update dashboard to render `每月`/`每年`, locale-aware currency/numbers, and localized order status labels.
- [ ] Pass the active locale into My Assets and disabled-reason number formatting; localize notification badges, dismiss labels, fallback user name, and payment loading/error UI.
- [ ] Run focused tests and verify GREEN.

### Task 6: Expose a first-class language selector

- [ ] Update the header test first to require `PIXAL3D_SHOW_LANGUAGE_SWITCHER = true`, localized ARIA labels, and a selector outside the authenticated-user-only branch.
- [ ] Run the test and verify RED.
- [ ] Enable the language-switcher flag.
- [ ] Refactor the desktop selector into an always-visible control shared by signed-out and signed-in states.
- [ ] Keep language names self-identifying (`English`, `简体中文`) and add `data-testid="locale-switcher"`.
- [ ] Create `POST /api/locale` as a thin validated adapter. It accepts only `en` or `zh-CN` and writes `NEXT_LOCALE` with `Path=/`, `Max-Age=31536000`, `SameSite=Lax`, `HttpOnly`, and `Secure` in production; automatic middleware never writes this cookie.
- [ ] Make the selector await that endpoint before navigation, preserve current path plus query string, and fail gracefully by still navigating to the explicitly selected locale.
- [ ] Add E2E assertions for manual-cookie value/path/max-age/same-site/httpOnly/secure behavior (secure asserted in production-oriented route unit coverage) and for path/query preservation.
- [ ] Localize the mobile menu and notification dismissal accessibility text.
- [ ] Run header tests and verify GREEN.

### Task 7: Add path-specific bilingual SEO and explicit noindex policy

- [ ] Add failing layout tests for localized canonical URLs, `alternates.languages`, `x-default`, and Open Graph locale mapping (`en_US`, `zh_CN`).
- [ ] Run focused tests and verify RED.
- [ ] Classify homepage, pricing, blog list, and available blog details as indexable public routes. Create a shared metadata URL helper and give those routes path-specific canonical URLs plus reciprocal `en`, `zh-CN`, and `x-default` links.
- [ ] Mark sign-in, sign-up, dashboard, My Assets, payment success, and payment cancel as `robots: { index: false, follow: false }`; do not emit canonical/hreflang/Open Graph alternates for these private or transaction-state routes.
- [ ] Map Open Graph locales to `en_US` and `zh_CN`, include the reciprocal `alternateLocale`, and make the Open Graph URL route-specific.
- [ ] Keep English clean URLs and Chinese `/zh-CN` URLs consistent with `sitemap.ts`.
- [ ] For database blog details, emit a `zh-CN` alternate only when validated Chinese metadata exists. Omit unavailable Chinese alternates from detail metadata and sitemap entries.
- [ ] Test nested routes and dynamic blog slugs against the same URL helper used by the sitemap, including localized, untranslated, and malformed database metadata cases.
- [ ] Add metadata tests proving indexable public routes have reciprocal alternates while private/auth/payment routes are `noindex, nofollow` and have no bilingual alternates.
- [ ] Run layout and sitemap tests and verify GREEN.

### Task 8: Browser verification and regression suite

- [ ] Start the Next.js app and use `agent-browser`/the in-app browser to verify these flows and discover stable selectors from the real DOM before writing Playwright code:
  - fresh Chinese browser request redirects to `/zh-CN` and shows localized hero/auth copy;
  - fresh English browser request stays on clean `/` and shows English;
  - unsupported browser language plus `CF-IPCountry: CN` selects Chinese;
  - a stored English cookie overrides Chinese browser/country signals;
  - the signed-out language selector switches both URL and visible content;
  - Chinese pricing/auth/blog pages contain localized content, not inherited English.
- [ ] Rewrite `tests/e2e/specs/i18n-switching.spec.ts` against the verified real header DOM without fallback navigation.
- [ ] Run the related Playwright spec and record results in `TEST-CATALOG.md`.
- [ ] Write `docs/implementation/i18n-routing.md` for routing/detection/cache/metadata behavior and `docs/user-guide/language-selection.md` for visible selector/cookie behavior.
- [ ] Run `pnpm --filter @tinyship/next-app typecheck` (or direct equivalent when the workspace pnpm wrapper is unavailable).
- [ ] Run `pnpm --filter @tinyship/next-app build` (or direct equivalent).
- [ ] Run `git diff --check` and review all changed files, preserving unrelated user changes.
