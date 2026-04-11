-- 添加可用的外键 (follows 和 user_likes 表有数据类型问题，跳过)

-- comments.user_id -> users.id
ALTER TABLE comments ADD CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- notes.author_id -> users.id
ALTER TABLE notes ADD CONSTRAINT fk_notes_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- feedback.user_id -> users.id
ALTER TABLE feedback ADD CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;