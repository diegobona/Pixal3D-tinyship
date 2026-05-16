# 快速开始

本指南将帮助你在本地环境中设置和运行 TinyShip 项目。

## 📑 目录

- [📋 系统要求](#-系统要求)
  - [必需软件](#必需软件)
- [🚀 快速安装](#-快速安装)
  - [1. 克隆项目](#1-克隆项目)
  - [2. 安装 PNPM（如果尚未安装）](#2-安装-pnpm如果尚未安装)
  - [3. 复制环境变量模板](#3-复制环境变量模板)
  - [4. 安装项目依赖](#4-安装项目依赖)
- [🗄️ 数据库配置](#️-数据库配置)
  - [1. 创建 PostgreSQL 数据库](#1-创建-postgresql-数据库)
  - [2. 配置环境变量](#2-配置环境变量)
  - [3. 初始化数据库架构](#3-初始化数据库架构)
  - [4. 填充测试数据](#4-填充测试数据)
- [🔐 最小化认证配置](#-最小化认证配置)
- [🎉 启动应用](#-启动应用)

## 📋 系统要求

在开始之前，请确保你的开发环境满足以下要求：

### 必需软件
- **Node.js**: >= 22.20.0 （**必须使用 22.20.0 或更高的 LTS 版本**）
  > ⚠️ **重要提示**：由于 Nuxt 4 使用的 [oxc-parser 原生绑定问题](https://github.com/nuxt/nuxt/issues/33480)，Node.js 版本必须 >= 22.20.0。低于此版本可能导致安装失败。
- **PNPM**: >= 9.0.0 （推荐的包管理器）
- **PostgreSQL**: >= 13.0 （数据库）


## 🚀 快速安装

### 1. 克隆项目

```bash
# 克隆仓库
git clone https://github.com/TinyshipCN/tinyship.git
cd tinyship

# 或者使用 SSH
git clone git@github.com:TinyshipCN/tinyship.git
cd tinyship
```

### 2. 安装 PNPM（如果尚未安装）

```bash
# 使用 npm 安装 pnpm
npm install -g pnpm

# 或使用 corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate
# 验证安装
pnpm --version
```

### 3. 复制环境变量模板

```bash
# 复制环境变量模板
cp env.example .env
```

### 4. 安装项目依赖

```bash
# 安装所有依赖
pnpm install
```

## 🗄️ 数据库配置

TinyShip 使用 PostgreSQL 作为主数据库，结合 Drizzle ORM 提供类型安全的数据库操作。

### 1. 创建 PostgreSQL 数据库

我们需要在 PostgreSQL中 创建一个新的数据库来使用 tinyship，下面是三种推荐的方式

#### 方法 1: 使用 Docker（推荐）
```bash
# 拉取并运行 PostgreSQL 容器
docker run --name tinyship-db \
  -e POSTGRES_USER=tinyship \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=tinyship \
  -p 5432:5432 \
  -d postgres:15

# 验证容器运行
docker ps | grep tinyship-db
```

#### 方法 2: 本地安装
```bash
# 创建数据库用户和数据库
sudo -u postgres createuser --interactive tinyship
sudo -u postgres createdb tinyship --owner=tinyship

# 设置用户密码
sudo -u postgres psql -c "ALTER USER tinyship PASSWORD 'your_password';"
```

#### 方法 3: 云数据库服务
支持以下云服务提供商：
- **Vercel Postgres**: 与 Vercel 部署无缝集成
- **Supabase**: 提供免费套餐，易于设置
- **AWS RDS**: 企业级选择
- **Google Cloud SQL**: 可靠的托管服务
- **阿里云 RDS**: 国内用户推荐

### 2. 配置环境变量

在项目根目录的 `.env` 文件中配置数据库连接：

```env
# 数据库连接配置
DATABASE_URL="postgresql://username:password@localhost:5432/tinyship"
```

```bash
# 检查数据库是否可以成功连接
pnpm run db:check
```

### 3. 初始化数据库架构

下面让我们将需要的表结构推送到本地的数据库

#### 开发环境 - 直接推送（推荐）

```bash
# 将架构直接推送到数据库
pnpm run db:push
```

### 4. 填充测试数据

接下来填充一些用户测试数据，一个管理员一个普通用户：

```bash
# 运行种子脚本
pnpm run db:seed

```

这将创建两个测试用户：
- **管理员**: `admin@example.com` / `admin123` (角色: admin)
- **普通用户**: `user@example.com` / `user123456` (角色: user)

两个用户都已验证邮箱，可以直接登录系统进行测试。

## 🔐 最小化认证配置

在 `.env` 文件中配置认证相关环境变量：

```env
# 认证配置
BETTER_AUTH_SECRET="your-secret-key-here-32-characters-min" # 32位随机数
BETTER_AUTH_URL="http://localhost:7001"  # 7001端口是应用启动的默认端口，生产环境改为实际域名

# 数据库配置（认证需要，上一步应该已经配置）
DATABASE_URL="postgresql://username:password@localhost:5432/tinyship"
```

**生成 32 位随机字符串的方法：**

命令行生成：
```bash
# 使用 openssl 生成（推荐）
openssl rand -hex 32

# 使用 Node.js 生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 使用 Python 生成
python -c "import secrets; print(secrets.token_hex(32))"
```

在线生成器：
- [RandomKeygen](https://randomkeygen.com/) - 提供多种格式的随机密钥生成
- [Password Generator](https://passwordsgenerator.net/) - 可自定义长度和字符类型

## 🎉 启动应用

现在我们的应用应该就可以最小化运行了 🎉🎉🎉，可以在根目录运行如下命令来启动应用：

```bash
# 启动 Next.js 应用
pnpm run dev:next
# 或者启动 Nuxt.js 应用
pnpm run dev:nuxt
# 或者启动 TanStack Start 应用
pnpm run dev:tanstack
# 访问 http://localhost:7001
```

你可以先感受一下大体的功能，现在是最小化应用，一些高级的配置还没有实现（更多登录方式/支付等等）。
---

🎊 **恭喜！** 你已经成功运行了 TinyShip 应用。

接下来，你可以根据需要进行更多配置：
- [基础配置](./basic-config.md) - 应用名称、Logo、主题、国际化
- [身份认证配置](./auth/overview.md) - 更多登录方式
- [支付配置](./payment/overview.md) - 接入支付功能
- [应用部署](./deployment/overview.md) - 部署到生产环境

如果遇到问题，请在 [GitHub Discussion](https://github.com/orgs/TinyshipCN/discussions) 或者 [Tinyship Issues](https://github.com/TinyshipCN/tinyship/issues)中提交问题。
