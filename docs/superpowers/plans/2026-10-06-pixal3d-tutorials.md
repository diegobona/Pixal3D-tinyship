# Pixal3D Tutorials and Embed Foundation Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent research and review. Follow the repository's Spec → Code → Verify → Test → Green workflow; write E2E code after browser inspection.

**Goal:** Deliver four bilingual, source-backed tutorial pages and reusable lazy embedded workspace infrastructure in the active Next.js app.

**Architecture:** Keep route definitions in `config/tutorials.ts`, content contracts in `libs/tutorials/types.ts`, and EN/ZH tutorial copy under `libs/i18n/locales`. Four explicit routes render a shared server template. Framework-independent lazy iframe behavior lives in `libs/react-shared`; existing auth overlays and workspace behavior are preserved. Cross-origin analytics feasibility is documented before claiming any generation/download counts.

**Tech Stack:** Next.js App Router, React, TypeScript, existing i18n, Playwright, IntersectionObserver.

## Acceptance source

`tests/e2e/TEST-CATALOG.md`, section 22. The user approved a lightweight branded frame on 2026-10-06. Public tutorials do not consume credits or require login. The embedded homepage retains its existing sign-in requirement.

## Task 1: Source research and content contracts

- [x] Verify official Pixal3D installation/model sources and community GGUF/ComfyUI availability using primary web sources.
- [x] Create `config/tutorials.ts` with four slug/path definitions and stable editorial date.
- [x] Create `libs/tutorials/types.ts` for translated tutorial sections, citations, performance rows, and screenshot evidence.
- [x] Add `libs/i18n/locales/tutorials/en.ts` and `zh-CN.ts`, then expose `tutorials` in the existing locale objects. Include requirements, steps, published performance evidence, troubleshooting, files, and screenshots in that order. Label unknown benchmarks instead of fabricating them; distinguish instructions/specifications from measurements.

## Task 2: Shared template and discoverability

- [x] Create `apps/next-app/components/tutorial-page.tsx` and `lib/tutorial-metadata.ts` using existing localized SEO helpers.
- [x] Create explicit pages under `app/[lang]/(root)/how-to-install-locally`, `gguf`, `low-vram`, and `comfyui`.
- [x] Add localized related links between tutorials and a new homepage link section without rewriting existing copy.
- [x] Extend `app/sitemap.ts`; add `app/robots.ts` allowing public routes and excluding API/private paths. Canonicals ignore query strings and `/en/*` redirects remain intact.

## Task 3: Embedded workspace

- [x] Build `libs/react-shared/components/lazy-iframe.tsx`: fixed layout footprint, native lazy loading plus near-viewport mount, translated placeholder, no-JS fallback, loading/slow/retry states, cleanup on unmount and source change. Start the 30-second slow-load timer only after mounting; reset on retry/source change. Include an external-open action. Browser load events are not a health check, and browser iframe error events are unreliable. Do not automatically destroy an active frame on timeout.
- [x] Use it in both homepage iframe instances, keeping test IDs and internal frame geometry stable. Add an i18n-powered brand/source bar around the inline workspace. The old modal overlay covers resolver requests only; frame loading belongs to the reusable component so help/retry controls remain usable after timeout.
- [x] Inspect the deployed Studio source for an actual event bridge and document the observed conclusion with its source URL. Document generation vs download analytics semantics and required child cooperation. If no bridge exists, state measurement is unavailable. A future bridge must validate exact origin, sender window, protocol, payload, and deduplicate event IDs. Do not label load/focus/session allocation as generation or download.

## Task 4: Browser verification, regression tests, and documentation

- [x] Start only Next.js on port 7001; inspect desktop/mobile tutorial layout, locale switching, home links, embed/auth state, and retry behavior with the available browser tool (agent-browser if installed).
- [x] Write `tests/e2e/specs/tutorials.spec.ts` and `embedded-workspace.spec.ts` from the observed DOM. Mock only external embed/session requests where needed; preserve actual app routing and rendering.
- [x] Run `pnpm --filter @tinyship/next-app typecheck` and `pnpm --filter @tinyship/next-app build`.
- [x] Run relevant E2E via `pnpm exec playwright test --config=tests/e2e/playwright.config.ts tutorials.spec.ts embedded-workspace.spec.ts` and affected homepage scenarios.
- [x] Update `docs/implementation/tutorials-and-embed.md`, `docs/user-guide/tutorials.md`, and the test catalog with actual evidence and remaining limits.
- [x] Review scope compliance and code quality; fix findings and verify before completion.
