# Original model sample references

`create-references.mjs` defines four original vector illustrations (mushroom, teapot, chair, crate) and renders them with the project's installed Sharp library. Run it from the repository with:

```sh
node scripts/model-samples/create-references.mjs
```

Each image shows a single unbranded object against a white background. No downloaded image, existing sample image, community model, stock art, or third-party vector element is used. The editable SVG and 768 × 768 PNG are stored under `apps/next-app/public/model-samples/<id>/`.

The reference provenance JSON records source paths and SHA-256 hashes. These files are image-to-3D inputs. They do not establish that a model was generated, that a model download exists, or that a provider grants commercial rights to generated outputs. Record the actual Space, source revision, seed, settings, generation response, output hash, and asset-specific release separately once each generation succeeds.

`generate-space-samples.mjs` is an operator-only script for the four approved samples. It uses the published free Space API sequentially, disables community sharing, records provenance, and skips completed outputs after verifying their hashes. It also verifies the current input PNG against the recorded SHA-256 before skipping a completed sample or resuming an existing generation. Optional `HF_TOKEN` stays in the local environment; it is sent only to the selected Space and is never logged. There is no paid fallback or page-triggered generation.

`export-geometry.mjs` converts an actual embedded static triangle GLB to geometry-only OBJ and binary STL, preserves transforms/units/topology, and verifies its saved bytes and counts. `refresh-manifest.mjs` includes only completed outputs whose GLB and input PNG match the recorded hashes. After a successful additional run, refresh the manifest, rerun the relevant Next E2E and rebuild Next.

## Actual output previews

`render-previews.mjs` renders each completed, hash-verified local GLB with the installed model-viewer and Chromium. It serves the model, viewer bundle and Draco decoder on an ephemeral loopback port, refuses external browser requests, and produces a 768 × 768 `preview.png`. It does not call a generation provider. The screenshot shows the actual model, materials and geometry artifacts with a fixed camera, neutral environment, background and contact shadow; no reference image is overlaid and no model repair is performed.

```sh
node scripts/model-samples/render-previews.mjs
node scripts/model-samples/refresh-manifest.mjs
```

The normal Playwright Chromium installation is required. The script also respects the existing `E2E_CHROMIUM_EXECUTABLE_PATH` override when a compatible local browser is already installed. This machine currently uses:

```powershell
$env:E2E_CHROMIUM_EXECUTABLE_PATH = 'C:/Users/zhouw/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
node scripts/model-samples/render-previews.mjs
node scripts/model-samples/refresh-manifest.mjs
```

Each `preview-provenance.json` records the GLB and PNG byte counts and SHA-256 hashes, render settings, resolved framing, model-viewer version and Chromium version. The manifest refresh preserves `previewImage` only after verifying that evidence against both files. Missing, stale or changed poster evidence stops publication before that sample's exports or the public manifest are rewritten. Run the renderer after each new completed generation so every published card has both its real input and output. Different browser/rendering versions may change PNG bytes; rerender and refresh together when changing them.

See `docs/implementation/image-to-3d-pages.md` for the Windows proxy command, source revision, current quota failure and resume procedure. The current library contains one completed mushroom model (1/4); the other three references have no downloadable 3D output. Do not add them to the manifest until generation succeeds.

## Generation recovery

`--retry-failed` permits a new attempt only after a confirmed provider-declared failure and after its cause is resolved. A retry preserves the failure evidence and prior attempts in the generation record. A `failed` status alone does not authorize resubmission. The existing legacy record containing the exact Gradio ZeroGPU quota error is conservatively recognized as a confirmed provider failure; arbitrary error text mentioning quota is insufficient.

A failed submission POST, an unparseable submission or result response, or an interrupted result stream leaves the GPU job's outcome uncertain. These records require recovery even when no `eventId` was saved, because the provider may have accepted the submission before the response failed. `--retry-failed` never resubmits an uncertain job. Keep the generation record and recover its existing event or result before continuing.

When the record already has `result.ok: true`, rerunning the script resumes the model download without submitting another GPU job. The input PNG must still match the generation record's SHA-256. A changed reference must be investigated before skip, resume, or manifest publication so it cannot be paired with an older model.

## Geometry exports

After a real generation has saved `model.glb`, run:

```sh
node scripts/model-samples/export-geometry.mjs apps/next-app/public/model-samples/mushroom/model.glb
```

The exporter writes `model.obj` and a binary `model.stl` beside the GLB. Both are geometry only. OBJ intentionally has no UV coordinates, MTL, material assignments, or texture files. Keep GLB for the original textured model. The script supports static triangle primitives in one embedded GLB buffer, including Draco-compressed geometry through the installed Three.js decoder. It applies the selected scene's node transforms, preserves source units, and reverses winding for mirrored node transforms. It rejects unsupported geometry features instead of creating a partial export.

The JSON report contains actual saved byte sizes, SHA-256 hashes, decoded triangle/vertex counts, bounds, and degenerate-triangle counts. No faces are removed, welded, invented, or repaired. STL uses the float32 coordinates required by that format; the report also counts triangles collapsed by that encoding. Neither successful conversion nor a positive triangle count establishes watertightness, correct physical scale, wall thickness, or printability.

Use `--check-only` to decode an input and report its geometry without writing exports. Verification fixtures run under the OS temporary directory and never become public samples:

```sh
node --test scripts/model-samples/generation-safety.test.mjs scripts/model-samples/export-geometry.test.mjs
```
