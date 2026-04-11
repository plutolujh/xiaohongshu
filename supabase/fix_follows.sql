-- 1. 修改列类型为 uuid
ALTER TABLE follows ALTER COLUMN follower_id TYPE uuid USING follower_id::uuid;
ALTER TABLE follows ALTER COLUMN following_id TYPE uuid USING following_id::uuid;

-- 2. 添加外键约束
ALTER TABLE follows ADD CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE follows ADD CONSTRAINT fk_follows_following FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE;