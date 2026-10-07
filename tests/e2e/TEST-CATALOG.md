# E2E 测试流程目录

本文档详细记录所有已实现的 E2E 测试用例，包含每个测试的具体步骤和验证内容。

> 编写规范和架构约定请查看 [`AGENTS.md`](./AGENTS.md)。

---

## 目录

### 已实现

- [1. 公共页面冒烟测试](#1-公共页面冒烟测试)
- [2. 认证流程测试](#2-认证流程测试)
- [3. 权限控制测试](#3-权限控制测试)
- [4. 仪表盘测试](#4-仪表盘测试)
- [5. 定价页测试](#5-定价页测试)
- [6. AI 功能页测试](#6-ai-功能页测试)
- [7. Stripe 支付流程测试](#7-stripe-支付流程测试)
- [8. 个人资料更新测试](#8-个人资料更新测试)
- [9. 修改密码测试](#9-修改密码测试)
- [10. 语言切换测试](#10-语言切换测试)
- [11. 上传页测试](#11-上传页测试)
- [12. 管理员面板测试](#12-管理员面板测试)
- [13. AI 对话（真实交互）](#13-ai-对话真实交互)
- [15. AI 图片生成（真实生成）](#15-ai-图片生成真实生成)
- [17. Creem 支付流程测试](#17-creem-支付流程测试)
- [18. PayPal 支付流程测试](#18-paypal-支付流程测试)
- [16. 管理员子页面筛选功能测试](#16-管理员子页面筛选功能测试)
- [21. My Assets 历史任务测试](#21-my-assets-历史任务测试)

### 待实现 (Backlog)
- [22. Pixal3D 教程页与 iframe 底座](#22-pixal3d-教程页与-iframe-底座)
- [19. 支付宝支付流程测试](#19-支付宝支付流程测试)
- [20. 博客功能测试](#20-博客功能测试)

### 追踪

- [Backlog 优先级汇总](#backlog-优先级汇总)
- [测试结果追踪](#测试结果追踪)

---

## 1. 公共页面冒烟测试

**文件：** `specs/public-pages.spec.ts` ｜ **优先级：** P0 ｜ **无需登录**

最基础的健全性检查，验证公共页面能正常打开、不报错。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 首页加载 | 打开 `/en` → 验证页面标题不含 error/500/404 → 验证 `<header>` 和 `<nav>` 可见 → 验证首屏 `<h1>` 标题可见 |
| 2 | 登录页加载 | 打开 `/en/signin` → 验证邮箱输入框、密码输入框、提交按钮均可见 |
| 3 | 注册页加载 | 打开 `/en/signup` → 验证姓名输入框（`#name`）、邮箱输入框、密码输入框、提交按钮均可见 |
| 4 | 忘记密码页加载 | 打开 `/en/forgot-password` → 验证邮箱输入框可见 → 验证表单内按钮可见 |
| 5 | 定价页加载 | 打开 `/en/pricing` → 验证标题不含错误 → 验证至少有一个含 ¥ 或 $ 价格的元素可见 |
| 6 | 登录后在内嵌工作台参考图标题行提供免费生成入口 | 未登录打开 `/en` → 登录遮罩可见且免费生成入口不存在；登录后分别打开 `/en` 和 `/zh-CN` → 验证入口以不超过 24px 高的小型辅助按钮浮在 iframe 上层、与 `SOURCE IMAGE` 标题同行且不覆盖上传框 → 英文显示 `No image? Create one free`，中文显示 `没有参考图？免费生成一张` → 链接指向 `https://seedance3-pro.com/app/image/gpt-image-2?ref=pixal3d`，并在新窗口安全打开 → 页面不再渲染 AnyPoses Footer |

---

## 2. 认证流程测试

**文件：** `specs/auth-flow.spec.ts` ｜ **优先级：** P0

完整的 注册 → 登录 → 登出 → 重定向 生命周期测试。

### 注册组

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | UI 表单注册 | 打开注册页 → 填写姓名/邮箱/密码 → 点击提交 → 等待 URL 离开 `/signup`（即注册成功后自动跳转） |
| 2 | API 注册 | 通过 `POST /api/auth/sign-up/email` 直接创建用户 → 验证返回 200 → 验证响应体包含 `user.email` |

### 登录 / 登出 / 重定向组

> 这组测试共用一个用户账号（在 `beforeAll` 中通过 API 注册一次），避免频繁注册触发限流。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 3 | UI 表单登录 | 打开登录页 → 填写邮箱/密码 → 点击提交 → 等待 URL 离开 `/signin` |
| 4 | API 登录 | 通过 `POST /api/auth/sign-in/email` 登录 → 验证返回 200 |
| 5 | 登出后无法访问仪表盘 | 先 API 登录 → 访问仪表盘确认可进入 → 调用 API 登出 → 再次访问仪表盘 → 验证被重定向到 `/signin` |
| 6 | 已登录用户访问 /signin 重定向到 /dashboard | API 登录 → 访问 `/signin` → 验证被自动重定向到 `/dashboard` |
| 7 | 已登录用户访问 /signup 重定向到 /dashboard | API 登录 → 访问 `/signup` → 验证被自动重定向到 `/dashboard` |

---

## 3. 权限控制测试

**文件：** `specs/access-control.spec.ts` ｜ **优先级：** P0

验证保护页面的访问控制：未登录 → 重定向，无权限 → 403。

### 未认证访问组

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | /dashboard 重定向 | 未登录访问 `/dashboard` → 验证 URL 包含 `/signin` |
| 2 | /upload 重定向 | 未登录访问 `/upload` → 验证 URL 包含 `/signin` |
| 3 | /admin 重定向 | 未登录访问 `/admin` → 验证 URL 包含 `/signin` |
| 4 | /premium-features 重定向 | 未登录访问 `/premium-features` → 验证 URL 包含 `/signin` |

### 已认证非管理员访问组

> 共用一个普通用户账号（`beforeAll` 注册）。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 5 | 普通用户访问 /admin 返回 403 | API 登录普通用户 → 访问 `/admin` → 验证返回 HTTP 403 或重定向到 signin |
| 6 | 普通用户可以访问 /dashboard | API 登录普通用户 → 访问 `/dashboard` → 验证停留在仪表盘页面 |

---

## 4. 仪表盘测试

**文件：** `specs/dashboard.spec.ts` ｜ **优先级：** P1

验证仪表盘页面功能，包括用户信息展示和标签页导航。

> 所有测试共用一个浏览器上下文（避免限流），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 仪表盘加载并显示用户信息 | API 注册并登录 → 访问 `/dashboard` → 验证 URL 正确 → 验证 `<h1>` 可见 → 验证用户名显示在页面上 |
| 2 | 个人资料标签页显示邮箱和姓名 | 访问 `/dashboard` → 等待加载完成 → 验证用户姓名和邮箱都显示在页面上 |
| 3 | 可以在标签页之间导航 | 访问 `/dashboard` → 获取所有标签按钮 → 验证数量 > 1 → 点击第二个标签 → 验证未离开 dashboard 页面 |

---

## 5. 定价页测试

**文件：** `specs/pricing.spec.ts` ｜ **优先级：** P1 ｜ **无需登录**

验证定价页的计划卡片渲染和标签切换。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 渲染计划卡片 | 打开定价页 → 验证页面标题可见 → 验证至少有一个含价格符号的元素 |
| 2 | 卡片显示名称、价格和功能 | 打开定价页 → 验证 `<h3>` 计划名称数量 ≥ 1 → 验证 CTA 按钮数量 ≥ 1 |
| 3 | 卡片包含功能列表和勾选图标 | 打开定价页 → 验证功能列表项数量 ≥ 1 |
| 4 | 订阅 / 积分标签切换 | 打开定价页 → 检查是否有标签切换器 → 如果有，点击「积分」标签 → 验证价格仍然可见 → 切回「订阅」标签 → 验证价格可见 |

---

## 6. AI 功能页测试

**文件：** `specs/ai-features.spec.ts` ｜ **优先级：** P2

验证 AI 功能页面能正常加载并显示关键 UI 元素。**不会**实际调用 AI API 生成内容。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | AI 对话页加载 | 打开 `/ai` → 如果未被重定向到登录页，验证文本输入区域（`<textarea>` 或 `contenteditable`）可见 |
| 2 | 图片生成页加载 | 打开 `/image-generate` → 验证提示词输入框可见 → 验证模型选择器（下拉框）存在 |
| 3 | 视频生成页加载 | 打开 `/video-generate` → 验证提示词输入框可见 → 验证模型选择器（下拉框）存在 |
| 4 | 图片生成页有生成按钮 | 打开 `/image-generate` → 验证页面上至少有一个按钮 |
| 5 | 视频生成页有生成按钮 | 打开 `/video-generate` → 验证页面上至少有一个按钮 |

---

## 7. Stripe 支付流程测试

**文件：** `specs/stripe-payment.spec.ts` ｜ **优先级：** P0

> ⚠️ **前置条件：**
> 1. 开发服务器在 7001 端口运行
> 2. `stripe listen --forward-to localhost:7001/api/payment/webhook/stripe` 正在运行
> 3. `.env` 中配置了 Stripe 测试模式的 API Key

完整的 Stripe 支付端到端流程，覆盖**订阅购买**和**积分购买**两个链路。使用测试卡号 `4242 4242 4242 4242` 模拟支付，不产生真实扣款。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

### A) 订阅购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击 Stripe 订阅计划跳转到 Checkout | API 注册用户 → 打开定价页（默认"订阅"标签页） → 等待 plan cards 渲染完成 → 找到 "Stripe Monthly Plan" 标题 → 滚动到可见区域 → 点击对应的 CTA 按钮 → 等待 URL 跳转到 `checkout.stripe.com` |
| 2 | 完成 Stripe 订阅支付 | 重复步骤 1 跳转到 Stripe Checkout → 等待卡号输入框出现 → 填写卡号 `4242 4242 4242 4242` → 填写有效期 `12/30` → 填写 CVC `123` → 填写持卡人姓名 → 点击 "Subscribe" 按钮 → 等待重定向回 `/payment-success` → 验证 URL 包含 `payment-success` 和 `provider=stripe` |
| 3 | 支付成功页显示成功 UI | 重复步骤 2 完成支付 → 验证成功页 `<h1>` 标题可见 → 验证页面上有跳转到 `/dashboard` 的链接 |
| 4 | 支付取消页可正常访问 | 直接访问 `/payment-cancel` → 验证 URL 正确 → 验证页面标题可见 → 验证有返回 `/pricing` 的链接 |
| 5 | 仪表盘订阅标签显示计划详情 | 访问 `/dashboard` → 点击"Subscription Status"导航按钮 → 等待订阅数据加载 → **如果 webhook 已处理**：验证计划名称 "Stripe Monthly Plan" 可见 → 验证 "Active" 状态徽章可见 → 验证 "Start Date" 和 "End Date" 标签可见 → 验证 "Recurring" 付款类型徽章可见 → 验证进度条存在。**如果 webhook 未处理**：验证 "No Active Subscription Found" 提示可见 → 验证 "View Plans" 链接可见 |

### B) 积分购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 6 | 点击 Stripe 积分计划跳转到 Checkout | 打开定价页 → 点击「Credits / 积分充值」标签 → 等待积分计划卡片渲染 → 找到 "100 Credits Stripe" 标题 → 点击对应的 CTA 按钮 → 等待 URL 跳转到 `checkout.stripe.com` |
| 7 | 完成 Stripe 积分购买 | 重复步骤 6 跳转到 Stripe Checkout → 填写测试卡信息 → 点击 "Pay" 按钮 → 等待重定向回 `/payment-success` → 验证 URL 包含 `payment-success` 和 `provider=stripe` |
| 8 | 仪表盘积分标签显示余额更新 | 访问 `/dashboard` → 点击"Credits"导航按钮 → 验证 "Credit Balance" 标题可见 → 验证 "Available Credits" 标签可见 → 读取余额数值 → 验证 ≥ 100 → 验证 "Total Purchased" ≥ 100 → 如果 webhook 已处理，验证交易记录中出现 "Purchase" 类型条目 |

### Stripe 订阅支付完整链路图

```
用户登录
  ↓
打开 /pricing 定价页（"订阅"标签页）
  ↓
点击 "Stripe Monthly Plan" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthly', provider: 'stripe' }
  ↓
后端创建 Stripe Checkout Session → 返回 paymentUrl
  ↓
前端 window.location.href = paymentUrl
  ↓
浏览器跳转到 checkout.stripe.com（Stripe 托管页面）
  ↓
用户填写测试卡信息并点击 "Subscribe"
  ↓
Stripe 处理支付 → 重定向到 /payment-success?session_id=xxx&provider=stripe
  ↓
前端调用 GET /api/payment/verify/stripe?session_id=xxx 验证支付状态
  ↓
同时 Stripe 发送 webhook → stripe listen 转发到 /api/payment/webhook/stripe
  ↓
后端更新订单状态 → 创建/更新订阅记录
  ↓
用户在仪表盘"订阅"标签页看到：计划名称、Active 状态、起止日期、进度条
```

### Stripe 积分购买完整链路图

```
用户登录
  ↓
打开 /pricing 定价页 → 切换到「积分充值」标签页
  ↓
点击 "100 Credits Stripe" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'credits100', provider: 'stripe' }
  ↓
后端创建 Stripe Checkout Session → 返回 paymentUrl
  ↓
浏览器跳转到 checkout.stripe.com
  ↓
用户填写测试卡信息并点击 "Pay"
  ↓
Stripe 处理支付 → 重定向到 /payment-success?session_id=xxx&provider=stripe
  ↓
webhook 触发后端 → 查询 plan 的 credits 字段 (100) → 调用 creditService.addCredits()
  ↓
用户在仪表盘"积分"标签页看到：可用积分 ≥ 100、累计购买 ≥ 100、交易记录
```

---

## 8. 个人资料更新测试

**文件：** `specs/profile-update.spec.ts` ｜ **优先级：** P1

验证仪表盘中编辑个人资料的完整流程：进入编辑模式 → 修改姓名 → 保存 → 验证更新。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 个人资料标签页显示用户名和编辑按钮 | API 注册用户 → 访问 `/dashboard` → 验证用户名可见 → 验证 "Edit" 按钮可见 |
| 2 | 可以进入编辑模式并修改姓名 | 访问 `/dashboard` → 等待用户名加载 → 点击 "Edit" 按钮 → 验证 `#name` 输入框可见 → 清空并填入新姓名 → 点击 "Save" → 等待编辑模式关闭（"Edit" 按钮重新出现） → 验证新姓名显示在页面上 |

---

## 9. 修改密码测试

**文件：** `specs/password-change.spec.ts` ｜ **优先级：** P2

验证仪表盘「账户」标签页的密码修改功能。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 账户标签页显示修改密码区域 | API 注册用户 → 访问 `/dashboard` → 点击 "Account" 标签 → 验证 "Change Password" 文字可见 → 验证修改密码按钮可见 |
| 2 | 可以打开密码修改对话框并提交 | 访问 `/dashboard` → 切换到 "Account" 标签 → 点击 "Change Password" 按钮 → 等待对话框出现 → 填写当前密码 → 填写新密码 → 填写确认密码 → 点击提交 → 等待对话框关闭（表示修改成功） |
| 3 | 可以用新密码登录 | 创建全新浏览器上下文（无 cookie） → 用新密码调用 `signInViaAPI` → 验证返回 200 → 访问 `/dashboard` → 验证用户名可见（确认 session 有效） |

---

## 10. 语言切换测试

**文件：** `specs/i18n-switching.spec.ts` ｜ **优先级：** P2 ｜ **无需登录**

验证首次访问的语言判断、页面头部的手动切换、完整本地化内容与选择持久化。语言优先级为：显式语言 URL / 用户手动偏好 cookie ＞ 浏览器 `Accept-Language` ＞ IP 国家请求头兜底 ＞ 英文。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 英文浏览器使用干净英文 URL | 无语言 cookie，以 `Accept-Language: en-US` 打开 `/` → URL 保持 `/` → Hero、导航和登录提示均为英文 |
| 2 | 中文浏览器首次访问自动进入中文站 | 无语言 cookie，以 `Accept-Language: zh-CN` 打开 `/` → 跳转 `/zh-CN` → Hero、导航和登录提示均为自然中文 → 自动跳转不写 `NEXT_LOCALE` |
| 3 | IP 国家仅作为弱兜底 | 无语言 cookie，以不支持的浏览器语言及 `CF-IPCountry: CN` 打开 `/` → 跳转 `/zh-CN`；若浏览器明确为英文，即使国家为 CN 也保持英文 |
| 4 | 登录前也能手动切换 | 未登录打开 `/` → 语言按钮可见 → 选择“简体中文” → 跳转 `/zh-CN` → 写入一年期 `NEXT_LOCALE=zh-CN`（Path=/、SameSite=Lax、HttpOnly） |
| 5 | 手动偏好覆盖自动判断 | 已有 `NEXT_LOCALE=en`，以中文浏览器和 CN 国家头打开 `/` → 仍显示英文；从中文站切回 English 后保持当前路径和查询参数 |
| 6 | 中文站不夹杂英文产品文案 | 访问 `/zh-CN`、`/zh-CN/signin`、`/zh-CN/blog`，并在功能开启时访问定价/资产页 → 验证核心标题、按钮、状态、日期与数字格式为中文本地化内容 |
| 7 | 中英文 SEO 和不可索引页面正确 | 公开页面输出对应 canonical 与互相指向的 hreflang；未翻译的数据库文章没有中文 alternate；登录、账户、资产和支付结果页输出 `noindex,nofollow` |

---

## 11. 上传页测试（真实上传）

**文件：** `specs/upload-page.spec.ts` ｜ **优先级：** P2

验证上传页面的真实上传流程（成功上传 + 客户端校验）。需要已配置可用的存储服务（OSS/S3/R2/COS）。

> 测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 上传页加载并显示存储服务选择器 | API 注册用户 → 访问 `/upload` → 验证页面标题可见 → 验证存储服务选择下拉框（`[role="combobox"]`）可见 |
| 2 | 成功上传图片并显示结果 | 使用 `input[type="file"]` 上传 1 张小尺寸 PNG → 等待 `POST /api/upload` 返回 200 → 验证上传后缩略图可见 → 验证查看文件链接可见 |
| 3 | 非图片文件被拒绝 | 上传 `.txt` 文件 → 验证提示 "Only image files are allowed" → 验证未出现上传结果 |
| 4 | 超过 1MB 文件被拒绝 | 上传 > 1MB 文件 → 验证提示 "File size must be less than 1MB" → 验证未出现上传结果 |

---

## 12. 管理员面板测试

**文件：** `specs/admin-panel.spec.ts` ｜ **优先级：** P3

验证管理员面板的核心功能：Dashboard 统计、子页面数据表、侧边栏导航和权限控制。

> 使用预置管理员账号 `admin@example.com` 登录（非测试创建，不会被 teardown 清理）。

### 管理员 Dashboard

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 管理员 Dashboard 加载并显示统计卡片 | 用管理员账号 API 登录 → 访问 `/admin` → 验证 "Admin Dashboard" 标题可见 → 验证至少有 4 个统计卡片 |
| 2 | Dashboard 显示图表和今日数据 | 访问 `/admin` → 验证 "Today" 相关文字可见 → 验证 "Recent Orders" 相关文字可见 |

### 管理员子页面

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 3 | 用户管理页显示数据表 | 访问 `/admin/users` → 验证 "User Management" 标题可见 → 验证 `<table>` 存在 |
| 4 | 订阅管理页显示数据表 | 访问 `/admin/subscriptions` → 验证 `<table>` 存在 |
| 5 | 订单管理页显示数据表 | 访问 `/admin/orders` → 验证 `<table>` 存在 |
| 6 | 积分管理页显示数据表 | 访问 `/admin/credits` → 验证 `<table>` 存在 |

### 侧边栏导航

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 7 | 侧边栏导航跨页面跳转 | 访问 `/admin` → 点击侧边栏 "Users" 链接 → 验证 URL 包含 `/admin/users` → 点击 "Orders" 链接 → 验证 URL 包含 `/admin/orders` |

### 用户详情管理

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 8 | 管理员从用户列表进入用户详情页 | 访问 `/admin/users` → 等待表格加载 → 点击第一行用户链接 → 验证 URL 匹配 `/admin/users/<id>` → 验证显示 "Edit User" 标题 |
| 9 | 管理员通过 API 获取用户详情 | 获取管理员 session → `GET /api/users/<adminId>` → 验证返回 200 → 验证 `id` 和 `email` 正确 |
| 10 | 管理员通过 API 更新用户信息 | 创建测试用户 → 重新登录管理员 → `PATCH /api/users/<testUserId>` 更新名称 → 验证返回 200 → `GET /api/users/<testUserId>` 验证名称已更新 |
| 11 | 非管理员用户无法访问用户详情 API | 创建普通用户 → `GET /api/users/<randomId>` → 验证返回 401 或 403 |

### 权限控制

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 12 | 非管理员用户访问管理面板被拒 | 使用全新浏览器上下文（未登录） → 访问 `/admin` → 验证被重定向到 `/signin` 或显示 "Access Denied" |

---

## 13. AI 对话（真实交互）

**文件：** `specs/ai-chat.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. 至少一个 AI 提供商的 API Key 已配置（如 Qwen、DeepSeek、OpenAI 等）
> 2. 积分通过 `seedCredits()` 在 `beforeAll` 中直接写入数据库（500 credits）

真实发送消息、验证 AI 回复、检查积分不足提示。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册 + 种子积分），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 使用默认模型发送消息并获得回复 | API 注册用户 → `seedCredits(userId, 500)` → 访问 `/ai` → 等待页面渲染 → 点击 "New Chat" 清除示例消息 → 在 `<textarea>` 输入 "Hello, please respond with OK" → 点击 `button[aria-label="Submit"]` → 等待 `.is-user` 用户消息出现 → 等待 `.is-assistant` 助手消息出现 → 轮询直到助手消息文本非空（Streamdown 流式渲染） |
| 2 | 对话历史显示用户和助手消息正确排列 | 访问 `/ai` → 清除示例消息 → 输入 "Say the word PINEAPPLE" → 提交 → 等待用户和助手消息均出现 → 验证消息总数 ≥ 2 → 验证倒数第二条为 `.is-user`、最后一条为 `.is-assistant` |
| 3 | 积分不足时显示错误提示 | 新建浏览器上下文 → API 注册用户（不种子积分，余额为 0） → 访问 `/ai` → 清除示例消息 → 输入 "Hello" → 提交 → 验证 "Insufficient Credits" toast 或 `.bg-destructive/10` 错误区域出现 |

### 积分种子方式

```
beforeAll:
  signUpViaAPI → 获取 userId → seedCredits(userId, 500)
  
seedCredits 实现 (helpers/credits.ts):
  1. 连接 DATABASE_URL
  2. UPDATE user SET credit_balance = credit_balance + amount WHERE id = userId
  3. INSERT INTO credit_transaction (bonus 类型) 用于审计追踪
```

---

## 15. AI 图片生成（真实生成）

**文件：** `specs/ai-image-generate.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. 至少一个图片生成提供商的 API Key 已配置（当前使用 Qwen / Aliyun BaiLian）
> 2. 积分通过 `seedCredits()` 在 `beforeAll` 中直接写入数据库（500 credits）
> 3. 生成通常需要 5-15 秒，测试超时设置为 120 秒

真实调用 Qwen 图片生成 API，验证图片生成、下载、积分不足提示。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册 + 种子积分），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 使用默认 Qwen 模型生成图片 | API 注册用户 → `seedCredits(userId, 500)` → 访问 `/image-generate` → 验证 `<h1>` 标题可见 → 验证 Provider 下拉框（`[role="combobox"]`）默认 "Aliyun BaiLian" → 验证 Model 下拉框默认 "Qwen Image Plus" → 在 `<textarea>` 输入 "A cute cat sitting on a table" → 点击 "Generate" 按钮 → 等待成功 toast "Image generated successfully!" 出现（超时 60 秒） → 验证 `img[alt="Generated image"]` 可见 → 验证图片 `src` 非空 → 验证 "Download" 按钮可见 |
| 2 | 生成后可以下载图片 | 访问 `/image-generate` → 输入提示词 → 点击生成 → 等待成功 toast → 验证 "Download" 按钮可见且可用 → 点击下载 → 验证无错误发生 |
| 3 | 积分不足时显示错误提示 | 新建浏览器上下文 → API 注册用户（不种子积分，余额为 0） → 访问 `/image-generate` → 输入提示词 → 点击生成 → 验证 "Insufficient Credits" toast 出现 |

### 积分种子方式

```
beforeAll:
  signUpViaAPI → 获取 userId → seedCredits(userId, 500)
  
seedCredits 实现 (helpers/credits.ts):
  1. 连接 DATABASE_URL
  2. UPDATE user SET credit_balance = credit_balance + amount WHERE id = userId
  3. INSERT INTO credit_transaction (bonus 类型) 用于审计追踪
```

### 页面选择器参考

```
通过 agent-browser 探索发现的选择器：
  - h1: "AI Image Generation"
  - 积分显示: text "credits: <number>"
  - Provider 下拉框: [role="combobox"] (第1个) — 默认 "Aliyun BaiLian"
  - Model 下拉框: [role="combobox"] (第2个) — 默认 "Qwen Image Plus"
  - 提示词输入: <textarea> placeholder="Describe the image you want to generate..."
  - 生成按钮: button 包含 "Generate" 文字
  - 结果区域: h2 "Result"，状态 "Idle" / "Generating..."
  - 生成图片: img[alt="Generated image"]
  - 下载按钮: button 包含 "Download" 文字
  - 成功 toast: Sonner 通知 "Image generated successfully!"
  - 积分不足 toast: "Insufficient Credits"
```

> **注意：** 视频生成测试暂不添加，因生成时间较长（通常 1-5 分钟），不适合自动化测试的超时设置。

---

## 16. 管理员子页面筛选功能测试

**文件：** `specs/admin-filters.spec.ts` ｜ **优先级：** P3

> 使用预置管理员账号 `admin@example.com` 登录。

验证各管理员子页面的搜索和下拉筛选功能。搜索功能通过 URL 参数导航验证页面状态（绕过 Vue `useVModel` 的反应性时序问题），下拉筛选通过 Radix/Reka combobox 交互验证 URL 更新。

> **实现说明：**
> - `goToPage` 等待 `networkidle` 确保 SSR 水合完成（避免点击时 Vue 事件处理器未挂载）
> - `pickFromCombobox` 使用重试循环 + Escape 关闭已打开的下拉框（处理 Radix UI overlay 阻塞）
> - Next.js 订阅页使用 `paymentType` 参数，Nuxt 使用 `provider` 参数（测试自动检测）

### A) 用户管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 搜索通过 URL 反映到页面状态 | 访问 `/admin/users?searchField=email&searchValue=admin&page=1` → 验证搜索输入框的值为 "admin" |
| 2 | 按角色筛选更新 URL | 访问 `/admin/users` → 在角色下拉框中选择 "Admin" → 等待 URL 包含 `role=admin` |
| 3 | 按封禁状态筛选更新 URL | 访问 `/admin/users` → 在封禁状态下拉框中选择 "Banned" → 等待 URL 包含 `banned=true` |
| 4 | 清除按钮重置所有筛选 | 访问带有多个筛选参数的 URL → 点击清除按钮 → 验证 URL 不再包含 `searchValue`、`role`、`banned` |

### B) 订阅管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 5 | 搜索通过 URL 反映到页面状态 | 访问 `/admin/subscriptions?searchField=userEmail&searchValue=test&page=1` → 验证搜索输入框值为 "test" |
| 6 | 按状态筛选更新 URL | 访问 `/admin/subscriptions` → 选择 "Active" → 等待 URL 包含 `status=active` |
| 7 | 第三筛选器更新 URL | 访问 `/admin/subscriptions` → 自动检测第三筛选器类型 → Next.js: 选择 "Recurring" → 验证 `paymentType=recurring`；Nuxt: 选择 "Stripe" → 验证 `provider=stripe` |

### C) 订单管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 8 | 按状态筛选更新 URL | 访问 `/admin/orders` → 选择 "Paid" → 等待 URL 包含 `status=paid` |
| 9 | 按提供商筛选更新 URL | 访问 `/admin/orders` → 选择 "Stripe" → 等待 URL 包含 `provider=stripe` |
| 10 | 组合筛选全部出现在 URL | 访问 `/admin/orders` → 选择 "Paid" → 再选择 "Stripe" → 验证 URL 同时包含 `status=paid` 和 `provider=stripe` |

### D) 积分管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 11 | 按类型筛选更新 URL | 访问 `/admin/credits` → 选择 "Purchase" → 等待 URL 包含 `type=purchase` |
| 12 | 搜索通过 URL 反映到页面状态 | 访问 `/admin/credits?searchField=userEmail&searchValue=admin&page=1` → 验证搜索输入框值为 "admin" |
| 13 | 清除按钮重置筛选 | 访问带有筛选参数的 URL → 点击清除按钮 → 验证 URL 不再包含 `searchValue`、`type` |

---

## 21. My Assets 历史任务测试

**文件：** `specs/my-assets.spec.ts` ｜ **优先级：** P1 ｜ **Next.js**

> ⚠️ **前置条件：**
> 1. `FAL_API_KEY` 或 `FAL_KEY` 已配置
> 2. 数据库可写，`pixal3d_generation` 表已存在
> 3. 测试用户在 `beforeAll` 中通过 API 注册，并通过 `seedCredits()` 预充足够积分

验证 Pixal3D 真实建任务后，历史页能读取并展示该用户的持久化任务记录。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册 + 种子积分），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 创建 Pixal3D 任务后在 My Assets 中看到历史卡片 | API 注册用户 → `seedCredits(userId, 5000)` → 打开首页 `/en` → 点击一个示例图片按钮 → 等待生成按钮可用 → 点击 Generate Model → 等待 `POST /api/3d-generate` 返回 200 且响应中含 `taskId` → 打开 `/en/my-assets` → 验证页面标题可见 → 验证历史卡片数量为 1 → 验证卡片状态为 `Processing` 或 `Completed` → 验证预览图存在 |
| 2 | 任务已完成时可以从 My Assets 打开 GLB 预览 | 在步骤 1 之后打开 `/en/my-assets` → 如果卡片出现预览按钮，则点击按钮 → 验证 GLB 预览对话框出现；如果任务仍在处理中，则跳过该断言，不判失败 |

---

## 待实现的测试 (Backlog)

以下是已规划但尚未实现的测试用例。按优先级排列，实现后应迁移到上方对应章节。

### 17. Creem 支付流程测试

**计划文件：** `specs/creem-payment.spec.ts` ｜ **优先级：** P1

> ⚠️ **前置条件：**
> 1. `.env` 中配置了 Creem 测试模式的 API Key 和 Webhook Secret
> 2. Creem webhook 转发已配置到 `localhost:7001/api/payment/webhook/creem`
> 3. Creem 产品已创建并配置了 `creemProductId`

Creem 与 Stripe 流程类似，都是页面跳转到托管 Checkout 页面完成支付，通过 webhook 回调通知后端。

#### A) 订阅购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击 Creem 订阅计划跳转到 Checkout | API 注册用户 → 打开定价页 → 找到 "Creem Monthly Plan" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 Creem Checkout 页面 |
| 2 | 完成 Creem 订阅支付 | 跳转到 Creem Checkout → 填写测试卡信息（Creem 测试模式下的测试卡号） → 点击支付按钮 → 等待重定向回 `/payment-success?provider=creem` |
| 3 | 仪表盘显示订阅详情 | 访问 `/dashboard` → 点击"订阅"标签 → 验证 "Creem Monthly Plan" 计划名称可见 → 验证 Active 状态可见 |

#### B) 一次性购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 4 | 点击 Creem 一次性计划跳转到 Checkout | 打开定价页 → 找到 "Creem Monthly Plan (One Time)" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 Creem Checkout |
| 5 | 完成 Creem 一次性支付 | 完成支付流程 → 验证重定向回 `/payment-success?provider=creem` |

#### Creem 支付链路图

```
用户登录
  ↓
打开 /pricing 定价页
  ↓
点击 "Creem Monthly Plan" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthlyCreem', provider: 'creem' }
  ↓
后端通过 Creem SDK 创建 Checkout Session → 返回 checkoutUrl
  ↓
浏览器跳转到 Creem Checkout 页面
  ↓
用户填写卡信息并支付
  ↓
Creem 处理支付 → 重定向到 /payment-success?provider=creem
  ↓
Creem 发送 webhook (checkout.completed / subscription.active)
  → 后端更新订单 → 创建/更新订阅
  ↓
用户在仪表盘查看订阅状态
```

---

## 18. PayPal 支付流程测试

**文件：** `specs/paypal-payment.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. `.env` 中配置了 PayPal **沙盒** Client ID 和 Secret（`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`）
> 2. `.env` 中配置了沙盒买家账号（`PAYPAL_E2E_USER_NAME`, `PAYPAL_E2E_USER_PWD`）
> 3. `PAYPAL_SANDBOX="true"` 已设置
> 4. 沙盒环境的 Plan ID 已配置在 `config/payment.ts`（`paypalPlanId`）

PayPal 使用沙盒账户测试，用户跳转到 PayPal 授权页面，使用沙盒买家账号登录并确认支付。每个流程使用独立的浏览器上下文和用户，避免状态泄漏。

> 如果 `PAYPAL_E2E_USER_NAME` / `PAYPAL_E2E_USER_PWD` 未配置，所有测试自动跳过。

#### A) 一次性支付（One-time）

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击 PayPal 一次性计划跳转到 PayPal | API 注册用户 → 打开定价页 → 找到 "PayPal Monthly (One Time)" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 `sandbox.paypal.com` |
| 2 | 完成 PayPal 一次性支付并看到成功页 | 跳转到 PayPal → 使用沙盒买家账号登录（email → Next → password → Log In） → 点击 "完成购物" / "Pay Now" 按钮 → 等待重定向回 `/payment-success?provider=paypal` → 验证 `<h1>` 标题和 dashboard 链接可见 |
| 3 | 仪表盘订阅标签显示 PayPal 计划 | 访问 `/dashboard` → 点击"Subscription"标签 → 验证 "PayPal Monthly" 计划名称可见（或 "No Active Subscription" 如 webhook 未处理） → 如有计划则验证 "Active" 状态可见 |

#### B) 循环订阅（Recurring）

> 使用独立浏览器上下文和用户。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 4 | 点击 PayPal 订阅计划跳转到 PayPal | API 注册用户 → 打开定价页 → 找到 "PayPal Monthly Plan" 标题 → 点击 CTA → 等待跳转到 `sandbox.paypal.com`（PayPal 订阅确认页面） |
| 5 | 完成 PayPal 订阅并看到成功页 | 使用沙盒买家账号登录 → 点击 "同意并订阅" / "Agree & Subscribe" 按钮（PayPal 订阅页面使用 iframe/Web Component 渲染，需跨 frame 搜索按钮） → 等待重定向回 `/payment-success?provider=paypal` |

#### C) 积分购买

> 使用独立浏览器上下文和用户。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 6 | 完成 PayPal 积分购买并看到成功页 | API 注册用户 → 打开定价页 → 切换到"积分充值"标签 → 找到 "100 Credits PayPal" → 点击 CTA → 在 PayPal 沙盒完成支付 → 验证重定向回 `/payment-success?provider=paypal` |
| 7 | 仪表盘积分余额更新 | 访问 `/dashboard` → 点击"Credits"标签 → 轮询最多 6 次（每次间隔 10s）等待 webhook 处理 → 验证可用积分 ≥ 100 → 验证累计购买 ≥ 100 |

#### PayPal 支付链路图

```
用户登录
  ↓
打开 /pricing 定价页
  ↓
点击 "PayPal Monthly (One Time)" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthlyPaypalOneTime', provider: 'paypal' }
  ↓
后端调用 PayPal API 创建 Order → 获取 approve URL
  ↓
浏览器跳转到 sandbox.paypal.com（授权页面）
  ↓
用户使用沙盒买家账号登录 → 点击 "Pay Now" / "完成购物"
  ↓
PayPal 重定向到 /api/payment/return/paypal?order_id=xxx&token=xxx&PayerID=xxx
  ↓
后端自动 capture 订单 → 更新订单状态 → 创建订阅
  ↓
重定向到 /payment-success?provider=paypal
  ↓
用户在仪表盘查看订阅/积分状态
```

#### PayPal 沙盒页面选择器参考

```
通过 agent-browser 探索发现的选择器：

一次性支付 (Orders API) 登录页面:
  - 邮箱输入: #email (textbox "Email or mobile number")
  - 下一步按钮: #btnNext (button "Next")
  - 密码输入: #password (textbox "Password")
  - 登录按钮: #btnLogin (button "Log In")

一次性支付审批页面 (sandbox.paypal.com/checkoutnow):
  - PayPal 余额: radio "PayPal余额 首选" (默认选中)
  - 信用卡: radio "Visa 信用卡 ••••0522"
  - 支付按钮: button "完成购物" / "Pay Now" / "Complete Purchase"
  - 取消链接: link "取消并返回TinyShip"

订阅支付审批页面 (sandbox.paypal.com/webapps/hermes):
  ⚠️ 内容在 iframe 中渲染，需使用 frame.getByRole('button', ...) 搜索
  - 审批按钮: button "同意并订阅" / "Agree & Subscribe"
  - 取消按钮: button "取消并返回到TinyShip"

注意：PayPal 可能记住登录状态，跳过 email/password 步骤直接到审批页面。
测试代码需处理两种场景（全新登录 vs 已登录）。
```

---

### 19. 支付宝支付流程测试

**计划文件：** `specs/alipay-payment.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. `.env` 中配置了支付宝**沙盒**环境的 App ID、私钥和公钥
> 2. 支付宝沙盒环境已开通（参考 [支付宝沙盒文档](https://opendocs.alipay.com/open/00dn7o)）
> 3. `ALIPAY_SANDBOX=true` 已设置
> 4. 沙盒买家账号已准备好

支付宝使用 PC 网站支付（`alipay.trade.page.pay`），用户跳转到支付宝页面完成支付，支付宝通过异步通知（notify_url）回调后端。

#### A) 订阅购买

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击支付宝计划跳转到支付宝 | API 注册用户 → 打开定价页 → 找到 "Alipay Monthly Plan / 支付宝月度" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 `alipay.com` 或 `alipaydev.com`（沙盒） |
| 2 | 在支付宝沙盒中完成支付 | 跳转到支付宝页面 → 使用沙盒买家账号登录并支付 → 等待重定向回 `/payment-success?provider=alipay` |
| 3 | 异步通知处理后仪表盘更新 | 支付宝发送异步通知到 `/api/payment/webhook/alipay` → 后端验签并更新订单 → 用户访问仪表盘验证订阅状态 |

#### 支付宝支付链路图

```
用户登录
  ↓
打开 /pricing 定价页
  ↓
点击 "Alipay Monthly Plan" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthlyAlipay', provider: 'alipay' }
  ↓
后端调用 alipay.trade.page.pay → 生成支付页面 URL
  ↓
浏览器跳转到 alipay.com / alipaydev.com（支付宝页面）
  ↓
用户登录沙盒买家账号 → 确认支付
  ↓
支付宝同步跳转到 /payment-success?provider=alipay
  ↓
同时支付宝异步通知 → POST /api/payment/webhook/alipay
  ↓
后端验签 → 更新订单状态 → 创建订阅
  ↓
用户在仪表盘查看订阅状态
```

> **注意：** 微信支付使用 Native 扫码支付（二维码），不适合 Playwright 自动化测试（无法模拟扫码），暂不计划添加。

---

### 20. 博客功能测试

**计划文件：** `specs/blog.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. 数据库已推送 `blog_post` 表（`pnpm db:push`）
> 2. 预置管理员账号 `admin@example.com` 可用

验证博客功能的完整流程：管理员创建/编辑/删除博客文章，公共页面展示已发布文章，权限控制。

> 管理员测试使用预置账号 `admin@example.com`（非测试创建，不会被 teardown 清理）。

#### A) 管理员博客管理

> 所有测试共用一个浏览器上下文（管理员登录），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 管理员侧边栏显示博客入口 | 用管理员账号 API 登录 → 访问 `/admin` → 验证侧边栏包含 "Blog" 链接 → 点击链接 → 验证 URL 包含 `/admin/blog` |
| 2 | 博客列表页加载并显示数据表 | 访问 `/admin/blog` → 验证页面标题可见 → 验证 `<table>` 存在 → 验证 "New Post" 按钮可见 |
| 3 | 创建新博客文章 | 点击 "New Post" 按钮 → 验证 URL 包含 `/admin/blog/new` → 填写标题 "E2E Test Post" → 验证 slug 自动生成 → 填写摘要 → 在 Markdown 编辑器中输入内容 → 选择状态为 "Published" → 点击保存 → 等待重定向到 `/admin/blog` → 验证列表中出现 "E2E Test Post" |
| 4 | 编辑已有博客文章 | 在列表中找到 "E2E Test Post" → 点击编辑按钮 → 验证 URL 包含 `/admin/blog/` → 修改标题为 "E2E Test Post Updated" → 点击保存 → 等待重定向到列表 → 验证列表中标题已更新 |
| 5 | 删除博客文章 | 在列表中找到 "E2E Test Post Updated" → 点击删除按钮 → 验证确认对话框出现 → 点击确认删除 → 验证文章从列表中消失 |
| 6 | 非管理员用户无法访问博客管理页 | 新建浏览器上下文 → 注册普通用户 → 访问 `/admin/blog` → 验证被重定向到 `/signin` 或返回 403 |

#### B) 公共博客页面

> 需要先通过 API 创建一篇已发布和一篇草稿文章用于测试。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 7 | 博客列表页加载并显示已发布文章 | 访问 `/blog` → 验证页面标题可见 → 验证至少有一篇文章卡片可见 → 验证卡片包含标题、摘要、日期 |
| 8 | 草稿文章不在公共页面显示 | 访问 `/blog` → 验证页面上不包含草稿文章的标题 |
| 9 | 博客详情页正确渲染 Markdown 内容 | 在博客列表点击文章卡片 → 验证 URL 包含 `/blog/` → 验证文章标题可见 → 验证作者信息可见 → 验证发布日期可见 → 验证 Markdown 内容已渲染（检查 `<h1>`/`<p>`/`<code>` 等 HTML 元素） |

#### C) 公共导航

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 10 | 网站头部导航包含博客链接 | 打开首页 `/` → 验证 `<header>` 中包含 "Blog" 链接 → 点击链接 → 验证 URL 包含 `/blog` |

#### D) Pixal3D 静态指南内容与配图

> 这组场景在当前实际使用的 Next.js 应用中验证。数据库中可能同时存在已发布文章，因此不限定页面卡片总数。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 11 | 六篇静态指南均显示匹配的高质量配图 | 访问 `/blog` → 验证 `image-to-3d-model`、`ai-3d-model-generator`、`image-to-glb`、`image-to-stl`、`pixal3d-alternative`、`pixal3d-model-uses` 六篇静态文章均存在 → 验证各自封面为对应的 `.webp` 图片而非通用 SVG |
| 12 | 新用途文章位于旧静态指南之前 | 访问 `/blog` → 获取六篇静态指南卡片的 DOM 顺序 → 验证 `pixal3d-model-uses` 位于其他五篇静态指南之前；允许数据库文章按发布日期插入其前后 |
| 13 | 第一条用途关联 AnyPoses 链接与图 2 | 打开 `/blog/pixal3d-model-uses` → 验证第一条用途为“搭建 3D 场景时的道具” → 同一用途正文包含指向 `https://anyposes.com` 的外链 → 紧随该正文的 `<figure>` 显示用户提供且未修改的 `anyposes-custom-prop.png` → 验证后续用途位于该图片之后 |
| 14 | 新用途文章支持英中双语 | 分别打开 `/en/blog/pixal3d-model-uses` 与 `/zh-CN/blog/pixal3d-model-uses` → 验证标题、摘要、用途标题、正文、图注和替代文本使用对应语言，同时 AnyPoses URL 与图 2 保持一致 |

#### 博客管理完整链路图

```
管理员登录
  ↓
打开 /admin/blog 博客管理页
  ↓
点击 "New Post" 按钮
  ↓
填写标题（自动生成 slug）、摘要、Markdown 内容、状态
  ↓
点击保存 → POST /api/admin/blog
  ↓
后端创建 blog_post 记录 → 重定向到列表
  ↓
已发布文章自动出现在 /blog 公共页面
  ↓
用户访问 /blog → 看到文章列表
  ↓
点击文章 → /blog/[slug] → Markdown 渲染展示
```

---

### Backlog 优先级汇总

| 优先级 | 编号 | 测试名称 | 前置条件 | 预计用例数 |
|--------|------|----------|----------|-----------|
| P2 | 19 | 支付宝支付流程 | 支付宝沙盒 App ID/密钥 + 沙盒买家账号 | 3 |
| ✅ | 20 | 博客功能 | blog_post 表已创建 + 管理员账号（静态文章 3 项无需数据库） | 14 |

---

## 测试结果追踪

每次运行后在此记录结果：

| 日期 | 应用 | 通过 | 失败 | 跳过 | 备注 |
|------|------|------|------|------|------|
| 2026-02-25 | Next.js | 35 | 0 | 0 | 全部通过（含 Stripe 支付） |
| 2026-03-04 | Next.js | 3 | 0 | 0 | AI Chat 真实交互（ai-chat.spec.ts） |
| 2026-03-06 | Next.js | 3 | 0 | 0 | AI Image Generation 真实生成（ai-image-generate.spec.ts） |
| 2026-03-06 | Nuxt.js | 3 | 0 | 0 | AI Image Generation 真实生成（ai-image-generate.spec.ts） |
| 2026-03-06 | Next.js | 5 | 0 | 0 | Creem 支付流程（creem-payment.spec.ts） |
| 2026-03-06 | Nuxt.js | 5 | 0 | 0 | Creem 支付流程（creem-payment.spec.ts） |
| 2026-03-06 | Next.js | 7 | 0 | 0 | PayPal 支付流程（paypal-payment.spec.ts） |
| 2026-03-06 | Nuxt.js | 7 | 0 | 0 | PayPal 支付流程（paypal-payment.spec.ts） |
| 2026-03-08 | Nuxt.js | 88 | 0 | 0 | **全量回归** — 全部通过（5m19s） |
| 2026-03-08 | Next.js | 88 | 0 | 0 | **全量回归** — 全部通过（6m00s） |
| 2026-03-09 | Nuxt.js | 11 | 0 | 0 | 博客功能（blog.spec.ts）— 全部通过（16.6s） |
| 2026-03-09 | Next.js | 11 | 0 | 0 | 博客功能（blog.spec.ts）— 全部通过（43.4s） |
| 2026-03-09 | Nuxt.js | 11 | 0 | 0 | 博客增强后回归（blog.spec.ts）— 全部通过（15.9s） |
| 2026-03-09 | Next.js | 11 | 0 | 0 | 博客增强后回归（blog.spec.ts）— 全部通过（55.5s） |
| 2026-05-31 | Next.js | 1 | 0 | 0 | My Assets 历史任务测试（my-assets.spec.ts）— 通过（32.0s） |
| 2026-09-12 | Next.js | 3 | 0 | 0 | Pixal3D 静态博客配图与用途文章（blog.spec.ts）— 通过（5.4s） |
| 2026-09-12 | Next.js | 1 | 0 | 0 | 首页单一 3D 产品需求问卷（public-pages.spec.ts）— 通过（8.9s） |
| 2026-09-19 | Next.js | 1 | 0 | 0 | 登录后显示的参考图标题行免费生成入口（public-pages.spec.ts）— 通过 |
| 2026-10-05 | Next.js | 1 | 0 | 0 | 参考图生成按钮中英文新跳转地址与 `ref=pixal3d` 参数（public-pages.spec.ts）— 通过（14.5s） |
| 2026-09-19 | Next.js | 7 | 0 | 0 | 中英双语、自动语言判断、手动偏好与 SEO（i18n-switching.spec.ts）— 全部通过（1.5m） |

| 2026-10-06 | Next.js | 19 | 0 | 0 | 教程 13 项 + iframe 3 项（49.7s），相关首页回归 3 项（4.0s）；外部工作台/会话使用 fixture |
| 2026-10-06 | Next.js | 13 | 0 | 0 | 最终便携版操作文案调整后，教程页回归再次全部通过（23.1s） |
| 2026-10-06 | Next.js | 13 | 0 | 0 | humanizer 润色四篇中英文教程后，教程页回归全部通过（26.3s） |

_每次测试运行后更新此表。_

---

## Pixal3D Free Trial Embed Backlog

**File:** `specs/public-pages.spec.ts` | **Priority:** P1 | **Next-only v1**

| # | Test name | Flow |
|---|-----------|------|
| 1 | HuggingFace free trial embed | Open `/` -> click `pixal3d-free-trial-button` -> backend selects the least busy HuggingFace Pixal3D instance -> verify `pixal3d-hf-trial-panel` iframe appears; if the resolver returns 503, verify the busy toast copy appears |

---

## Pixal3D Product Request Feedback

**File:** `specs/public-pages.spec.ts` | **Priority:** P1 | **Next.js**

| # | Test name | Flow |
|---|-----------|------|
| 1 | Single tool-request question | Open `/en` → find `pixal3d-pain-point-feedback` → verify the question asks “What do you need from a 3D modeling tool?” and the description/placeholder invite workflow problems and software features → verify there are no checkbox options and exactly one textarea |
| 2 | Multilingual 3,000-character input | Verify the textarea hint says any language is accepted → verify the separate counter and `maxlength=3000` enforce the limit → enter text and submit → verify the success message appears |

### 工作台标注与反馈措辞调整（2026-10-07）

- 首页和两篇意图页的工作台外框不再显示 `Hosted on Hugging Face` 或对应中文托管标注；懒加载、登录覆盖层和故障恢复继续可用。
- 首页 EN/ZH 的反馈标题、说明、输入提示明确询问 3D 建模软件、在线服务或 AI 工具的需求，引导用户描述工作流程中的问题与所需功能。
- 反馈保持一个自由文本框、任意语言和 3,000 字上限；正常提交与成功提示继续可用。手机无横向溢出。

**状态：** Green。Next 类型检查、生产构建通过；首页已有单元回归 10/10 通过（323ms）；相关公共首页、工作台和意图页 E2E 最终 16/16 通过（19.4s）。构建只保留既有 middleware 弃用提示。

**命令：** `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/public-pages.spec.ts tests/e2e/specs/embedded-workspace.spec.ts tests/e2e/specs/image-to-3d-pages.spec.ts --grep 'Home page|Embedded workspace|Public image-to-3D intent pages'`；`corepack pnpm exec vitest run tests/unit/next/home-page-layout.test.ts`；`corepack pnpm --filter @tinyship/next-app typecheck` 与 `build`。

Verify 使用已连接的 in-app browser，核对 EN/ZH 实际文字及 390px 中文布局（整页无横向溢出）。E2E 沿用 Chromium 路径覆盖与 `E2E_SKIP_CLEANUP=true`；反馈提交与登录/供应商页面均为 fixture，不写入真实用户反馈、不运行 GPU 或消费积分。`E2E_CAPTURE_FEEDBACK=true` 保存 `.tmp/feedback-copy/feedback-en.png` 和 `home-workspace-en.png`。

最初工作台翻译回归在中文导航后发生客户端脚本未完成加载，尚未请求模拟 session 即超时。只读 trace 复核后，在该工作台 spec 中隔离无关的外部图库请求，与公共首页 spec 的 fixture 保持一致；工作台 3/3 和最终组合 16/16 均通过。没有调整业务登录逻辑、放宽断言或增加超时时间。

---

## Pixal3D API Integration Backlog

**File:** `specs/pixal3d-api.spec.ts` | **Priority:** P1 | **Requires:** `FAL_API_KEY`, signed-in user with credits

| # | Test name | Flow |
|---|-----------|------|
| 1 | Create Pixal3D task | Sign in -> upload or select a sample image -> click generate -> verify `POST /api/3d-generate` returns a processing task with provider `fal` and model `fal-ai/pixal3d` |
| 2 | Poll Pixal3D task to GLB | Poll `/api/3d-generate/status?taskId=...` until terminal -> verify success includes a `.glb` model URL, or provider runtime failure marks the task failed without automatic refund |
| 3 | Missing fal key fails safely | Run generation without `FAL_API_KEY` in a local test environment -> verify the API returns an error and any consumed credits are refunded |
| 4 | Wiro backup remains available | Submit `provider=wiro` with `WIRO_API_KEY` configured -> verify the same API shape returns a processing task and status polling maps Wiro GLB output |

## 22. Pixal3D 教程页与 iframe 底座

**状态：** Green（2026-10-06） ｜ **范围：** Next.js ｜ **无需登录阅读教程**

| # | 验收场景 | 预期行为 |
|---|---------|---------|
| 1 | 四个独立教程入口 | `/how-to-install-locally`、`/gguf`、`/low-vram`、`/comfyui` 及对应 `/zh-CN` 页面均可直接访问，未登录不重定向到登录页；标题和正文对应目标主题 |
| 2 | 统一教程结构 | 环境要求 → 逐步操作 → 已公开的性能证据 → 常见问题与解决 → 模型/文件来源 → 截图；数据、报错和社区支持结论附可核实来源，未知数据明确说明 |
| 3 | SEO 与 URL | 每页独立 title/description、干净 canonical、EN/ZH/x-default hreflang；查询参数不进入 canonical；`/en/<slug>` 跳转到英文干净 URL；sitemap 包含四页并声明语言版本，robots 放行教程且不暴露私有/API 索引入口 |
| 4 | 内链 | 首页新增四个教程链接且现有文案保持；教程互链和返回首页按当前语言生成 URL |
| 5 | 布局与截图 | 桌面与手机均无横向溢出；命令块可横向滚动；真实来源截图/示例注明出处与性质，不冒充本机实测 |
| 6 | iframe 懒加载与品牌外框 | 初始保持固定占位高度，接近视口才挂载外部 iframe，具有 native loading=lazy；外框标题、来源与状态有 EN/ZH 文案；原 iframe 尺寸及登录遮罩/参考图入口保持 |
| 7 | 加载失败与恢复 | 网络失败或超时出现说明和可操作的重试/外部打开入口；重新加载成功后状态恢复，无无限加载遮罩 |
| 8 | 埋点可行性与真实性 | 生成和下载定义为两个独立事件；明确现有跨域 iframe 是否提供事件桥；加载、焦点、会话分配不能冒充生成或下载次数；任何待接入方案不宣称已统计成功 |

**结果：** 教程 13 项、iframe 3 项、受影响的首页回归 3 项通过。使用运行中的 Next.js（7001）完成桌面/390px 手机浏览器验收；官方预览和归档截图均确认真实解码。类型检查、生产构建与首页单元回归 11 项通过。

| 命令 | 结果 |
|------|------|
| `corepack pnpm --filter @tinyship/next-app typecheck` | 通过 |
| `corepack pnpm --filter @tinyship/next-app build` | 通过，39 个路由；保留 Next.js 既有 middleware 弃用提示 |
| `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/tutorials.spec.ts tests/e2e/specs/embedded-workspace.spec.ts` | 16/16 通过（49.7s） |
| `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/tutorials.spec.ts` | 最终文案调整后，13/13 再次通过（23.1s） |
| `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/public-pages.spec.ts --grep 'Home page\|Embedded workspace'` | 3/3 通过（4.0s） |
| `corepack pnpm exec vitest run tests/unit/next/home-page-layout.test.ts tests/unit/next/home-progress-order.test.ts` | 11/11 通过 |

E2E 设置 `E2E_SKIP_CLEANUP=true`，因为这些用例使用会话/远程工作台 fixture，不创建数据库用户。当前机器仅缓存 Chromium 149（headless shell 1228），通过 `E2E_CHROMIUM_EXECUTABLE_PATH` 选择该浏览器；未安装匹配 Playwright 1.60 的默认 Chromium 下载。路由、页面渲染、语言切换和元数据使用真实 Next.js，测试没有执行 GPU 生成、分配试用会话或消耗积分。未宣称跨域生成/下载计数已接通。

### 教程文字润色（2026-10-06）

**状态：** Green。使用已安装的 humanizer skill 润色四篇 EN/ZH 教程，仅调整文章措辞。

- 保留观点、事实、数字、来源、适用条件与未知项；不增加作者经历或 GPU 测试结论。
- 命令、文件名、路径、模型/节点参数、链接地址与教程结构保持一致。
- 四篇双语页面、元数据、语言切换与移动布局继续通过现有教程 E2E；完成 Next.js 类型检查和构建。

**验证结果：** 独立逐篇复核通过；对比润色前快照，数字实际值、命令、路径、来源/图片地址、公共 UI 标签及结构均保留。真实浏览器确认新版文字显示。`corepack pnpm --filter @tinyship/next-app typecheck` 与 `build` 均通过；`corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/tutorials.spec.ts` 13/13 通过（26.3s）。E2E 沿用本节记录的 Chromium 路径覆盖与 fixture 设置，构建仅有既有 middleware 弃用提示。

### 第三方 iframe 统计边界（2026-10-06）

用户确认只能嵌入第三方 `victor/pixal3d-studio`，没有修改 Space 代码的权限。实时只读核查公开源码与部署页面，两者均无生成/下载事件桥。准确的内部生成成功次数、模型下载请求次数暂不可接入；加载、焦点或外部打开不能替代它们。现有懒加载、品牌外框、SEO 和内链实现保留。本次仅补充已确认的限制说明，无运行时代码变更，沿用上面的验证结果。

## 23. 图片转 3D 两个搜索意图页

**状态：** 页面 Green（2026-10-06）；四个样本批次 Pending（1/4） ｜ **范围：** Next.js ｜ **公开页面与样本下载**

| # | 验收场景 | 预期行为 |
|---|---------|---------|
| 1 | 两页双语公开访问 | `/image-to-3d-model-free-download`、`/image-to-3d` 和对应中文页未登录均可阅读，不跳转到登录页；英文 A 页 H1 直接包含 Free 和 Download |
| 2 | 内容分工 | A 页围绕实际文件下载、免费边界、格式与权限 FAQ；B 页包含 Pixal3D、Hyper3D Rodin、TRELLIS、Hunyuan3D 独立卡片，说明适用对象、格式、质量限制、运行条件及已知耗时/显存的适用范围；不复制第二套首页生成器 |
| 3 | 嵌入与来源边界 | 两页复用品牌外框及懒加载恢复入口，Space 可单独配置；明确第三方运行与本站样本下载的不同免费范围，框内没有本站登录遮罩，不宣称已统计内部生成/下载 |
| 4 | 真正可下载的自托管文件 | 只展示来源/再分发权限明确且已存在的文件；无本站注册步骤、无占位链接，公开下载返回真实有效文件；样本说明生成来源和资产许可，不把模型代码许可当成输出许可，不冒充新生成批次 |
| 5 | 格式与 FAQ | GLB、STL、OBJ、FBX 说明准确，只有实际存在的格式才有下载按钮；回答 no sign up、免费范围与商用，STL 提醒几何/尺寸检查，OBJ 说明材质依赖 |
| 6 | SEO 与语言切换 | 两页有独立 title/description、无查询参数 canonical、EN/ZH/x-default hreflang；英文前缀别名跳转；sitemap 包含两页语言版本，robots 放行；切换语言保留当前页面和查询参数 |
| 7 | 内链与移动布局 | 首页新增两页入口且已有文案保持；两页互链并连接相关四个教程；390px 无整页横向溢出，表格可局部滚动，按钮/FAQ 可操作 |
| 8 | 无隐式付费操作 | 浏览、选择模型和公开样本下载不预留试用会话、不提交生成任务、不扣本站积分；外部工作台用 fixture 验证 UI，不把 fixture 当作真实 GPU 运行 |

**结果：** `specs/image-to-3d-pages.spec.ts` 10/10 通过（初次 16.9s，最终布局调整后 15.3s）。覆盖两页 EN/ZH 公开内容、来源与 FAQ，实际匿名文件下载及 SHA-256、GLB 内嵌纹理和几何检查，OBJ/STL 面数与边界一致，懒加载、语言切换、首页/教程内链、canonical/hreflang/sitemap/robots、390px 布局与原图解码。浏览页面和下载文件未提交生成请求、预留试用会话或消耗本站积分。

| 命令 | 结果 |
|------|------|
| `corepack pnpm --filter @tinyship/next-app typecheck` | 通过 |
| `corepack pnpm --filter @tinyship/next-app build` | 通过，43 个预渲染页面；保留既有 middleware 弃用提示 |
| `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts` | 最终 10/10 通过（15.3s） |
| `corepack pnpm exec node --test scripts/model-samples/generation-safety.test.mjs scripts/model-samples/export-geometry.test.mjs` | 19/19 通过（293.7ms） |
| `corepack pnpm exec node scripts/model-samples/refresh-manifest.mjs` | 1 个完整模型、3 个真实文件通过校验并生成清单 |

桌面/手机 Verify 使用已连接的 in-app browser（本机无 `agent-browser`）。E2E 使用 `E2E_SKIP_CLEANUP=true` 与本节上一轮记录的 Chromium headless shell 路径覆盖；不创建测试数据库用户，远程 iframe 使用 fixture，下载使用真实本地公开文件。完整页面截图保存到 `.tmp/intent-pages/download-page.png` 和 `comparison-page.png`；下载区域预览为 `.tmp/intent-pages/download-preview.png`。

独立脚本复核中的重复提交与原图完整性问题已修复。新回归覆盖明确的配额拒绝、未收到事件 ID 的提交中断、已接受请求的流/解析中断、恢复下载、Token 脱敏，以及原图变化时阻止跳过/续跑/发布。离线测试不请求真实供应商或 GPU。

**未完成项：** 用户已指定 `victor/pixal3d-studio` 生成四个样本。蘑菇已完成并提供真实 GLB/OBJ/STL；茶壶被 ZeroGPU 匿名额度拒绝（请求 120s，剩余 108s），椅子和木箱未提交。未完成样本不进入清单，也不显示下载按钮。批次需要额度恢复或用户提供认证后续做。两页具体嵌入 Space 仍按原需求后定，目前各自配置为现有 Space。公开资产说明只授权个人、教育及非商业评估使用，未授予商用许可。

### 工作区优先与布局精简（2026-10-07）

**状态：** Green（2026-10-07；以下验收场景在编码前记录）。

- 两页 EN/ZH 的核心生成工作区均位于紧凑页头之后，是第一个正文区域；桌面与 390px 手机初始视口可看到工作区外框和 iframe 顶部，无需先浏览下载库或模型卡片。
- 每页仅挂载一个现有 Space iframe，接近视口自动加载，滚动离开后保留会话；不增加本站登录遮罩、试用预留或付费生成请求，也不恢复已删除的托管来源徽标。
- 下载页使用紧凑的样本图、真实文件按钮与用途说明；保留原图性质、来源、使用许可和 GLB/OBJ/STL 区别，FBX 不增加虚假下载入口。删除重复流程卡片。
- 对比页四个模型的适用情景易于扫描，显存、耗时、质量限制和来源通过可操作的详情展开；保留全部事实、版本条件和数字，删除重复选择步骤卡片。不暗示卡片切换第三方工作区模型。
- 两页保留不同搜索意图、元数据、语言切换和内链；FAQ、折叠说明和下载链接正常工作。桌面与手机无整页横向溢出，触控入口易于操作。
- 在真实浏览器检查桌面与手机布局后更新相关 E2E，并完成 Next.js typecheck、build 与该页面 E2E。

**验证结果：** Next.js typecheck、build 通过（43 个预渲染页面，仅既有 middleware 弃用提示）。相关页面 11 项 + 共享工作区 3 项 E2E 共 14/14 通过（24.0s），新增父页面脚本被阻止时，核心 iframe 仍可显示的浏览器回归。覆盖首次视口、SSR 单 iframe、滚动保留、详情/格式展开、EN/ZH、390px、真实文件下载与 SEO。共享工作区测试观察器修正可见事件先于水合注册时被丢弃的竞态，原有懒加载与恢复断言保留。E2E 沿用 Chromium 覆盖、免数据库清理和第三方 fixture，未执行 GPU 任务。

真实浏览器桌面/手机检查使用 in-app browser（本机无 agent-browser）。真实页面局部预览为 `.tmp/intent-pages/redesign-download.jpg`、`redesign-comparison.jpg`；E2E 保存两页 EN/ZH 的首屏、支持内容及手机布局截图。

### 下载与模型选择意图聚焦（2026-10-07）

**状态：** 页面功能 Green（2026-10-07；以下场景在本轮实现前记录，按 A → B 顺序验收）；样本批次仍为 Pending（1/4）。**测试文件：** `specs/image-to-3d-pages.spec.ts`。仅验证 Next.js 公共页面；第三方工作台使用 fixture，不运行 GPU、创建账号、预留试用或消费积分。

| # | 验收场景 | 预期行为 |
|---|---------|---------|
| A1 | 下载入口从首屏可找到 | A 页英文 H1 保留 Free 与 Download；生成工作台位于紧凑页头后的首个正文区域；工作台附近直接说明上传、生成和导出的路径，并提供明确的本站样本下载入口，点击后到达真实下载区域。 |
| A2 | 原图与真实结果同屏呈现 | 每个已完成样本展示输入原图和由其实际 GLB 渲染的结果预览；结果具有可解码的静态海报，交互预览失败或父页面脚本无法加载时仍能查看海报和使用下载链接；海报来源可以追溯到对应 GLB 的哈希。 |
| A3 | 匿名取得真实文件 | 无登录的独立请求和浏览器分别取得已完成样本的 GLB、OBJ、STL；公开 URL 直接返回有效文件，文件大小与 SHA-256 匹配清单，GLB 纹理/几何有效，OBJ/STL 几何与 GLB 相符。未完成样本没有占位卡片或按钮，未提供的 FBX 没有下载入口。 |
| A4 | 格式用途与限制直接可见 | 格式对照内容默认可见，说明 GLB、OBJ、STL 及 FBX 的用途、实际可用性与限制；OBJ 材质依赖/当前几何导出、STL 尺寸和可打印性检查、FBX 不可下载均准确；手机可读且不造成整页横向溢出。 |
| A5 | 免费与许可边界准确 | 本站样本可匿名直接下载，样本来源与非商业评估许可可查；第三方工作台的账号、额度、排队和导出限制与本站下载区明确区分，不把本站免注册下载承诺套用到供应商生成或导出。 |
| B1 | 首屏支持模型选择 | B 页保留一个生成工作台，并在其附近提供 Pixal3D、Hyper3D Rodin、TRELLIS、Hunyuan3D 的具名导航；每个入口跳转对应模型内容。导航不替换、重载或增加 iframe，且明确当前仍是暂定 Pixal3D 嵌入。 |
| B2 | 选择所需事实默认可见 | 四张模型卡片直接显示适用情景、输出格式、免费/在线/本地条件、质量与不适用场景，以及带具体版本/硬件条件的简短耗时和显存信息；未知值明确为未知，不编造统一性能排行或把所有服务说成免费。 |
| B3 | 每个模型都有实际行动入口 | 每张卡片至少有一个有意义的在线使用或本地安装入口，链接指向已核验的对应官方页面/项目；链接名称说明行为，长版本细节、许可说明和来源链接放入可正常展开/收起的详情。 |
| C1 | 双语、SEO 和导航保持有效 | 两页 EN/ZH 均公开可读，新增文案使用对应字典；保留不同的 title/description、无查询参数 canonical、EN/ZH/x-default hreflang、sitemap/robots、首页及教程内链；切换语言保留页面路径与查询参数。 |
| C2 | 单 iframe、脚本回退与手机布局 | 两页服务端 HTML 均含一个核心 iframe，首屏可看到其顶部；滚动、模型锚点导航和折叠内容操作后仍只有原来的 iframe。阻断父页面脚本后 iframe、样本海报和直接下载仍可用；390px EN/ZH 均无整页横向溢出，动作入口可操作。 |

**验证顺序：** A 实现 → 真实浏览器 EN/ZH 桌面/390px 核验 → 更新并运行 A 相关 E2E → B 实现 → 真实浏览器核验 → 更新并运行完整相关 E2E → Next.js typecheck/build → 在此补记实际结果。沿用 `E2E_SKIP_CLEANUP=true` 与现有 `E2E_CHROMIUM_EXECUTABLE_PATH` 覆盖，并记录实际 Chromium 版本。fixture 仅隔离远程工作台与无关第三方请求；本地页面、静态预览、下载和元数据使用真实应用。

**A 阶段结果：** 浏览器核验后，A 的 EN/ZH 页面、匿名真实文件与三个格式的浏览器下载、海报 PNG/GLB 哈希溯源、SSR 单 iframe、父页面脚本阻断时的海报/下载、390px 双语布局等相关 E2E **6/6 通过（10.7s）**。命令为 `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts --grep 'image-to-3d-model-free-download|serves real|server-renders|parent scripts|within 390px'`。实际浏览器为 Google Chrome for Testing **149.0.7827.55**，使用现有 headless shell 路径覆盖；第三方 iframe 为 fixture，本地图片、文件和页面均为实际内容。后续 B 与最终验证结果如下。

**A + B 组合结果：** B 的真实浏览器 EN 桌面/中文 390px 核验后，运行 `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts tests/e2e/specs/embedded-workspace.spec.ts`，**16/16 通过（52.6s；13 项意图页 + 3 项共享工作台）**。B 新回归逐一点击四个具名模型导航，确认到达对应卡片且原 iframe 节点、src 与一次加载均保留；在线及外部本地安装链接在新标签页打开对应 URL，Pixal3D 本地安装进入真实本地化教程。默认可见使用条件与五项简要事实、折叠长说明与来源、EN/ZH 元数据/语言切换/内链及 390px 布局均通过。

本次设置 `E2E_CAPTURE_INTENT_PAGES=true`，新截图位于 `.tmp/intent-pages/`：`download-top-{locale}.png`、`comparison-top-{locale}.png`、对应 `supporting`、`mobile-top`、`mobile-supporting` 与整页截图；复核英文模型卡片和中文手机导航无视觉阻塞。浏览器仍为 **149.0.7827.55**。第三方工作台与外部入口仅用 fixture 验证本站操作，不证明供应商 GPU 可用性；本地结果海报、GLB/OBJ/STL、教程和 SEO 为真实内容。

| 最终验证 | 结果 |
|----------|------|
| `corepack pnpm --filter @tinyship/next-app build` | 通过，43 个预渲染页面；编译 8.0s、TypeScript 10s，仅既有 middleware → proxy 弃用提示 |
| `corepack pnpm --filter @tinyship/next-app typecheck` | 构建后再次执行，通过 |
| 意图页与共享工作台相关 E2E（上述组合命令） | 16/16 通过（52.6s） |
| 资产生成安全与几何导出离线测试 | 22/22 通过；海报独立解码及 GLB/PNG 溯源通过 |
| `git diff --check` | 通过，无空白错误；仅工作区 CRLF 规范化提示 |

**样本批次单独状态：** 仍仅蘑菇已完成，提供真实 GLB/OBJ/STL 与对应 GLB 海报；茶壶、椅子、木箱不显示为已完成，也不出现占位下载。本轮未提交 GPU 生成任务。供应商配额恢复时间记录为北京时间 **2026-10-07 22:59:30**，其余 3/4 等待配额后继续；页面功能 Green 不代表四个生成样本已经完成。

### 删除工作区左侧标题（2026-10-07）

**状态：** Green。修改前验收：两页 EN/ZH 工作区外框不再显示左侧 Pixal3D workspace / Pixal3D 工作台标题；右侧说明保留，iframe 仍有可访问名称，首屏显示、下载和详情操作正常。

**结果：** 真实浏览器确认左侧标题消失；四个 EN/ZH 页面相关 E2E 4/4 通过（8.0s），新增外框仅含右侧说明、section 可访问名称及 iframe title 断言。Next.js typecheck 和 build 通过，构建仅有既有 middleware 弃用提示。预览为 `.tmp/intent-pages/workspace-title-removed.jpg`。

### TRELLIS.2 与 Hunyuan3D 2.1 站内工作台切换（2026-10-07）

**状态：** Green（2026-10-07；以下场景在本轮编码前记录）。**测试文件：** `specs/image-to-3d-pages.spec.ts`。此次需求更新 B 页的使用动作；以上历史记录中“所有非 Pixal3D 模型在线操作均打开外部工具”和“交互后始终仅有一个 iframe”的验收由下列行为替代。

| # | 验收场景 | 预期行为 |
|---|---------|---------|
| 1 | 首次访问仅运行默认嵌入 | B 页初始服务端 HTML 仍只有 Pixal3D iframe；初次访问仅请求 Pixal3D 工作台，TRELLIS.2 和 Hunyuan3D 2.1 在首次选择前不挂载、不请求第三方工作台。 |
| 2 | 顶部与卡片可切换站内模型 | 分别点击顶部和模型卡片中的 TRELLIS.2、Hunyuan3D 2.1 使用按钮，在当前页面工作台区域显示对应真实 `hf.space` iframe；不导航到外站、不弹出新标签页。各模型 iframe 使用准确的源 URL 与本地化可访问标题，顶部/卡片对应按钮的 `aria-pressed` 与当前模型保持一致。 |
| 3 | 切换时保留输入与会话 | 依次访问 Pixal3D、TRELLIS.2、Hunyuan3D，再从两处使用按钮切回。已经访问的 iframe 保留原 DOM 节点及 fixture 内输入的文本，供应商页面不会因切换而重新请求；三个均访问后最多挂载三个 iframe，始终只有一个可见。 |
| 4 | 名称导航与其他操作保持明确 | 四个模型名称仍滚动至对应模型说明卡片，不触发模型切换；Rodin 保持真实外部使用入口，打开规则与原先一致；本地安装链接仍进入对应的教程或官方安装页面。A 页保持单 Pixal3D 工作台和实际样本下载行为。 |
| 5 | 活跃工作台可单独恢复 | 工作台加载慢或失败时，当前模型的重试/独立打开恢复入口指向当前源；重试仅重新加载所选模型，未选模型的 iframe、输入和会话继续保留。切换后可看到新活跃工作台的恢复状态，不混用另一模型的状态。 |
| 6 | 双语、手机与脚本回退 | EN/ZH 文案、按钮状态和 iframe 标题正确；390px 中切换入口可操作且无整页横向溢出。父页面脚本阻断时保留 SSR 的默认 Pixal3D 工作台；已有 A 页海报与匿名直接下载回退仍可用。 |
| 7 | 仅隔离第三方的安全回归 | E2E 使用可输入文本的第三方 iframe fixture 验证切换与保留，不提交真实 GPU 生成，不创建账号、预留试用或消费积分；对站点生成/试用请求继续使用禁止请求断言。 |

**验证顺序：** 实现 → 真实浏览器核验 EN/ZH、顶部/卡片切换及 390px → 基于实际 DOM 更新相关 E2E → 运行意图页与共享工作台回归 → Next.js typecheck/build → 补记结果。维持现有 Chromium 覆盖与 `E2E_SKIP_CLEANUP=true`。

**已知既有边界：** 完整回归发现一次全局语言表单在页面水合前提交而丢失查询参数：服务端隐藏 `returnTo` 仅含路径，查询参数由客户端 `onSubmit` 追加。本轮不修改全局 Header 或 `/api/locale`；原有语言测试明确验证水合后的客户端交互，在 B 页每次语言操作前等待模型按钮启用，仍保留完整 URL、查询参数、cookie 和 canonical 断言。该场景定向复核 1/1 通过（8.9s）；脚本失效场景仍独立验证默认工作台及 A 页海报/下载回退，不宣称覆盖无脚本语言查询保留。

新恢复测试最初使用默认角色选择器读取已隐藏 iframe 中的输入，导致两项断言找不到元素；改为 `includeHidden: true` 后，仍完整验证原节点与输入值，定向 2/2 通过（3.7s）。应用的 iframe 保留和恢复实现未因此修改。

**最终结果：** `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts tests/e2e/specs/embedded-workspace.spec.ts` **20/20 通过（58.6s；17 项意图页 + 3 项共享工作台）**。新 EN 桌面与中文 390px 场景验证首次仅 Pixal3D、顶部/卡片双向切换、每个来源仅一次请求、原 iframe 节点与文本输入保留、三框最多挂载且仅一框可见、按钮状态同步、无页面跳转/新窗口，以及逐个模型重试只重载当前 iframe。原有 A 页下载/海报/脚本回退、模型名称导航、Rodin/本地安装外链、SEO 与语言回归保留。

Next.js 生产 build 通过（43 个预渲染页面，仅既有 middleware 弃用提示），随后 typecheck 与 `git diff --check` 通过。本次 E2E 使用 `http://localhost:7001`、Chromium headless **149.0.7827.55**、`E2E_SKIP_CLEANUP=true` 和 `E2E_CAPTURE_INTENT_PAGES=true`。新增截图为 `.tmp/intent-pages/comparison-active-{pixal3d,trellis,hunyuan3d}-{en,zh-CN}.png`；已检查 TRELLIS.2 中文手机和 Hunyuan3D 英文桌面选中态。真实浏览器也检查了供应商上传/生成/导出 UI 与卡片入口，实时预览保存在 `.tmp/intent-pages/trellis-inline-live.jpg`。E2E iframe 使用可输入文本的 fixture；未提交真实生成、认证、试用或计费请求。

### 工作台切换的本地地址兼容（2026-10-07）

**状态：** Green（2026-10-07；Spec 在修复前记录，根因确认后收窄验收范围）。本轮修复用户观察到的“在本页使用”入口长期禁用并显示等待光标问题；上一轮只在 `localhost` 验证的通过结果未覆盖 `127.0.0.1` 的实际使用。本轮仅处理 Next.js 开发环境的工作台交互。

**确认根因与修复范围：** Next.js 16 开发调试流依赖 HMR WebSocket；相同服务端收到 `Origin: http://127.0.0.1:7001` 时拒绝握手，而 `localhost` 返回 101，导致前者的页面未完成水合。只在 Next 配置加入 `allowedDevOrigins: ['127.0.0.1']`，保留组件就绪保护、静态页面、现有会话逻辑及已声明的 Pixal3D 无脚本回退，不新增 GET 模型切换或动态页面。

| # | 验收场景 | 预期行为 |
|---|---------|---------|
| 1 | 两种地址独立访问均可切换 | 使用全新浏览器上下文分别访问 `http://localhost:7001` 与 `http://127.0.0.1:7001` 的 B 页，不借用另一地址已建立的状态。顶部和模型卡片的 Pixal3D、TRELLIS.2、Hunyuan3D 使用入口均能在当前页面显示正确工作台；不要求用户手动更换主机名。 |
| 2 | 两地址的脚本均正常就绪 | 保持真实 Next.js 脚本加载，两个地址均能完成水合，使用入口随后启用、显示 pointer 光标并实际切换正确模型，不能只移除 disabled 属性或等待光标。开发服务单独复核两个 Origin 的 HMR 握手均为 101；浏览器 E2E 验证用户操作，不硬依赖开发专用协议。 |
| 3 | 保留已声明的无脚本边界 | 父页面脚本阻断时继续呈现默认 SSR Pixal3D 工作台；切换入口保留就绪保护，不宣称无脚本也能切换全部模型。A 页海报与直接下载回退仍可用，本轮不改变该既有边界。 |
| 4 | 正常会话与恢复不回退 | 正常脚本下继续验证按需挂载、顶部/卡片选中状态一致、最多三个已访问 iframe 且仅一个可见、切回保留 DOM 和输入、每个模型首次仅请求一次；重试仍只重载当前模型，其他输入继续保留。 |
| 5 | 双语、手机及现有行为 | EN/ZH 与 390px 下入口可操作、文案准确且无整页横向溢出；模型名称仍只导航至说明卡片，Rodin 外链与 A 页下载行为保持正确。所有第三方生成仅使用 fixture，不提交真实 GPU、认证、试用或计费请求。 |

**验证顺序：** 配置修复 → 真实浏览器分别核验两个地址 → 按真实 DOM 更新 E2E → 两地址独立访问与原会话/恢复/SSR 回退相关回归 → Next.js typecheck/build → 补记结果。实际测试代码在修复后的 UI 经过核验后编写。

**结果：** 新增四项独立上下文回归覆盖 `localhost` / `127.0.0.1` × EN / ZH，使用真实父页面脚本及第三方工作台 fixture，验证入口就绪、TRELLIS.2 与 Hunyuan3D 站内打开、卡片返回、输入/节点保留、每个来源仅一次请求、仅一框可见与无新标签页。定向 **4/4 通过（5.3s）** 后，完整相关命令 `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts tests/e2e/specs/embedded-workspace.spec.ts` **24/24 通过（1.1m；21 项意图页 + 3 项共享工作台）**。

最后增加顶部三个入口及卡片入口 `cursor: pointer` 断言，再执行 `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts --grep 'fresh browser context' --reporter=list`，**4/4 通过（4.9s）**。完整 24 项 HTML 报告保留在 `test-results/e2e-report/index.html`。测试继续使用 Chromium headless **149.0.7827.55**、`E2E_SKIP_CLEANUP=true`；未请求真实 GPU、试用或扣费。浏览器回归没有依赖开发环境专用 HMR 事件，因而仍可用于正常应用运行方式。

最终 Next.js build 通过（43 个预渲染页面；编译 8.9s、TypeScript 10.0s，仅既有 middleware 弃用提示），随后 typecheck 与 `git diff --check` 通过。真实浏览器在用户原先的 `127.0.0.1` 中文页面验证按钮启用、pointer 光标及 TRELLIS.2 / Hunyuan3D 实际工作台显示；截图为 `.tmp/intent-pages/hunyuan-buttons-fixed-127.jpg`。

### HF 工作台后台巡检与同模型自动切换（2026-10-07）

**状态：** 本地页面 E2E 与路由回归 Green；生产部署验证待完成（Spec 在实现前记录）。用户选择网站后台自动执行；不创建 Codex 本地定时任务。范围为 Next.js 的 Pixal3D、TRELLIS.2、Hunyuan3D 2.1 嵌入，Rodin 外链与已有样本资产来源不变。

**下载操作提示补充（2026-10-07，Green）：** A 页三步流程下方增加 EN/ZH 提示：下载按钮无响应时，尝试通过其右侧的分享按钮下载。桌面与390px宽度可见、自然换行；步骤数量、工作区及已有下载行为保持。属于轻量文案修改，复用现有 A 页内容与响应式 E2E，不新增模拟第三方按钮行为的测试。真实浏览器已核验中英文提示及分享图标；聚焦 E2E `--grep 'image-to-3d-model-free-download has distinct|within 390px'` 3/3通过（6.0s），Next typecheck/build通过（43页；仅既有middleware弃用提示）。截图 `.tmp/intent-pages/download-share-hint-zh-CN.png`。未提交第三方生成、分享或下载操作，未部署。

| # | 验收场景 | 预期行为 |
|---|---------|---------|
| 1 | 三天到期才检查供应商 | 复用 Cloudflare 现有每日触发入口，PostgreSQL 持久记录每个模型的到期时间；未满 72 小时的运行不请求 HF 检查。并发触发由持久租约防止重复执行，失败和进程中断后可恢复，不依赖单个 Worker 实例内存。原有年度积分刷新的密钥开关和行为保持。 |
| 2 | 巡检只做可用性读取 | 检查公开 Space 状态、模型与版本证据、应用可访问性及嵌入条件；区分暂时超时、启动中、不可用和未知结果，不把 HTTP 200、iframe load、队列长度或 fixture 当成生成成功。不得提交 GPU 生成、预留试用、注册登录或消耗本站积分。 |
| 3 | 仅切换匹配的候选 | 当前源确认不可用时，在已核验候选中选择同一模型和版本、功能条件匹配且检查通过的 Space。仅名称相似、版本不同、身份/功能证据不足的搜索结果不能自动成为活跃源；没有合格候选时保留最后已知配置并记录原因，不编造可用替代。 |
| 4 | 状态与审计持久化 | 每个模型记录当前及上次可用源、检查时间、下次到期、检查结果与切换原因；切换和失败可审计。公共页面/解析接口不返回数据库信息、巡检密钥或供应商凭证；模型之间的状态互不覆盖。 |
| 5 | 公开稳定地址解析 | 首页及 A/B 页统一使用 `/api/space-workspaces/{pixal3d\|trellis\|hunyuan3d}` 同源 iframe 地址；该地址匿名可用并重定向到服务器选定的合法 `hf.space`，不要求客户端先完成水合。未知模型与任意外部 URL 参数不能造成开放重定向。解析响应不缓存旧活跃源。 |
| 6 | 数据库故障可安全回退 | 无记录、表尚未安装或数据库暂不可读时，解析接口在有界等待后使用该模型已配置的默认源，页面仍可打开；故障不触发生成或将未验证地址写为活跃源。单次页面加载不主动执行供应商巡检。 |
| 7 | 后台切换不打断现有会话 | 后台更新活跃源后，已挂载 iframe 的节点、输入和运行中会话保持。切换只在新页面、该模型首次挂载或用户明确重试时解析；切回已访问模型仍复用原节点，最多三个 iframe 且仅一个可见。 |
| 8 | 重试与独立打开使用当前解析 | 对当前模型重试或独立打开时访问稳定解析地址，取得最新活跃源；重试只重载当前模型，其他 iframe 的输入与节点保留。用户看到的来源说明不能把已切换的社区 Space 冒充最初官方实例。 |
| 9 | 现有页面保持可用 | 两页初始 SSR 仍仅含默认 Pixal3D iframe；禁用父页面脚本时仍能通过稳定地址打开该工作台。EN/ZH、localhost/127、390px、模型导航/按钮、SEO、A 页海报与真实匿名下载及首页原有访问限制保持。 |
| 10 | 巡检入口受保护 | 新巡检 POST 路由在缺少服务端密钥时安全失败，错误或缺失客户端密钥被拒绝；匿名用户与普通登录用户都不能触发供应商检查或状态写入。正确服务端调用使用相同授权约定，路由仅适配共享业务逻辑。 |
| 11 | 可重复的页面回归 | 浏览器使用真实 Next.js 页面与解析路由，并仅隔离外部供应商；另用受控重定向 fixture 模拟活跃源切换，验证当前帧不变、新挂载/重试取得替代、恢复链接正确。测试清楚区分真实路由默认解析与 fixture 覆盖，不以 fixture 证明真实备用 Space 健康。 |
| 12 | 部署后才宣称后台生效 | 完成数据库结构更新与 Cloudflare 部署后，核验运行中的巡检授权、计划、持久状态及日志。只有本地代码/测试通过时标为实现验证完成，不能声称线上已每三天自动巡检。 |

**测试分工与顺序：** 先实现共享巡检/存储、薄 API 和页面稳定源 → 真实浏览器核验默认解析及 EN/ZH 工作台切换 → 按实际 DOM 更新 `specs/image-to-3d-pages.spec.ts`、共享 iframe 与首页相关 E2E。现有二十四项会话、来源、恢复及两种本机地址回归需适配稳定地址，并保留真实样本下载检查。重定向状态码/白名单/无缓存、巡检密钥拒绝、72 小时到期、租约/并发、候选版本匹配、数据库回退等纯 API/业务契约放入对应 API 或单元测试，不混作 UI E2E。所有自动化供应商响应使用 fixture；不执行真实 GPU 或试用流程。沿用 Chromium 覆盖与 `E2E_SKIP_CLEANUP=true`，完成相关 Next.js E2E、typecheck/build 后在本节记录实际结果及部署状态。

**Verify 与测试边界：** 可用的 in-app browser 在真实 `127.0.0.1` 中文页面确认默认 Pixal3D 经稳定地址加载、TRELLIS 按钮切换及切回 Pixal3D 保留已有 iframe；没有提交生成。页面 E2E 使用真实 Next.js 页面、SSR 和脚本，稳定解析的 307 跳转由第二个本地 HTTP origin 承接供应商文档；这验证实际浏览器跨 origin 重定向，避免 Playwright 对重定向链后续请求的拦截限制导致误连真实 HF。一个独立页面场景通过实际匿名 Next.js 解析路由，确认三个默认目标与 `no-store` 后再交给本地供应商 fixture；EN/ZH 两项仅修改内存中的受控解析结果，验证已挂载输入和节点不变，而首次挂载、独立打开及用户重试取得新目标。未写入生产活跃源，也不把这些 fixture 作为真实备用 Space 或 GPU 健康证据。

**结果：** 新增三项定向 E2E 3/3 通过（11.6s）。首次完整回归中，五项旧测试因 fixture 新增目标说明后通用 `p` 选择器不再唯一而失败，已改为明确文本选择器；另一次中文内链断言在并发应用构建期间失败，停止并发构建后无应用或测试改动即通过。六项定向复核 6/6 通过（20.5s），随后完整相关回归 **29/29 通过（1.2m）**：原二十四项保留，新增实际解析一项、受控切换两项及首页两项。最终报告为 `test-results/e2e-report/index.html`。

| 验证命令 | 本轮结果 |
|---------|---------|
| `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts tests/e2e/specs/embedded-workspace.spec.ts tests/e2e/specs/public-pages.spec.ts --grep 'Public image-to-3D intent pages\|Embedded workspace foundation\|Home page loads\|Embedded workspace shows'` | 29/29 通过（1.2m） |
| `corepack pnpm exec vitest run tests/unit/space-monitor/routes.test.ts` | 28/28 通过（273ms）；实际 registry/auth、模拟共享业务边界；覆盖匿名解析、未知模型、URL 注入无效、授权与状态脱敏、触发时间、回滚及故障响应 |
| `git diff --check -- tests/e2e tests/unit/space-monitor/routes.test.ts` | 通过；只有现有 CRLF 规范化提示 |

巡检使用独立 `SPACE_MONITOR_SECRET`，不会借用或启用年度积分任务的 `CRON_SECRET`；路由单元测试明确验证该隔离。E2E 使用 Chromium headless **149.0.7827.55**、`E2E_SKIP_CLEANUP=true` 和 `E2E_CAPTURE_INTENT_PAGES=true`；最新 EN/ZH 桌面与 390px 截图保存到 `.tmp/intent-pages/`，中文手机首屏已复核。Next.js 最终 typecheck/build、共享巡检/存储测试及生产部署的实际结果由对应实现验证另行补记；此处的本地 Green 不表示线上计划已经启用。四样本批次仍为 1/4，本轮 QA 未执行 GPU、登录、预留试用或计费操作。

### B 页精简说明与突出模型名称（2026-10-07）

**状态：** Green（Spec 已先于实现记录）。范围仅为 `/image-to-3d` 及中文页的可见文案和顶部模型名称呈现。

| # | 验收场景 | 预期行为 |
|---|---------|---------|
| 1 | 精简页头摘要 | 中文页头摘要移除末尾“免费使用和文件导出的条件各不相同”，英文移除对应的末尾说明；保留选择模型、本站使用三个模型和打开 Rodin 的介绍，句子标点自然。 |
| 2 | 删除两处重复段落 | 工作台下方原 `workspaceNote` 整段不再显示；“选择模型”标题下原 `modelsIntro` 整段不再显示。两个位置不残留空白段落或多余间距，模型卡片的具体条件、限制和来源仍可阅读。 |
| 3 | 顶部模型名称更突出 | 顶部选择器的 Pixal3D、Rodin、TRELLIS.2、Hunyuan3D 2.1 名称使用桌面 24px、手机 20px 的加粗文字，比其说明与使用条件更醒目；390px 下较长名称自然排版，不挤压使用按钮、不造成整页横向溢出。 |
| 4 | 导航与模型操作保持有效 | 点击四个名称仍到达各自模型卡片；三个站内模型使用按钮继续切换正确工作台并同步选中状态，切回保留已访问 iframe 与输入；Rodin 仍打开原外部入口。 |
| 5 | 双语与原页面边界 | EN/ZH 对应调整一致，既有 SEO 元数据、无脚本默认工作台和公开访问正常；A 页三步流程、分享下载提示及真实样本下载保持。文案精简不触发生成、试用或计费操作。 |

**验证顺序：** 完成文案与样式 → 真实浏览器核验 B 页 EN/ZH 桌面与 390px → 按实际 DOM 调整既有内容断言，保留名称导航、站内切换、会话保留和响应式回归 → 相关 Next.js E2E 与 typecheck/build → 补记结果。本轮不新增第三方生成测试。

**结果：** 真实浏览器检查中文桌面与 390px 布局，三处指定文字已移除，名称桌面 24px、手机 20px / 700 加粗，较长名称可换行且导航无横向溢出。既有 E2E `--grep 'image-to-3d has distinct|model navigation reaches|switches embedded models|within 390px'` **7/7 通过（28.2s）**，覆盖 EN/ZH 内容、四个名称锚点、模型切换、会话保留以及两页手机布局。Next typecheck、build（43 个预渲染页面）与 `git diff --check` 通过；构建仅有既有 middleware 弃用提示。浏览器和环境沿用本节前述 Chromium 覆盖、fixture 与跳过测试用户清理配置。中文桌面预览为 `.tmp/intent-pages/model-navigation-clean-zh-CN.png`，E2E 双语截图仍存于 `.tmp/intent-pages/`。未执行真实生成或计费操作，未部署。

### 两页目标关键词与标题调整（2026-10-07）

**状态：** Green（Spec 已先于实现记录）。采用用户确认的标题：A 为 `Image to 3D Model: Free Download`，B 为 `Image to 3D Model: Free & Online AI Tools`。

- 两页英文 H1、HTML title、Open Graph 和 Twitter 标题使用同一新标题；中文采用自然对应表述。
- B 页现有摘要、模型比较标题及 FAQ 自然体现 image-to-3D AI、从图片在线生成模型及免费使用意图，不增加段落，不恢复前轮已删除的三处说明。
- A 页保留免费下载文件的定位，B 页保留模型比较与在线使用的定位；URL、canonical、工作区和下载行为保持。
- 复用 EN/ZH 两页内容/metadata/FAQ 与 390px 响应式 E2E；真实浏览器核对首屏和文字换行，完成 Next typecheck/build 后记录结果。

**结果：** 真实浏览器已核对两页英文 H1、B 页摘要及工作区上方层级；E2E 的 390px 截图已检查英文 B 页和中文 A 页标题换行。现有内容测试增加 OG/Twitter 标题和比较区 H2 的一致性断言，`--grep 'has distinct public content|within 390px'` **5/5 通过（9.1s）**，覆盖 EN/ZH H1、HTML title、社交标题、canonical、FAQ、样本内容与响应式布局。Next typecheck/build（43 个预渲染页面）及 `git diff --check` 通过；仅有既有 middleware 弃用提示。真实英文预览为 `.tmp/intent-pages/keyword-title-comparison-en.png`；手机截图来自受控 iframe fixture。仅调整共享 EN/ZH 文案、已有测试和文档，未改工作区逻辑，未部署。

### A 页暂时隐藏样本下载入口与样本库（2026-10-07）

**状态：** Green（Spec 已先于实现记录）。用户要求暂时隐藏 A 页的样本按钮及下方样本库；保留已生成资源与组件，便于以后恢复。

| # | 验收场景 | 预期行为 |
|---|---------|---------|
| 1 | 样本入口与样本库均不渲染 | EN/ZH A 页不显示页头“Download free samples”及对应中文按钮、不显示导出说明内的样本链接，也不渲染样本库、样本卡片或输入/结果海报；页面不残留指向不存在的 `#downloads` 的链接或空白区域。 |
| 2 | 可见说明与元数据一致 | A 页摘要、description、FAQ、下载步骤附近说明等不再承诺可见的示例库或引导用户下载本站样本；B 页相关入口及首页指向这两页的说明同步保持准确。A 页仍围绕工作台生成与文件导出，保留已确认的标题及格式说明。 |
| 3 | 隐藏不等于删除资源 | `modelSampleLibraryEnabled=false` 控制当前显示；已完成样本的清单、GLB/OBJ/STL、原图、海报和溯源文件保留。已有文件验证仍通过匿名直接 GET 检查实际内容、大小、哈希及格式，不依赖隐藏的按钮，也不把其他三个未完成样本标为完成。 |
| 4 | 工作台与格式表正常 | A 页三步流程、分享按钮下载提示、单个默认 iframe、恢复入口和可见格式表保持；支持内容以格式表和 FAQ 为主，滚动定位使用真实存在的 `#formats`，不依赖已隐藏的样本区。 |
| 5 | 双语、无脚本与手机布局 | EN/ZH 桌面和 390px 均无样本入口或卡片、无整页横向溢出；父页面脚本失败时默认 iframe 与格式表仍可读。B 页模型选择、导航、会话保留与恢复，以及两页 SEO/FAQ/内链回归继续有效。 |

**验证顺序：** 配置与页面文案实现 → 真实浏览器检查 EN/ZH A 页、390px 与相关入口 → 仅更新 `specs/image-to-3d-pages.spec.ts` 中现有内容、文件下载、无脚本和手机场景，不新增测试；保留真实文件验证，将隐藏区相关 UI 断言改为不渲染 → 相关 Next.js E2E 与 typecheck/build → 补记结果。本轮不删除样本文件，不调用供应商生成、试用或计费流程。

**结果：** CUA 核对英文首屏和展开后的 FAQ，真实工作区正常加载；首屏截图 `.tmp/intent-pages/download-samples-hidden-en.png`。已检查 E2E 中文格式表及 390px 首屏截图（E2E iframe 使用受控 fixture）。现有 `image-to-3d-pages.spec.ts` **24/24 通过（1.1m）**，覆盖双语内容/SEO、隐藏样本、保留资源完整性、模型切换与会话保留、无父页面脚本、内链、sitemap 与手机布局。Next typecheck/build（43 个预渲染页面）及 `git diff --check` 通过；构建仅有既有 middleware 弃用提示。本轮未部署。

### 在线生成入口命名（2026-10-07）

**状态：** Green（Spec 已先于实现记录）。首页通向 B 页的入口明确表达“选择模型、在线生成”，英文同步；共享标签也用于 A 页通向 B 页的内链。首页说明不再把 B 页描述为只比较模型。目标 URL 与页面内模型比较标题不变，复用现有双语首页/内链 E2E，核对实际入口文字与跳转，完成 Next typecheck/build。

**结果：** 入口改为“选择模型，在线生成 3D”/“Choose a model and generate 3D”。CUA 已核对中文首页显示并实际点击进入 B 页，截图 `.tmp/intent-pages/online-generation-entry-zh-CN.png`。既有 `--grep 'links from the homepage'` 场景 **1/1 通过（3.1s）**，覆盖 EN/ZH 首页与两页互链。Next typecheck/build（43 个预渲染页面）及 `git diff --check` 通过，仅有原有 middleware 弃用提示；未部署。

### 首页多模型入口优先级（2026-10-07；位置方案已由下方用户反馈修正替代）

**状态：** Green（以下验收场景先于实现记录）。仅调整 Next.js 首页入口布局与 EN/ZH 文案，保留现有页面和生成逻辑。

| # | 验收场景 | 预期行为 |
|---|---|---|
| 1 | 首屏发现多模型能力 | 在首页标题下、Pixal3D iframe 上方展示醒目的多模型入口；说明首页使用 Pixal3D，多模型页支持切换；列出真实可站内切换的 Pixal3D、TRELLIS.2、Hunyuan3D 2.1 名称和明确行动按钮。 |
| 2 | 正确进入多模型页 | EN/ZH 入口分别进入 `/image-to-3d` 和 `/zh-CN/image-to-3d`；公开入口不受首页登录遮罩阻挡，到达后模型选项正常可用。 |
| 3 | 下载入口降级 | FAQ 下保留较轻的 Pixal3D 生成与下载说明入口，明确它与首页使用同一模型；不再并列展示两个同等权重的大按钮。 |
| 4 | 响应式与可访问性 | 桌面与 390px 手机首屏能看到并点击多模型按钮；无整页横向溢出；链接支持键盘焦点，中英文无硬编码和缺失文案。 |
| 5 | 现有功能回归 | 两页互链、语言 URL、首页 iframe 与登录遮罩保持可用；相关意图页、共享工作台、首页 E2E 通过。 |

**实施与验证计划：** 扩展共享翻译类型及 EN/ZH 字典 → 首页首屏多模型卡片与下方轻量下载入口 → 实际浏览器检查双语桌面/390px布局与点击 → 基于真实 DOM 更新现有首页内链 E2E → Next typecheck、build、相关 E2E及 diff 检查 → 记录结果与文档。当前环境没有 `agent-browser` 命令，视觉验收使用可用的浏览器工具；不运行真实生成或计费操作。

**结果：** CUA 已检查双语桌面和 390px 首页，并从中文首屏按钮进入真实多模型页；英文手机按钮缩短后完整单行显示。新增四项 EN/ZH × 桌面/手机 E2E 验证入口与模型标签完整出现在初始视口、键盘聚焦、实际跳转、模型选项可用，以及首页单 iframe 和匿名登录遮罩。原首页/意图页内链场景适配下方单一指南入口。独立静态复核无遗留问题。

| 验证 | 结果 |
|---|---|
| `corepack pnpm --filter @tinyship/next-app typecheck` | 通过 |
| `corepack pnpm --filter @tinyship/next-app build` | 通过，43 个预渲染页面；仅既有 middleware 弃用提示 |
| `corepack pnpm exec vitest run tests/unit/next/home-page-layout.test.ts` | 10/10 通过（443ms） |
| `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts tests/e2e/specs/embedded-workspace.spec.ts tests/e2e/specs/public-pages.spec.ts --grep 'Public image-to-3D intent pages\|Embedded workspace foundation\|Home page loads\|Embedded workspace shows'` | 33/33 通过（57.8s） |
| `git diff --check` | 通过 |

E2E 使用已有 Chromium headless 149.0.7827.55 路径覆盖及 `E2E_SKIP_CLEANUP=true`，外部工作台使用 fixture，未运行生成、试用或计费操作。截图为 `.tmp/intent-pages/home-multi-model-{desktop,mobile}-{en,zh-CN}.png`；报告 `test-results/e2e-report/index.html`。本轮未部署。环境自带的 `pnpm` 包装器尝试安装依赖并因无 TTY 中止，改用项目指定的 `corepack pnpm` 后全部验证通过，没有重新安装依赖。

### 首页以 Pixal3D 登录使用为主：更多模型入口下移（2026-10-07）

**状态：** Green（Spec 先于修正实现记录）。用户明确：首页主要引导登录并使用 Pixal3D，以支持邮箱收集；更多模型仅作为工作台下方的补充入口。此要求替代上节首屏大卡片方案。

- 首页标题后直接展示现有 Pixal3D 工作台与登录遮罩，不插入多模型卡片或大按钮。
- “使用更多 3D 生成模型”/“Explore more 3D models”作为轻量文字链接紧接 Pixal3D 工作台下方，位于后续反馈等内容之前；不保留额外大标题、说明块、模型标签或渐变主按钮。
- EN/ZH、桌面与390px：初始视口优先呈现 Pixal3D，滚动到工作台底部后才看到更多模型链接；链接不溢出、可键盘聚焦，并进入正确的本地化多模型页。
- 首页登录按钮继续通向对应登录页，单一 Pixal3D iframe及登录状态切换行为保持；不新增或改变两篇公开意图页的访问策略。
- 根据实际浏览器结果修正上一轮的四项布局 E2E，保留首页/两页互链回归，完成 Next typecheck、build及相关 E2E 后记录结果。

**结果：** CUA 已检查中文桌面/390px 的工作台底部链接、键盘焦点及真实跳转。修正后的四项布局 E2E覆盖 EN/ZH × 桌面/手机：更多模型入口不在初始视口，紧接工作台且位于反馈区之前；真实点击登录按钮进入对应语言的 `/signin`，返回后用 Enter 打开多模型页；单 iframe、登录遮罩、双语标签与无横向溢出均通过。没有新增测试数量或访问策略。

| 验证 | 结果 |
|---|---|
| `corepack pnpm --filter @tinyship/next-app typecheck` | 通过 |
| `corepack pnpm --filter @tinyship/next-app build` | 通过，43 个预渲染页面；仅既有 middleware 弃用提示 |
| `corepack pnpm exec vitest run tests/unit/next/home-page-layout.test.ts` | 10/10 通过（358ms） |
| `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts tests/e2e/specs/embedded-workspace.spec.ts tests/e2e/specs/public-pages.spec.ts --grep 'links from the homepage\|homepage multi-model entry\|Embedded workspace foundation\|Home page loads\|Embedded workspace shows'` | 10/10 通过（19.5s） |
| `git diff --check` | 通过 |

沿用已有 Chromium headless 149.0.7827.55、`E2E_SKIP_CLEANUP=true` 与第三方工作台 fixture。初始视口截图为 `.tmp/intent-pages/home-more-models-initial-{desktop,mobile}-{en,zh-CN}.png`；工作台下方截图为 `.tmp/intent-pages/home-more-models-{desktop,mobile}-{en,zh-CN}.png`。报告保留在 `test-results/e2e-report/index.html`。未创建账号、运行生成或消费积分；未部署。

### 工作台下方更多模型入口适度加重（2026-10-07）

**状态：** Green（Spec 先于样式修改记录）。保留工作台下方靠右的位置及双语文字，将灰色下划线文字改为加粗浅青色文字、细边框、淡背景与适当内边距的紧凑次要按钮；不增加横幅、模型列表或渐变主按钮。桌面及390px无溢出，键盘焦点和本地化跳转可用，Pixal3D登录入口继续保持主位。复用既有四项首页入口 E2E及双语内链场景，不新增样式实现细节测试；浏览器核验后运行相关 E2E、Next typecheck/build并记录结果。

**结果：** CUA 核对中文桌面/390px 加粗文字、浅青描边背景与键盘焦点，手机按钮宽约210px且文字完整显示。`corepack pnpm --filter @tinyship/next-app typecheck`、`build`（43页）及 `git diff --check` 通过；构建仅保留既有 middleware 弃用提示。`corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts --grep 'links from the homepage|homepage multi-model entry'` **5/5通过（17.6s）**，验证双语桌面/手机布局、登录跳转和多模型页入口。复用已有 Chromium 路径覆盖、跳过清理及工作台 fixture，截图已更新至 `.tmp/intent-pages/home-more-models-{desktop,mobile}-{en,zh-CN}.png`。仅修改 Next 页面样式并同步文档，无新文案、业务或配置变更；未部署。

### 下载入口差异化文案与指定说明精简（2026-10-07）

**状态：** Green（Spec 先于实现记录）。按用户三张截图修改 Next.js 可见文案，中英文同步。

- 首页下方下载指南围绕生成、文件导出、格式选择与后续使用，不再提及 Pixal3D 或“与首页相同”；链接明确为“免费下载 3D 模型”及对应英文，保持原本地化目标地址。
- 多模型页仅移除 Pixal3D 卡片标题下“当前基于 TRELLIS.2 的版本”及对应英文，不影响其他模型版本行、模型名称、使用动作及其余卡片内容。
- 下载页工作台下方移除单独的第三方 Hugging Face Space 排队、额度和登录提示行及对应英文；保留下载操作提示、格式表、FAQ与工作台行为。
- 使用实际浏览器核验 EN/ZH 与390px布局，再调整现有内容/内链 E2E中的对应断言，不新增独立测试。完成相关 Next.js E2E、typecheck/build与 diff 检查后记录结果。

**结果：** 首页标题改为“3D 模型下载与使用指南”，摘要说明生成/导出步骤及建模、游戏、3D打印的格式选择，链接改为“免费下载 3D 模型”；英文同步。Pixal3D 的版本文案与下载工作台提示已从字典中移除，版本字段改为可选并仅在有内容时渲染，其他三张卡片仍有各自版本行；同时删除已无用途的 `download.workspaceNote` 类型与节点。

CUA 已核对中文首页新文案及实际点击、下载区提示移除、Pixal3D 卡片与相邻 Rodin 卡片；E2E 核验双语内容和390px布局，已查看新首页指南截图及手机格式区截图。既有 E2E `corepack pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/specs/image-to-3d-pages.spec.ts --grep 'has distinct public content|links from the homepage|within 390px'` **6/6通过（9.7s）**，未增加测试数量。`corepack pnpm --filter @tinyship/next-app typecheck`、`build`（43个预渲染页面）及 `git diff --check`通过；构建仅有既有middleware弃用提示。

截图 `.tmp/intent-pages/home-download-guide-{en,zh-CN}.png`，报告 `test-results/e2e-report/index.html`；沿用 Chromium headless 149.0.7827.55、工作台fixture及跳过用户清理配置。修改分组：共享libs为翻译类型与EN/ZH字典，Next为卡片可选版本与工作台文案节点，docs为实施说明、用户指南与测试目录；配置没有新增变化。未触发生成或计费，未部署。

### 首页入口明确为 AI 3D 生成工具（2026-10-07）

**状态：** Green（Spec 先于文案修改记录）。英文入口使用 “More AI 3D Generators”，中文使用“更多 AI 3D 生成工具”，明确指向生成工具而非 3D 模型资源。工作台下方位置、次要按钮样式及本地化 `/image-to-3d` 目标保持。

**验收：** 浏览器核对双语按钮文字；复用现有首页内链及 EN/ZH × 桌面/390px 入口 E2E，验证文字、布局、登录入口及键盘跳转。现有断言读取共享字典，无需新增测试。完成 Next typecheck/build 后记录结果。`agent-browser` 当前不可用，使用 CUA 浏览器核验。

**结果：** CUA 已核对中文文案和英文实际按钮；既有 E2E `--grep 'links from the homepage|homepage multi-model entry'` **5/5 通过（12.4s）**，覆盖双语桌面/390px、登录及生成工具页跳转。Next typecheck、build（43 页）和 `git diff --check` 通过；构建保留既有 middleware 弃用提示。沿用 Chromium headless 149.0.7827.55、工作台 fixture 及跳过用户清理配置。截图 `.tmp/intent-pages/home-more-models-{desktop,mobile}-{en,zh-CN}.png` 已更新。仅修改 EN/ZH 共享字典并同步两份文档，无 Next 组件或配置变更。
