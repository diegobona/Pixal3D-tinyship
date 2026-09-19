import type { Locale } from './types'

export const zhCN: Locale = {
  common: {
    login: "登录", and: "和", loading: "加载中……", unexpectedError: "发生了意外错误", viewPlans: "查看套餐", dismissMessage: "关闭消息",
    notifications: { success: "成功", error: "错误", notice: "提示", dismiss: "关闭通知" }
  },
  actions: { previous: "上一页", next: "下一页", createAccount: "创建账户" },
  home: { metadata: {
    title: "Pixal3D - 免费 AI 图片转 3D 模型生成器",
    description: "Pixal3D 是由腾讯 ARC 开源项目驱动的免费 AI 图片转 3D 工具。上传一张图片，即可在线生成 3D 模型。",
    keywords: "Pixal3D, 图片转3D, AI 3D模型生成器, 3D模型制作, 图片转GLB, AI 3D资产"
  } },
  header: {
    navigation: { home: "首页", pricing: "价格", blog: "博客", openMenu: "打开主菜单" },
    sourceBadge: "源自 TencentARC",
    auth: { signIn: "登录", signOut: "退出登录", dashboard: "控制台", myAssets: "我的资产", myCredits: "我的积分", userFallback: "用户" },
    language: { english: "English", chinese: "简体中文", openMenu: "选择语言" }
  },
  pixal3d: {
    generator: {
      heroTitle: "把任意图片变成高还原度 3D 模型",
      subtitle: "完全免费使用",
      referenceImageCta: "没有参考图？免费生成一张",
      signedOutTitle: "登录后即可免费使用",
      signedOutDescription: "登录即可解锁本页的免费 Pixal3D 工作区。",
      signedOutButton: "登录",
      imageHint: "上传一张图片，交给 Pixal3D 生成 3D 模型。",
      imagePreviewAlt: "已上传的参考图片",
      uploadButton: "上传图片",
      dragDropPaste: "拖放图片到这里",
      orLabel: "或",
      selectFileButton: "选择文件",
      samplePrompt: "没有图片？试试这些示例：",
      useSample: "使用示例",
      removeImage: "移除已上传图片",
      exampleResultTitle: "示例结果",
      exampleModelLabel: "3D 结果",
      featuresNav: "功能",
      defaultPrompt: "生成一个比例准确、拓扑整洁、采用中性棚拍光照且适合 PBR 材质的游戏级 3D 资产。",
      trialDescription: "无需登录即可试用 Pixal3D。可使用两次，每次 15 分钟，不消耗积分。",
      stylePreset: "游戏开发：高模",
      cleanTopology: "整洁拓扑",
      pbrMaterials: "PBR 材质",
      subscribeButton: "订阅",
      subscribeToGenerateButton: "订阅后生成",
      upgradeButton: "升级",
      upgradeToGenerateButton: "升级后生成",
      freeTrialButton: "开始免费试用",
      freeTrialLoading: "正在寻找服务器……",
      freeTrialSelected: "免费试用服务器已就绪。",
      freeTrialExpired: "本次免费试用已结束。",
      hfTrialTitle: "Pixal3D 免费试用",
      hfTrialQueueLabel: "当前排队人数",
      hfTrialTimeLeft: "剩余时间",
      hfTrialStartHint: "如果“开始生成”按钮暂不可用，请稍等几秒，让服务器完成加载。",
      hfTrialClose: "关闭",
      hfTrialFindingTitle: "正在寻找可用服务器",
      hfTrialFindingDescription: "我们正在检查免费试用资源池，并为你预留一个在线的 Pixal3D 会话，通常只需几秒。",
      hfTrialLoadingTitle: "正在打开免费试用工作区",
      hfTrialLoadingDescription: "服务器已经就绪，工作区正在打开，请暂时不要关闭此页面。",
      generateButton: "生成模型",
      generatingButton: "正在构建模型……",
      resultTitle: "3D 模型已生成",
      previewTitle: "预览 3D 模型",
      previewLoading: "正在加载模型……",
      previewErrorTitle: "模型预览失败",
      previewErrorDescription: "无法在此处加载这个 GLB 文件。你仍可下载文件，并用其他 3D 查看器打开。",
      previewModelButton: "预览 GLB",
      closePreviewButton: "关闭预览",
      openModelButton: "打开 GLB",
      downloadModelButton: "下载 GLB",
      settings: {
        resolution: "目标分辨率", textureSize: "纹理尺寸", advanceSettings: "高级设置",
        showAdvanceSettings: "展开设置", hideAdvanceSettings: "收起设置", advancedSettingsSummary: "15 项参数",
        on: "开启", off: "关闭",
        fields: {
          decimationTarget: "减面目标", maxNumTokens: "最大 Token 数", meshScale: "网格缩放",
          sparseStructureGuidanceStrength: "稀疏结构引导强度", sparseStructureGuidanceRescale: "稀疏结构引导重缩放",
          sparseStructureSteps: "稀疏结构采样步数", sparseStructureRescaleT: "稀疏结构重缩放 T",
          shapeGuidanceStrength: "形状引导强度", shapeGuidanceRescale: "形状引导重缩放",
          shapeSteps: "形状采样步数", shapeRescaleT: "形状重缩放 T",
          textureGuidanceStrength: "纹理引导强度", textureSteps: "纹理采样步数",
          textureRescaleT: "纹理重缩放 T", remesh: "重新网格化"
        }
      },
      status: {
        idle: "上传图片后即可开始。", ready: "图片已就绪，可以生成模型。", creating: "正在创建 3D 任务……",
        processing: "正在构建 GLB……", stillChecking: "仍在“我的资产”中检查结果……", succeeded: "3D 模型已生成。"
      },
      progress: {
        title: "生成进度", completedTitle: "3D 模型已生成", checkingTitle: "仍在检查结果", failedTitle: "生成已停止",
        steps: {
          submitting: "正在提交请求", waitingForRunner: "正在等待计算资源", preparingImage: "正在处理图片",
          samplingSparseStructure: "正在采样稀疏结构", samplingShapeSLat: "正在采样形状 SLat",
          samplingTextureSLat: "正在采样纹理 SLat", buildingMesh: "正在构建网格和 GLB", finalizingPreview: "正在完成预览"
        }
      },
      errors: {
        unsupportedImage: "请上传 JPG、PNG、WebP 或 BMP 图片。", imageTooLarge: "图片大小不能超过 10 MB。",
        uploadFailed: "无法读取图片，请换一个文件重试。", imageRequired: "请先上传参考图片。",
        signInRequired: "请登录或升级套餐后再生成并保存模型。", generationFailed: "3D 模型生成失败。",
        statusFailed: "无法查询 3D 任务状态。", timeout: "3D 模型生成超时，请重试。",
        statusStillChecking: "仍在检查你的模型。",
        statusStillCheckingDescription: "任务已经提交，但本页面暂时无法确认最终结果。请几分钟后到“我的资产”中查看。",
        timeoutStillChecking: "任务耗时超过预期，但仍可能稍后出现在“我的资产”中。",
        freeTrialBusy: "免费试用服务器繁忙，请稍后重试", freeTrialLimitReached: "免费试用次数已用完，请登录并订阅后继续生成。",
        trialUsed: "免费试用次数已用完", trialUsedDescription: "创建账户后即可继续生成 Pixal3D 模型。",
        generateDisabledSignIn: "登录并订阅可获得更快、更稳定、持续在线的生成服务。上方仍可免费试用。",
        generateDisabledSubscribeRequired: "订阅后即可生成模型",
        generateDisabledFreeTrialAbove: "获得更快、更稳定、持续在线的生成服务。上方仍可免费试用。",
        generateDisabledInsufficientCredits: "积分不足。", generateDisabledImageRequired: "请先上传图片",
        generateDisabledReadingImage: "正在读取图片……", insufficientCredits: "积分不足，无法生成 3D 模型。",
        insufficientCreditsDescription: "该分辨率需要 {required} 积分，你当前有 {balance} 积分。"
      }
    },
    advantages: {
      eyebrow: "Pixal3D 优势", title: "为什么选择 Pixal3D",
      items: {
        faithful: { title: "忠实还原参考图片", description: "生成的 3D 模型尽可能保留输入图片中的形状、风格和视觉特征。" },
        pixelAligned: { title: "像素对齐的 3D 生成", description: "强化二维像素与三维空间之间的对应关系，让图片转 3D 的结果更清晰。" },
        geometry: { title: "精细的几何重建", description: "还原物体轮廓、结构和造型细节，避免得到过度简化的 3D 模型。" },
        pbr: { title: "PBR 纹理生成", description: "生成更丰富的物理材质，适合真实感 GLB 预览和各类 3D 资产项目。" },
        fast: { title: "快速生成模型", description: "快速完成图片转 3D 和 GLB 准备，便于反复试验与验证。" }
      }
    },
    painPoint: {
      eyebrow: "1 分钟反馈", title: "你现在需要一款什么样的 3D 产品？",
      description: "告诉我们你希望接下来做出的 3D 产品。", inputHint: "可以使用任意语言填写。",
      otherPlaceholder: "描述你需要的 3D 产品、风格、格式或工作流程……", submitButton: "提交反馈",
      submittingButton: "正在提交……", successMessage: "感谢反馈，这将帮助我们规划下一款产品。",
      errorMessage: "反馈提交失败，请重试。"
    },
    inspiration: {
      eyebrow: "模型灵感库", title: "浏览示例，寻找下一次 3D 生成的方向", generateSimilar: "点击生成相似的 3D 模型",
      items: ["复古终端", "树屋", "甜点场景", "生物概念", "风格化座椅", "浮空城", "复古电脑", "野餐篮", "披萨片", "树屋", "风车小屋", "装甲龟", "奇幻遗物", "生物概念", "奇幻建筑", "场景概念"]
    },
    faq: {
      title: "常见问题",
      items: {
        generator: { question: "Pixal3D 是 AI 3D 模型生成器吗？", answer: "是。Pixal3D 可以根据参考图片生成高还原度 3D 模型，其底层来自腾讯 ARC 以 MIT 许可证开源的 Pixal3D 项目。" },
        oneImage: { question: "Pixal3D 能用一张图片生成 3D 模型吗？", answer: "可以。上传一张主体清晰的图片，即可在线生成 GLB 格式的 3D 模型。" },
        bestImages: { question: "什么样的图片最适合转成 3D？", answer: "背景干净、主体单一、轮廓清晰且形体细节可见的图片，通常效果最好。" },
        formats: { question: "结果可以导出为 GLB 文件吗？", answer: "可以。Pixal3D 会导出 GLB 模型，方便预览、下载并用于后续 3D 工作流程。" }
      }
    }
  },
  auth: {
    metadata: {
      signin: { title: "登录 Pixal3D", description: "登录 Pixal3D，生成并管理 AI 3D 模型。", keywords: "Pixal3D登录, 登录, AI 3D模型账户" },
      signup: { title: "注册 Pixal3D", description: "创建 Pixal3D 账户，保存 AI 3D 模型生成记录并使用积分。", keywords: "Pixal3D注册, 创建账户, AI 3D模型账户" }
    },
    signin: {
      welcomeBack: "欢迎回来", description: "使用 Google 或邮箱登录", socialLogin: "使用 Google 登录",
      orContinueWith: "或使用邮箱继续", email: "邮箱", emailPlaceholder: "请输入邮箱", password: "密码",
      rememberMe: "记住我", submit: "登录", submitting: "正在登录……", success: "登录成功",
      noAccount: "还没有账户？", signupLink: "立即注册", termsNotice: "点击继续，即表示你同意我们的",
      termsOfService: "服务条款", privacyPolicy: "隐私政策",
      errors: { required: "请输入邮箱和密码。", invalidCredentials: "邮箱或密码不正确。" },
      socialProviders: { google: "Google" }
    },
    signup: {
      title: "创建账户", description: "使用邮箱和密码创建 Pixal3D 账户。", name: "姓名", namePlaceholder: "请输入姓名",
      email: "邮箱", emailPlaceholder: "请输入邮箱", password: "密码", passwordPlaceholder: "至少 8 个字符",
      submit: "创建账户", submitting: "正在创建账户……", success: "账户已创建", haveAccount: "已有账户？", signinLink: "去登录",
      errors: { required: "请填写姓名、邮箱和密码。", passwordTooShort: "密码至少需要 8 个字符。" }
    }
  },
  pricing: {
    metadata: {
      title: "Pixal3D 价格 - AI 3D 模型生成积分",
      description: "选择适合你的 Pixal3D 套餐，用于图片转 3D、下载 GLB、提高队列优先级并保护私有资产。",
      keywords: "Pixal3D价格, AI 3D模型积分, 图片转3D订阅"
    },
    title: "价格",
    description: "选择适合你的 3D 工作流程的积分套餐。",
    monthly: "月付",
    yearly: "年付",
    perMonth: "/ 月",
    currentPlan: "当前套餐",
    subscribeNow: "立即订阅",
    checkoutError: "无法发起结账，请稍后重试。",
    freeTrialNotice: "可免费试用两次（每次 15 分钟，不消耗积分）", yearlyDiscountBadge: "约省 20%", billedYearly: "按年计费：${amount}",
    contactPlan: {
      name: "Max 无限版", description: "面向有定制用量、工作流支持和优先接入需求的团队。", price: "联系我们",
      priceNote: "可定制月付或年付方案", button: "联系我们", chatUnavailable: "请打开在线客服窗口联系我们。",
      features: ["定制每月积分", "定制并发任务数", "每日不限下载次数", "最高队列优先级", "私有资产所有权", "工作流与接入支持"]
    }
  },
  payment: {
    metadata: {
      success: { title: "Pixal3D 支付成功", description: "你的 Pixal3D 付款已成功处理。", keywords: "支付成功, Pixal3D订阅" },
      cancel: { title: "Pixal3D 支付已取消", description: "你的 Pixal3D 付款已取消。", keywords: "支付取消, Pixal3D结账" }
    },
    result: {
      success: { title: "支付成功", description: "你的付款已成功处理。", actions: { viewDashboard: "查看控制台", backToHome: "返回首页" } },
      cancel: { title: "支付已取消", description: "本次付款已取消。你可以返回价格页后重试。", actions: { tryAgain: "重新支付", contactSupport: "联系支持", backToHome: "返回首页" } }
    }
  },
  blog: {
    metadata: { title: "Pixal3D 博客", description: "阅读 Pixal3D 的最新动态与 AI 3D 模型生成指南。", keywords: "Pixal3D博客, AI 3D模型指南, 图片转3D" },
    title: "博客", subtitle: "Pixal3D 动态与实用指南", publishedOn: "发布于", by: "作者",
    noPosts: "暂时没有文章，欢迎稍后再来！", backToBlog: "返回博客",
    staticPosts: { pixal3dModelUses: {
      title: "用 Pixal3D 生成 3D 模型后，可以用来做什么？",
      excerpt: "从 3D 场景道具、游戏原型到商品预览、AR 体验和 3D 打印准备，了解如何真正用好 Pixal3D 生成的模型。",
      intro: [
        "生成模型只是开始。Pixal3D 可以把一张参考图快速转化为能够进入场景搭建、原型设计、互动内容与实体制作流程的 3D 资产。",
        "模型最适合去哪里，取决于几何结构、纹理质量、尺寸和文件格式。可以先从下面的用途开始，再根据文末清单完成交付前检查。"
      ],
      sceneProps: {
        heading: "1. 用作搭建 3D 场景时的道具", beforeLink: "生成模型后，最快上手的方式之一，就是把它作为道具放到角色或环境周围。在 ",
        linkLabel: "AnyPoses", afterLink: " 中，你可以上传 Pixal3D 模型作为自定义道具，把它与角色及其他物体一起布置，用于插画参考、故事板或构图规划。",
        alt: "AnyPoses 3D 场景编辑器，画面中包含沙发、人体模型、花瓶和上传自定义道具按钮",
        caption: "AnyPoses 支持上传 GLB 或 STL 文件作为自定义场景道具。"
      },
      prototyping: { heading: "2. 把想法快速变成概念原型", paragraphs: [
        "生成的 3D 模型能回答平面概念图难以回答的空间问题：侧面轮廓是否成立？比例是否可信？缩小后还能否清楚辨认？",
        "在投入手工建模和制作级拓扑之前，可以先用它完成早期评审、提案视觉和预演。"
      ] },
      games: { heading: "3. 搭建游戏和互动体验原型", paragraphs: [
        "在游戏或 WebGL 体验尚处于搭建阶段时，Pixal3D 模型可以充当道具、收集物、场景装饰或互动目标。",
        "用于实时项目之前，请检查面数、纹理分辨率、轴心、碰撞需求和材质兼容性。优化通常是高质量生成资产进入流畅运行环境的关键一步。"
      ] },
      commerce: { heading: "4. 制作商品与电商 3D 预览", paragraphs: [
        "3D 模型可以用于转台动画、互动商品查看器、生活方式场景样机和不同机位的展示，不必为每个角度重新拍摄。",
        "在与实物核对前，应把尺寸和颜色视为视觉近似值。用于面向客户的页面时，请在不同角度和灯光下检查纹理瑕疵。"
      ] },
      spatial: { heading: "5. 探索 AR 与空间展示", paragraphs: [
        "GLB 资产常用于浏览器 3D 和增强现实体验。体积适中的 Pixal3D 输出可以用于房间、展览、课堂或互动演示中的早期摆放测试。",
        "请设置可信的现实尺寸、减小文件体积，并在目标设备上测试。移动设备的性能和材质支持可能与桌面预览差异很大。"
      ] },
      printing: { heading: "6. 作为 3D 打印工作流的起点", paragraphs: [
        "如果生成的形体合适，可以将它带入面向打印的流程，用于制作模型小样、桌面摆件、教学用具或形态研究。",
        "渲染好看并不等于可以直接打印。请先检查网格是否闭合，修复非流形几何，加厚脆弱细节，设定最终尺寸，并在切片软件中验证。"
      ] },
      checklistHeading: "使用模型前的检查清单",
      checklistItems: ["旋转模型，检查正面、背面、底部和细小部件。", "确认目标工具支持导出的格式、材质与纹理。", "为目标工作流设置合适的尺寸、原点和轴心。", "面向实时或移动端使用时，优化几何和纹理尺寸。", "保留原始参考图，方便重新生成或比较版本。"],
      faqHeading: "常见问题",
      faq: [
        { question: "可以把 Pixal3D 模型直接上传到 AnyPoses 吗？", answer: "可以。导出受支持的 GLB 或 STL 文件，然后使用 AnyPoses 的“上传自定义道具”功能。模型应尽量轻量，以保持场景编辑流畅。" },
        { question: "生成的模型可以直接用于游戏或商品页吗？", answer: "它很适合作为高质量起点，但仍需针对目标环境检查拓扑、纹理、尺寸、性能和视觉准确性。" },
        { question: "应该选择哪种格式？", answer: "GLB 适合带纹理的网页和实时预览；STL 以几何为主，常用于 3D 打印工作流。" }
      ]
    } }
  },
  dashboard: {
    metadata: { title: "Pixal3D 控制台", description: "查看你的 Pixal3D 订阅、积分和账户信息。", keywords: "Pixal3D控制台, 订阅, 积分" },
    eyebrow: "账户", title: "控制台", description: "查看套餐、订阅周期、积分和最近付款。", actions: { managePlan: "管理套餐" },
    subscription: {
      label: "当前套餐", active: "有效", free: "免费版", canceled: "已取消", expired: "已到期",
      cancelAtPeriodEnd: "将在本周期结束时取消", billingCycle: "计费周期", monthly: "月付", yearly: "年付", periodStart: "开始时间",
      validUntil: "有效期至", lifetime: "永久", included: "套餐额度"
    },
    credits: { label: "积分", description: "可用于生成 Pixal3D 模型的积分。" },
    account: { label: "账户", unnamed: "未命名用户", memberSince: "注册时间" },
    orders: { label: "付款记录", title: "最近订单", empty: "暂无付款记录。" }
  },
  myAssets: {
    eyebrow: "个人资产库", title: "我的资产", description: "查看最近的 Pixal3D 生成任务，并重新打开已完成的 GLB 模型。",
    actions: { create: "创建", refresh: "刷新", preview3DModel: "预览 3D 模型", openModel: "打开 GLB", sourceImage: "原始图片", previous: "上一页", next: "下一页" },
    empty: { title: "还没有生成记录", description: "生成第一个 3D 模型后，它会显示在这里。" },
    card: {
      targetResolution: "目标分辨率", textureSize: "纹理尺寸", createdAt: "创建时间", credits: "积分", creditsUsed: "已用积分",
      pricingHint: "随着服务成本下降，单次生成所需积分也会相应降低。", checkingStatus: "正在查询状态……",
      status: { processing: "处理中", succeeded: "已完成", failed: "失败" }
    }
  }
} as const;
