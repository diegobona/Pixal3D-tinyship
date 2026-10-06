# Public Pixal3D tutorials

The active Next.js app exposes four dedicated tutorial paths: `/how-to-install-locally`, `/gguf`, `/low-vram`, and `/comfyui`. English uses clean paths; Chinese uses `/zh-CN` plus the same slug. Existing middleware handles `/en` redirects and locale negotiation. Tutorials are public, do not call generation APIs, and do not consume credits.

## Content and routing

`config/tutorials.ts` defines the allowed slugs and editorial review date. `libs/tutorials/types.ts` defines the content contract. The English and Chinese modules under `libs/i18n/locales/tutorials` supply all displayed tutorial copy and source labels. Four explicit App Router pages share `components/tutorial-page.tsx`; avoid a root catch-all that could absorb unrelated public or protected routes.

Every tutorial uses the same order: requirements, steps, performance evidence, troubleshooting, model/file sources, and source screenshots. Commands are examples for the documented environment. Performance rows identify their evidence scope: configuration defaults are not measured VRAM, community reports are not site benchmarks, and unverified hardware remains unverified. Source images are upstream illustrations with captions; they are not fabricated screenshots of local model execution.

The source inventory and verification limits live in [tutorial-sources.md](./tutorial-sources.md). When changing content, verify the upstream source again, update both languages, and revise the review date. Community workflow compatibility and artifact availability may change independently of the official model.

## SEO and internal links

`lib/tutorial-metadata.ts` provides distinct translated titles/descriptions and uses the existing localized canonical/hreflang helper. Canonicals exclude search parameters. Open Graph uses article metadata. Sitemap entries declare EN, ZH, and x-default alternates with a stable editorial date. `app/robots.ts` references the sitemap, allows the public site, and excludes APIs and private/transaction routes. Robots rules are crawler guidance; existing middleware/server auth remain the security boundary.

The homepage adds a tutorial link section without rewriting existing copy. Each tutorial links to the other three in the current language and back to the localized homepage. Tutorial content renders on the server and requires no remote model request to read it.

## Embedded workspace

See [embedded-workspace.md](./embedded-workspace.md) for shared iframe loading behavior, retry semantics, and the generation/download event feasibility audit. The user approved a lightweight frame around the existing workspace, without changes inside Hugging Face.

## Verification

Acceptance scenarios and actual verification results are tracked in `tests/e2e/TEST-CATALOG.md`, section 22. Relevant tests exercise public routes, metadata, locale behavior, internal links, mobile layout, and deterministic iframe lifecycle fixtures. They do not execute GPU generation or reserve trial sessions.
