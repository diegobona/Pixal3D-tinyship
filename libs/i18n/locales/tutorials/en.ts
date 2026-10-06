import type { TutorialSource, TutorialTranslations } from "../../../tutorials/types";

export const tutorialReferences = {
  upstream: "https://github.com/TencentARC/Pixal3D",
  inference: "https://github.com/TencentARC/Pixal3D/blob/master/inference.py",
  pipeline: "https://github.com/TencentARC/Pixal3D/blob/master/pixal3d/pipelines/pixal3d_image_to_3d.py",
  requirements: "https://github.com/TencentARC/Pixal3D/blob/master/requirements.txt",
  trellis: "https://github.com/microsoft/TRELLIS.2#-installation",
  natten: "https://natten.org/install/",
  weights: "https://huggingface.co/TencentARC/Pixal3D",
  checkpoints: "https://huggingface.co/TencentARC/Pixal3D/tree/main/ckpts",
  gguf: "https://github.com/Aero-Ex/ComfyUI-Trellis2-GGUF",
  ggufNodes: "https://github.com/Aero-Ex/ComfyUI-Trellis2-GGUF/blob/main/nodes.py",
  ggufManager: "https://github.com/Aero-Ex/ComfyUI-Trellis2-GGUF/blob/main/model_manager.py",
  ggufWeights: "https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main",
  ggufSparse: "https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main/Sparse",
  ggufShape: "https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main/shape",
  ggufTexture: "https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main/texture",
  ggufDecoders: "https://huggingface.co/Aero-Ex/Pixal3D-GGUF/tree/main/decoder",
  ggufEncoders: "https://huggingface.co/Aero-Ex/Trellis2-GGUF/tree/main/encoders",
  ggufDino: "https://huggingface.co/Aero-Ex/Dinov3",
  ggufWorkflows: "https://github.com/Aero-Ex/ComfyUI-Trellis2-GGUF/tree/main/example_workflows",
  city96: "https://github.com/city96/ComfyUI-GGUF",
  benchmark: "https://github.com/carroyoaesa/comfyui-trellis2-pixal3d-rtx40-ada-sm89-wheels-debian13/blob/main/docs/05-pixal3d-on-12gb.md",
  sparseIssue: "https://github.com/visualbruno/ComfyUI-Trellis2/issues/193",
  turingIssue: "https://github.com/Saganaki22/Pixal3D-ComfyUI/issues/16",
  comfy: "https://github.com/Peak-Design/Pixal3D-ComfyUI/blob/e5d40457d136d68e2c0ad46756da0c88a30e6a70/README.md",
  comfyRegistry: "https://registry.comfy.org/nodes/Pixal3D-ComfyUI",
  comfyRegistryInstall: "https://api.comfy.org/nodes/Pixal3D-ComfyUI/install?version=0.2.4",
  comfyWorkflows: "https://github.com/infinition/Pixal3D-pipeline/tree/main/workflows",
  comfyBatch: "https://github.com/infinition/Pixal3D-pipeline/blob/main/README.md",
  nativeComfy: "https://docs.comfy.org/tutorials/3d/pixal3d",
  comfyUpdate: "https://docs.comfy.org/installation/update_comfyui",
  comfyInstall: "https://www.comfy.org/download",
  nativeSupport: "https://github.com/Comfy-Org/ComfyUI/pull/14718",
  nativeExport: "https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_save_3d.py",
  nativeWorkflow: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/3d_pixal3d_trellis2_image_to_model.json",
  nativePreview: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/3d_pixal3d_trellis2_image_to_model-1.webp",
  nativeInput: "https://github.com/Comfy-Org/workflow_templates/blob/main/input/viking_wolf_rune_axe.png",
  nativeWeights: "https://huggingface.co/Comfy-Org/Pixal3D",
  nativeTrellis: "https://huggingface.co/Comfy-Org/TRELLIS.2/tree/main/diffusion_models",
  nativeMoge: "https://huggingface.co/Comfy-Org/MoGe/tree/main/geometry_estimation",
  nativeBackground: "https://huggingface.co/Comfy-Org/BiRefNet/tree/main/background_removal",
  nvidia: "https://docs.nvidia.com/deploy/nvidia-smi/index.html",
  teaser: "https://github.com/TencentARC/Pixal3D/blob/master/assets/teaser.png",
  normalWorkflow: "https://github.com/infinition/Pixal3D-pipeline/blob/main/workflows/pixal3d_example_workflow.png",
  lowWorkflow: "https://github.com/infinition/Pixal3D-pipeline/blob/main/workflows/pixal3d_low_vram_cam_control_example_workflow.png",
} as const;

export const tutorialCommands = {
  base: "git clone -b main https://github.com/microsoft/TRELLIS.2.git --recursive\ncd TRELLIS.2\n. ./setup.sh --new-env --basic --flash-attn --nvdiffrast --nvdiffrec --cumesh --o-voxel --flexgemm",
  clone: "conda activate trellis2\ncd ..\ngit clone https://github.com/TencentARC/Pixal3D.git\ncd Pixal3D\npip install -r requirements.txt",
  natten: 'NATTEN_CUDA_ARCH="xx" NATTEN_N_WORKERS=xx pip install natten==0.21.0 --no-build-isolation\npip install https://github.com/LDYang694/Storages/releases/download/20260430/utils3d-0.0.2-py3-none-any.whl',
  generate: "python inference.py --image assets/images/0_img.png --output ./output.glb",
  web: "python app.py --low_vram",
  low: "python inference.py --image assets/images/0_img.png --output ./output.glb --low_vram --resolution 1024",
  sdpa: "ATTN_BACKEND=sdpa python inference.py --image assets/images/0_img.png --output ./output.glb --low_vram",
  gpu: "nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv -l 1",
  comfy: "git pull\npip install -r requirements.txt\npython main.py",
  gguf: "cd ComfyUI/custom_nodes\ngit clone https://github.com/Aero-Ex/ComfyUI-Trellis2-GGUF.git\ngit clone https://github.com/city96/ComfyUI-GGUF.git",
} as const;

function source(key: keyof typeof tutorialReferences, label: string): TutorialSource {
  return { href: tutorialReferences[key], label: key === "turingIssue" ? `${label} (historical; original unavailable)` : label };
}

const teaserSrc = "https://raw.githubusercontent.com/TencentARC/Pixal3D/master/assets/teaser.png";
const lowWorkflowSrc = "https://raw.githubusercontent.com/infinition/Pixal3D-pipeline/main/workflows/pixal3d_low_vram_cam_control_example_workflow.png";
const nativeWorkflowSrc = "https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/templates/3d_pixal3d_trellis2_image_to_model-1.webp";

export const tutorialsEn: TutorialTranslations = {
  common: {
    eyebrow: "Pixal3D tutorials",
    home: "Home",
    reviewedAt: "Sources reviewed",
    onThisPage: "On this page",
    requirements: "System requirements",
    steps: "Step-by-step setup",
    performance: "VRAM and generation time",
    errors: "Common errors and fixes",
    files: "Model files and downloads",
    screenshots: "Source screenshots",
    configuration: "Configuration",
    memory: "VRAM",
    time: "Generation time",
    evidence: "Evidence and limits",
    source: "Source",
    related: "Related tutorials",
    homeLinksTitle: "Run Pixal3D your way",
    homeLinksDescription: "Explore local installation, GGUF models, low VRAM settings, and ComfyUI workflows.",
  },
  pages: {
    "how-to-install-locally": {
      title: "How to install Pixal3D locally",
      description: "Set up the TRELLIS.2 environment and CUDA dependencies, download the models, and generate your first GLB with Pixal3D.",
      summary: "The official Python pipeline turns an image into a 3D model on your machine. These commands use a Linux shell; Windows users can follow the community ComfyUI guide. Try the bundled image first to make it easier to tell input issues from environment issues.",
      requirements: [
        { title: "Linux and an NVIDIA CUDA GPU", body: "TRELLIS.2 was tested on Linux with A100/H100 GPUs, and its installation guide requires at least 24 GB VRAM. That requirement applies to the base setup. It does not establish how much memory Pixal3D needs with offloading enabled.", sources: [source("trellis", "TRELLIS.2 prerequisites")] },
        { title: "Conda, CUDA Toolkit, and matching Python packages", body: "The base setup creates a trellis2 environment with PyTorch 2.6.0 and CUDA 12.4. Build extensions in the environment you will use to run Pixal3D. An extension can import successfully and still fail when its GPU kernel runs.", sources: [source("trellis", "Base environment"), source("turingIssue", "Runtime compatibility report")] },
        { title: "Internet access for the first model load", body: "The inference script loads TencentARC/Pixal3D, a DINOv3 image encoder, and MoGe camera estimation. Keep the cached files between runs to avoid downloading them again. The linked sources give no RAM or disk minimum that applies to every installation of this pipeline.", sources: [source("inference", "Models loaded by inference.py")] },
      ],
      steps: [
        { title: "Create the TRELLIS.2 base environment", body: "Run the upstream setup in a Linux terminal. If CUDA compilation fails, check CUDA_HOME, then follow the base guide to install the setup components one at a time.", command: tutorialCommands.base, sources: [source("trellis", "Official installation commands")] },
        { title: "Clone Pixal3D and install its dependencies", body: "With the same environment active, return to the parent directory and clone Pixal3D. For a local installation, use requirements.txt.", command: tutorialCommands.clone, sources: [source("upstream", "Pixal3D installation"), source("requirements", "Local dependency file")] },
        { title: "Build NATTEN for your GPU", body: "Replace both xx placeholders before running the command. Set the architecture for your GPU and choose a worker count your build machine can handle. NATTEN gives 8.9 for Ada as an example. Use Pixal3D's pinned 0.21.0 version for this setup.", command: tutorialCommands.natten, sources: [source("upstream", "NATTEN and utils3d commands"), source("natten", "Architecture and build workers")] },
        { title: "Generate the bundled test model", body: "Run this from the Pixal3D folder. The first run may download model weights. Once it finishes, check that output.glb exists and opens as a textured mesh. Inspect the sides and back before trying your own image.", command: tutorialCommands.generate, sources: [source("inference", "Image input and GLB export")] },
        { title: "Open the local interface", body: "Start the Gradio app to upload images through a local interface. This command enables offloading. If memory or GPU architecture may be an issue, read the low VRAM guide before running it.", command: tutorialCommands.web, sources: [source("upstream", "Local Gradio demo")] },
      ],
      performance: {
        intro: "The official CLI help gives the following estimates without specifying the hardware. They are not measurements from this site. It also gives no timings for downloads or the first model load.",
        rows: [
          { configuration: "Official inference, standard mode", memory: "About 18 GB (CLI estimate)", time: "Not reported", evidence: "The help text does not specify the GPU, input image, or measurement method.", sources: [source("inference", "--low_vram help text")] },
          { configuration: "Official inference with --low_vram", memory: "About 10–12 GB (CLI estimate)", time: "Slower; no duration reported", evidence: "Models move between CPU and GPU for each stage. Peak usage varies between runs.", sources: [source("inference", "Offload estimate")] },
        ],
      },
      errors: [
        { title: "A CUDA extension fails to import or run", body: "Check the Python, PyTorch, CUDA, and GPU architecture used to build each wheel. A filename containing CUDA is not enough to confirm compatibility. In the RTX 2070 report, imports passed but GPU execution failed.", sources: [source("turingIssue", "Import checks versus kernel execution")] },
        { title: "FlashAttention is unavailable", body: "The official pipeline can use PyTorch SDPA for attention. The command below uses Linux shell syntax. In PowerShell, set $env:ATTN_BACKEND='sdpa' before running Python. Switching to SDPA does not fix sparse-kernel compatibility.", command: tutorialCommands.sdpa, sources: [source("upstream", "SDPA alternative")] },
        { title: "Hugging Face demo dependencies fail locally", body: "Use the local requirements file. According to the upstream README, requirements-hfdemo.txt targets H-series GPUs and may be incompatible with other architectures.", sources: [source("upstream", "Demo dependency warning")] },
      ],
      files: [
        { title: "Official source and model weights", body: "Get the code from TencentARC/Pixal3D and the weights from its Hugging Face model repository. If you use a local snapshot, retain pipeline.json and the ckpts directory structure.", sources: [source("upstream", "Official source"), source("weights", "Official model card"), source("checkpoints", "Checkpoint files")] },
        { title: "Helper models", body: "inference.py also loads camenduru/dinov3-vitl16-pretrain-lvd1689m and Ruicheng/moge-2-vitl. The Pixal3D checkpoint does not include these image and camera models.", sources: [source("inference", "Helper model identifiers")] },
      ],
      screenshots: {
        intro: "The project authors published this image to show Pixal3D's outputs. It comes from the upstream project; no local run was performed to produce it for this tutorial.",
        items: [{ src: teaserSrc, alt: "Reference images and generated 3D assets in the TencentARC Pixal3D project teaser", caption: "Pixal3D project teaser from TencentARC and the project authors.", source: source("teaser", "Original repository image") }],
      },
    },
    gguf: {
      title: "Pixal3D GGUF: models and ComfyUI setup",
      description: "Download Pixal3D GGUF files and set up the community loader in ComfyUI, with notes on quantization, reported VRAM use, and known errors.",
      summary: "Aero-Ex distributes a community GGUF conversion of Pixal3D for its TRELLIS.2 ComfyUI wrapper. You need compatible versions of the model, loader, decoder files, and CUDA dependencies.",
      requirements: [
        { title: "A working CUDA environment", body: "Follow the wrapper's installation instructions for your OS and Python/PyTorch version. GGUF makes the stored model weights smaller. CUDA mesh and sparse operations are still required.", sources: [source("gguf", "Wrapper installation")] },
        { title: "Both community node repositories", body: "The wrapper uses city96's ComfyUI-GGUF code for quantized Linear operations. One contributor reported that dequantization failed without this sibling node folder.", sources: [source("benchmark", "GGUF integration prerequisites"), source("city96", "GGUF operations")] },
        { title: "The complete model set", body: "You need pipeline.json, matching JSON configs, four quantized flow models, fp16 decoders, DINOv3, and the shared shape encoder. The manager also looks for helper files outside the Pixal3D GGUF snapshot. Download sizes do not tell you how much VRAM a run will use.", sources: [source("ggufManager", "Model and helper file resolution"), source("ggufWeights", "Published model layout")] },
        { title: "Dependencies used in the reported benchmark", body: "The contributor's low-memory setup also requires MoGe and a working CUDA libnatten build for the tested sm89 GPU. Check that your installation meets these conditions before comparing its memory use with the report.", sources: [source("benchmark", "Measured environment prerequisites")] },
      ],
      steps: [
        { title: "Install the GGUF wrapper and its sibling node", body: "Clone both repositories into custom_nodes. Use ComfyUI's own Python to install the wheels and dependencies specified by the wrapper, then restart ComfyUI.", command: tutorialCommands.gguf, sources: [source("gguf", "Wrapper dependencies"), source("city96", "ComfyUI-GGUF install")] },
        { title: "Select Pixal3D in the GGUF loader", body: "Set modelname=Pixal3D-GGUF and choose GGUF Q8_0 or GGUF Q6_K. Use backend=sdpa, device=cuda, low_vram=true, keep_models_loaded=false. The loader downloads files from Aero-Ex/Pixal3D-GGUF to models/Pixal3D-GGUF.", sources: [source("ggufNodes", "Actual loader options"), source("ggufManager", "Download paths")] },
        { title: "Load the supplied Advanced workflow", body: "Open example_workflows/Advanced.json. For a first run with limited memory, select 1024_cascade with 8 steps per stage, max_num_tokens=16384, max_views=1, and the tiled decoder. Leave sparse_structure_resolution=32 until you have checked the reported cascade bug.", sources: [source("ggufWorkflows", "Advanced.json"), source("ggufNodes", "Generation widgets"), source("sparseIssue", "Sparse resolution bug report")] },
        { title: "Check the texture-stage patch", body: "The RTX 4070 benchmark used a source patch to reduce texture NAF conditioning. These results do not establish the peak memory use of an unmodified installation. Read the contributor's patch explanation and apply it only if your version has the same failure.", sources: [source("benchmark", "Patched benchmark conditions")] },
        { title: "Compare exports using the same image", body: "Keep the image and seed fixed when comparing quantizations. Check the exported mesh and materials along with memory use. Record your installed commits so you can compare results after node updates.", sources: [source("ggufWorkflows", "Export workflow examples")] },
      ],
      performance: {
        intro: "A contributor measured these runs on Linux with an RTX 4070 12 GB. Both used 1024_cascade, 16k tokens, one view, tiled decoding, city96 support, CUDA libnatten, MoGe, and a texture NAF source patch. The results were not measured by this site and do not establish compatibility with a 6 GB card.",
        rows: [
          { configuration: "Q6_K · 8/8/8 steps · 2048 texture", memory: "About 6.97 GB peak", time: "About 340 seconds", evidence: "Measured by the contributor with nvidia-smi on a patched RTX 4070 setup.", sources: [source("benchmark", "Q6_K measurement")] },
          { configuration: "Q8_0 · 12/12/12 steps · 4096 texture", memory: "About 7.15 GB peak", time: "About 356 seconds", evidence: "Step counts and texture settings also changed, so the timing cannot isolate the effect of quantization.", sources: [source("benchmark", "Q8_0 measurement")] },
        ],
      },
      errors: [
        { title: "Tensor dimensions disagree during GGUF loading", body: "Make sure city96/ComfyUI-GGUF is installed beside the wrapper, then restart ComfyUI. The contributor traced a 256-versus-210 mismatch to missing support for quantized Linear operations.", sources: [source("benchmark", "Missing dequantization diagnosis")] },
        { title: "OOM when sparse_structure_resolution is 64", body: "Issue #193 reports OOM across quantizations on a 12 GB card at this setting; 32 completed. The report concerns the GGUF fork. Check the issue and affected commit before applying a patch.", sources: [source("sparseIssue", "Affected fork and reproduction")] },
        { title: "A file is missing after downloading the weights", body: "Check each model's JSON config and the folders Sparse, shape, texture, and decoder. Folder names are case sensitive. Use the loader's downloader, or copy the files without changing the repository layout.", sources: [source("ggufManager", "Remote-to-local filename mapping")] },
      ],
      files: [
        { title: "Sparse structure", body: "Example: Sparse/ss_flow_img_dit_1_3B_64_bf16_Q8_0.gguf with ss_flow_img_dit_1_3B_64_bf16.json. Published alternatives include Q4_K_M, Q5_K_M, Q6_K, and BF16.", sources: [source("ggufSparse", "Sparse files")] },
        { title: "Shape and texture", body: "For Q8_0, use shape/slat_flow_img2shape_dit_1_3B_512_bf16_Q8_0.gguf, shape/slat_flow_img2shape_dit_1_3B_1024_bf16_Q8_0.gguf, and texture/slat_flow_imgshape2tex_dit_1_3B_1024_bf16_Q8_0.gguf, with their JSON configs.", sources: [source("ggufShape", "Shape files"), source("ggufTexture", "Texture files")] },
        { title: "Decoders use safetensors", body: "decoder/ contains ss_dec_conv3d_16l8_fp16.safetensors, shape_dec_next_dc_f16c32_fp16.safetensors, and tex_dec_next_dc_f16c32_fp16.safetensors. Each needs its JSON config. Download the decoder files and configs along with pipeline.json.", sources: [source("ggufDecoders", "Decoder files"), source("ggufWeights", "Pipeline config")] },
        { title: "Image encoder and shared shape encoder", body: "The manager downloads missing DINOv3 files from Aero-Ex/Dinov3 to dinov3/facebook/dinov3-vitl16-pretrain-lvd1689m/. It also downloads encoders/shape_enc_next_dc_f16c32_fp16.safetensors and its JSON from Aero-Ex/Trellis2-GGUF. Include these helper files when copying a local installation.", sources: [source("ggufManager", "Helper download implementation"), source("ggufDino", "DINOv3 helper repository"), source("ggufEncoders", "Shared encoder files")] },
      ],
      screenshots: {
        intro: "The upstream Pixal3D examples show outputs from the model family. They provide no evidence of GGUF output quality or memory use.",
        items: [{ src: teaserSrc, alt: "TencentARC Pixal3D examples showing reference images and 3D results", caption: "Official model examples. To see the GGUF node graph, open the linked workflow JSON.", source: source("teaser", "TencentARC source image") }],
      },
    },
    "low-vram": {
      title: "Pixal3D low VRAM guide: offloading and RTX 2070 limits",
      description: "Enable Pixal3D low VRAM mode and monitor GPU memory use. Check the RTX 2070 kernel compatibility issues that quantization cannot fix.",
      summary: "Start with the official --low_vram option and a 1024 pipeline. If you need to use less memory, the community GGUF guide includes results for a specified GPU. Check GPU architecture as well: lower memory use does not establish support for an RTX 2070.",
      requirements: [
        { title: "Check free VRAM and GPU architecture", body: "Before launching, check the GPU name and available memory. Leave room for the desktop and other processes. Offloading still needs CUDA kernels that work on your GPU.", sources: [source("nvidia", "GPU memory query"), source("turingIssue", "Architecture-dependent runtime failure")] },
        { title: "Leave CPU memory for staged models", body: "The native pipeline moves each model to the GPU when its stage runs. This reduces VRAM use at the cost of transfers and CPU memory. The upstream project gives no system RAM minimum that covers every run.", sources: [source("pipeline", "Stage-by-stage offloading")] },
        { title: "RTX 2070 support is unconfirmed", body: "A cached copy of historical issue #16 describes an RTX 2070 Max-Q on Windows. Imports passed, but attention and sparse CUDA kernels failed. The original repository and issue now return 404. This report describes an earlier failure; it cannot confirm current compatibility. No completed RTX 2070 run was verified for this guide.", sources: [source("turingIssue", "RTX 2070 report"), source("comfyRegistry", "Original nodepack registry")] },
      ],
      steps: [
        { title: "Monitor memory while generating", body: "Run this read-only query in a second terminal and stop it with Ctrl+C. Record the highest observed sample, your GPU name, and the settings. Sampling once per second can miss brief spikes. To measure PyTorch's allocator peak, you need instrumentation inside the running process.", command: tutorialCommands.gpu, sources: [source("nvidia", "Query fields and loop interval"), source("sparseIssue", "In-process PyTorch peak counters")] },
        { title: "Enable native offloading", body: "Run this from your installed Pixal3D folder. It selects a 1024 cascade and moves the models between CPU and GPU for each stage.", command: tutorialCommands.low, sources: [source("inference", "CLI resolution and offload options"), source("pipeline", "Offload implementation")] },
        { title: "Try SDPA if attention fails", body: "This command uses Linux shell syntax. In PowerShell, set $env:ATTN_BACKEND='sdpa' first. SDPA can avoid the FlashAttention dependency. Any missing sparse convolution kernels still need to be resolved separately.", command: tutorialCommands.sdpa, sources: [source("upstream", "Official SDPA option"), source("turingIssue", "Separate sparse-kernel blocker")] },
        { title: "Reduce memory use in an existing Saganaki22 workflow", body: "If you use the older Saganaki22 nodepack from the registry, try hybrid_low_vram or native_low_vram. Disable MoGe/RMBG loading and set camera_mode=manual. Supply a transparent image with background_mode=keep_alpha. These controls belong to the older nodepack; the current native ComfyUI template has a different setup.", sources: [source("comfy", "Preserved nodepack README"), source("comfyRegistryInstall", "Published 0.2.4 package"), source("nativeComfy", "Current native template")] },
        { title: "Check compatibility before switching to GGUF", body: "If native offloading still uses too much memory, follow the GGUF guide. Its community report uses an RTX 4070 with a source patch. Those memory figures cannot be assumed to apply to an untested RTX 2070 or a 6 GB card.", sources: [source("benchmark", "Measured GPU and patch conditions"), source("turingIssue", "RTX 2070 execution report")] },
      ],
      performance: {
        intro: "The memory figures below are upstream estimates. The historical compatibility report records a failed run. Neither establishes a minimum that works for every input, export, or GPU architecture.",
        rows: [
          { configuration: "Native --low_vram · 1024 default", memory: "About 10–12 GB (CLI estimate)", time: "No measured duration published", evidence: "The help text specifies no GPU or image. CPU/GPU transfers are expected to slow inference.", sources: [source("inference", "Official estimate")] },
          { configuration: "RTX 2070 Max-Q · Windows · historical SDPA patch report", memory: "No completed-run peak reported", time: "No end-to-end result", evidence: "The cached report describes sparse kernels preventing completion. The original issue is currently unavailable.", sources: [source("turingIssue", "Reported unsuccessful run")] },
          { configuration: "6 GB GPU", memory: "Not verified for this guide", time: "Not verified for this guide", evidence: "The cited primary sources do not confirm reliable generation from start to finish with this amount of memory.", sources: [source("benchmark", "Available report uses a 12 GB card")] },
        ],
      },
      errors: [
        { title: "FlashAttention only supports Ampere GPUs or newer", body: "The historical Turing report contained this exact message; its original issue is now unavailable. Try the official SDPA backend, then test the remaining CUDA operations separately.", sources: [source("turingIssue", "Reported attention error")] },
        { title: "no kernel image is available for execution on the device", body: "A compiled extension may lack code for your GPU architecture. In the cached RTX 2070 report, sparse convolution produced this error after attention was patched. The original issue now returns 404. Reducing the model file size cannot fix the compiled wheel.", sources: [source("turingIssue", "Reported CUDA kernel error")] },
        { title: "Out of memory in NAF or texture conditioning", body: "Use the traceback to find the failing stage. The GGUF benchmark needed a texture NAF patch, while the Saganaki22 node documents fallback refinement settings. Choose a workaround that applies to your node version.", sources: [source("benchmark", "Texture conditioning diagnosis"), source("comfy", "NAF fallback settings")] },
      ],
      files: [
        { title: "Native and GGUF weights use different loaders", body: "The official pipeline loads TencentARC/Pixal3D. Aero-Ex/Pixal3D-GGUF needs its community wrapper. The native checkpoint loader cannot load a .gguf just because it is placed in the checkpoint folder.", sources: [source("inference", "Native model path"), source("ggufNodes", "GGUF loader")] },
        { title: "Archived low memory camera-control workflow", body: "infinition/Pixal3D-pipeline preserves pixal3d_low_vram_cam_control_example_workflow.png with the older workflow embedded. Load it with the Saganaki22 nodepack from the registry. It is not a workflow for the native ComfyUI or Aero-Ex loader.", sources: [source("comfyWorkflows", "Preserved workflow files"), source("comfyRegistry", "Original nodepack registry")] },
      ],
      screenshots: {
        intro: "The infinition batch-wrapper repository preserves this Saganaki22 workflow image. Its node values show the original setup, without confirming GPU compatibility through measurement.",
        items: [{ src: lowWorkflowSrc, alt: "Archived Saganaki22 Pixal3D low VRAM workflow with manual camera control", caption: "Low VRAM camera-control workflow copied into infinition/Pixal3D-pipeline. The original Saganaki22 repository currently returns 404.", source: source("lowWorkflow", "Preserved workflow PNG") }],
      },
    },
    comfyui: {
      title: "Pixal3D in ComfyUI: setup and GLB export",
      description: "Run ComfyUI's official native Pixal3D template to generate a textured 3D model, with update commands, workflow downloads, and the required model filenames.",
      summary: "ComfyUI now supports Pixal3D natively. Use the official single-image template and the Comfy-Org model layout described here. The Aero-Ex GGUF wrapper and older Saganaki22 nodepack each require their own setup.",
      requirements: [
        { title: "An updated ComfyUI installation", body: "Install ComfyUI for your platform, or update your existing installation. Native Pixal3D support was merged on August 22, 2026. If core nodes are missing, check the engine version and startup logs before trying unrelated custom nodes.", sources: [source("comfyInstall", "ComfyUI download"), source("nativeSupport", "Merged native support"), source("comfyUpdate", "Engine and dependency updates")] },
        { title: "Use ComfyUI's Python environment", body: "For a manual installation, update dependencies in the active virtual environment. Portable and Desktop installations have separate update procedures. The official native guide gives no VRAM minimum tied to specific hardware and no completed RTX 2070 benchmark.", sources: [source("comfyUpdate", "Update by installation type"), source("nativeComfy", "Native workflow guide")] },
        { title: "Download all the template's models", body: "The graph references Pixal3D and TRELLIS.2 checkpoints, two VAEs, DINOv3, MoGe, and BiRefNet. Place them in the native ComfyUI folders listed below without changing the filenames.", sources: [source("nativeWorkflow", "Actual model loader selections"), source("nativeWeights", "Comfy-Org model layout")] },
      ],
      steps: [
        { title: "Update ComfyUI and restart", body: "For a manual Git installation, activate ComfyUI's existing Python environment and run these commands from its root folder. With Windows Portable, run ComfyUI_windows_portable/update/update_comfyui.bat from the outer portable installation. In Desktop, update the engine through Manage → Update.", command: tutorialCommands.comfy, sources: [source("comfyUpdate", "Official update procedures")] },
        { title: "Load the official image-to-model template", body: "In the Template Library, search for Pixal3D & TRELLIS.2: Image to Model. You can also load 3d_pixal3d_trellis2_image_to_model.json from the linked repository.", sources: [source("nativeWorkflow", "Workflow JSON"), source("nativeWeights", "Template linked by model card")] },
        { title: "Put the weights in the native folders", body: "Download the listed files and check each model selection in the graph. To run Pixal3D, leave Boolean (Switch to Trellis2) set to false.", sources: [source("nativeWeights", "Pixal3D files"), source("nativeTrellis", "TRELLIS.2 checkpoint"), source("nativeWorkflow", "Switch and loader defaults")] },
        { title: "Try the supplied input image", body: "Load viking_wolf_rune_axe.png into LoadImage. Use the template's settings for the first run and check the preprocessing previews. The background-removal switch lets you skip that stage.", sources: [source("nativeInput", "Official example input"), source("nativeWorkflow", "Input and preprocessing graph")] },
        { title: "Queue the workflow and check the GLB", body: "Press Ctrl+Enter, or Cmd+Enter on macOS, then inspect the textured GLB in Preview3DAdvanced. The documented output folder is ComfyUI/output/3d/ComfyUI/. Rotate the model to check the back and materials before adjusting settings.", sources: [source("nativeComfy", "Queue, preview, and save location"), source("nativeWorkflow", "Save3DAdvanced output node"), source("nativeExport", "GLB serialization and saving")] },
      ],
      performance: {
        intro: "The official native guide publishes no fixed VRAM peak or generation time. An older contributor report gives results for a different nodepack; those results cannot predict performance with the native template.",
        rows: [
          { configuration: "Current official native single-image template", memory: "Not reported in the guide", time: "Not reported in the guide", evidence: "The guide provides no benchmark for a specified GPU. Record your hardware, settings, and the full export when testing.", sources: [source("nativeComfy", "Official workflow guide")] },
          { configuration: "Older batch wrapper · RTX 4070 Ti 12 GB", memory: "12 GB card; measured peak not reported", time: "About 5–6 minutes end to end", evidence: "Reported by a contributor using the Saganaki22 wrapper, including background removal. This is a separate setup from native ComfyUI.", sources: [source("comfyBatch", "Historical batch pipeline report")] },
        ],
      },
      errors: [
        { title: "The template or core nodes are missing", body: "Update ComfyUI's code and dependencies, then restart. The official guide lists an outdated engine and failed startup imports as possible causes. Make sure your stable release includes the new nodes.", sources: [source("nativeComfy", "Missing-node guidance"), source("comfyUpdate", "Core dependencies and templates")] },
        { title: "A model dropdown cannot find a file", body: "Match the exact filename and models subfolder to the model card and template. Comfy-Org's repackaged weights have a different layout from Tencent's native snapshot and Aero-Ex GGUF.", sources: [source("nativeWeights", "Required model folders"), source("nativeWorkflow", "Loader filenames")] },
        { title: "The old Saganaki22 clone URL returns 404", body: "The original repository is currently unavailable. If an existing workflow needs its nodes, you can use the optional Manager registry entry Pixal3D-ComfyUI by saganaki22. Its published 0.2.4 package was verified available. Follow the preserved README and that nodepack's model layout; this native template uses a different setup.", sources: [source("comfyRegistry", "Optional older nodepack"), source("comfyRegistryInstall", "Available 0.2.4 package"), source("comfy", "Preserved nodepack README")] },
      ],
      files: [
        { title: "Diffusion checkpoints", body: "Place pixal3d_int8_convrot.safetensors from Comfy-Org/Pixal3D and trellis_2_int8_convrot.safetensors from Comfy-Org/TRELLIS.2 in ComfyUI/models/diffusion_models/. The template includes both options for its model switch.", sources: [source("nativeWeights", "Pixal3D checkpoint"), source("nativeTrellis", "TRELLIS.2 checkpoint"), source("nativeWorkflow", "Both loader selections")] },
        { title: "VAEs and image encoder", body: "From Comfy-Org/Pixal3D, put trellis_2_shape_vae_bf16.safetensors and trellis_2_texture_vae_bf16.safetensors in ComfyUI/models/vae/, and dino_v3_L_naf_fp32.safetensors in ComfyUI/models/clip_vision/.", sources: [source("nativeWeights", "VAE and CLIP vision layout")] },
        { title: "Camera and background helpers", body: "Put moge_2_vitl_normal_fp16.safetensors from Comfy-Org/MoGe in ComfyUI/models/geometry_estimation/. Put birefnet.safetensors from Comfy-Org/BiRefNet in ComfyUI/models/background_removal/.", sources: [source("nativeMoge", "MoGe file"), source("nativeBackground", "BiRefNet file"), source("nativeComfy", "Helper model folders")] },
        { title: "Workflow and test input", body: "Get 3d_pixal3d_trellis2_image_to_model.json and viking_wolf_rune_axe.png from Comfy-Org/workflow_templates. Import the JSON to load the graph. The preview image below only illustrates it.", sources: [source("nativeWorkflow", "Native workflow JSON"), source("nativeInput", "Test input image")] },
      ],
      screenshots: {
        intro: "Comfy-Org published this preview of the current native template and linked it from the official guide. It was not produced by a test on this site.",
        items: [
          { src: nativeWorkflowSrc, alt: "Comfy-Org's official Pixal3D and TRELLIS.2 image-to-model template preview", caption: "Official native single-image template preview. The setup steps link to its matching JSON.", source: source("nativePreview", "Comfy-Org template preview") },
        ],
      },
    },
  },
};
