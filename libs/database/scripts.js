const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

/**
 * 执行命令并打印输出
 */
function runCommand(command, description) {
  console.log(`\n🚀 ${description}...\n`);
  try {
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env }, // 确保环境变量传递
      cwd: process.cwd() // 设置正确的工作目录
    });
    console.log(`\n✅ ${description}完成\n`);
  } catch (error) {
    console.error(`\n❌ ${description}失败\n`);
    process.exit(1);
  }
}

// 获取命令行参数
const [, , command] = process.argv;

// 执行相应命令
switch (command) {
  case 'check':
    runCommand('tsx ./libs/database/check-connection.ts', '检查数据库连接');
    break;
    
  case 'push':
    runCommand('npx drizzle-kit push', '推送数据库架构到数据库');
    break;
    
  case 'generate':
    runCommand('npx drizzle-kit generate', '生成数据库迁移文件');
    break;
    
  case 'migrate':
    runCommand('npx drizzle-kit migrate', '应用数据库迁移');
    break;
    
  case 'seed':
    runCommand('tsx ./libs/database/seed.ts', '填充测试数据');
    break;
    
  case 'studio':
    runCommand('npx drizzle-kit studio', '启动 Drizzle Studio 数据库管理界面');
    break;
    
  default:
    console.log(`
可用命令:
  check    - 检查数据库连接
  push     - 直接推送数据库架构到数据库（开发环境）
  generate - 生成数据库迁移文件（生产环境准备）
  migrate  - 应用数据库迁移（生产环境）
  seed     - 填充测试数据
  studio   - 启动 Drizzle Studio 数据库管理界面
`);
    break;
} 