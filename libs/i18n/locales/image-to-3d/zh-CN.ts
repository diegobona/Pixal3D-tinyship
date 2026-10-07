import type { ImageTo3DTranslations } from "../../../ai3d/intent-pages";
import { downloadZhCN } from "./download-zh-CN";
import { comparisonZhCN } from "./comparison-zh-CN";

const sampleDefaults = {
  provenance: "victor/pixal3d-studio · 原创矢量输入图",
  license: "免费用于非商业评估",
};

export const imageTo3DZhCN: ImageTo3DTranslations = {
  common: {
    home: "首页",
    reviewed: "来源核查日期",
    workspaceTitle: "用自己的图片生成模型",
    details: "参数与来源",
    sources: "来源",
    formats: "输出格式",
    suitable: "适合何时尝试",
    avoid: "使用前注意",
    quality: "需要检查什么",
    runtime: "运行方式",
    memory: "显存需求",
    time: "生成耗时",
    compareLink: "选择模型，在线生成 3D",
    downloadLink: "免费下载 3D 模型",
    homeLinksTitle: "3D 模型下载与使用指南",
    homeLinksDescription: "了解 3D 模型的生成与导出步骤，选择适合建模、游戏或 3D 打印的文件格式。",
    homeMultiModel: {
      action: "更多 AI 3D 生成工具",
    },
  },
  download: downloadZhCN,
  comparison: comparisonZhCN,
  samples: {
    mushroom: { ...sampleDefaults, name: "红帽蘑菇", description: "由图中的原创插画生成，GLB 保留导出材质，STL 和 OBJ 只含几何。复用前请检查菌盖和底部。", referenceAlt: "白色背景上的原创红帽蘑菇输入插画" },
    teapot: { ...sampleDefaults, name: "绿色陶瓷茶壶", description: "由图中的原创插画生成，请将壶嘴和把手与输入图对照。STL 和 OBJ 只含几何，不含贴图。", referenceAlt: "白色背景上的原创绿色陶瓷茶壶输入插画" },
    chair: { ...sampleDefaults, name: "木椅", description: "由图中的原创蓝色坐垫木椅插画生成。导入后检查靠背与椅腿的连接，STL 和 OBJ 只含几何。", referenceAlt: "白色背景上的原创蓝色坐垫木椅输入插画" },
    crate: { ...sampleDefaults, name: "木箱", description: "由图中的原创无品牌木箱插画生成。检查木板和不可见表面，STL 和 OBJ 只含几何。", referenceAlt: "白色背景上的原创无品牌木箱输入插画" },
  },
};
