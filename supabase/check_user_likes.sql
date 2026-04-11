-- 检查 user_likes 表是否存在
SELECT table_name FROM information_schema.tables WHERE table_name = 'user_likes';

-- 如果存在，检查数据
SELECT * FROM user_likes LIMIT 10;