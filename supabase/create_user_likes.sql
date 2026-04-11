-- 1. 创建 user_likes 表
CREATE TABLE IF NOT EXISTS user_likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at text DEFAULT NOW(),
    UNIQUE(user_id, tag_id)
);

-- 2. 创建索引
CREATE INDEX idx_user_likes_user_id ON user_likes(user_id);
CREATE INDEX idx_user_likes_tag_id ON user_likes(tag_id);

-- 3. 初始化数据：将用户笔记关联的标签添加到 user_likes
INSERT INTO user_likes (user_id, tag_id)
SELECT DISTINCT n.author_id, nt.tag_id
FROM notes n
JOIN note_tags nt ON n.id = nt.note_id
WHERE n.author_id IS NOT NULL
AND nt.tag_id IS NOT NULL
ON CONFLICT (user_id, tag_id) DO NOTHING;