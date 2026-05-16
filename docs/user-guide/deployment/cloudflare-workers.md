# Cloudflare Workers 部署指南（TanStack Start）

本指南介绍如何将 TinyShip 的 TanStack Start 应用部署到 Cloudflare Workers。

> **适用范围**：仅适用于 `apps/tanstack-app`（TanStack Start）。Next.js 和 Nuxt.js 建议部署到 Node.js 环境，或使用 Vercel / Netlify。

## 目录

- [为什么选择 Cloudflare Workers](#为什么选择-cloudflare-workers)
- [兼容性说明](#兼容性说明)
- [仓库中已完成的配置](#仓库中已完成的配置)
- [分步骤部署](#分步骤部署)
  - [步骤 1：登录 Cloudflare](#步骤-1登录-cloudflare)
  - [步骤 2：配置 Hyperdrive（数据库）](#步骤-2配置-hyperdrive数据库)
  - [步骤 3：配置 Secrets](#步骤-3配置-secrets)
  - [步骤 4：本地预览](#步骤-4本地预览)
  - [步骤 5：部署上线](#步骤-5部署上线)
  - [步骤 6：部署后验证](#步骤-6部署后验证)
- [数据库连接](#数据库连接)
  - [方案 A：Hyperdrive（推荐）](#方案-ahyperdrive推荐)
  - [方案 B：Neon Serverless Driver](#方案-bneon-serverless-driver)
- [环境变量与 Secrets](#环境变量与-secrets)
- [CI/CD](#cicd)
  - [GitHub Actions](#github-actions)
  - [Cloudflare Workers Builds](#cloudflare-workers-builds)
- [CF 模式工作原理（开发者说明）](#cf-模式工作原理开发者说明)
- [故障排查](#故障排查)

## 为什么选择 Cloudflare Workers

| 特性 | 说明 |
|------|------|
| **全球边缘部署** | 自动分发到 300+ 数据中心 |
| **冷启动极快** | 基于 V8 Isolate，冷启动 < 5ms |
| **按量计费** | 免费额度：每日 10 万次请求 |
| **内置 R2 存储** | 可无缝集成 Cloudflare R2 |
| **完整 SSR 支持** | 支持 TanStack Start 的 SSR、Streaming、Server Functions |
| **低运维成本** | 无需管理服务器、负载均衡或容器 |

## 兼容性说明

Cloudflare Workers 运行在 V8 Isolate（非 Node.js）环境。通过 `nodejs_compat` 标志可覆盖大多数 Node.js API，但仍有一些注意事项。

### 已验证兼容

- TanStack Start SSR / Streaming / Server Functions
- Better Auth（基于 HTTP）
- Stripe / PayPal / Creem 支付（基于 HTTP API）
- AI SDK（Vercel AI SDK，HTTP 请求）
- `Buffer`、`crypto` 等（通过 `nodejs_compat`）
- Cloudflare R2 对象存储

### 需要额外配置

- **PostgreSQL**：`pg` 使用 TCP 连接，Workers 不支持原生 TCP。需使用 **Hyperdrive** 或 **Neon Serverless Driver**（见下文）。
- **文件上传**：请求体上限为 100MB（免费版）/ 500MB（付费版）。
- **执行时间**：CPU 时间限制为 10ms（免费版）/ 30s（付费版）。长耗时 AI 任务建议使用流式响应或异步处理。

### 不兼容项

- 依赖原生 C++ 扩展的 npm 包（如 `bcrypt`，建议换成 `bcryptjs`）
- 文件系统写入（如 `fs.writeFile`）
- 长连接 TCP（WebSocket 需配合 Durable Objects）

## 仓库中已完成的配置

以下文件已在仓库中预置完成，你只需补充自己的环境配置：

| 文件 | 用途 |
|------|------|
| `apps/tanstack-app/wrangler.jsonc` | Wrangler 配置文件（请替换为你自己的 Hyperdrive 与域名配置） |
| `apps/tanstack-app/vite.config.ts` | 通过 `CF_DEPLOY` 环境变量按需加载 Cloudflare Vite 插件 |
| `apps/tanstack-app/package.json` | 已提供 `dev:cf` / `deploy:cf` / `cf-typegen` 脚本 |
| `libs/database/index.ts` | 已支持 Hyperdrive 的 `getConnectionString()`（自动回退到 `DATABASE_URL`） |

> **不会影响日常开发**：`pnpm dev` 仍使用标准 Vite 开发服务。  
> 仅当设置 `CF_DEPLOY=1` 时才启用 CF 模式（`dev:cf` 和 `deploy:cf` 脚本会自动设置）。

## 分步骤部署

### 前置条件

- 拥有 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
- 本地 `.env` 中已配置 `DATABASE_URL`
- 依赖已安装（`wrangler` 与 `@cloudflare/vite-plugin` 已在 `devDependencies`）

### 步骤 1：登录 Cloudflare

```bash
cd apps/tanstack-app
npx wrangler login
```

执行后会自动打开浏览器授权。完成后终端会显示 `Successfully logged in`。

### 步骤 2：配置 Hyperdrive（数据库）

先使用你的 PostgreSQL 连接串创建 Hyperdrive（这是线上 Workers 使用的代理配置）：

```bash
npx wrangler hyperdrive create tinyship-db \
  --connection-string="postgresql://user:password@host:5432/dbname"
```

创建完成后会返回一个 Hyperdrive ID。然后在 `wrangler.jsonc` 中同时配置：

- `id`：**线上部署**时使用（`wrangler deploy` 后在 Cloudflare 边缘通过 Hyperdrive 访问数据库）
- `localConnectionString`：**本地开发**时使用（`wrangler dev` / `pnpm dev:cf` 直接连你本机或内网数据库）

示例（与当前项目结构一致）：

```jsonc
"hyperdrive": [
  {
    "binding": "HYPERDRIVE",
    "id": "<your-hyperdrive-id>",
    "localConnectionString": "postgresql://viking:unused@localhost:5432/shipeasy_dev"
  }
]
```

说明：
* 本地调试优先走 `localConnectionString`，便于连接本机数据库并避免依赖线上网络。
* 部署到 Cloudflare 后不会使用 `localConnectionString`，而是使用 `id` 对应的 Hyperdrive 配置。
* 若你不填 `localConnectionString`，本地 CF 调试会走 Hyperdrive 的远端连接路径，调试体验通常更慢且更依赖外网。

### 步骤 3：配置 Secrets

Cloudflare Workers 的敏感配置使用 Secrets（不是 `.env` 文件）：

```bash
# 必填
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put DATABASE_URL

# 按照需要多次放入 serect

# 2) 也可以使用文件进行一次导入
npx wrangler secret bulk .secrets.json
```

上述命令会逐个提示你输入值。  
如果你希望非交互式一次性导入，可使用 `wrangler secret bulk`：


> 建议：`.secrets.json` 仅用于本地临时导入，不要提交到 Git。

非敏感变量建议放在 `wrangler.jsonc` 的 `vars` 中（取消注释后填写）：

```jsonc
"vars": {
  "APP_BASE_URL": "https://your-domain.com",
  "BETTER_AUTH_URL": "https://your-domain.com"
}
```

### 步骤 4：本地预览

先在本地 Workers 模拟环境中验证：

```bash
cd apps/tanstack-app
pnpm dev:cf
```

该命令会以 `CF_DEPLOY=1` 运行 Vite + Cloudflare 插件，从而模拟 Workers 运行时。建议验证：

1. 页面在输出 URL（通常 `http://localhost:7001`）可正常打开
2. 登录 / 注册功能可用
3. 依赖数据库的功能可正常加载
4. API 端点返回符合预期

### 步骤 5：部署上线

```bash
cd apps/tanstack-app
pnpm run deploy:cf
```

该命令执行 `CF_DEPLOY=1 vite build && wrangler deploy`。成功后会输出类似地址：

```
https://tinyship-tanstack.<your-subdomain>.workers.dev
```

### 步骤 6：部署后验证

在部署地址上验证以下端点：

| 检查项 | URL | 期望 |
|-------|-----|------|
| 健康检查 | `/api/health` | 200 OK |
| 首页 | `/en` | 页面正常渲染 |
| 登录页 | `/en/signin` | 登录页可访问 |
| 数据库功能 | `/api/credits/balance`（需会话） | 正常返回余额 |

```bash
# 快速烟雾测试
curl -s -o /dev/null -w "%{http_code}" https://your-worker-url/api/health
```

## 数据库连接

### 方案 A：Hyperdrive（推荐）

[Hyperdrive](https://developers.cloudflare.com/hyperdrive/) 是 Cloudflare 提供的数据库加速代理，可将 Workers 发起的 TCP 请求代理到你的 PostgreSQL。**无需改 ORM 驱动。**

当前代码库已经通过 `libs/database/index.ts` 支持 Hyperdrive：

```typescript
function getConnectionString(): string {
  if (typeof globalThis !== 'undefined' && (globalThis as any).HYPERDRIVE) {
    return (globalThis as any).HYPERDRIVE.connectionString;
  }
  return process.env.DATABASE_URL!;
}
```

这段逻辑在 Node.js 环境（Next.js / Nuxt.js）下是安全的：`HYPERDRIVE` 不存在时会自动回退到 `DATABASE_URL`。

**优势：**

- 无需改 ORM 驱动
- 自动连接池管理
- 全局边缘缓存查询结果
- 与现有代码保持兼容

### 方案 B：Neon Serverless Driver

如果你使用 [Neon](https://neon.tech) 托管 PostgreSQL，可使用其 HTTP 驱动：

```bash
pnpm add @neondatabase/serverless drizzle-orm/neon-http
```

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

> **注意**：该方案需要改 `libs/database` 驱动实现，可能影响 Next.js 与 Nuxt.js。建议配合条件导入或环境变量开关使用。

## 环境变量与 Secrets

### Secrets（敏感，建议通过 CLI 或 Web 控制台配置）

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `BETTER_AUTH_SECRET` | 是 | 认证加密密钥 |
| `DATABASE_URL` | 是 | PostgreSQL 连接串（未配置 Hyperdrive 时的回退连接） |
| `STRIPE_SECRET_KEY` | 使用 Stripe 时必填 | Stripe API Key |
| `STRIPE_WEBHOOK_SECRET` | 使用 Stripe 时必填 | Stripe Webhook 签名密钥 |
| `PAYPAL_CLIENT_SECRET` | 使用 PayPal 时必填 | PayPal API Secret |
| `CREEM_API_KEY` | 使用 Creem 时必填 | Creem API Key |
| `OPENAI_API_KEY` | 使用 OpenAI 时必填 | OpenAI API Key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | 使用 Google AI 时必填 | Google AI API Key |

### Vars（非敏感，建议写在 `wrangler.jsonc`）

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `APP_BASE_URL` | 是 | 生产环境域名（如 `https://your-domain.com`） |
| `BETTER_AUTH_URL` | 是 | Better Auth 使用的站点基地址（通常与 `APP_BASE_URL` 一致） |

## CI/CD

### GitHub Actions

```yaml
name: Deploy TanStack to Cloudflare Workers

on:
  push:
    branches: [main]
    paths:
      - 'apps/tanstack-app/**'
      - 'libs/**'
      - 'config/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Build and Deploy
        working-directory: apps/tanstack-app
        run: pnpm run deploy:cf
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Cloudflare Workers Builds

也可使用 Cloudflare 内置 CI/CD：

1. 打开 Cloudflare Dashboard → Workers & Pages → Create Worker
2. 连接 GitHub 仓库
3. 设置构建命令：`pnpm install && pnpm --filter @tinyship/tanstack-app build`
4. 设置输出目录：`apps/tanstack-app/.output`
5. 后续 push 自动触发部署

## CF 模式工作原理（开发者说明）

Cloudflare 集成采用**按需启用（opt-in）**方案，不影响常规开发：

```
┌─────────────────────────────────────────────────┐
│  pnpm dev          (常规开发)                   │
│  → Vite dev server, Node.js, DATABASE_URL       │
│  → 不设置 CF_DEPLOY                             │
│  → 不加载 cloudflare() 插件                     │
├─────────────────────────────────────────────────┤
│  pnpm dev:cf       (CF 本地预览)                │
│  → CF_DEPLOY=1 → 加载 cloudflare() 插件         │
│  → Vite + Cloudflare 插件模拟 Workers 运行时     │
│  → 使用 Hyperdrive 或 DATABASE_URL              │
├─────────────────────────────────────────────────┤
│  pnpm run deploy:cf (生产部署)                  │
│  → CF_DEPLOY=1 → 加载 cloudflare() 插件         │
│  → vite build → 产出 Workers 兼容构建           │
│  → wrangler deploy → 发布到边缘网络             │
└─────────────────────────────────────────────────┘
```

关键机制：`vite.config.ts` 会检查 `process.env.CF_DEPLOY`，仅在该变量存在时才动态导入 `@cloudflare/vite-plugin`。这意味着：

- `pnpm dev` / `pnpm build`：纯 Vite/Node.js 流程，无 CF 额外开销
- `pnpm dev:cf` / `pnpm run deploy:cf`：走 Workers 兼容构建流程

## 故障排查

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `TypeError: Cannot read properties of undefined (reading 'connect')` | `pg` 在 Workers 中尝试 TCP 连接 | 配置 Hyperdrive 或改用 Neon 驱动 |
| `Error: No such module "node:..."` | 缺少 `nodejs_compat` 标志 | 在 `wrangler.jsonc` 中确认 `"compatibility_flags": ["nodejs_compat"]` |
| `Worker exceeded CPU time limit` | 请求处理时间过长 | 优化查询、使用流式处理或升级付费版 |
| `Request body too large` | 上传超过限制 | 使用 Cloudflare R2 直传或分片上传 |
| `Module not found: bcrypt` | 原生 C++ 扩展不兼容 | 替换为纯 JS 实现（如 `bcryptjs`） |
| 环境变量不生效 | Workers 不读取 `.env` 文件 | 使用 `wrangler secret put` 或控制台 Secrets |
| `pnpm dev` 行为异常 | 不应在常规开发加载 CF 插件 | 检查 Shell 中是否意外设置了 `CF_DEPLOY` |

### 调试命令

```bash
cd apps/tanstack-app

# 查看线上实时日志
npx wrangler tail

# 查看部署历史
npx wrangler deployments list

# 回滚到上一版本
npx wrangler rollback
```

### 性能监控

部署后可在 Cloudflare Dashboard 查看：

- 请求量与响应耗时
- CPU 使用率
- 错误率和错误详情
- 地域分布情况

---

## 与其他部署方式对比

| 特性 | Cloudflare Workers | Docker | Vercel | 传统部署 |
|------|--------------------|--------|--------|----------|
| **适用框架** | TanStack Start | 全部 | Next.js | 全部 |
| **冷启动** | < 5ms | 无（常驻） | ~250ms | 无 |
| **全球分发** | 自动 | 手动 | 自动 | 手动 |
| **免费额度** | 10 万次/天 | 无 | 有限 | 无 |
| **数据库支持** | 需 Hyperdrive | 原生 TCP | 原生 TCP | 原生 TCP |
| **上传限制** | 100MB / 500MB | 无限制 | 50MB | 无限制 |
| **运维成本** | 很低 | 中等 | 低 | 高 |

Cloudflare Workers 适合追求**高性能、全球覆盖、低运维**的场景。如果你对数据库连接方式或执行时限有顾虑，可优先考虑 Docker 或传统部署。
