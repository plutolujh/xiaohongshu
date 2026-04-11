-- 查看各表数据样本，检查数据类型一致性
SELECT 'note_tags' as tbl, note_id, tag_id FROM note_tags LIMIT 3
UNION ALL
SELECT 'comments', note_id, user_id FROM comments LIMIT 3
UNION ALL
SELECT 'user_likes', user_id, tag_id FROM user_likes LIMIT 3
UNION ALL
SELECT 'feedback', user_id, 'N/A' FROM feedback LIMIT 3
UNION ALL
SELECT 'notes', author_id, 'N/A' FROM notes LIMIT 3;