-- 添加外键约束
ALTER TABLE user_likes ADD CONSTRAINT fk_user_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_likes ADD CONSTRAINT fk_user_likes_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;