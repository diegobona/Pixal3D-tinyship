# Image-to-3D intent pages

The download page answers how to obtain a file; the comparison page answers which model and runner to try. Both are public Next server-rendered pages with EN/ZH translations. There are no synonym routes for “photo,” “picture,” “free,” “AI,” or “online.”

## Placement

- `libs/ai3d/intent-pages.ts`: shared content and public-sample contracts.
- `config/image-to-3d.ts`: routes, evidence URLs, review date, and separate workspace slots.
- `config/model-sample-manifest.json`: operator-generated manifest of completed, verified files.
- `libs/i18n/locales/image-to-3d`: humanizer-reviewed page and sample prose.
- Next components/routes: public content, format table, model cards, related links and lazy workspace wrapper.

No new runtime API, paid task, credit consumption or authentication rule is introduced. Public model files live under `apps/next-app/public/model-samples`. The existing middleware excludes file paths and protects only existing private pages. Downloads use same-origin anchors with the `download` attribute.

## Provisional embedded workspace

The user deferred final Space selection for the two pages. Both currently reuse the existing public [victor/pixal3d-studio](https://huggingface.co/spaces/victor/pixal3d-studio); independent `intentWorkspaces` entries allow replacement later. The comparison page's embed runs Pixal3D only. Its model cards do not switch the embed between providers.

The shared `LazyIframe` preserves the session after mounting and supplies recovery controls. On these pages it sits below the primary content, so browser inspection confirms that no remote iframe mounts in the initial viewport. There is no local sign-in overlay. Provider login, queue, quotas and export rules remain outside this site's control.

The user has no edit rights to the Space. Its current frontend has no generation/download event bridge. No internal generation/download totals are claimed, and page views, frame loads, focus, and source-link clicks are not substitutes. No analytics backend is introduced by this work.

## Actual sample generation

The user explicitly selected the current Space for a first batch of four new samples. Original mushroom, teapot, chair and crate vector references were authored in `scripts/model-samples/create-references.mjs` and rendered with the project's installed Sharp. These images are generation inputs, not model previews. Their reproducible paths and SHA-256 hashes are recorded in `reference-provenance.json`.

Live health reported `fast_backend=local`, `fast_final=true`, `mock=false`. Inspected public source/API revision: `ef1cb838893269417b3eaa81dd8fc635f65a5180`. The normal anonymous `/generate_fast` API was used with resolution 1024, quality `draft`, fixed seeds, automatic FOV, and `share_to_community=false`. No paid fallback was used.

Current result (2026-10-06): **1 of 4 models completed**. The mushroom GLB is 3,114,164 bytes with 58,407 vertices and 99,288 triangles. The first delivery guard initially stopped at the provider's HF bucket URL; its matching prompt/seed record was recovered from the public bucket, then the real GLB was saved and decoded. The original timing response was not retained; no GPU memory or end-to-end performance measurement is claimed for this sample.

The teapot request was rejected by ZeroGPU quota: `120s requested vs. 108s left`, with a `23:49:40` recovery delay. Chair/crate jobs were not submitted. Failed or unstarted samples are absent from the manifest and have no download buttons. Remaining production needs available provider quota or explicitly supplied authentication. Do not rotate IPs/accounts to bypass the limit.

The existing keyboard preview derives from a third-party project example with no local asset redistribution license. It is excluded from this batch. MIT notices on inference software are separate from asset permissions. New samples currently have a free personal/educational/non-commercial evaluation usage note. Commercial reuse is not granted; a wider release would need the operator's decision.

## Export and resume tools

`export-geometry.mjs` exports real geometry-only OBJ and binary STL from embedded static triangle GLBs. It supports uncompressed/Draco meshes, applies active scene transforms, preserves source units/topology, and rejects unsupported geometry. No texture, rig, animation or mesh repair is added. A true STL does not imply a printable mesh. Output reports include counts, bounds, degeneracies, sizes and hashes.

`refresh-manifest.mjs` checks completed generation records, original PNG hashes and input GLB hashes, exports geometry, then writes the manifest and per-sample `geometry-exports.json`. The generation script also verifies the original PNG before skipping a completed output or resuming its download. Restore a changed reference to the recorded hash before either operation. Only completed files enter the public library. Do not manually add ungenerated references, remote gallery examples, renamed binaries or unverified download paths.

For a later operator-authorized retry after resolving the provider error:

```powershell
# If needed, configure HF_TOKEN in your local environment; never put it in chat or source files.
# On this Windows machine, Node needs the already configured system proxy:
$taskBatchProxy = [System.Net.WebRequest]::DefaultWebProxy.GetProxy([uri]'https://huggingface.co')
$env:HTTPS_PROXY = $taskBatchProxy.AbsoluteUri
corepack pnpm exec node --use-env-proxy scripts/model-samples/generate-space-samples.mjs --retry-failed
corepack pnpm exec node scripts/model-samples/refresh-manifest.mjs
```

Completed model and reference hashes are checked before skipping. A terminal Gradio error or explicit unsuccessful completion is saved separately as `providerFailure`; `--retry-failed` permits an authorized fresh attempt only for that confirmed failure and retains its evidence in `priorAttempts`. The older teapot record is recognized only by its exact Gradio error prefix, structured ZeroGPU quota title and quota message.

Submission uncertainty is saved before POST. A transport error, missing event ID or unparseable response can occur after the provider accepts a job, so `--retry-failed` cannot resubmit those records. Recover the existing submission or output first. A saved `result.ok=true` resumes the file download without starting another GPU job. Optional `HF_TOKEN` is forwarded only to the selected Space, redacted from failure messages/evidence, and never saved in provenance. Page rendering never invokes these scripts.

## Comparison evidence

Each card links its primary sources. Facts describe a named version and distinguish local requirements from cloud access:

| Card | Primary evidence and boundary |
|---|---|
| Pixal3D | [Current repo](https://github.com/TencentARC/Pixal3D), [CLI](https://github.com/TencentARC/Pixal3D/blob/master/inference.py), [original paper](https://arxiv.org/html/2605.10922v1). Original paper geometry differs from the current TRELLIS.2-based release; CLI memory values are estimates without hardware scope. |
| Rodin Gen-2.5 | [API](https://docs.hyper3d.ai/en/api-specification/rodin-gen2-5), [plans](https://hyper3d.ai/pricing?lang=en), [published timing claim](https://hyper3d.ai/features/image-to-3d), [terms](https://hyper3d.ai/legal/terms). Hosted/credit-based access, not downloadable local weights; timing lacks hardware/tier/queue scope. |
| TRELLIS.2 | [Repository](https://github.com/microsoft/TRELLIS.2), [GLB example](https://github.com/microsoft/TRELLIS.2/blob/main/example.py), [original TRELLIS](https://github.com/microsoft/TRELLIS). H100 timings belong to the stated resolution/model; original version outputs/requirements are separate. |
| Hunyuan3D 2.1 | [Repository](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1), [GUI exports](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/gradio_app.py), [Community License](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE), [2.0](https://github.com/Tencent-Hunyuan/Hunyuan3D-2). Territory and service-size restrictions apply; memory figures have stage/version scope and unspecified hardware. |

Suggestions are reasons to try a model, not a quality ranking or claim of this site's testing. Sources, not comparable local benchmarks, support the published card figures.

## SEO review

Two distinct canonicals and descriptions, EN/ZH/x-default hreflang, English prefix redirects, sitemap entries, localized homepage links, mutual links and the four existing tutorial links follow the existing site conventions. Homepage prose is preserved. User-supplied keyword/GSC figures guide scope and are not published as independently verified statistics.

After a production launch, review four full weeks of GSC page/query data. For A, check completed file requests and relevant conversion outcomes separately from visits. For B, check broad-query impressions/clicks alongside the homepage. The merge criterion in the user's brief is a homepage loss with no corresponding gain on the new page. Any merge should retain useful content and use an appropriate redirect/canonical update. This local task does not publish the pages, claim production results, or create an unsolicited scheduled monitor.

## Verification (2026-10-06)

Next typecheck and production build pass after the final layout adjustment. The build prerenders 43 pages and reports only the existing middleware convention deprecation. The focused `image-to-3d-pages.spec.ts` suite passes 10/10 (15.3s), including real anonymous download/hash checks, independent GLB texture/geometry checks, equivalent OBJ/STL bounds and face counts, localized content/navigation/metadata, lazy embeds and 390px layouts. Browser verification preceded the E2E selectors; the connected in-app browser was used because `agent-browser` is unavailable.

Offline `generation-safety.test.mjs` and `export-geometry.test.mjs` pass 19/19 (293.7ms), covering confirmed provider failure retries, uncertain submissions with/without event IDs, result recovery without another GPU job, token redaction, original-image integrity and geometry exports. A real manifest refresh verifies one complete mushroom model and three files. Provider frames in E2E are fixtures; these tests do not execute GPU jobs, reserve trial sessions or spend site credits.

Full-page screenshots are `.tmp/intent-pages/download-page.png` and `comparison-page.png`; the download-section preview is `download-preview.png`. The requested production batch remains **1/4**, pending available provider quota or user-supplied authentication. Page validation does not mark the unfinished batch complete.

## Workspace labels and product research copy (2026-10-07)

At the user's request, remove the EN/ZH hosting badge anchors from the homepage and both intent-page workspace headers. Delete their unused translation keys. The workspace title remains; lazy loading and recovery controls use the existing shared component.

The homepage feedback question now asks what users need from a 3D modeling tool. Its description asks about the difficult part of their current workflow and what software or an online tool should do; the placeholder gives mesh repair and batch processing as examples. These EN/ZH strings are humanizer-reviewed. The form still accepts one free-form multilingual response up to 3,000 characters through the existing submission flow.

Verification: Next typecheck/build pass, the existing homepage layout tests pass 10/10, and the affected public-home/workspace/intent E2E scenarios pass 16/16 (19.4s). Desktop EN/ZH and 390px Chinese copy were inspected in the connected browser. The workspace spec now isolates unrelated remote gallery requests after a trace showed a locale-navigation hydration stall; application authentication was not changed. Feedback capture and submission use fixtures. Proof screenshots are `.tmp/feedback-copy/feedback-en.png` and `home-workspace-en.png`.
