# Image-to-3D intent pages

Two public, bilingual Next.js pages with different jobs:

- `/image-to-3d-model-free-download`: obtain an actual usable file without a site registration wall. Explain the free boundary, file formats, and asset-specific usage rights.
- `/image-to-3d`: choose a model and a way to run it. Compare Pixal3D, Hyper3D Rodin, TRELLIS, and Hunyuan3D with scoped primary-source evidence.

Keep all existing homepage copy. Add localized links to both pages. Both pages use the shared lightweight branded lazy iframe, with independent configuration so a later Space choice does not require changing page content. Space selection is deferred in the user's brief; a provisional choice must be stated in implementation documentation.

## Acceptance and delivery steps

- [x] Record public access, differentiation, metadata, navigation, download validity/rights, and mobile scenarios in the E2E catalog before implementation.
- [x] Audit local sample assets and establish provenance before offering a download or claiming commercial permission. One completed mushroom model has verified GLB/OBJ/STL files; no third-party gallery models are offered.
- [x] Verify comparison facts and model versions against official sources. Distinguish vendor estimates from measured results, and cloud products from local weights.
- [x] Put page/model/asset configuration in `config`, shared contracts in `libs`, and EN/ZH prose in i18n. Apply humanizer in embedded mode.
- [x] Implement two Next server-rendered pages and a shared reusable workspace wrapper. Downloads stay public and do not consume site credits.
- [x] Add canonical/hreflang/sitemap entries and localized homepage/related links without modifying existing homepage prose.
- [x] Inspect the actual desktop/mobile UI in the browser before writing E2E selectors. Use the connected in-app browser because `agent-browser` is unavailable.
- [x] Write and run the relevant Next E2E tests; run Next typecheck and production build. Ten focused E2E scenarios passed in 16.9s.
- [x] Complete the final operator-script review repairs and record their offline regression results. Uncertain submissions cannot create another GPU job; original PNG hashes gate skip/resume/publication. Nineteen offline regression tests pass.
- [ ] Complete all four approved generated samples. Anonymous ZeroGPU quota rejected the teapot; chair and crate were not submitted. Available quota or operator-supplied authentication is required before continuing.

## Asset and measurement boundaries

An existing preview is not automatically licensed for redistribution. A model software license is not an asset license. No placeholder geometry, broken downloads, format aliases, or third-party examples may be described as a newly generated self-hosted sample batch. Only actual approved files are included in the public library. STL strips color/texture and needs manifold/unit checks before printing; OBJ material dependencies must travel with the file. FBX is format guidance unless a real export is present.

Reading a third-party Space is free of site charges; its queues, runtime, sign-in, quotas, downloads and output rights depend on that provider. Parent-page load/focus events cannot measure internal generation/download actions. No GPU measurements or generation-completion counters are claimed without evidence.

The user supplied keyword volumes, difficulty and GSC rankings guide page scope, not public factual copy. The four-week merge rule belongs in an SEO review runbook; no publishing or recurring automation is requested by this local implementation.

## Verification result (2026-10-06)

The two-page implementation passes Next typecheck, production build, and 10 focused E2E scenarios (final run: 15.3s). The actual anonymous browser download matches the mushroom GLB's recorded SHA-256; independent inspection verifies texture data and 99,288 triangles. Its geometry-only OBJ/STL have matching face counts and bounds. Nineteen offline tests cover geometry export and generation/publication integrity. The actual manifest refresh verifies one model and three files. Desktop and 390px layouts were inspected in the connected browser before E2E tests were written.

The requested sample batch remains **1/4**, not complete. Both embeds provisionally use the current Pixal3D Space; final per-page Space selection remains deferred. Asset usage currently allows personal, educational and non-commercial evaluation use; commercial permission is not granted.
