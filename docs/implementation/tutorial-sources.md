# Pixal3D tutorial source inventory

Reviewed: 2026-10-06. Applies to the English and Chinese public tutorials at
`/how-to-install-locally`, `/gguf`, `/low-vram`, and `/comfyui`.

The underlying model is TencentARC/Pixal3D. This repository configures
`fal-ai/pixal3d` and `tencentarc/pixal3d` in `config/ai3d.ts`. These tutorials
describe local/community software, separately from the website's hosted service.
No local GPU generation, model installation, or performance measurement was
performed while writing the articles.

## Sources and evidence scope

| Source | What it supports | Limits |
| --- | --- | --- |
| [Official Pixal3D repository](https://github.com/TencentARC/Pixal3D) | TRELLIS.2 base installation, local requirements, NATTEN 0.21.0, published utils3d wheel, inference/Gradio commands, SDPA option, upstream link to Saganaki22 integration | README names a `main` branch, while the observed default GitHub file links use `master`. Clone the default branch; do not invent a branch-specific clone command. |
| [TRELLIS.2 installation](https://github.com/microsoft/TRELLIS.2#-installation) | Linux-tested baseline, NVIDIA A100/H100 validation, at least 24 GB VRAM, CUDA 12.4 recommendation, default PyTorch 2.6.0 environment, setup.sh flags | These are TRELLIS.2 base requirements. They do not establish Pixal3D's minimum with offloading. TRELLIS.2 H100 timings must not be relabelled as Pixal3D timings. |
| [Official inference.py](https://github.com/TencentARC/Pixal3D/blob/master/inference.py) | TencentARC/Pixal3D model path; camenduru DINOv3 and Ruicheng MoGe IDs; image/output/resolution flags; GLB export; CLI estimate of about 18 GB versus 10–12 GB with offload | CLI help does not identify GPU, image, measurement method, or duration. Label values as estimates, never tested hardware compatibility. Native CLI does not expose every widget present in community workflows. |
| [Native pipeline implementation](https://github.com/TencentARC/Pixal3D/blob/master/pixal3d/pipelines/pixal3d_image_to_3d.py) | Stage-by-stage CPU/GPU movement; input alpha handling; separate structure, shape, texture, and decode stages | Code behavior is not an end-to-end performance measurement. |
| [Local requirements.txt](https://github.com/TencentARC/Pixal3D/blob/master/requirements.txt) | Local dependency file | Official README warns the separate requirements-hfdemo.txt targets H-series hardware. |
| [NATTEN installation](https://natten.org/install/) | NATTEN_CUDA_ARCH syntax (e.g. 8.9 for Ada), NATTEN_N_WORKERS, architecture detection/build behavior | Current NATTEN documentation shows newer releases; tutorial retains Pixal3D's 0.21.0 pin. The official xx values are placeholders that must be replaced, not runnable machine defaults. |
| [Official Hugging Face model](https://huggingface.co/TencentARC/Pixal3D) and [ckpts](https://huggingface.co/TencentARC/Pixal3D/tree/main/ckpts) | Official model identity, pipeline.json/checkpoint layout | A base model snapshot does not include every helper model used by a given runner. |
| [Aero-Ex GGUF wrapper](https://github.com/Aero-Ex/ComfyUI-Trellis2-GGUF) | Community runtime, installation/wheel guidance | Community conversion/integration, not an official Tencent GGUF release. The wrapper README largely describes TRELLIS.2; Pixal3D-specific behavior was checked in source. |
| [GGUF nodes.py](https://github.com/Aero-Ex/ComfyUI-Trellis2-GGUF/blob/main/nodes.py) | Actual Pixal3D-GGUF loader option; Q4_K_M/Q5_K_M/Q6_K/Q8_0/BF16 formats; SDPA; low_vram; keep_models_loaded; workflow generation widgets | Setting names are specific to this wrapper. They are not the Saganaki22 node interface. CPU loader option alone does not establish a complete CPU-compatible pipeline. |
| [GGUF model_manager.py](https://github.com/Aero-Ex/ComfyUI-Trellis2-GGUF/blob/main/model_manager.py) | models/Pixal3D-GGUF root, remote folder/filename mappings, decoder safetensors handling, full model-file download/resolution; missing DINOv3 files are downloaded from Aero-Ex/Dinov3; EXTRA_MODELS adds shape_enc_next_dc_f16c32_fp16 and shared encoder files come from Aero-Ex/Trellis2-GGUF | Case matters: Sparse uses an uppercase S. Four GGUF files and three decoders alone are not the complete installation. Existing DINOv3 files in the manager's supported old/user locations can satisfy its check without a fresh download. |
| [Aero-Ex model files](https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main), [Sparse](https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main/Sparse), [shape](https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main/shape), [texture](https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main/texture), [decoder](https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main/decoder) | Real artifact names and available quantizations; four flow GGUFs plus three fp16 safetensors decoders and JSON configs | On-disk file sizes are not peak VRAM. Hugging Face auto-detected architecture labels are not treated as technical proof. |
| [GGUF example workflows](https://github.com/Aero-Ex/ComfyUI-Trellis2-GGUF/tree/main/example_workflows) | Advanced.json and export examples | Workflow must be used with the matching node version. No GGUF workflow PNG was verified here. |
| [Shared GGUF encoder files](https://huggingface.co/Aero-Ex/Trellis2-GGUF/tree/main/encoders) and [DINOv3 helper repository](https://huggingface.co/Aero-Ex/Dinov3) | shape_enc_next_dc_f16c32_fp16.safetensors/config and DINOv3 helper model source | These are additional helper sources rather than files in Aero-Ex/Pixal3D-GGUF. Loader implementation is the evidence for the fetch/local paths. |
| [city96/ComfyUI-GGUF](https://github.com/city96/ComfyUI-GGUF) | Quantized operations and sibling node installation | Generic GGUF support alone does not establish Pixal3D GPU compatibility. |
| [Contributor RTX 4070 report](https://github.com/carroyoaesa/comfyui-trellis2-pixal3d-rtx40-ada-sm89-wheels-debian13/blob/main/docs/05-pixal3d-on-12gb.md) | Linux/RTX 4070 12 GB: Q6_K approximately 6.97 GB/340 s; Q8_0 approximately 7.15 GB/356 s; nvidia-smi measurement; missing city96 diagnosis; texture NAF patch; DINOv3/MoGe on disk and working sm89 CUDA libnatten as required prerequisites | Both runs were patched, with 1024_cascade, 16k tokens, one view and tiled decoding. Q6 used 8/8/8 steps and 2048 textures; Q8 used 12/12/12 and 4096 textures. Not an isolated quantization comparison, our benchmark, or proof that a 6 GB GPU works. |
| [GGUF sparse cascade issue #193](https://github.com/visualbruno/ComfyUI-Trellis2/issues/193) | Firsthand failure reproduction on RTX 4070 12 GB; sparse resolution 64 failed across quantizations and 32 worked; affected fork/commit details | Historical report about Aero-Ex fork. Do not claim the bug is still present in every current version. |
| [Official native ComfyUI Pixal3D guide](https://docs.comfy.org/tutorials/3d/pixal3d) | Current native single-image template, Pixal3D/TRELLIS switch, input/queue/Preview3DAdvanced steps, model subfolders and output location | Live HTTP 200. No hardware-labelled VRAM minimum or duration supplied. Native route differs from Tencent Python, Aero-Ex GGUF and Saganaki22 nodepacks; do not transfer their measurements or controls to this template. |
| [Native support PR #14718](https://github.com/Comfy-Org/ComfyUI/pull/14718) | Pixal3D/TRELLIS.2 support merged into ComfyUI master on 2026-08-22 | A merge date does not guarantee every installed stable build already contains the nodes. The official guide directs missing-node users to update and inspect imports. |
| [ComfyUI update guide](https://docs.comfy.org/installation/update_comfyui) and [download](https://www.comfy.org/download) | Manual git pull, active-environment pip install -r requirements.txt, python main.py; Portable update script and Desktop engine update procedures | Commands in the tutorial apply to an existing manual Git install in its own Python environment. Use the corresponding procedure for Portable/Desktop. |
| [Official workflow JSON](https://github.com/Comfy-Org/workflow_templates/blob/main/templates/3d_pixal3d_trellis2_image_to_model.json) | Actual UNET/CLIP/VAE filenames; default false Boolean switch; LoadImage input; background-removal switch; Save3DAdvanced and Preview3DAdvanced nodes; 3d/ComfyUI output prefix | Live raw JSON HTTP 200. Template settings are not universal performance defaults. The preview image is an illustration; import the JSON for the node graph. |
| [Comfy-Org Pixal3D model card](https://huggingface.co/Comfy-Org/Pixal3D) | Repackaged Pixal3D native ComfyUI files: pixal3d_int8_convrot.safetensors, dino_v3_L_naf_fp32.safetensors, trellis_2_shape_vae_bf16.safetensors and trellis_2_texture_vae_bf16.safetensors; diffusion_models/clip_vision/vae layout; template link | These are Comfy-Org repackaged weights rather than the Tencent full snapshot or Aero-Ex GGUF. File sizes are not runtime VRAM. |
| [Comfy-Org TRELLIS.2 checkpoint](https://huggingface.co/Comfy-Org/TRELLIS.2/tree/main/diffusion_models), [MoGe](https://huggingface.co/Comfy-Org/MoGe/tree/main/geometry_estimation) and [BiRefNet](https://huggingface.co/Comfy-Org/BiRefNet/tree/main/background_removal) | Native template's other exact files: trellis_2_int8_convrot.safetensors, moge_2_vitl_normal_fp16.safetensors and birefnet.safetensors | Follow native directory names. The template references both diffusion checkpoint options; the false switch selects Pixal3D. |
| [Save/GLB node implementation](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_save_3d.py) | MeshToFile3D serializes mesh/material information into GLB; Save3DAdvanced saves upstream file format and uses the specified output prefix | Export code confirms format behavior; it is not a quality or speed measurement. |
| [Saganaki22 README (historical original)](https://github.com/Saganaki22/Pixal3D-ComfyUI/blob/main/README.md) | Search-indexed historical README described stable Manager entry/manual install, same-Python requirement, GPU dependencies, model paths, environment check, NAF fallback, loader modes, graph and unload | Live public repository API and raw main/master requests return HTTP 404 on 2026-10-06. Cached search content must not be presented as a currently accessible source or working clone route. |
| [Preserved Peak-Design README](https://github.com/Peak-Design/Pixal3D-ComfyUI/blob/e5d40457d136d68e2c0ad46756da0c88a30e6a70/README.md) | Accessible frozen fork, nodepack controls hybrid_low_vram/native_low_vram, optional MoGe/RMBG loading, manual camera/keep_alpha and NAF fallback | Fork API/raw README verified HTTP 200; frozen May 26 commit is version 0.2.3. README also matches verified registry 0.2.4 package README. Do not claim the original GitHub repository is available. |
| [Official ComfyUI registry entry](https://registry.comfy.org/nodes/Pixal3D-ComfyUI) and [version 0.2.4 metadata](https://api.comfy.org/nodes/Pixal3D-ComfyUI/install?version=0.2.4) | Optional older Pixal3D-ComfyUI nodepack published by saganaki22 remains ACTIVE; registry metadata gives https://cdn.comfy.org/saganaki22/Pixal3D-ComfyUI/0.2.4/node.zip | Live metadata and archive HEAD HTTP 200; ZIP Content-Length 1,707,281 bytes. Read in memory only to verify root README/nodes/requirements/install/pyproject files, version/publisher and controls. Old GitHub clone is removed from the main how-to. Registry package availability does not prove successful GPU execution. |
| [Preserved workflow directory](https://github.com/infinition/Pixal3D-pipeline/tree/main/workflows) | Real copies of standard and low-VRAM camera-control PNGs, with embedded workflows, preserved by a batch wrapper that credits Saganaki22 | These show the older Saganaki22 nodepack. They are neither current native ComfyUI templates nor images from a test performed for these articles. |
| [RTX 2070 issue #16 (historical original)](https://github.com/Saganaki22/Pixal3D-ComfyUI/issues/16) | Search-indexed firsthand Windows RTX 2070 Max-Q/Turing sm75 report; imports pass but attention/NATTEN/sparse kernels fail; SDPA patch did not produce completed GLB | Original repository is currently unavailable (HTTP 404). Describe this explicitly as a historical cached report, not a currently accessible verification link. It describes that environment, not all RTX 2070 configurations. No verified completed run, peak, or total time. |
| [Pixal3D-pipeline README](https://github.com/infinition/Pixal3D-pipeline/blob/main/README.md) | Contributor reports RTX 4070 Ti 12 GB, roughly 5–6 minutes end to end using Saganaki22 nodes and wrapper/background processing | Card capacity is given, peak VRAM is not. Do not present this wrapper's timing as a universal ComfyUI timing. |
| [NVIDIA nvidia-smi manual](https://docs.nvidia.com/deploy/nvidia-smi/index.html) | Read-only selective GPU query, CSV formatting, loop interval, Ctrl+C | Sampling once a second reports observed samples and may miss a brief memory peak. In-process PyTorch allocator peak counters are a separate measurement, illustrated in issue #193. The tutorial does not call the highest sample a true peak. |

## Original images

Articles embed source images directly and link each caption to its repository
file. No image was synthesized, downloaded as a display workaround, or labelled
as our local test evidence.

| Image | Raw URL | Use |
| --- | --- | --- |
| [Official project teaser](https://github.com/TencentARC/Pixal3D/blob/master/assets/teaser.png) | https://raw.githubusercontent.com/TencentARC/Pixal3D/master/assets/teaser.png | Local install and GGUF visual reference; explicitly upstream examples, not GGUF performance evidence. |
| [Official native template preview](https://github.com/Comfy-Org/workflow_templates/blob/main/templates/3d_pixal3d_trellis2_image_to_model-1.webp) | https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/templates/3d_pixal3d_trellis2_image_to_model-1.webp | Current /comfyui illustration. HEAD verified HTTP 200, image/webp, 740,516 bytes. Its official guide links this exact asset. |
| [Preserved standard community workflow](https://github.com/infinition/Pixal3D-pipeline/blob/main/workflows/pixal3d_example_workflow.png) | https://raw.githubusercontent.com/infinition/Pixal3D-pipeline/main/workflows/pixal3d_example_workflow.png | Verified archived Saganaki22 node graph; no longer embedded in the current native /comfyui tutorial. HEAD HTTP 200, image/png, 472,996 bytes. |
| [Preserved low-VRAM camera workflow](https://github.com/infinition/Pixal3D-pipeline/blob/main/workflows/pixal3d_low_vram_cam_control_example_workflow.png) | https://raw.githubusercontent.com/infinition/Pixal3D-pipeline/main/workflows/pixal3d_low_vram_cam_control_example_workflow.png | Archived Saganaki22 workflow copied into the batch-wrapper repo. HEAD verified HTTP 200, image/png, 614,656 bytes. |

Initial cached GitHub listings were insufficient: browser QA found both original
Saganaki22 PNGs failed to decode. Live read-only public HEAD probes then confirmed
the original repository and main/master image URLs return HTTP 404. The infinition
copies above return HTTP 200 with image/png. Browser QA separately verified the
official teaser decodes at naturalWidth 3840. The replacement low-VRAM PNG
decoded at 2463 × 1973, and the native ComfyUI WebP decoded at 350 × 350
in the live in-app browser. These checks are separate from E2E image fixtures.
The native ComfyUI preview uses its official workflow_templates WebP instead of
the old nodepack screenshot. The linked native input viking_wolf_rune_axe.png
also passed HEAD (HTTP 200, image/png, 1,106,832 bytes). No image was downloaded
to bypass display restrictions.

## Deliberate unknowns

- Reliable complete Pixal3D generation on RTX 2070 or a 6 GB GPU was not verified.
- Native CLI help does not supply the hardware behind its 18 GB/10–12 GB estimates.
- No universal system RAM, disk minimum, cold-download time, or exact generation
  time is asserted for the official Python route or current native ComfyUI template.
- Community fixes are described with version/environment limits; no unreviewed
  source patch is presented as a mandatory change to every current install.
- Older unrelated community text claims a noncommercial/EU-restricted license.
  Current official Pixal3D repository/model card identify MIT; third-party
  components retain their own terms. Those older claims were not repeated.

## Editorial and verification notes

User-facing text is in `libs/i18n/locales/tutorials/en.ts` and `zh-CN.ts`, typed
against `TutorialTranslations`. Shared command strings and source URLs keep the
two languages consistent. No provider generation or local GPU dependency
installation is part of website route verification. Root integration performs
the required Next.js typecheck, build, browser walkthrough, and relevant E2E.
