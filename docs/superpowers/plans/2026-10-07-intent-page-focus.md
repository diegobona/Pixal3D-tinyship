# Image-to-3D page focus implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent asset production and review. Follow the repository's spec → code → browser verification → E2E sequence.

**Goal:** Deliver A's free file acquisition journey, then B's actionable model selection journey, with the generation workspace at the top of both pages.

**Architecture:** Keep public Next server-rendered content, shared translated contracts and configuration. A adds real generated-result evidence beside its source and public downloads. B adds model navigation next to the existing provisional workspace and visible access/export facts with genuine use actions. No new paid API, authentication, or iframe event claims.

**Tech stack:** Next.js App Router, React, TypeScript, existing model-viewer/Three.js, Playwright, EN/ZH dictionaries.

## A. Obtain a file

- [x] Record acceptance criteria in `tests/e2e/TEST-CATALOG.md` before code.
- [x] In `intent-pages.ts` and download EN/ZH dictionaries, add compact generation/export guidance, result-preview labels and download conditions; keep Free + Download H1.
- [x] In `image-to-3d-page.tsx` and `intent-workspace.tsx`, give A a download-focused workspace bar and an obvious independent sample-download action. Preserve one server-rendered iframe and its session.
- [x] Generate a real poster from each completed local GLB, with source hash provenance; show input and output together. Keep direct format downloads usable without viewer JavaScript or login.
- [x] Resume only the explicitly authorized four-sample batch if provider quota permits. Do not retry uncertain submissions, spend money, bypass quotas or fabricate missing models. Record any remaining provider block separately.
- [x] Restore the format comparison with visible use/limitations and a mobile layout; retain FAQ and terms.
- [x] Browser-inspect EN/ZH desktop and mobile before updating relevant E2E assertions. Run A-focused public/download/preview tests; review spec and code before moving on.

## B. Select a model

- [x] Keep `/image-to-3d` as the single free/AI/online keyword landing page. Use an honest title and summary covering free options without claiming all providers/exports are free.
- [x] Verify primary-source online/local entry URLs. Add named model navigation in the top workspace region; keep the same provisional Pixal3D embed and disclose its scope without pretending controls switch providers.
- [x] In model cards, show suitability, formats, access/free conditions, quality/avoid guidance and concise scoped time/VRAM facts. Keep full version detail and source references in disclosures.
- [x] Add actual local setup/online use actions. Preserve license limitations and no invented benchmarks.
- [x] Browser-inspect links, navigation and responsive layout. Update and run B-related tests.

## Delivery

- [x] Update `docs/implementation/image-to-3d-pages.md` and `docs/user-guide/image-to-3d.md` to describe final behavior and actual sample status.
- [x] Run `corepack pnpm --filter @tinyship/next-app typecheck` and `corepack pnpm --filter @tinyship/next-app build`.
- [x] Run `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts tests/e2e/specs/embedded-workspace.spec.ts` against Next port 7001; record fresh results.
- [x] Independent spec/code review, final diff check, no deployment or commit unless requested.

## Remaining sample production

- [ ] Generate the remaining teapot, chair and crate after provider quota recovers. Current batch: 1/4. Saved quota delay permits earliest retry on 2026-10-07 at 22:59:30 Shanghai; no job was submitted in this turn. This does not block the verified page changes.

## Follow-up: embed the two official HF demos

The user selected TRELLIS.2 and Hunyuan3D 2.1 for inline embedding on B. Rodin retains its external use action. A remains unchanged.

- [x] Verify actual `hf.space` origins and framing policy from official Space metadata/responses.
- [x] Add shared React selection/session state, with Pixal3D server-rendered initially and other frames mounted only on first selection. Keep visited frames mounted but hidden when inactive.
- [x] Wire both top and model-card use buttons to the same selection. Supply translated provider-specific accessible titles, selected state and clear no-JavaScript fallback.
- [x] Browser-check actual inline models, EN/ZH, mobile, switching and recovery. Then update related E2E for one initially mounted frame, one visible frame, persistent visited sessions and no popups/generation calls.
- [x] Refresh docs and complete Next typecheck/build and related E2E. Related suite: 20/20 passed (58.6s); typecheck/build passed, with the existing middleware deprecation only.
