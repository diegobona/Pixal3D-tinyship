import type { StaticBlogPost } from "./static-posts";

const author = "Pixal3D 团队";
const publishedAt = "2026-05-16T00:00:00.000Z";

export const ZH_LEGACY_STATIC_BLOG_POSTS: StaticBlogPost[] = [
  {
    id: "static-image-to-3d-model", slug: "image-to-3d-model", title: "图片转 3D 模型实用指南",
    excerpt: "了解怎样选择更合适的参考图、检查首次生成结果，并避开图片转 3D 的常见问题。",
    coverImage: "/blog-covers/image-to-3d-model.webp", authorName: author, publishedAt,
    sections: [
      { type: "paragraphs", paragraphs: [
        "参考图中的主体越明确、轮廓越清晰、表面细节越充分，图片转 3D 的效果通常越好。",
        "本指南介绍如何准备输入图片，以及怎样判断首次生成的模型是否适合进入后续流程。"
      ] },
      { type: "paragraphs", heading: "什么样的参考图效果更好", paragraphs: [
        "理想的图片通常只有一个主体，物体边缘与背景区分明显，你关心的部位也有足够细节。",
        "商品图、物体渲染图、简洁的角色概念图和正面参考图，通常比拥挤的生活场景更容易处理。",
        "如果主体与背景混在一起，模型可能丢失轮廓；如果只拍到单一平面，背面则需要由系统推断，应重点检查。",
        "上传前先围绕主体裁剪并清除多余元素。一次简单裁剪，往往比反复重试更能改善形体。"
      ] },
      { type: "list", heading: "实用检查清单", items: [
        "一张图只保留一个清晰主体。", "让背景足够简洁，物体轮廓容易辨认。", "避免主体被画面边缘裁掉。",
        "确认关键纹理在原图中清晰可见。", "生成后检查形状、比例、纹理位置以及破损或空洞区域。"
      ] },
      { type: "list", heading: "常见误区", items: [
        "上传内容拥挤的图片，却没有指出哪个物体才是主体。", "使用边缘和纹理已经模糊的小缩略图。",
        "只看正面截图，不旋转检查整个模型。"
      ] },
      { type: "faq", heading: "常见问题", items: [
        { question: "任意图片都能转成 3D 模型吗？", answer: "主体单一清晰时效果最好。复杂场景通常需要先裁剪，或换用更干净的参考图。" },
        { question: "生成结果能直接投入正式制作吗？", answer: "正式使用前请检查拓扑、比例和纹理细节；根据目标流程，部分结果仍需清理。" },
        { question: "应该从哪里开始？", answer: "先在首页生成一次。如果形体不够清晰，再使用更干净的参考图迭代。" }
      ] }
    ]
  },
  {
    id: "static-ai-3d-model-generator", slug: "ai-3d-model-generator", title: "AI 3D 模型生成器指南",
    excerpt: "了解 AI 3D 生成适合做什么、如何检查输出，以及用于真实项目之前要关注哪些问题。",
    coverImage: "/blog-covers/ai-3d-model-generator.webp", authorName: author, publishedAt,
    sections: [
      { type: "paragraphs", paragraphs: [
        "AI 3D 模型生成器可以把参考图快速转成初步模型，用于概念评审、资产规划和快速视觉测试。",
        "关键在于分清系统擅长推断的部分，以及仍需人工检查的部分。"
      ] },
      { type: "paragraphs", heading: "AI 3D 生成能做什么", paragraphs: [
        "当你希望在投入手工建模前快速得到一个物体时，AI 3D 生成很有价值。",
        "它能帮助你探索造型语言、纹理方向，并判断二维创意是否具备转成三维资产的信息。",
        "请重点检查细薄结构、对称细节、背面推断和纹理接缝，这些区域最容易暴露需要修复的问题。",
        "它最适合用于资产流程早期的快速定向，而不是替代最终拓扑、精确尺寸或制造级精度。"
      ] },
      { type: "list", heading: "实用检查清单", items: [
        "选择主体单一且完整可见的参考图。", "先用生成结果验证轮廓和整体体积。", "旋转模型，检查隐藏面是否合理。",
        "检查纹理是否拉伸、重复或缺失。", "用于游戏、商品场景或客户预览前预留清理时间。"
      ] },
      { type: "list", heading: "常见误区", items: [
        "期待 AI 生成完全替代最终网格清理。", "上传主体被阴影或强反光遮挡的图片。", "只比较生成速度，忽略检查和导出需求。"
      ] },
      { type: "faq", heading: "常见问题", items: [
        { question: "什么是 AI 3D 模型生成器？", answer: "它是根据图片等输入自动创建 3D 模型的软件。" },
        { question: "Pixal3D 能用于游戏资产吗？", answer: "可以先用于游戏资产概念和原型，再根据需要清理和优化结果。" },
        { question: "每张图片的生成质量都一样吗？", answer: "不一样。主体明确、画面简洁的图片通常能得到更实用的结果。" }
      ] }
    ]
  },
  {
    id: "static-image-to-glb", slug: "image-to-glb", title: "图片转 GLB 完整指南",
    excerpt: "了解 GLB 为什么适合网页预览、生成后该检查什么，以及怎样避免低质量的网页 3D 资产。",
    coverImage: "/blog-covers/image-to-glb.webp", authorName: author, publishedAt,
    sections: [
      { type: "paragraphs", paragraphs: [
        "GLB 很适合浏览器 3D、商品预览、游戏原型和 AR 实验。",
        "下面介绍如何判断图片生成的模型是否已成为可用的 GLB 资产。"
      ] },
      { type: "paragraphs", heading: "为什么选择 GLB", paragraphs: [
        "GLB 可以把几何、材质、纹理和场景数据打包进一个二进制文件。",
        "因此它便于移动、测试和分享，很适合网页预览及互动 3D 查看器。",
        "正式使用前，请检查加载速度、旋转时纹理是否稳定，以及模型比例在目标查看器中是否合理。",
        "如果模型正面很好但侧面破损，应换用更清晰的参考图重试，或在公开展示前手工清理。"
      ] },
      { type: "list", heading: "实用检查清单", items: [
        "在查看器中从各个角度旋转模型。", "检查曲面和薄片上的纹理质量。", "确认文件体积适合目标网页或原型。",
        "检查破损几何、漂浮碎片和缺失的背面。", "保留干净参考图，便于首次 GLB 不理想时重新生成。"
      ] },
      { type: "list", heading: "常见误区", items: [
        "只测试模型正面。", "把 GLB 放上网页前不检查文件大小。", "不检查关键表面上的纹理拉伸。"
      ] },
      { type: "faq", heading: "常见问题", items: [
        { question: "GLB 通常用来做什么？", answer: "GLB 是常用于网页、游戏、AR 和互动预览的紧凑型 3D 资产格式。" },
        { question: "Pixal3D 能完全替代 3D 清理工具吗？", answer: "不能。先用 Pixal3D 生成和探索，再在最终使用前检查并优化模型。" },
        { question: "什么图片适合生成 GLB？", answer: "选择物体边界明确、形体细节足够的图片，为 3D 生成提供清楚依据。" }
      ] }
    ]
  },
  {
    id: "static-image-to-stl", slug: "image-to-stl", title: "图片转 STL 与 3D 打印指南",
    excerpt: "了解将图片生成的模型带入 STL 打印流程前，需要检查和处理哪些关键问题。",
    coverImage: "/blog-covers/image-to-stl.webp", authorName: author, publishedAt,
    sections: [
      { type: "paragraphs", paragraphs: [
        "STL 广泛用于 3D 打印，但图片生成的模型通常需要检查后才能打印。",
        "本指南梳理了准备 STL 形体时最重要的检查项。"
      ] },
      { type: "paragraphs", heading: "STL 文件需要满足什么", paragraphs: [
        "STL 保存的是表面几何，而不是丰富材质或 PBR 纹理。",
        "面向 3D 打印时，需要关注网格是否封闭、薄片能否承受打印，以及模型比例是否符合现实。",
        "Pixal3D 可以根据图片创建形体，但面向打印的 STL 往往仍需额外清理。",
        "请把生成模型当作起点，并在打印前用切片或网格修复软件检查。"
      ] },
      { type: "list", heading: "实用检查清单", items: [
        "确认生成网格封闭且没有明显破损。", "检查天线、把手等细部是否薄到无法打印。", "导出或切片前设置真实尺寸。",
        "如果切片软件报告几何错误，请修复非流形区域。", "需要精确尺寸时，只把生成模型当作起点。"
      ] },
      { type: "list", heading: "常见误区", items: [
        "认为预览好看就一定可以直接打印。", "忘记 STL 不像 GLB 那样保留彩色纹理。", "没有检查壁厚和比例就送去打印。"
      ] },
      { type: "faq", heading: "常见问题", items: [
        { question: "图片生成的模型可以变成 STL 吗？", answer: "可以，但用于打印前应该检查并修复模型。" },
        { question: "STL 会保留纹理信息吗？", answer: "标准 STL 主要保存几何，并不适合丰富色彩或 PBR 纹理数据。" },
        { question: "什么图片适合准备 STL？", answer: "请选择体积感明确、轮廓清楚、背景干扰少的物体图片。" }
      ] }
    ]
  },
  {
    id: "static-pixal3d-alternative", slug: "pixal3d-alternative", title: "Pixal3D 与同类工具怎么选",
    excerpt: "用同一张参考图、公平检查还原度和后期清理成本，正确比较图片转 3D 工具。",
    coverImage: "/blog-covers/pixal3d-alternative.webp", authorName: author, publishedAt,
    sections: [
      { type: "paragraphs", paragraphs: [
        "比较图片转 3D 工具时，应关注输入质量、输出格式、模型还原度、纹理质量、速度和后期清理工作量。"
      ] },
      { type: "paragraphs", heading: "怎样公平比较图片转 3D 工具", paragraphs: [
        "公平比较的第一步，是让每个工具使用同一张参考图。",
        "选择一张干净的物体图片，生成后从各个角度检查，不要只对比首张预览截图。",
        "如果你关心图片还原度、像素对齐的形体重建、几何细节、PBR 风格纹理和单图快速迭代，可以重点观察 Pixal3D 的表现。",
        "建议建立一个小型测试集：商品图、风格化物体、简单角色和一张困难图片，以便公平、重复地比较。"
      ] },
      { type: "list", heading: "实用检查清单", items: [
        "比较生成器时使用同一张原图。", "检查结果是否忠于原始形状和风格。", "从侧面和背面检查几何，而不只看正面。",
        "尽可能在相同灯光下比较纹理。", "结合 GLB 预览或 STL 准备等导出需求评估。"
      ] },
      { type: "list", heading: "常见误区", items: [
        "只凭落地页上的精选案例选择工具。", "每个生成器使用不同图片，却认为比较公平。", "忽略最终模型在真实项目中的清理成本。"
      ] },
      { type: "faq", heading: "常见问题", items: [
        { question: "首先应该比较什么？", answer: "先比较形体还原度、纹理质量、导出格式和后期清理工作量。" },
        { question: "Pixal3D 适合所有 3D 任务吗？", answer: "没有一种图片转 3D 工具适合所有任务。请用自己的图片测试，并认真检查结果。" },
        { question: "为什么必须使用同一张图片？", answer: "相同输入能让测试更公平，也更容易判断哪个工具更适合你的素材。" }
      ] }
    ]
  }
];
