-- 为 comments 表添加 user_avatar 字段
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_avatar TEXT;
COMMENT ON COLUMN comments.user_avatar IS '用户头像URL';
