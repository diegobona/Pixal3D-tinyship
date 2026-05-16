import { pool } from "./client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * 检查数据库连接
 */
async function checkConnection() {
  try {
    console.log("正在连接数据库...");
    await pool.query("SELECT 1");
    console.log("✅ 数据库连接成功");
    return true;
  } catch (error) {
    console.error("❌ 数据库连接失败:", error);
    return false;
  } finally {
    await pool.end();
  }
}

// 如果直接运行此文件，执行连接检查
if (require.main === module) {
  checkConnection()
    .then(connected => {
      if (!connected) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("发生错误:", error);
      process.exit(1);
    });
}

export { checkConnection }; 