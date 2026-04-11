-- 清空并重新初始化 user_likes
TRUNCATE user_likes;

-- 只插入用户自己的笔记关联的标签
INSERT INTO user_likes (user_id, tag_id)
SELECT DISTINCT n.author_id, nt.tag_id
FROM notes n
JOIN note_tags nt ON n.id = nt.note_id
WHERE n.author_id IS NOT NULL
AND nt.tag_id IS NOT NULL
ON CONFLICT (user_id, tag_id) DO NOTHING;