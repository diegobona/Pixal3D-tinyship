# 存储服务

**中文** | [English](./README_EN.md)

为 TinyShip 项目提供统一的存储抽象层，支持多种云存储服务商的一致性接口。

## 概述

存储库为不同的云存储服务商提供统一的文件操作接口。目前支持阿里云 OSS、AWS S3 和 Cloudflare R2。

## 特性

- **统一接口**：跨存储服务商的一致 API
- **类型安全**：完整的 TypeScript 支持和类型定义
- **灵活配置**：基于环境变量的配置，提供合理的默认值
- **安全访问**：签名 URL 生成，支持可配置的过期时间
- **错误处理**：全面的错误处理和详细的错误信息
- **元数据支持**：文件元数据管理和检索
- **多服务商支持**：轻松切换 OSS、S3 和 R2

## 支持的服务商

### 阿里云 OSS
- ✅ 文件上传/下载
- ✅ 签名 URL 生成
- ✅ 文件删除
- ✅ 文件存在检查
- ✅ 元数据检索
- ✅ 目录列表

### AWS S3
- ✅ 文件上传/下载
- ✅ 签名 URL 生成
- ✅ 文件删除
- ✅ 文件存在检查
- ✅ 元数据检索
- ✅ 目录列表

### Cloudflare R2
- ✅ 文件上传/下载
- ✅ 签名 URL 生成
- ✅ 文件删除
- ✅ 文件存在检查
- ✅ 元数据检索
- ✅ 目录列表

### 腾讯云 COS
- ✅ 文件上传/下载
- ✅ 签名 URL 生成
- ✅ 文件删除
- ✅ 文件存在检查
- ✅ 元数据检索
- ✅ 目录列表

### 计划支持
- 🚧 Google Cloud Storage
- 🚧 Azure Blob Storage

## 安装

不同服务商使用不同的 SDK：

```bash
# 阿里云 OSS
pnpm add ali-oss

# AWS S3 和 Cloudflare R2
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 腾讯云 COS
pnpm add cos-nodejs-sdk-v5
```

## 配置

### 选择默认服务商

设置 `STORAGE_PROVIDER` 环境变量来选择默认服务商：

```bash
# 可选值：oss, s3, r2, cos
STORAGE_PROVIDER=s3
```

### 阿里云 OSS 配置

在 `.env` 文件中添加以下环境变量：

```bash
# 阿里云 OSS 配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=your-bucket-name
OSS_ENDPOINT=your-custom-endpoint  # 可选
```

### AWS S3 配置

```bash
# AWS S3 配置
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_access_key_id
S3_ACCESS_KEY_SECRET=your_secret_access_key
S3_BUCKET=your-bucket-name
S3_ENDPOINT=  # 可选：S3 兼容服务的自定义端点
S3_FORCE_PATH_STYLE=false  # 可选：强制路径样式访问
```

### Cloudflare R2 配置

```bash
# Cloudflare R2 配置
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_ACCESS_KEY_SECRET=your_r2_access_key_secret
R2_BUCKET=your-bucket-name
```

### 腾讯云 COS 配置

```bash
# 腾讯云 COS 配置
COS_REGION=ap-guangzhou
COS_SECRET_ID=your_secret_id
COS_SECRET_KEY=your_secret_key
COS_BUCKET=your-bucket-name-appid  # 格式：bucket-appid，如 example-1250000000
```

配置自动从 `config.ts` 加载：

```typescript
import { config } from '@config';

// 默认服务商（可通过 STORAGE_PROVIDER 环境变量设置）
config.storage.defaultProvider // 'oss' | 's3' | 'r2' | 'cos'

// OSS 配置
config.storage.oss.region
config.storage.oss.accessKeyId
config.storage.oss.accessKeySecret
config.storage.oss.bucket
config.storage.oss.endpoint

// S3 配置
config.storage.s3.region
config.storage.s3.accessKeyId
config.storage.s3.accessKeySecret
config.storage.s3.bucket
config.storage.s3.endpoint

// R2 配置
config.storage.r2.accountId
config.storage.r2.accessKeyId
config.storage.r2.accessKeySecret
config.storage.r2.bucket

// COS 配置
config.storage.cos.region
config.storage.cos.secretId
config.storage.cos.secretKey
config.storage.cos.bucket
```

## 使用方法

### 基本使用

默认存储实例使用 `STORAGE_PROVIDER` 环境变量指定的服务商：

```typescript
import { storage } from '@libs/storage';

// 上传文件（使用默认服务商）
const uploadResult = await storage.uploadFile({
  file: fileBuffer,
  fileName: 'release-v1.0.0.zip',
  contentType: 'application/zip',
  folder: 'releases/2024'
});

console.log('文件已上传:', uploadResult.key);
```

### 使用特定服务商

```typescript
import { createStorageProvider } from '@libs/storage';

// 创建 OSS 服务商
const ossStorage = createStorageProvider('oss');

// 创建 S3 服务商
const s3Storage = createStorageProvider('s3');

// 创建 R2 服务商
const r2Storage = createStorageProvider('r2');

// 创建 COS 服务商
const cosStorage = createStorageProvider('cos');

// 上传到 S3
const result = await s3Storage.uploadFile({
  file: fileBuffer,
  fileName: 'document.pdf',
  contentType: 'application/pdf'
});
```

### 直接实例化服务商

```typescript
import { OSSProvider, S3Provider, createR2Provider, COSProvider } from '@libs/storage';

// 直接创建服务商实例
const ossProvider = new OSSProvider();
const s3Provider = new S3Provider();
const r2Provider = createR2Provider();
const cosProvider = new COSProvider();

// 使用自定义配置（仅 S3）
import { S3Provider, S3ProviderConfig } from '@libs/storage';

const customConfig: S3ProviderConfig = {
  region: 'eu-west-1',
  accessKeyId: 'custom-key',
  accessKeySecret: 'custom-secret',
  bucket: 'custom-bucket',
  endpoint: 'https://custom-endpoint.com',
  forcePathStyle: true
};

const customS3 = new S3Provider(customConfig);
```

## API 参考

### StorageProvider 接口

#### uploadFile(params: UploadParams): Promise<UploadResult>

上传文件到存储。

```typescript
const result = await storage.uploadFile({
  file: Buffer.from('file content'),
  fileName: 'example.txt',
  contentType: 'text/plain',
  metadata: { version: '1.0.0' },
  folder: 'documents'
});

// 返回：
// {
//   key: 'documents/example.txt',
//   url: 'https://bucket.s3.amazonaws.com/documents/example.txt',
//   size: 12,
//   etag: '"abc123..."'
// }
```

#### generateSignedUrl(params: SignedUrlParams): Promise<SignedUrlResult>

生成签名 URL 以安全访问文件。

```typescript
const signedUrl = await storage.generateSignedUrl({
  key: 'documents/example.txt',
  expiresIn: 3600, // 1 小时
  operation: 'get'
});

// 返回：
// {
//   url: 'https://bucket.s3.amazonaws.com/documents/example.txt?X-Amz-Signature=...',
//   expiresAt: Date
// }
```

#### deleteFile(key: string): Promise<boolean>

从存储中删除文件。

```typescript
const deleted = await storage.deleteFile('documents/example.txt');
console.log('文件已删除:', deleted); // true
```

#### fileExists(key: string): Promise<boolean>

检查文件是否存在。

```typescript
const exists = await storage.fileExists('documents/example.txt');
console.log('文件存在:', exists); // true/false
```

#### getFileMetadata(key: string): Promise<FileMetadata>

获取文件元数据和信息。

```typescript
const metadata = await storage.getFileMetadata('documents/example.txt');

// 返回：
// {
//   key: 'documents/example.txt',
//   size: 12,
//   lastModified: Date,
//   contentType: 'text/plain',
//   etag: '"abc123..."',
//   metadata: { version: '1.0.0' }
// }
```

#### listFiles(folder: string, limit?: number): Promise<FileMetadata[]>

列出特定目录下的文件。

```typescript
const files = await storage.listFiles('documents', 10);

// 返回 FileMetadata 对象数组
files.forEach(file => {
  console.log(`${file.key} (${file.size} 字节)`);
});
```

## 类型定义

### UploadParams
```typescript
interface UploadParams {
  file: Buffer;
  fileName: string;
  contentType?: string;
  metadata?: Record<string, string>;
  folder?: string;
}
```

### UploadResult
```typescript
interface UploadResult {
  key: string;
  url?: string;
  size: number;
  etag?: string;
}
```

### SignedUrlParams
```typescript
interface SignedUrlParams {
  key: string;
  expiresIn?: number; // 秒
  contentType?: string;
  operation?: 'get' | 'put';
}
```

### SignedUrlResult
```typescript
interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}
```

### FileMetadata
```typescript
interface FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  etag?: string;
  metadata?: Record<string, string>;
}
```

### S3ProviderConfig
```typescript
interface S3ProviderConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string;
  defaultExpiration?: number;
  forcePathStyle?: boolean;
}
```

### COSProviderConfig
```typescript
interface COSProviderConfig {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  defaultExpiration?: number;
}
```

## 错误处理

库提供全面的错误处理：

```typescript
try {
  const result = await storage.uploadFile(params);
} catch (error) {
  if (error.message.includes('Failed to upload file')) {
    // 处理上传错误
    console.error('上传失败:', error.message);
  }
}
```

常见错误场景：
- **认证错误**：无效的凭证
- **权限错误**：存储桶权限不足
- **网络错误**：连接超时或失败
- **文件未找到**：尝试访问不存在的文件
- **配额超限**：存储配额或速率限制达到

## 安全注意事项

### 访问控制
- 使用 IAM 角色和策略限制存储访问
- 安全存储凭证（环境变量）
- 定期轮换访问密钥

### 签名 URL
- 设置适当的过期时间（默认：1 小时）
- 所有操作使用 HTTPS
- 考虑对敏感文件进行 IP 限制

### 文件验证
- 上传前验证文件类型和大小
- 如需要可扫描恶意软件
- 使用 content-type 验证

## 最佳实践

### 文件组织
```typescript
// 好的做法：按逻辑目录组织文件
await storage.uploadFile({
  file: fileBuffer,
  fileName: 'app-v1.2.3.zip',
  folder: 'releases/2024/01'
});

// 好的做法：使用一致的命名规范
await storage.uploadFile({
  file: fileBuffer,
  fileName: `release-${version}-${timestamp}.zip`,
  folder: 'releases'
});
```

### 错误处理
```typescript
// 好的做法：处理特定的错误情况
try {
  await storage.deleteFile(key);
} catch (error) {
  if (error.message.includes('NoSuchKey') || error.message.includes('NotFound')) {
    console.log('文件已删除');
  } else {
    console.error('删除失败:', error);
    throw error;
  }
}
```

### 性能优化
```typescript
// 好的做法：操作前检查文件是否存在
if (await storage.fileExists(key)) {
  const metadata = await storage.getFileMetadata(key);
  // 处理已存在的文件
}

// 好的做法：使用适当的过期时间
const shortTermUrl = await storage.generateSignedUrl({
  key: 'temp-file.txt',
  expiresIn: 300 // 5 分钟临时访问
});
```

## 服务商特定说明

### Cloudflare R2

R2 兼容 S3，因此库在底层使用 S3Provider，并应用 R2 特定配置：

- Region 自动设置为 `auto`
- 强制使用路径样式访问（R2 要求）
- 端点从您的账户 ID 自动构建

```typescript
import { createR2Provider } from '@libs/storage';

// R2 服务商已预配置正确的设置
const r2 = createR2Provider();
```

### AWS S3 vs S3 兼容服务

S3Provider 支持任何 S3 兼容服务（MinIO、DigitalOcean Spaces 等），只需设置自定义端点：

```bash
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_FORCE_PATH_STYLE=true
```

### 腾讯云 COS

腾讯云 COS 使用 `cos-nodejs-sdk-v5` SDK，用于服务端环境：

- Bucket 名称格式为 `bucket-appid`，如 `example-1250000000`
- Region 格式为 `ap-xxx`，如 `ap-guangzhou`、`ap-shanghai`、`ap-beijing`
- 支持自定义元数据（以 `x-cos-meta-` 为前缀）

```typescript
import { COSProvider } from '@libs/storage';

// COS 服务商已预配置正确的设置
const cos = new COSProvider();

// 或使用自定义配置
import { COSProvider, COSProviderConfig } from '@libs/storage';

const customConfig: COSProviderConfig = {
  secretId: 'your-secret-id',
  secretKey: 'your-secret-key',
  bucket: 'your-bucket-1250000000',
  region: 'ap-guangzhou'
};

const customCOS = new COSProvider(customConfig);
```

## 开发

### 测试
```bash
# 运行存储测试
pnpm test libs/storage

# 运行特定服务商测试
pnpm test libs/storage/providers/oss
pnpm test libs/storage/providers/s3
```

### 添加新服务商

1. 在 `providers/` 中创建服务商实现
2. 实现 `StorageProvider` 接口
3. 在 `StorageProviderType` 中添加服务商类型
4. 更新 `index.ts` 中的工厂函数
5. 在 `config.ts` 中添加配置
6. 更新文档

## 故障排除

### 常见问题

**S3/R2 认证错误**
```
Error: Failed to upload file to S3: InvalidAccessKeyId
```
- 验证 `S3_ACCESS_KEY_ID` 和 `S3_ACCESS_KEY_SECRET`（或 R2 对应变量）
- 检查访问密钥的 IAM 权限

**OSS 认证错误**
```
Error: Failed to upload file to OSS: InvalidAccessKeyId
```
- 验证 `OSS_ACCESS_KEY_ID` 和 `OSS_ACCESS_KEY_SECRET`
- 检查访问密钥的 IAM 权限

**存储桶访问错误**
```
Error: Failed to upload file: NoSuchBucket
```
- 验证存储桶名称配置
- 确保存储桶在指定区域存在

**R2 CORS 问题**
如果从浏览器访问 R2，请确保已在 Cloudflare 控制台中为 R2 存储桶配置 CORS。

**COS 认证错误**
```
Error: Failed to upload file to COS: InvalidSecretId
```
- 验证 `COS_SECRET_ID` 和 `COS_SECRET_KEY`
- 检查密钥的 CAM 权限
- 确保 Bucket 名称格式正确（bucket-appid）

**COS CORS 问题**
如果从浏览器访问 COS，请在腾讯云控制台为 COS 存储桶配置 CORS 规则。

**网络超时**
```
Error: Failed to upload file: RequestTimeout
```
- 检查网络连接
- 考虑增加超时时间
- 验证端点配置

### 调试模式

通过设置环境变量启用调试日志：
```bash
DEBUG=storage:* npm start
```

## 许可证

此库是 TinyShip 项目的一部分，遵循相同的许可条款。
