-- 直接查询该用户喜欢的标签
SELECT t.id, t.name
FROM tags t
JOIN user_likes ut ON t.id = ut.tag_id
WHERE ut.user_id = '2555ffc6-a467-436f-ac42-5f7ee64e7953'
ORDER BY t.name;