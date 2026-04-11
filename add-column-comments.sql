-- 为表列添加说明

-- users 表
COMMENT ON COLUMN users.id IS '用户ID，UUID格式';
COMMENT ON COLUMN users.username IS '用户名，唯一';
COMMENT ON COLUMN users.password IS '密码，加密存储';
COMMENT ON COLUMN users.nickname IS '用户昵称';
COMMENT ON COLUMN users.avatar IS '用户头像URL';
COMMENT ON COLUMN users.bio IS '用户简介';
COMMENT ON COLUMN users.role IS '用户角色，如admin、user';
COMMENT ON COLUMN users.status IS '用户状态，如active、inactive';
COMMENT ON COLUMN users.created_at IS '创建时间';

-- notes 表
COMMENT ON COLUMN notes.id IS '笔记ID，UUID格式';
COMMENT ON COLUMN notes.title IS '笔记标题';
COMMENT ON COLUMN notes.content IS '笔记内容';
COMMENT ON COLUMN notes.ingredients IS '食材列表，JSON格式';
COMMENT ON COLUMN notes.steps IS '步骤列表，JSON格式';
COMMENT ON COLUMN notes.images IS '图片URL列表，JSON格式';
COMMENT ON COLUMN notes.author_id IS '作者ID，外键关联users表';
COMMENT ON COLUMN notes.author_name IS '作者名称';
COMMENT ON COLUMN notes.likes IS '点赞数';
COMMENT ON COLUMN notes.liked IS '是否点赞，0或1';
COMMENT ON COLUMN notes.created_at IS '创建时间';

-- comments 表
COMMENT ON COLUMN comments.id IS '评论ID，UUID格式';
COMMENT ON COLUMN comments.note_id IS '笔记ID，外键关联notes表';
COMMENT ON COLUMN comments.user_id IS '用户ID，外键关联users表';
COMMENT ON COLUMN comments.user_name IS '用户名';
COMMENT ON COLUMN comments.content IS '评论内容';
COMMENT ON COLUMN comments.reply_to_id IS '回复的评论ID';
COMMENT ON COLUMN comments.reply_to_user_name IS '被回复的用户名';
COMMENT ON COLUMN comments.reply_to_content IS '被回复的评论内容';
COMMENT ON COLUMN comments.created_at IS '创建时间';

-- feedback 表
COMMENT ON COLUMN feedback.id IS '反馈ID，UUID格式';
COMMENT ON COLUMN feedback.user_id IS '用户ID，外键关联users表';
COMMENT ON COLUMN feedback.user_name IS '用户名';
COMMENT ON COLUMN feedback.title IS '反馈标题';
COMMENT ON COLUMN feedback.content IS '反馈内容';
COMMENT ON COLUMN feedback.category IS '反馈类别';
COMMENT ON COLUMN feedback.contact IS '联系方式';
COMMENT ON COLUMN feedback.status IS '反馈状态，如pending、resolved';
COMMENT ON COLUMN feedback.created_at IS '创建时间';

-- note_tags 表
COMMENT ON COLUMN note_tags.id IS '笔记标签关联ID，UUID格式';
COMMENT ON COLUMN note_tags.note_id IS '笔记ID，外键关联notes表';
COMMENT ON COLUMN note_tags.tag_id IS '标签ID，外键关联tags表';
COMMENT ON COLUMN note_tags.created_at IS '创建时间';

-- tags 表
COMMENT ON COLUMN tags.id IS '标签ID，UUID格式';
COMMENT ON COLUMN tags.name IS '标签名称，唯一';
COMMENT ON COLUMN tags.created_at IS '创建时间';
