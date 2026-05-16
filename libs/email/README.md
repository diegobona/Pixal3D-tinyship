# Email Service

这个服务提供了一个统一的邮件发送接口，支持多个邮件服务提供商和国际化邮件模板。目前支持 Resend，计划支持 SendGrid 和 SMTP。

## 邮件模板系统

本模块使用内联 MJML 模板解决 monorepo 部署问题，支持多语言邮件模板：

- **验证邮件** - 用户注册后的邮箱验证
- **重置密码邮件** - 用户忘记密码时的重置链接
- **支持语言** - 中文 (`zh-CN`) 和英文 (`en`)
- **响应式设计** - 基于 MJML 的响应式邮件布局

### MJML 资源

- **[MJML 官网](https://mjml.io/)** - 了解 MJML 语法和最佳实践
- **[MJML 在线编辑器](https://mjml.io/try-it-live/)** - 实时预览和调试邮件模板
- **[MJML 文档](https://documentation.mjml.io/)** - 完整的组件和语法文档

## 配置

配置分为两部分：
- 敏感信息（如 API 密钥、密码等）通过环境变量配置
- 非敏感信息（如默认提供商、服务器地址等）直接在 `config.ts` 中配置

### 环境变量

复制 `.env.example` 文件为 `.env`，并填入敏感信息：

```env
# Resend 配置（敏感信息）
RESEND_API_KEY=your_resend_api_key

# SendGrid 配置（敏感信息）
SENDGRID_API_KEY=your_sendgrid_api_key

# SMTP 配置（敏感信息）
SMTP_USERNAME=your_smtp_username
SMTP_PASSWORD=your_smtp_password
```

### 配置文件

`config.ts` 文件中的 Email 配置结构：

```typescript
export const config = {
  email: {
    // 默认的邮件服务提供商
    defaultProvider: 'resend',

    // 默认发件人邮箱
    defaultFrom: 'noreply@example.com',

    // Resend 配置
    resend: {
      apiKey: requireEnv('RESEND_API_KEY'),  // 敏感信息：从环境变量获取
    },

    // SendGrid 配置
    sendgrid: {
      apiKey: requireEnv('SENDGRID_API_KEY'),  // 敏感信息：从环境变量获取
    },

    // SMTP 配置
    smtp: {
      host: 'smtp.example.com',              // 固定值
      port: 587,                             // 固定值
      username: requireEnv('SMTP_USERNAME'), // 敏感信息：从环境变量获取
      password: requireEnv('SMTP_PASSWORD'), // 敏感信息：从环境变量获取
      secure: true,                          // 固定值
    }
  }
};
```

## 使用方法

### 邮件模板使用

#### 发送验证邮件

```typescript
import { sendVerificationEmail } from '@libs/email';

// 用户注册后发送验证邮件
await sendVerificationEmail('user@example.com', {
  name: 'vikingmute',  // 用户名
  verification_url: 'https://example.com/verify?token=123',
  expiry_hours: 1,     // 过期时间（小时）
  locale: 'zh-CN'      // 语言（'en' | 'zh-CN'）
});
```

#### 发送重置密码邮件

```typescript
import { sendResetPasswordEmail } from '@libs/email';

// 用户忘记密码后发送重置邮件
await sendResetPasswordEmail('user@example.com', {
  name: 'vikingmute',  // 用户名  
  reset_url: 'https://example.com/reset?token=456',
  expiry_hours: 1,     // 过期时间（小时）
  locale: 'zh-CN'      // 语言（'en' | 'zh-CN'）
});
```

### 基本邮件发送

```typescript
import { sendEmail } from '@libs/email';

// 使用默认提供商发送邮件
await sendEmail({
  to: 'user@example.com',
  subject: '欢迎使用我们的服务',
  html: '<h1>欢迎！</h1><p>感谢您注册我们的服务。</p>'
});

// 使用指定提供商发送邮件
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
  provider: 'sendgrid'
});
```

### 响应格式

```typescript
interface EmailResponse {
  success: boolean;        // 发送是否成功
  id?: string;            // 邮件ID
  error?: {
    message: string;
    name: string;
    provider?: 'resend' | 'sendgrid' | 'smtp';
  } | null;
}
```

## 邮件模板开发

### 模板结构

模板文件位于 `templates/` 目录：
```
templates/
├── index.ts         # 模板生成函数
├── templates.ts     # MJML 模板内容
└── README.md        # 模板文档
```

### 添加新模板

1. 使用 [MJML 在线编辑器](https://mjml.io/try-it-live/) 设计和测试新模板
2. 在 `templates.ts` 中添加新的 MJML 模板字符串
3. 在 `index.ts` 中添加对应的接口和生成函数
4. 在 `i18n/locales/` 中添加相应的翻译文本
5. 在 `templates-sender.ts` 中添加发送函数

### 模板特性

- **内联部署** - 模板内容直接嵌入代码，解决 monorepo 部署问题
- **多语言支持** - 基于 `@libs/i18n` 的翻译系统
- **响应式设计** - 使用 MJML 确保邮件在各设备正常显示
- **占位符替换** - 自动处理 `{{name}}`、`{{expiry_hours}}`、`{{year}}` 等变量

## 添加新的服务提供商

1. 在 `.env.example` 和 `.env` 中添加新提供商所需的敏感信息
2. 在 `config.ts` 中的 `email` 配置中添加新提供商的配置（区分敏感和非敏感信息）
3. 在 `providers` 目录下创建新的提供商实现文件
4. 在 `types.ts` 中的 `EmailProvider` 类型中添加新的提供商
5. 在 `email-sender.ts` 中添加新的 case 处理

## 注意事项

- 确保在使用前正确配置所有必需的环境变量（仅敏感信息）
- 在 `config.ts` 中直接配置非敏感信息
- 不同提供商可能需要不同的配置参数
- 建议在生产环境中使用错误处理和重试机制
- 模板使用内联方式，无需担心 monorepo 构建时的文件路径问题 