-- 查询该用户的笔记
SELECT id, title, author_id FROM notes WHERE author_id = '2555ffc6-a467-436f-ac42-5f7ee64e7953';

-- 查询该用户笔记关联的标签
SELECT DISTINCT t.id, t.name
FROM tags t
JOIN note_tags nt ON t.id = nt.tag_id
JOIN notes n ON nt.note_id = n.id
WHERE n.author_id = '2555ffc6-a467-436f-ac42-5f7ee64e7953'
ORDER BY t.name;