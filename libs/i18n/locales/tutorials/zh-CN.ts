import type { TutorialSource, TutorialTranslations } from "../../../tutorials/types";
import { tutorialCommands, tutorialReferences } from "./en";

function source(key: keyof typeof tutorialReferences, label: string): TutorialSource {
  return { href: tutorialReferences[key], label: key === "turingIssue" ? `${label}（历史资料，原链接不可用）` : label };
}

const teaserSrc = "https://raw.githubusercontent.com/TencentARC/Pixal3D/master/assets/teaser.png";
const lowWorkflowSrc = "https://raw.githubusercontent.com/infinition/Pixal3D-pipeline/main/workflows/pixal3d_low_vram_cam_control_example_workflow.png";
const nativeWorkflowSrc = "https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/templates/3d_pixal3d_trellis2_image_to_model-1.webp";

export const tutorialsZhCN: TutorialTranslations = {
  common: {
    eyebrow: "Pixal3D 使用教程",
    home: "首页",
    reviewedAt: "资料核对日期",
    onThisPage: "本页目录",
    requirements: "系统要求",
    steps: "安装与操作步骤",
    performance: "显存与生成时间",
    errors: "常见报错与处理",
    files: "模型文件与下载",
    screenshots: "来源截图",
    configuration: "配置",
    memory: "显存",
    time: "生成时间",
    evidence: "依据与适用范围",
    source: "来源",
    related: "相关教程",
    homeLinksTitle: "按你的方式运行 Pixal3D",
    homeLinksDescription: "了解本地安装、GGUF 模型、低显存设置与 ComfyUI 工作流。",
  },
  pages: {
    "how-to-install-locally": {
      title: "Pixal3D 本地安装教程",
      description: "搭建 TRELLIS.2 基础环境，安装匹配的 CUDA 依赖和 Pixal3D 模型，完成第一次图片转 GLB。",
      summary: "这篇教程使用官方 Python 流程在本地生成 3D 模型，命令适用于 Linux shell。Windows 用户可参考社区的 ComfyUI 教程。建议先跑通仓库自带的图片，再换自己的输入，方便判断问题出在环境还是图片上。",
      requirements: [
        { title: "Linux 与 NVIDIA CUDA 显卡", body: "TRELLIS.2 在 Linux 的 A100/H100 上做过验证，安装文档要求至少 24 GB 显存。这个要求针对 TRELLIS.2 基础环境，不能当作 Pixal3D 卸载模式的实测结果。", sources: [source("trellis", "TRELLIS.2 环境要求")] },
        { title: "Conda、CUDA Toolkit 与匹配的软件版本", body: "基础脚本会创建 trellis2 环境，默认安装 PyTorch 2.6.0 和 CUDA 12.4。编译扩展时要匹配实际运行环境。模块即使能导入，也可能在显卡执行内核时失败。", sources: [source("trellis", "基础环境版本"), source("turingIssue", "运行时兼容性报告")] },
        { title: "首次加载模型时需要网络", body: "推理脚本会加载 TencentARC/Pixal3D、DINOv3 图片编码器和 MoGe 相机估计模型。保留缓存可以省去重复下载。核对到的资料未给出这条安装路线通用的内存和磁盘最低要求。", sources: [source("inference", "推理脚本加载的模型")] },
      ],
      steps: [
        { title: "创建 TRELLIS.2 基础环境", body: "在 Linux 终端运行官方脚本。如果 CUDA 编译失败，先检查 CUDA_HOME，再按基础安装指南逐项安装脚本中的组件。", command: tutorialCommands.base, sources: [source("trellis", "官方安装命令")] },
        { title: "克隆 Pixal3D 并安装依赖", body: "继续使用同一个环境。回到上一级目录，克隆 Pixal3D，再用 requirements.txt 安装本地依赖。", command: tutorialCommands.clone, sources: [source("upstream", "Pixal3D 安装说明"), source("requirements", "本地依赖文件")] },
        { title: "为显卡编译 NATTEN", body: "运行前先替换两处 xx，分别填入显卡的 CUDA 架构和适合这台机器的编译任务数。NATTEN 文档给出的 Ada 架构示例是 8.9。这里沿用 Pixal3D 指定的 0.21.0 版本。", command: tutorialCommands.natten, sources: [source("upstream", "NATTEN 与 utils3d 命令"), source("natten", "架构与编译任务数")] },
        { title: "生成仓库自带示例", body: "在 Pixal3D 目录运行下方命令，首次执行可能需要下载权重。生成后打开 output.glb，确认模型带有纹理，并旋转查看侧面和背面。示例跑通后再换自己的图片。", command: tutorialCommands.generate, sources: [source("inference", "图片输入与 GLB 导出")] },
        { title: "打开本地交互界面", body: "需要交互上传图片时，可以启动 Gradio。下方命令会开启模型卸载。如果还不确定显存是否够用，或显卡架构是否兼容，可接着看低显存教程。", command: tutorialCommands.web, sources: [source("upstream", "本地 Gradio 界面")] },
      ],
      performance: {
        intro: "官方命令行帮助给出了以下显存估计，但没有说明对应的硬件。本站未做这组测量，资料也没有提供下载和首次加载的耗时。",
        rows: [
          { configuration: "官方推理：标准模式", memory: "约 18 GB（命令行估计）", time: "未公布", evidence: "帮助文字没有说明使用的 GPU、输入图片或测量方式。", sources: [source("inference", "低显存参数的帮助文字")] },
          { configuration: "官方推理：开启 --low_vram", memory: "约 10–12 GB（命令行估计）", time: "较慢，未公布具体耗时", evidence: "模型会随运行阶段在 CPU 与 GPU 之间移动，实际显存峰值取决于任务。", sources: [source("inference", "卸载模式估计")] },
        ],
      },
      errors: [
        { title: "CUDA 扩展无法导入或执行", body: "逐个检查 wheel 是否匹配 Python、PyTorch、CUDA 和显卡架构，不能只看文件名里有没有 CUDA。RTX 2070 的报告就记录了模块导入成功、运行显卡内核时仍然失败的情况。", sources: [source("turingIssue", "导入检查与内核执行的差异")] },
        { title: "FlashAttention 无法使用", body: "官方流程支持切换到 PyTorch SDPA。下方环境变量的写法适用于 Linux。使用 PowerShell 时，先设置 $env:ATTN_BACKEND='sdpa'，再运行 Python 命令。SDPA 切换的是注意力后端，无法修复稀疏算子的架构兼容性问题。", command: tutorialCommands.sdpa, sources: [source("upstream", "SDPA 替代方式")] },
        { title: "在线演示的依赖在本机安装失败", body: "改用本地依赖文件 requirements.txt。官方说明 requirements-hfdemo.txt 面向 H 系列 GPU，其他架构可能无法使用。", sources: [source("upstream", "演示环境依赖提示")] },
      ],
      files: [
        { title: "官方代码与权重", body: "从 TencentARC/Pixal3D 克隆代码，再从同名 Hugging Face 模型仓库获取权重。如果使用本地快照，要保留 pipeline.json 和 ckpts 的目录结构。", sources: [source("upstream", "官方源码"), source("weights", "官方模型卡"), source("checkpoints", "权重文件")] },
        { title: "流程中的辅助模型", body: "inference.py 还会用到 camenduru/dinov3-vitl16-pretrain-lvd1689m 和 Ruicheng/moge-2-vitl。这两个图片与相机模型不包含在 Pixal3D 权重中。", sources: [source("inference", "辅助模型标识")] },
      ],
      screenshots: {
        intro: "项目作者发布的这张结果示意图可以帮助你了解模型输出。图片来自上游项目，并非本教程在本机运行后截取。",
        items: [{ src: teaserSrc, alt: "TencentARC Pixal3D 项目示意图，展示参考图片与生成的 3D 资产", caption: "Pixal3D 官方项目示意图，来源为 TencentARC 与项目作者。", source: source("teaser", "仓库原图") }],
      },
    },
    gguf: {
      title: "Pixal3D GGUF 模型与 ComfyUI 配置教程",
      description: "查找 Pixal3D GGUF 文件，安装对应的社区加载器，了解量化格式、显存测试结果和常见报错。",
      summary: "Aero-Ex 发布的 Pixal3D GGUF 是社区转换版本，需要用对应的 TRELLIS.2 ComfyUI 包装器加载。安装时要配齐模型、加载器、解码器和 CUDA 依赖。",
      requirements: [
        { title: "可用的 CUDA 环境", body: "按包装器说明选择适合操作系统、Python 和 PyTorch 版本的安装方式。GGUF 能缩小权重文件，运行时仍需要 CUDA 网格与稀疏算子。", sources: [source("gguf", "包装器安装说明")] },
        { title: "同时安装两个社区节点仓库", body: "包装器通过 city96 的 ComfyUI-GGUF 执行量化 Linear 运算。贡献者曾记录过反量化失效，原因就是旁边缺少这个节点目录。", sources: [source("benchmark", "GGUF 集成前提"), source("city96", "GGUF 算子")] },
        { title: "下载完整模型组合", body: "保留 pipeline.json、配套 JSON 配置、四个量化生成模型、fp16 解码器、DINOv3 和共享形状编码器。管理器也会检查 Pixal3D GGUF 快照之外的辅助文件。硬盘上的文件大小不能直接换算成运行时显存。", sources: [source("ggufManager", "模型与辅助文件解析"), source("ggufWeights", "已发布的目录结构")] },
        { title: "复现实测需要的额外依赖", body: "贡献者的低显存测试还用到了 MoGe，以及能在测试用 sm89 显卡上运行的 CUDA libnatten。想复现同样的显存占用，先确认这些依赖和运行条件。", sources: [source("benchmark", "实测环境前提")] },
      ],
      steps: [
        { title: "安装 GGUF 包装器与相邻节点", body: "把两个仓库都克隆到 custom_nodes。再用 ComfyUI 自己的 Python，按包装器指南安装匹配的 wheel 和依赖。装好后重启 ComfyUI。", command: tutorialCommands.gguf, sources: [source("gguf", "包装器依赖"), source("city96", "ComfyUI-GGUF 安装")] },
        { title: "在 GGUF 加载器中选择 Pixal3D", body: "设置 modelname=Pixal3D-GGUF，选择 GGUF Q8_0 或 GGUF Q6_K，并设置 backend=sdpa、device=cuda、low_vram=true、keep_models_loaded=false。加载器从 Aero-Ex/Pixal3D-GGUF 下载到 models/Pixal3D-GGUF。", sources: [source("ggufNodes", "实际加载器选项"), source("ggufManager", "下载目录")] },
        { title: "载入自带的 Advanced 工作流", body: "打开 example_workflows/Advanced.json。首次尝试可使用 1024_cascade、每阶段 8 步、max_num_tokens=16384、max_views=1 与分块解码。排查已报告的级联问题时，保持 sparse_structure_resolution=32。", sources: [source("ggufWorkflows", "Advanced.json"), source("ggufNodes", "生成参数"), source("sparseIssue", "稀疏分辨率问题报告")] },
        { title: "比较性能前先检查纹理阶段显存", body: "下面的 RTX 4070 测试修改了源码，以降低纹理 NAF 条件处理的开销。原版安装未必能达到同样的显存峰值。参考补丁前，要确认自己的版本和故障与贡献者描述的一致。", sources: [source("benchmark", "补丁与实测条件")] },
        { title: "固定输入后导出并比较", body: "切换量化格式时，保持图片和种子不变，检查导出的网格、材质以及显存占用。记下节点的提交版本，之后更新时才方便对比。", sources: [source("ggufWorkflows", "导出工作流示例")] },
      ],
      performance: {
        intro: "这些结果由贡献者在 Linux 和 RTX 4070 12 GB 上测得，本站没有重复测试。两组都用了 1024_cascade、16k tokens、单视图和分块解码，并依赖 city96 节点、CUDA libnatten、MoGe 及纹理 NAF 源码补丁。这些数据还不能说明 6 GB 显卡能否运行。",
        rows: [
          { configuration: "Q6_K · 8/8/8 步 · 2048 纹理", memory: "峰值约 6.97 GB", time: "约 340 秒", evidence: "贡献者用 nvidia-smi 测量，使用的是 RTX 4070 和带源码补丁的环境。", sources: [source("benchmark", "Q6_K 测量")] },
          { configuration: "Q8_0 · 12/12/12 步 · 4096 纹理", memory: "峰值约 7.15 GB", time: "约 356 秒", evidence: "这组的步数和纹理尺寸也变了，不能据此单独比较量化格式的速度。", sources: [source("benchmark", "Q8_0 测量")] },
        ],
      },
      errors: [
        { title: "加载 GGUF 时张量维度不匹配", body: "先检查 city96/ComfyUI-GGUF 是否装在包装器旁边，安装后重启。贡献者遇到的 256 与 210 维度不匹配，原因是缺少量化 Linear 支持。", sources: [source("benchmark", "反量化缺失的诊断")] },
        { title: "稀疏分辨率设为 64 后显存溢出", body: "问题 #193 中，12 GB 显卡尝试多种量化格式都失败了，改为 32 则可以完成。这个报告针对 GGUF 分支，应用补丁前要核对涉及的提交版本。", sources: [source("sparseIssue", "受影响分支与复现方式")] },
        { title: "已经下载权重，仍提示文件缺失", body: "检查 Sparse、shape、texture、decoder 的目录名大小写，以及每个模型的 JSON 配置。可以交给加载器下载；手动下载时则要保留模型仓库的原有结构。", sources: [source("ggufManager", "远程与本地文件映射")] },
      ],
      files: [
        { title: "稀疏结构模型", body: "例如 Sparse/ss_flow_img_dit_1_3B_64_bf16_Q8_0.gguf，配套 ss_flow_img_dit_1_3B_64_bf16.json。仓库还发布了 Q4_K_M、Q5_K_M、Q6_K 与 BF16。", sources: [source("ggufSparse", "稀疏模型文件")] },
        { title: "形状与纹理模型", body: "Q8_0 对应 shape/slat_flow_img2shape_dit_1_3B_512_bf16_Q8_0.gguf、shape/slat_flow_img2shape_dit_1_3B_1024_bf16_Q8_0.gguf、texture/slat_flow_imgshape2tex_dit_1_3B_1024_bf16_Q8_0.gguf，并需要各自的 JSON 配置。", sources: [source("ggufShape", "形状文件"), source("ggufTexture", "纹理文件")] },
        { title: "解码器仍使用 safetensors", body: "decoder/ 包含 ss_dec_conv3d_16l8_fp16.safetensors、shape_dec_next_dc_f16c32_fp16.safetensors 与 tex_dec_next_dc_f16c32_fp16.safetensors，各有 JSON 配置。还需要下载 pipeline.json。", sources: [source("ggufDecoders", "解码器文件"), source("ggufWeights", "流程配置")] },
        { title: "图片编码器与共享形状编码器", body: "管理器从 Aero-Ex/Dinov3 下载缺失的 DINOv3 文件到 dinov3/facebook/dinov3-vitl16-pretrain-lvd1689m/，并从 Aero-Ex/Trellis2-GGUF 下载 encoders/shape_enc_next_dc_f16c32_fp16.safetensors 与 JSON。复制本地安装时也要保留这些辅助文件。", sources: [source("ggufManager", "辅助文件下载实现"), source("ggufDino", "DINOv3 辅助仓库"), source("ggufEncoders", "共享编码器文件")] },
      ],
      screenshots: {
        intro: "这张图来自 Pixal3D 上游项目，可以参考模型的输出效果，但不能据此判断 GGUF 的质量或显存占用。",
        items: [{ src: teaserSrc, alt: "TencentARC 原始 Pixal3D 图片转 3D 示例", caption: "官方模型示例；实际节点图请使用链接中的 GGUF 工作流 JSON。", source: source("teaser", "TencentARC 来源图片") }],
      },
    },
    "low-vram": {
      title: "Pixal3D 低显存教程：模型卸载与 RTX 2070 限制",
      description: "开启 Pixal3D 低显存模式，观察显存占用，检查 RTX 2070 的内核兼容性限制。",
      summary: "先尝试官方的 --low_vram 和 1024 流程。如果显存仍然不够，可以参考社区的 GGUF 硬件测试。RTX 2070 还需要单独检查架构兼容性，显存降下来并不意味着就能跑通。",
      requirements: [
        { title: "核对空闲显存与显卡架构", body: "运行前看一下显卡名称和已占用的显存，给桌面及其他进程留些余量。即使开启模型卸载，CUDA 内核也必须支持这张显卡。", sources: [source("nvidia", "GPU 显存查询"), source("turingIssue", "架构相关运行故障")] },
        { title: "给模型卸载预留系统内存", body: "原生流程会在每个阶段需要时才把模型搬到 GPU。这样能减少显存占用，代价是 CPU 内存和传输开销。官方尚未公布通用的系统内存最低要求。", sources: [source("pipeline", "分阶段卸载实现")] },
        { title: "RTX 2070 的完整运行尚未确认", body: "问题 #16 的历史缓存记录了一次 Windows 上的 RTX 2070 Max-Q 尝试：导入检查通过，注意力和稀疏 CUDA 内核执行却失败了。原仓库和问题目前都返回 404，这份记录只能作为历史背景。核对到的资料中，尚未确认该显卡成功完成整个流程，旧报告也无法用于验证当前兼容性。", sources: [source("turingIssue", "RTX 2070 报告"), source("comfyRegistry", "原节点包注册表")] },
      ],
      steps: [
        { title: "运行任务时观察显存", body: "在第二个终端运行下方只读命令，按 Ctrl+C 停止。记下观测到的最高采样值、显卡名称和配置。每秒采样一次可能漏掉短暂尖峰；如果要测 PyTorch 分配器峰值，需要在运行进程内部加入统计。", command: tutorialCommands.gpu, sources: [source("nvidia", "查询字段与刷新间隔"), source("sparseIssue", "进程内 PyTorch 峰值统计")] },
        { title: "开启原生模型卸载", body: "在已安装的 Pixal3D 目录运行下方命令。它使用 1024 级联流程，让各阶段模型在 CPU 与 GPU 之间移动。", command: tutorialCommands.low, sources: [source("inference", "分辨率与卸载参数"), source("pipeline", "卸载实现")] },
        { title: "注意力阶段失败时尝试 SDPA", body: "下方命令适用于 Linux shell。使用 PowerShell 时，先设置 $env:ATTN_BACKEND='sdpa'。SDPA 可以避开 FlashAttention 依赖，缺失的稀疏卷积内核仍要另外处理。", command: tutorialCommands.sdpa, sources: [source("upstream", "官方 SDPA 选项"), source("turingIssue", "独立的稀疏内核问题")] },
        { title: "减少已有 Saganaki22 工作流的阶段负载", body: "如果使用注册表中保留的旧 Saganaki22 节点包，可以尝试 hybrid_low_vram 或 native_low_vram。关闭 MoGe/RMBG 加载，设置 camera_mode=manual；透明输入则使用 background_mode=keep_alpha。这些参数属于旧节点包，不能直接套到当前的原生 ComfyUI 模板。", sources: [source("comfy", "保留的节点包 README"), source("comfyRegistryInstall", "已发布的 0.2.4 包"), source("nativeComfy", "当前原生模板")] },
        { title: "环境兼容后再尝试 GGUF", body: "如果原生卸载仍超出显存预算，可以接着看 GGUF 教程。社区测试用的是带源码补丁的 RTX 4070，其显存数据不能直接用于判断未经测试的 RTX 2070 或 6 GB 显卡。", sources: [source("benchmark", "实测显卡与补丁条件"), source("turingIssue", "RTX 2070 执行报告")] },
      ],
      performance: {
        intro: "官方显存估计和兼容性报告回答的是不同问题。它们都无法保证，在一个固定的最低显存值下，所有输入、导出设置和 GPU 架构都能完成运行。",
        rows: [
          { configuration: "原生 --low_vram · 默认 1024", memory: "约 10–12 GB（命令行估计）", time: "未公布实测耗时", evidence: "帮助文字没有说明显卡和输入。CPU/GPU 之间的传输通常会增加耗时。", sources: [source("inference", "官方估计")] },
          { configuration: "RTX 2070 Max-Q · Windows · 历史 SDPA 补丁报告", memory: "未报告完整运行峰值", time: "未完成整个流程", evidence: "缓存报告记录了稀疏内核导致的失败，原问题目前已无法访问。", sources: [source("turingIssue", "未成功完成的报告")] },
          { configuration: "6 GB 显卡", memory: "此处未验证", time: "此处未验证", evidence: "核对到的一手资料还不足以证明这个显存预算能可靠地完成生成。", sources: [source("benchmark", "现有报告使用 12 GB 显卡")] },
        ],
      },
      errors: [
        { title: "FlashAttention 提示需要 Ampere 或更新架构", body: "历史 Turing 报告曾出现这个提示，原问题目前已无法访问。可以先试官方的 SDPA 后端，再分别检查其余 CUDA 运算是否兼容。", sources: [source("turingIssue", "注意力错误报告")] },
        { title: "CUDA 提示没有可执行的内核镜像", body: "编译扩展可能没有包含这张 GPU 所用架构的代码。RTX 2070 的历史缓存报告中，修补注意力后，稀疏卷积阶段仍出现了这个错误；原问题目前返回 404。缩小模型文件也不能解决 wheel 的兼容性问题。", sources: [source("turingIssue", "CUDA 内核错误报告")] },
        { title: "NAF 或纹理条件处理显存溢出", body: "先从 traceback 找到失败的阶段。GGUF 测试用到了纹理 NAF 补丁，Saganaki22 节点也有回退细化设置的说明。选择处理方式时，要对应自己正在使用的节点版本。", sources: [source("benchmark", "纹理条件处理诊断"), source("comfy", "NAF 回退设置")] },
      ],
      files: [
        { title: "原生与 GGUF 权重需要不同加载器", body: "官方流程加载 TencentARC/Pixal3D，量化流程则通过社区包装器加载 Aero-Ex/Pixal3D-GGUF。仅把 .gguf 文件放进原生权重目录，原生加载器无法使用它。", sources: [source("inference", "原生模型路径"), source("ggufNodes", "GGUF 加载器")] },
        { title: "归档的低显存相机控制工作流", body: "infinition/Pixal3D-pipeline 保存了 pixal3d_low_vram_cam_control_example_workflow.png，图片内嵌了旧工作流。它需要配合注册表中的 Saganaki22 节点包使用，不适用于原生 ComfyUI 或 Aero-Ex 加载器。", sources: [source("comfyWorkflows", "保留的工作流文件"), source("comfyRegistry", "原节点包注册表")] },
      ],
      screenshots: {
        intro: "这张 Saganaki22 工作流图片保存在 infinition 的批处理包装器仓库中。它展示的是旧集成的参数设置，不代表显卡兼容性实测结果。",
        items: [{ src: lowWorkflowSrc, alt: "归档的 Saganaki22 Pixal3D 低显存工作流，包含手动相机控制", caption: "infinition/Pixal3D-pipeline 保存的低显存相机控制工作流副本；原 Saganaki22 仓库目前返回 404。", source: source("lowWorkflow", "保留的工作流 PNG") }],
      },
    },
    comfyui: {
      title: "Pixal3D ComfyUI 教程：安装、加载与导出 GLB",
      description: "使用官方原生 Pixal3D ComfyUI 模板，更新环境、下载工作流和模型文件，生成带纹理的 3D 模型。",
      summary: "ComfyUI 已内置 Pixal3D 支持，这里使用官方单图模板和 Comfy-Org 的模型目录。Aero-Ex GGUF 包装器和旧 Saganaki22 节点包各有自己的配置，使用时要与对应的模型和工作流配套。",
      requirements: [
        { title: "更新 ComfyUI", body: "按自己的平台安装 ComfyUI，已有安装则先更新。Pixal3D 原生支持于 2026 年 8 月 22 日合并。如果找不到核心节点，先看引擎版本和启动日志。", sources: [source("comfyInstall", "ComfyUI 下载"), source("nativeSupport", "已合并的原生支持"), source("comfyUpdate", "引擎与依赖更新")] },
        { title: "使用 ComfyUI 自己的 Python 环境", body: "手动安装时，要在已激活的虚拟环境中更新依赖。便携版和桌面版分别使用各自的更新方式。原生指南没有给出对应具体硬件的最低显存，也没有提供 RTX 2070 完整运行的测试结果。", sources: [source("comfyUpdate", "不同安装类型的更新方式"), source("nativeComfy", "原生工作流指南")] },
        { title: "下载模板引用的所有模型", body: "模板引用了 Pixal3D 和 TRELLIS.2 检查点、两个 VAE、DINOv3、MoGe 和 BiRefNet。按下方列出的原生 ComfyUI 目录放置文件，下载时保留原文件名。", sources: [source("nativeWorkflow", "实际模型加载选项"), source("nativeWeights", "Comfy-Org 模型目录")] },
      ],
      steps: [
        { title: "更新 ComfyUI 并重启", body: "如果是手动 Git 安装，先激活已有的 Python 环境，再到 ComfyUI 根目录运行下方命令。Windows 便携版从便携包外层目录运行 ComfyUI_windows_portable/update/update_comfyui.bat。桌面版通过 Manage → Update 更新引擎。", command: tutorialCommands.comfy, sources: [source("comfyUpdate", "官方更新方式")] },
        { title: "载入官方图片转模型模板", body: "在模板库搜索 Pixal3D & TRELLIS.2: Image to Model。也可以从链接中的仓库载入 3d_pixal3d_trellis2_image_to_model.json。", sources: [source("nativeWorkflow", "工作流 JSON"), source("nativeWeights", "模型卡链接的模板")] },
        { title: "把权重放入原生目录", body: "下载下方文件后，检查节点图中的模型选项。要运行 Pixal3D，就让 Boolean (Switch to Trellis2) 保持 false。", sources: [source("nativeWeights", "Pixal3D 文件"), source("nativeTrellis", "TRELLIS.2 检查点"), source("nativeWorkflow", "开关与加载器默认值")] },
        { title: "用现成输入图片测试", body: "把 viking_wolf_rune_axe.png 载入 LoadImage。第一次运行先保留模板设置，看看预处理预览是否正常。模板也提供了背景移除开关，可以跳过这个阶段。", sources: [source("nativeInput", "官方示例输入"), source("nativeWorkflow", "输入与预处理节点图")] },
        { title: "排队并检查导出的模型", body: "按 Ctrl+Enter 开始排队，macOS 使用 Cmd+Enter。导出后在 Preview3DAdvanced 查看带纹理的 GLB，旋转检查背面和材质，再调整设置。文档给出的保存目录是 ComfyUI/output/3d/ComfyUI/。", sources: [source("nativeComfy", "排队、预览与保存目录"), source("nativeWorkflow", "Save3DAdvanced 输出节点"), source("nativeExport", "GLB 序列化与保存实现")] },
      ],
      performance: {
        intro: "官方原生指南没有公布固定的显存峰值或耗时。较早的贡献者报告使用了另一套节点包，其结果不能用来预测当前原生模板的性能。",
        rows: [
          { configuration: "当前官方原生单图模板", memory: "指南未报告", time: "指南未报告", evidence: "指南没有提供注明 GPU 的测试。自行运行时，记下硬件、设置和完整导出的结果。", sources: [source("nativeComfy", "官方工作流指南")] },
          { configuration: "旧批处理包装器 · RTX 4070 Ti 12 GB", memory: "显卡容量 12 GB，未报告峰值", time: "整个流程约 5–6 分钟", evidence: "贡献者使用 Saganaki22 包装器，计时包含抠图。这套流程与原生 ComfyUI 不同。", sources: [source("comfyBatch", "历史批处理报告")] },
        ],
      },
      errors: [
        { title: "模板或核心节点缺失", body: "更新 ComfyUI 代码和依赖后重启。官方指南提到，引擎过旧或启动时导入失败都可能造成节点缺失。还要确认自己使用的稳定版本已经包含这些新节点。", sources: [source("nativeComfy", "缺失节点说明"), source("comfyUpdate", "核心依赖与模板更新")] },
        { title: "模型下拉框找不到文件", body: "对照模型卡和模板，检查文件名及 models 子目录。Comfy-Org 重新打包的权重、Tencent 原生快照和 Aero-Ex GGUF 各有对应的目录，不能混用。", sources: [source("nativeWeights", "模型目录要求"), source("nativeWorkflow", "加载器文件名")] },
        { title: "旧 Saganaki22 克隆地址返回 404", body: "原仓库目前无法访问。已有旧节点工作流可以使用 Manager 注册表中的 Pixal3D-ComfyUI，发布者是 saganaki22，0.2.4 包已确认仍可下载。使用时按它自己的模型目录和保留的 README 配置，不要套用本页的原生模板。", sources: [source("comfyRegistry", "可选旧节点包"), source("comfyRegistryInstall", "可下载的 0.2.4 包"), source("comfy", "保留的节点包 README")] },
      ],
      files: [
        { title: "扩散检查点", body: "把 Comfy-Org/Pixal3D 的 pixal3d_int8_convrot.safetensors 与 Comfy-Org/TRELLIS.2 的 trellis_2_int8_convrot.safetensors 放入 ComfyUI/models/diffusion_models/。现成模板列出了这两种开关选项。", sources: [source("nativeWeights", "Pixal3D 检查点"), source("nativeTrellis", "TRELLIS.2 检查点"), source("nativeWorkflow", "两个加载器选项")] },
        { title: "VAE 与图片编码器", body: "从 Comfy-Org/Pixal3D 下载 trellis_2_shape_vae_bf16.safetensors 与 trellis_2_texture_vae_bf16.safetensors，放入 ComfyUI/models/vae/；dino_v3_L_naf_fp32.safetensors 放入 ComfyUI/models/clip_vision/。", sources: [source("nativeWeights", "VAE 与 CLIP vision 目录")] },
        { title: "相机与背景辅助模型", body: "Comfy-Org/MoGe 的 moge_2_vitl_normal_fp16.safetensors 放入 ComfyUI/models/geometry_estimation/。Comfy-Org/BiRefNet 的 birefnet.safetensors 放入 ComfyUI/models/background_removal/。", sources: [source("nativeMoge", "MoGe 文件"), source("nativeBackground", "BiRefNet 文件"), source("nativeComfy", "辅助模型目录")] },
        { title: "工作流与测试输入", body: "使用 Comfy-Org/workflow_templates 的 3d_pixal3d_trellis2_image_to_model.json 和 viking_wolf_rune_axe.png。下方图片只展示预览效果，载入节点图时要导入 JSON。", sources: [source("nativeWorkflow", "原生工作流 JSON"), source("nativeInput", "测试输入图片")] },
      ],
      screenshots: {
        intro: "Comfy-Org 发布了这张原生模板预览图，官方指南也引用了它。图片来自上游，并非本站运行测试后截取。",
        items: [
          { src: nativeWorkflowSrc, alt: "Comfy-Org 官方 Pixal3D 与 TRELLIS.2 图片转模型模板预览", caption: "官方原生单图模板预览；对应 JSON 可从上方步骤下载。", source: source("nativePreview", "Comfy-Org 模板预览") },
        ],
      },
    },
  },
};
