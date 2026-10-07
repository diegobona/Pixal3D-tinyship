# Image-to-3D intent pages

**Current sample visibility (2026-10-07):** `modelSampleLibraryEnabled=false` in `config/image-to-3d.ts` temporarily hides A's header sample CTA, the sample link in its export help, and the entire sample library. EN/ZH visible copy, metadata, FAQs and related-page labels no longer direct users to that hidden section. A retains the workspace, share-download hint, format table and FAQ. The sample component, manifest, model files, source images, posters and provenance remain available for later restoration; their direct-file integrity checks remain in the existing E2E scenario. Earlier dated verification sections below describe the previously visible sample library, not the current UI.

Visibility verification: the existing intent-page E2E suite passes 24/24 (1.1m), Next typecheck/build pass, and the build generates 43 static pages with only the existing middleware deprecation warning. CUA confirmed the English page with the live Space and its updated FAQ; EN/ZH desktop and 390px checks use the existing provider fixture. No deployment was performed for this change.

The download page answers how to obtain a file; the comparison page answers which model and runner to try. Both are public Next server-rendered pages with EN/ZH translations. There are no synonym routes for “photo,” “picture,” “free,” “AI,” or “online.”

## Placement

- `libs/ai3d/intent-pages.ts`: shared content and public-sample contracts.
- `config/image-to-3d.ts`: routes, evidence URLs, review date, separate workspace slots and the sample-library visibility flag.
- `config/model-sample-manifest.json`: operator-generated manifest of completed, verified files.
- `libs/i18n/locales/image-to-3d`: humanizer-reviewed page and sample prose.
- Next components/routes: compact public page headers, workspace-first layout, visible format guidance and actionable model cards. The retained sample-library component supports paired input/result previews and direct downloads when enabled. Long model details and sources use disclosures.

The sample visibility change introduces no runtime API, paid task, credit consumption or authentication rule. Retained public model files live under `apps/next-app/public/model-samples`. The existing middleware excludes file paths and protects only existing private pages. Their URLs remain accessible directly while the library's download anchors are not rendered.

## Embedded workspaces

Both pages initially show the existing public [victor/pixal3d-studio](https://huggingface.co/spaces/victor/pixal3d-studio). B also embeds the official [TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2) and [Hunyuan3D 2.1](https://huggingface.co/spaces/tencent/Hunyuan3D-2.1) Spaces at `https://microsoft-trellis-2.hf.space` and `https://tencent-hunyuan3d-2-1.hf.space`. The public Space metadata supplied both hosts; their document/config responses were HTTP 200 without frame-blocking headers on 2026-10-07.

`comparisonWorkspaces` holds the embed sources. `ModelWorkspaceProvider` in `libs/react-shared` shares selection between the top controls and lower model cards. Pixal3D alone renders initially; the other frames mount on first selection. Visited panels stay mounted with stable keys and are hidden when inactive, preserving their sessions during model switching. Buttons expose `aria-pressed` and scroll to the workspace without navigating. Model names still link to comparison cards; Rodin opens its official workspace separately. Switching requires JavaScript; the initial Pixal3D frame remains available without it.

The shared `LazyIframe` preserves the session after mounting and supplies recovery controls. Both intent pages place the workspace directly after the compact header, before format guidance or model comparisons. Their `loadImmediately` adapter option renders the iframe in the initial HTML; native `loading=lazy` remains. This path skips the opaque React loading overlay so a delayed parent hydration cannot cover a usable frame. Its automatic timeout starts only after a client-observed retry, avoiding a false warning when an initial frame load happened before hydration. Other callers retain deferred observer mounting and their existing loader. There is no local sign-in overlay. Provider login, queue, quotas and export rules remain outside this site's control.

The user has no edit rights to the Space. Its current frontend has no generation/download event bridge. No internal generation/download totals are claimed, and page views, frame loads, focus, and source-link clicks are not substitutes. No analytics backend is introduced by this work.

## Actual sample generation

The user explicitly selected the current Space for a first batch of four new samples. Original mushroom, teapot, chair and crate vector references were authored in `scripts/model-samples/create-references.mjs` and rendered with the project's installed Sharp. These images are generation inputs, not model previews. Their reproducible paths and SHA-256 hashes are recorded in `reference-provenance.json`.

Live health reported `fast_backend=local`, `fast_final=true`, `mock=false`. Inspected public source/API revision: `ef1cb838893269417b3eaa81dd8fc635f65a5180`. The normal anonymous `/generate_fast` API was used with resolution 1024, quality `draft`, fixed seeds, automatic FOV, and `share_to_community=false`. No paid fallback was used.

Current result (2026-10-06): **1 of 4 models completed**. The mushroom GLB is 3,114,164 bytes with 58,407 vertices and 99,288 triangles. The first delivery guard initially stopped at the provider's HF bucket URL; its matching prompt/seed record was recovered from the public bucket, then the real GLB was saved and decoded. The original timing response was not retained; no GPU memory or end-to-end performance measurement is claimed for this sample.

The teapot request was rejected by ZeroGPU quota: `120s requested vs. 108s left`, with a `23:49:40` recovery delay. The exact saved rejection is `2026-10-06T15:09:50.337Z`; its earliest retry is `2026-10-07T14:59:30.337Z` (22:59:30 Shanghai), subject to provider availability. During the 2026-10-07 morning implementation, that delay had not elapsed, so no further job was submitted. Chair/crate remain unsubmitted. Failed or unstarted samples are absent from the manifest and have no download buttons. Remaining production needs available provider quota or explicitly supplied authentication. Do not rotate IPs/accounts to bypass the limit.

The existing keyboard preview derives from a third-party project example with no local asset redistribution license. It is excluded from this batch. MIT notices on inference software are separate from asset permissions. New samples currently have a free personal/educational/non-commercial evaluation usage note. Commercial reuse is not granted; a wider release would need the operator's decision.

## Export and resume tools

`export-geometry.mjs` exports real geometry-only OBJ and binary STL from embedded static triangle GLBs. It supports uncompressed/Draco meshes, applies active scene transforms, preserves source units/topology, and rejects unsupported geometry. No texture, rig, animation or mesh repair is added. A true STL does not imply a printable mesh. Output reports include counts, bounds, degeneracies, sizes and hashes.

`render-previews.mjs` renders each completed, verified local GLB with the installed model-viewer in Chromium. It serves only loopback assets and refuses external requests. It creates a 768 × 768 `preview.png` and a `preview-provenance.json` containing source/output hashes, byte counts and camera/renderer settings. The poster preserves the actual generated geometry, including imperfections; it does not use the input illustration as an overlay. Repeated mushroom rendering produced the same SHA-256 (`3783cb486442ad3161dc773297b00a3912b254857a91fa6c1a33be6c1421aedb`). These retained static images need no viewer script or model download when a sample card is enabled; the current visibility setting does not render them.

`refresh-manifest.mjs` checks completed generation records, original PNG hashes, input GLB hashes and matching poster provenance, exports geometry, then writes the manifest and per-sample `geometry-exports.json`. Missing, stale or modified poster evidence stops publication; render previews before refreshing the manifest. The generation script also verifies the original PNG before skipping a completed output or resuming its download. Restore a changed reference to the recorded hash before either operation. Only completed files enter the retained manifest; the visibility flag independently controls whether the library is rendered. Do not manually add ungenerated references, remote gallery examples, renamed binaries or unverified download paths.

For a later operator-authorized retry after resolving the provider error:

```powershell
# If needed, configure HF_TOKEN in your local environment; never put it in chat or source files.
# On this Windows machine, Node needs the already configured system proxy:
$taskBatchProxy = [System.Net.WebRequest]::DefaultWebProxy.GetProxy([uri]'https://huggingface.co')
$env:HTTPS_PROXY = $taskBatchProxy.AbsoluteUri
corepack pnpm exec node --use-env-proxy scripts/model-samples/generate-space-samples.mjs --retry-failed
corepack pnpm exec node scripts/model-samples/render-previews.mjs
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

### Model actions verified 2026-10-07

`comparisonActions` is separate from `comparisonSources`. Pixal3D has an in-page use anchor and a localized installation tutorial. [Rodin's official pricing](https://hyper3d.ai/pricing?lang=en) points its start action to [the Rodin workspace](https://hyper3d.ai/workspace/rodin); free-plan exports cover legacy models, with no promise of free Gen-2.5 export. [Microsoft's project site](https://microsoft.github.io/TRELLIS.2/) links [the official TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2); [its app code](https://huggingface.co/spaces/microsoft/TRELLIS.2/blob/main/app.py) uses GPU quota for generation and GLB extraction. [Tencent's model card](https://huggingface.co/tencent/Hunyuan3D-2.1) links [the official 2.1 Space](https://huggingface.co/spaces/tencent/Hunyuan3D-2.1). Local setup anchors were checked against official rendered GitHub headings: TRELLIS.2 `#installation-steps`, Hunyuan3D 2.1 `#install-requirements`.

The top model navigation gives direct use actions and access badges. The cards show suitability, access/export conditions, formats, scoped memory/timing, quality checks and limitations without expanding details. Full version-specific facts and primary sources remain in native disclosures. This structure serves the free/AI/online selection intent while keeping the provisional generation workspace at the top.

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

## Workspace-first redesign (2026-10-07)

The workspace is the first content section on both pages, within a wider frame. The header contains one sentence and a compact jump link. Downloads use a horizontal sample card on desktop and a smaller input illustration on mobile. The format guide uses four expandable cards. Model cards show their summary and suitable use first; version-specific limits, formats, runtime, memory, timing and official sources remain in native disclosure controls. Repeated workflow/selection sections are removed from the rendered pages, related links become a compact list, and duplicate FAQ questions are removed. Unique image checks and license conditions remain in FAQs/details. EN/ZH prose follows the installed humanizer skill.

Browser inspection covered desktop sections and 390px mobile first view, disclosures and wrapping. Final Next.js typecheck and build pass (43 prerendered pages; existing middleware deprecation only). The intent-page suite now has 11 scenarios, including blocked parent JavaScript with a visible core iframe. Combined with the 3 existing shared-workspace scenarios, all 14 E2E tests pass in 24.0s. The shared-workspace observer fixture now retains simulated visibility before hydration registers the observer, matching native observation and retaining the original pre-reveal assertions. No product change was needed for that fixture race. Remote workspaces remain fixtures during E2E; real local asset checks remain enabled.

Native browser previews are `.tmp/intent-pages/redesign-download.jpg` and `redesign-comparison.jpg`. E2E also captures desktop/mobile EN/ZH top and supporting sections; provider fixture screenshots are layout evidence, not proof of live GPU generation. The unfinished sample batch remains 1/4.

The subsequent header edit removes the visible left Pixal3D workspace title from both intent pages, in EN/ZH. The section uses its translated accessible name and the iframe retains its title; the right caption remains. Browser inspection, the four localized content E2E scenarios (4/4, 8.0s), Next typecheck and build pass. The updated strip is `.tmp/intent-pages/workspace-title-removed.jpg`.

## Sitemap fetch investigation (2026-10-07)

Search Console reports that `https://pixal3d.net/sitemap.xml` cannot be read, despite successful live inspection and verified Googlebot requests returning HTTP 200/XML at 21:51 and 22:23 Asia/Shanghai. Downloaded responses parse successfully and contain 14 URLs; the owner reports no manual actions. The cause is not confirmed.

`/sitemap.txt` provides a diagnostic alternative using the same sitemap function and the same `<loc>` URL set, one absolute URL per line with UTF-8 `text/plain`. It retains the existing database fallback and revalidation policy. XML, robots and Cloudflare configuration are unchanged. [Google supports text sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#text-sitemap).

After deployment, verify the public TXT response is 200 with the expected content and matches XML, then submit `https://pixal3d.net/sitemap.txt` in Search Console once, retaining the existing XML record. TXT success offers an alternate URL-discovery path and narrows the investigation; it does not establish an XML parser defect, since the submission URL also changes. If it also fails, correlate its actual Googlebot fetch with the new report before changing site configuration. Local tests do not verify Google processing or indexing.

## Download and model-selection focus (2026-10-07)

Homepage entry hierarchy prioritizes Pixal3D use and the existing sign-in/email-registration flow: the hero leads directly into `pixal3d-inline-trial` with its authentication overlay. A single compact outlined secondary link sits at the lower right below the workspace, before the existing feedback section: “More AI 3D Generators” / “更多 AI 3D 生成工具”. Bold mint text, a thin cyan border and a pale cyan background make the link easier to see. It uses `common.homeMultiModel.action` and the localized `/image-to-3d` destination. The link remains subordinate to the Pixal3D workspace, without a banner, explanatory heading, model chips or prominent gradient button. The FAQ-adjacent section retains a subdued download-guide link with general 3D generation, export and format guidance. Public intent-page permissions, iframe loading, and generation behavior are unchanged.

The global header uses compact navigation with locale-aware current-page styling for Home and the Blog section; Features retains its localized homepage anchor. Navigation links and the mobile menu toggle keep 44px minimum targets and visible keyboard focus. The source badge appears at large screen widths to leave room in the tablet header, and the mobile toggle exposes its expanded state. Below the balanced homepage title, the existing translated free-use message appears as a small non-interactive mint label with a decorative check icon. The Pixal3D workspace, sign-in flow and secondary model-tool link keep their positions.

The revised hierarchy passed Next typecheck/build, the 10 existing homepage unit tests, and 10 targeted homepage/intent-link/shared-workspace E2E tests (19.5s). Four revised EN/ZH desktop/mobile cases verify placement below the workspace, localized sign-in navigation, and keyboard navigation through the secondary link. CUA verified the Chinese desktop/mobile presentation and actual model-page navigation. Screenshots are `.tmp/intent-pages/home-more-models-{desktop,mobile}-{en,zh-CN}.png`, with matching `home-more-models-initial-*` captures of the initial viewport. Provider frames use fixtures in E2E. Only the existing middleware deprecation warning remains; no deployment was performed.

The subsequent copy refinement gives the homepage download block the title “3D model download & usage guide” / “3D 模型下载与使用指南”, description “Learn how to generate and export a 3D model, and choose a file format for editing, games or 3D printing.” / “了解 3D 模型的生成与导出步骤，选择适合建模、游戏或 3D 打印的文件格式。”, and CTA “Download 3D models for free” / “免费下载 3D 模型”. The block no longer emphasizes Pixal3D or compares its model with the homepage. The Pixal3D comparison card omits only its current TRELLIS.2-based version subtitle; other cards retain their version subtitles and existing detailed model facts remain. The standalone provider queue/quota/login note below the download workspace is removed in EN/ZH, while the existing FAQs remain. These copy refinements are separate from the hierarchy verification above.

Implemented and verified A before B. A's header emphasizes free sample downloads, the workspace supplies concise upload/generate/export guidance, and each published sample pairs its input with a verified render of the actual downloadable GLB. File actions show material versus geometry-only content and sizes. Format use/limitations are visible in a responsive table. A's focused E2E passed 6/6 before B implementation.

B's header addresses free and online AI model choices. The workspace region now contains four named choices with access badges and real use actions; Pixal3D remains the provisional embedded runner. Each model card exposes decision facts and actions while retaining full original source-backed detail in disclosures. Rodin's plan boundary and the Hunyuan license limits are visible. No generic free-generation promise, fake provider switching or new billing/authentication flow was added.

Final Next typecheck and production build passed (43 prerendered pages; existing middleware deprecation warning only). Combined intent/workspace E2E passed **16/16 in 52.6s** with Chromium headless 149.0.7827.55, including EN/ZH desktop/mobile, actual all-format downloads and poster provenance, blocked parent JavaScript, all model anchors/actions and original iframe preservation. Provider frames and external-action targets use fixtures; these E2E tests do not measure live provider generation. Offline generation/export/preview-integrity tests passed **22/22**. Independent spec and code reviews found no remaining blockers after correcting the TRELLIS setup anchor.

Current screenshots: `.tmp/intent-pages/download-supporting-en.png`, `comparison-supporting-en.png`, both `*-top-zh-CN.png`, and `*-mobile-supporting-zh-CN.png`. The browser viewport override was reset after manual inspection. The planned production sample batch remains **1/4**, with three models pending provider quota; page validation does not claim the sample batch is complete. No deployment was performed.

## Inline TRELLIS.2 and Hunyuan3D workspaces (2026-10-07)

The model-selection page now switches between three embedded demos. Both top and card actions share selection, and each visited iframe remains mounted when another is selected. The initial page loads only Pixal3D. Rodin retains its separate official workspace link. The download page and its sample files are unaffected by this follow-up.

The connected browser displayed both real official Spaces, including upload, preview and export controls. Desktop and mobile model selection, card-to-workspace scrolling and active-state styling were checked. No GPU generation was submitted. The live screenshot is `.tmp/intent-pages/trellis-inline-live.jpg`; the temporary browser viewport was reset.

The initial verification found that the local Next dev server served scripts successfully on `127.0.0.1`, but rejected that origin's HMR upgrade with a bare `Unauthorized` response. Next 16's development React debug stream waits on HMR, leaving parent hydration blocked and the model buttons disabled. `allowedDevOrigins: ['127.0.0.1']` in `apps/next-app/next.config.ts` fixes the origin check. Raw upgrades now return HTTP 101 for both local origins, and the connected browser can click both model controls on the original `127.0.0.1` address. Enabled model controls show a pointer cursor. The allowlist change applies only to development and retains Next's built-in localhost allowance.

Final verification: Next typecheck and production build passed, with 43 prerendered pages and only the existing middleware convention deprecation. The combined intent-page/shared-workspace E2E suite passed **20/20 (58.6s)** using Chromium headless 149.0.7827.55. It checks exact embed sources, first-selection loading, shared pressed states, preserved iframe nodes and typed inputs, one visible panel, active-model-only retries, EN/ZH/mobile behavior and existing download/SEO regressions. Provider documents are fixtures in automated tests; live UI inspection does not claim GPU generation succeeded. `git diff --check` passed.

The existing global locale form can lose query parameters if submitted before its client handler hydrates. This follow-up leaves the global header/API unchanged; the locale regression now waits for client readiness and retains its full query, cookie and canonical assertions. The separate blocked-script tests still verify the initial workspace and download fallback. This known locale boundary is recorded in the test catalog.

### Local preview button fix verification

After the user reported the disabled controls, raw WebSocket upgrades isolated the cause to Next's development origin allowlist: `Origin: http://127.0.0.1:7001` returned bare `Unauthorized` through either loopback host, while the localhost origin returned HTTP 101. The narrow `allowedDevOrigins` configuration restored HTTP 101 for the numeric loopback origin. See [Next's allowedDevOrigins documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins).

Fresh browser checks on the original `127.0.0.1` address enabled both controls and displayed the real TRELLIS.2 and Hunyuan3D interfaces. Enabled actions now use a pointer cursor. The new E2E cases use fresh contexts for both `localhost` and `127.0.0.1`, in EN and ZH, with real parent scripts. The full intent/workspace suite passed **24/24 (1.1m)**; the four origin cases were then rerun with explicit pointer assertions, **4/4 (4.9s)**. Final Next typecheck, build and diff checks passed; the build retains the existing middleware deprecation warning and prerenders 43 pages. Proof: `.tmp/intent-pages/hunyuan-buttons-fixed-127.jpg`.
