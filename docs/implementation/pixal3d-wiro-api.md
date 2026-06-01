# Pixal3D Provider API Integration

Pixal3D generation uses fal.ai as the primary provider and keeps Wiro as an explicit backup provider.

## Primary Provider: fal.ai

- Create task: `POST https://queue.fal.run/fal-ai/pixal3d`
- Poll status: `GET https://queue.fal.run/fal-ai/pixal3d/requests/{request_id}/status`
- Fetch result: `GET https://queue.fal.run/fal-ai/pixal3d/requests/{request_id}`
- Required credential: `FAL_API_KEY` or fal's official `FAL_KEY` alias
- Optional override: `FAL_BASE_URL`

The fal request uses JSON and maps `imageUrl` to `image_url`. The completed result is read from `model_glb.url`.

## Backup Provider: Wiro

- Create task: `POST https://api.wiro.ai/v1/Run/tencentarc/pixal3d`
- Poll task: `POST https://api.wiro.ai/v1/Task/Detail`
- Required credential: `WIRO_API_KEY`
- Optional credential for signature-based Wiro projects: `WIRO_API_SECRET`
- Optional override: `WIRO_BASE_URL`

The shared implementation lives in `libs/ai/3d.ts`. App API routes remain thin adapters that validate auth/input, consume credits, call the shared provider, and create an in-memory task record.

Credits are charged by resolution before provider execution: `1024` costs `1000` credits and `1536` costs `1500` credits. Credits are refunded automatically only when provider task creation fails before the provider accepts execution, for example a missing API key or submit-time validation error. Once fal/Wiro has accepted a task and polling later reports a provider/runtime failure, the site marks the task as failed but does not automatically refund credits because the upstream provider may already have billed the request.

## Request Mapping

The project-level request fields map to provider Pixal3D parameters as follows:

| Project field | fal field | Wiro field | Default |
|---|---|---|
| `imageUrl` | `image_url` | `inputImage` | Required |
| `resolution: 1024` | `resolution=1024` | `pipeline_type=1024_cascade` | Yes |
| `resolution: 1536` | `resolution=1536` | `pipeline_type=1536_cascade` | No |
| `textureSize` | `texture_size` | `texture_size` | `1024` |
| `decimationTarget` | `decimation_target` | `decimation_target` | `200000` |
| `seed` | `seed` | `seed` | Omitted |
| `meshScale` | `mesh_scale` | Not mapped | `1` |
| `maxNumTokens` | `max_num_tokens` | Not mapped | `49152` |
| `sparseStructureSteps` | `ss_sampling_steps` | Not mapped | `12` |
| `sparseStructureGuidanceStrength` | `ss_guidance_strength` | Not mapped | `7.5` |
| `sparseStructureGuidanceRescale` | `ss_guidance_rescale` | Not mapped | `0.7` |
| `sparseStructureRescaleT` | `ss_rescale_t` | Not mapped | `5` |
| `shapeSteps` | `shape_slat_sampling_steps` | Not mapped | `12` |
| `shapeGuidanceStrength` | `shape_slat_guidance_strength` | Not mapped | `7.5` |
| `shapeGuidanceRescale` | `shape_slat_guidance_rescale` | Not mapped | `0.5` |
| `shapeRescaleT` | `shape_slat_rescale_t` | Not mapped | `3` |
| `textureSteps` | `tex_slat_sampling_steps` | Not mapped | `12` |
| `textureGuidanceStrength` | `tex_slat_guidance_strength` | Not mapped | `1` |
| `textureRescaleT` | `tex_slat_rescale_t` | Not mapped | `3` |
| `remesh` | `remesh` | Not mapped | `true` |

Advanced Pixal3D controls are also supported by the shared options type: sparse structure, shape, and texture step counts, guidance strengths, guidance rescale values, timestep rescale values, and `max_num_tokens`. fal's documented default for `texture_size` is `2048`, but the website intentionally defaults to `1024` to match the product UI requirement.

## Result Mapping

fal is treated as successful only when status is `COMPLETED` and the result includes `model_glb.url`.

Wiro `Task/Detail` is treated as successful only when:

- `status` is `task_postprocess_end`
- `pexit` is `"0"`
- At least one output is a GLB (`.glb`, `model/gltf-binary`, or `model/glb`)

The GLB output becomes `result.modelUrl`. The first image output, when present, becomes `result.thumbnailUrl`.
