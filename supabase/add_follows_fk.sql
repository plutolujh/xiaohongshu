-- follows 表的外键
ALTER TABLE follows ADD CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE follows ADD CONSTRAINT fk_follows_following FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE;