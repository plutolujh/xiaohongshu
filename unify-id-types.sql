-- 统一 ID 类型为 UUID 的 SQL 脚本

-- 1. 备份数据（可选）
-- 建议在执行前备份整个数据库

-- 2. 处理 tags 表（已经是 UUID，无需修改）

-- 3. 处理 note_tags 表
-- 更新 tag_id 类型为 UUID
-- 先创建临时表
CREATE TABLE IF NOT EXISTS note_tags_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TEXT
);

-- 插入数据，使用 gen_random_uuid() 生成新的 ID
INSERT INTO note_tags_temp (note_id, tag_id, created_at)
SELECT 
  CASE 
    WHEN note_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN note_id::UUID
    ELSE gen_random_uuid()
  END as note_id,
  CASE 
    WHEN tag_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN tag_id::UUID
    ELSE (SELECT id FROM tags WHERE name = tag_id LIMIT 1)
  END as tag_id,
  created_at
FROM note_tags;

-- 4. 处理 users 表
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

-- 插入数据，使用 gen_random_uuid() 生成新的 ID
INSERT INTO users_temp (username, password, nickname, avatar, bio, role, status, created_at)
SELECT username, password, nickname, avatar, bio, role, status, created_at
FROM users;

-- 5. 处理 notes 表
-- 创建临时表
CREATE TABLE IF NOT EXISTS notes_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  ingredients TEXT,
  steps TEXT,
  images TEXT,
  author_id UUID NOT NULL,
  author_name TEXT,
  likes INTEGER,
  liked INTEGER,
  created_at TEXT
);

-- 插入数据，使用 gen_random_uuid() 生成新的 ID
INSERT INTO notes_temp (title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at)
SELECT 
  title, content, ingredients, steps, images,
  (SELECT id FROM users_temp WHERE users_temp.username = (SELECT username FROM users WHERE users.id = notes.author_id) LIMIT 1),
  author_name, likes, liked, created_at
FROM notes;

-- 6. 处理 comments 表
-- 创建临时表
CREATE TABLE IF NOT EXISTS comments_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT,
  content TEXT,
  reply_to_id UUID,
  reply_to_user_name TEXT,
  reply_to_content TEXT,
  created_at TEXT
);

-- 插入数据，使用 gen_random_uuid() 生成新的 ID
INSERT INTO comments_temp (note_id, user_id, user_name, content, reply_to_id, reply_to_user_name, reply_to_content, created_at)
SELECT 
  (SELECT id FROM notes_temp WHERE notes_temp.title = notes.title LIMIT 1),
  (SELECT id FROM users_temp WHERE users_temp.username = (SELECT username FROM users WHERE users.id = comments.user_id) LIMIT 1),
  comments.user_name, comments.content,
  NULL, -- 暂时设置为 NULL，后续可以根据需要更新
  comments.reply_to_user_name, comments.reply_to_content, comments.created_at
FROM comments
JOIN notes ON comments.note_id = notes.id;

-- 7. 处理 follows 表
-- 创建临时表
CREATE TABLE IF NOT EXISTS follows_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TEXT
);

-- 插入数据，使用 gen_random_uuid() 生成新的 ID
INSERT INTO follows_temp (follower_id, following_id, created_at)
SELECT 
  (SELECT id FROM users_temp WHERE users_temp.username = (SELECT username FROM users WHERE users.id = follows.follower_id) LIMIT 1),
  (SELECT id FROM users_temp WHERE users_temp.username = (SELECT username FROM users WHERE users.id = follows.following_id) LIMIT 1),
  created_at
FROM follows;

-- 8. 处理 feedback 表
-- 创建临时表
CREATE TABLE IF NOT EXISTS feedback_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_name TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  contact TEXT,
  status TEXT,
  created_at TEXT
);

-- 插入数据，使用 gen_random_uuid() 生成新的 ID
INSERT INTO feedback_temp (user_id, user_name, title, content, category, contact, status, created_at)
SELECT 
  (SELECT id FROM users_temp WHERE users_temp.username = (SELECT username FROM users WHERE users.id = feedback.user_id) LIMIT 1),
  user_name, title, content, category, contact, status, created_at
FROM feedback;

-- 9. 验证数据迁移
-- 检查临时表数据量
SELECT 'users' as table_name, COUNT(*) as count FROM users_temp
UNION ALL
SELECT 'notes' as table_name, COUNT(*) as count FROM notes_temp
UNION ALL
SELECT 'comments' as table_name, COUNT(*) as count FROM comments_temp
UNION ALL
SELECT 'follows' as table_name, COUNT(*) as count FROM follows_temp
UNION ALL
SELECT 'feedback' as table_name, COUNT(*) as count FROM feedback_temp
UNION ALL
SELECT 'note_tags' as table_name, COUNT(*) as count FROM note_tags_temp;

-- 10. 替换原表（谨慎执行）
-- 以下操作会删除原表，请确保已经备份数据
-- DROP TABLE IF EXISTS users, notes, comments, follows, feedback, note_tags;
-- ALTER TABLE users_temp RENAME TO users;
-- ALTER TABLE notes_temp RENAME TO notes;
-- ALTER TABLE comments_temp RENAME TO comments;
-- ALTER TABLE follows_temp RENAME TO follows;
-- ALTER TABLE feedback_temp RENAME TO feedback;
-- ALTER TABLE note_tags_temp RENAME TO note_tags;

-- 11. 创建索引（如果需要）
-- CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id);
-- CREATE INDEX IF NOT EXISTS idx_comments_note_id ON comments(note_id);
-- CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
-- CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
-- CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
-- CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
-- CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
