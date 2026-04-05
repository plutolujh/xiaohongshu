import bcrypt from 'bcrypt';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'xiaohongshu.db');

async function updatePassword() {
  try {
    const SQL = await initSqlJs();
    let db;
    
    // 加载数据库
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      console.error('Database not found');
      return;
    }

    // 生成密码哈希
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Generated hash:', hashedPassword);

    // 更新用户密码
    const stmt = db.prepare('UPDATE users SET password = ? WHERE username = ?');
    stmt.bind([hashedPassword, 'lujh']);
    stmt.step();
    stmt.free();

    // 验证更新
    const verifyStmt = db.prepare('SELECT password FROM users WHERE username = ?');
    verifyStmt.bind(['lujh']);
    const result = verifyStmt.get();
    verifyStmt.free();

    console.log('Updated password in database:', result[0]);

    // 保存数据库
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);

    console.log('Password updated successfully');
  } catch (error) {
    console.error('Error updating password:', error);
  }
}

updatePassword();
