import { en } from './en'
import type { Locale } from './types'

export const zhCN: Locale = {
  ...en,
  pixal3d: {
    ...en.pixal3d,
    generator: {
      ...en.pixal3d.generator,
      referenceImageCta: "没有参考图像，去免费生成"
    }
  },
  blog: {
    ...en.blog,
    metadata: {
      title: "Pixal3D 博客",
      description: "阅读 Pixal3D 的最新动态与 AI 3D 模型生成指南。",
      keywords: "Pixal3D 博客, AI 3D 模型指南, 图片转 3D"
    },
    title: "博客",
    subtitle: "Pixal3D 动态与实用指南",
    publishedOn: "发布于",
    by: "作者",
    noPosts: "暂时没有文章，欢迎稍后再来！",
    backToBlog: "返回博客",
    staticPosts: {
      pixal3dModelUses: {
        title: "用 Pixal3D 生成 3D 模型后，可以用来做什么？",
        excerpt: "从 3D 场景道具、游戏原型到商品预览、AR 体验和 3D 打印准备，了解如何真正用好 Pixal3D 生成的模型。",
        intro: [
          "生成模型只是开始。Pixal3D 可以把一张参考图快速转化为能够进入场景搭建、原型设计、互动内容与实体制作流程的 3D 资产。",
          "模型最适合去哪里，取决于几何结构、纹理质量、尺寸和文件格式。可以先从下面的用途开始，再根据文末清单完成交付前检查。"
        ],
        sceneProps: {
          heading: "1. 用作搭建 3D 场景时的道具",
          beforeLink: "生成模型后，最快上手的方式之一，就是把它作为道具放到角色或环境周围。在 ",
          linkLabel: "AnyPoses",
          afterLink: " 中，你可以上传 Pixal3D 模型作为自定义道具，把它与角色及其他物体一起布置，用于插画参考、故事板或构图规划。",
          alt: "AnyPoses 3D 场景编辑器，画面中包含沙发、人体模型、花瓶和上传自定义道具按钮",
          caption: "AnyPoses 支持上传 GLB 或 STL 文件作为自定义场景道具。"
        },
        prototyping: {
          heading: "2. 把想法快速变成概念原型",
          paragraphs: [
            "生成的 3D 模型能回答平面概念图难以回答的空间问题：侧面轮廓是否成立？比例是否可信？缩小后还能否清楚辨认？",
            "在投入手工建模和制作级拓扑之前，可以先用它完成早期评审、提案视觉和预演。"
          ]
        },
        games: {
          heading: "3. 搭建游戏和互动体验原型",
          paragraphs: [
            "在游戏或 WebGL 体验尚处于搭建阶段时，Pixal3D 模型可以充当道具、收集物、场景装饰或互动目标。",
            "用于实时项目之前，请检查面数、纹理分辨率、轴心、碰撞需求和材质兼容性。优化通常是高质量生成资产进入流畅运行环境的关键一步。"
          ]
        },
        commerce: {
          heading: "4. 制作商品与电商 3D 预览",
          paragraphs: [
            "3D 模型可以用于转台动画、互动商品查看器、生活方式场景样机和不同机位的展示，不必为每个角度重新拍摄。",
            "在与实物核对前，应把尺寸和颜色视为视觉近似值。用于面向客户的页面时，请在不同角度和灯光下检查纹理瑕疵。"
          ]
        },
        spatial: {
          heading: "5. 探索 AR 与空间展示",
          paragraphs: [
            "GLB 资产常用于浏览器 3D 和增强现实体验。体积适中的 Pixal3D 输出可以用于房间、展览、课堂或互动演示中的早期摆放测试。",
            "请设置可信的现实尺寸、减小文件体积，并在目标设备上测试。移动设备的性能和材质支持可能与桌面预览差异很大。"
          ]
        },
        printing: {
          heading: "6. 作为 3D 打印工作流的起点",
          paragraphs: [
            "如果生成的形体合适，可以将它带入面向打印的流程，用于制作模型小样、桌面摆件、教学用具或形态研究。",
            "渲染好看并不等于可以直接打印。请先检查网格是否闭合，修复非流形几何，加厚脆弱细节，设定最终尺寸，并在切片软件中验证。"
          ]
        },
        checklistHeading: "使用模型前的检查清单",
        checklistItems: [
          "旋转模型，检查正面、背面、底部和细小部件。",
          "确认目标工具支持导出的格式、材质与纹理。",
          "为目标工作流设置合适的尺寸、原点和轴心。",
          "面向实时或移动端使用时，优化几何和纹理尺寸。",
          "保留原始参考图，方便重新生成或比较版本。"
        ],
        faqHeading: "常见问题",
        faq: [
          {
            question: "可以把 Pixal3D 模型直接上传到 AnyPoses 吗？",
            answer: "可以。导出受支持的 GLB 或 STL 文件，然后使用 AnyPoses 的“上传自定义道具”功能。模型应尽量轻量，以保持场景编辑流畅。"
          },
          {
            question: "生成的模型可以直接用于游戏或商品页吗？",
            answer: "它很适合作为高质量起点，但仍需针对目标环境检查拓扑、纹理、尺寸、性能和视觉准确性。"
          },
          {
            question: "应该选择哪种格式？",
            answer: "GLB 适合带纹理的网页和实时预览；STL 以几何为主，常用于 3D 打印工作流。"
          }
        ]
      }
    }
  }
}
