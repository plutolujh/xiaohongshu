-- 统一 ID 类型为 UUID 的 SQL 脚本（简化版）

-- 1. 处理 users 表
-- 创建临时表
CREATE TABLE IF NOT EXISTS users_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  role TEXT,
  status TEXT,
  created_at TEXT
);

-- 插入数据
INSERT INTO users_temp (username, password, nickname, avatar, bio, role, status, created_at)
SELECT username, password, nickname, avatar, bio, role, status, created_at
FROM users;

-- 检查结果
SELECT 'users_temp' as table_name, COUNT(*) as count FROM users_temp;
