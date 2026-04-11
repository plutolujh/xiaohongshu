-- 检查 user_likes 表的数据量和该用户的数据
SELECT COUNT(*) as total_count FROM user_likes;
SELECT * FROM user_likes WHERE user_id = '2555ffc6-a467-436f-ac42-5f7ee64e7953';