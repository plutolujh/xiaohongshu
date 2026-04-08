# 项目修复日志

> 生成日期: 2026-04-08
> 项目: 小红书美食分享 (xiaohongshu-food-share)

---

## 修复概览

本次修复针对项目上线前存在的安全问题、性能问题和生产配置问题进行修复。

---

## 问题清单与修复

### 1. 安全漏洞修复

#### 1.1 IDOR 授权漏洞 (严重)

**问题**: 用户可以修改或删除其他用户的资料、笔记、评论

**修复位置**: `server.js`

**修复内容**:
- `PUT /api/users/:id` - 添加用户身份验证
- `PUT /api/users/:id/password` - 添加用户身份验证
- `PUT /api/notes/:id` - 添加笔记作者验证
- `DELETE /api/notes/:id` - 添加笔记作者验证
- `DELETE /api/comments/:id` - 添加评论作者验证

```javascript
// 修复示例
const currentUserId = req.user.userId
const targetUserId = req.params.id
if (currentUserId !== targetUserId) {
  return res.status(403).json({ success: false, message: '无权限修改此用户' })
}
```

---

#### 1.2 速率限制 (高)

**问题**: 缺乏速率限制，容易遭受暴力破解

**修复**:
- 安装 `express-rate-limit` 依赖
- 添加通用限流器：每 15 分钟 100 次请求
- 添加认证限流器：登录/注册每 15 分钟 10 次

**修复位置**: `server.js:182-199`

```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: '请求过于频繁，请稍后再试' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: '请求过于频繁，请稍后再试' }
})
```

---

#### 1.3 CORS 安全 (高)

**问题**: 生产环境未设置 FONTEND_URL 时会变为 `*`，允许所有来源

**修复位置**: `server.js:163-177`

**修复内容**:
- 生产环境必须设置 FRONTEND_URL，否则拒绝请求
- 添加启动时警告

```javascript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : []  // 生产环境必须设置
  : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003']

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.error('错误: 生产环境必须设置 FRONTEND_URL 环境变量')
}
```

---

### 2. 数据与性能修复

#### 2.1 数据库索引 (高)

**问题**: 常用查询字段无索引，全表扫描

**修复位置**: `server.js:351-360`

**修复内容**: 首次启动时自动创建索引

```sql
CREATE INDEX idx_notes_author_id ON notes(author_id)
CREATE INDEX idx_notes_created_at ON notes(created_at DESC)
CREATE INDEX idx_comments_note_id ON comments(note_id)
CREATE INDEX idx_comments_user_id ON comments(user_id)
CREATE INDEX idx_feedback_user_id ON feedback(user_id)
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id)
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id)
```

---

#### 2.2 分页上限验证 (高)

**问题**: 无 limit 上限，用户可请求 `limit=999999`

**修复位置**: `server.js:683-685`

```javascript
let limit = parseInt(req.query.limit) || 10
limit = Math.min(Math.max(limit, 1), 100)
```

---

### 3. 错误处理修复

#### 3.1 API 静默失败 (中)

**问题**: API 错误时只返回空数据，不返回错误状态码

**修复位置**: `server.js:708,1168`

```javascript
// 修复前
res.json({ notes: [], total: 0, page, limit })

// 修复后
res.status(500).json({ success: false, message: e.message, notes: [], total: 0, page, limit })
```

---

### 4. 配置与加密修复

#### 4.1 bcrypt 轮数 (中)

**问题**: bcrypt 轮数使用 10偏低

**修��**: 默认密码改为 12 轮

---

### 5. 生产配置

#### 5.1 生产环境配置模板

**新增文件**: `.env.production`

```env
# 生产环境配置模板
NODE_ENV=production
PORT=3004
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your-secure-jwt-secret-key-here
DATABASE_URL=postgresql://user:password@host:port/database
```

---

#### 5.2 PM2 进程管理

**新增文件**: `ecosystem.config.js`

**功能**:
- 多进程负载均衡
- 自动重启
- 日志轮转 (7天，10MB)
- 内存限制 (500MB)

**新增 npm 脚本**:
- `pm2:start` - 启动
- `pm2:stop` - 停止
- `pm2:restart` - 重启
- `pm2:logs` - 查看日志
- `pm2:monit` - 实时监控

---

## 新增依赖

```json
{
  "dependencies": {
    "express-rate-limit": "^8.3.2"
  },
  "devDependencies": {
    "pm2": "^6.0.14"
  }
}
```

---

## 上线检查清单

### 上线前必须配置

- [ ] 复制 `.env.production` 到 `.env`
- [ ] 设置 `FRONTEND_URL` 为实际域名
- [ ] 生成并设置 `JWT_SECRET` (`openssl rand -hex 64`)
- [ ] 配置数据库连接 `DATABASE_URL`
- [ ] 执行 `npm run build` 构建前端

### 验证步骤

1. 启动后端: `npm run server` 或 `npm run pm2:start`
2. 检查 CORS 警告是否消失
3. 测试登录/注册限流
4. 验证 IDOR 修复（非本人无法修改他人资料）
5. 检查数据库索引是否创建

---

## 待优化 (非紧急)

- Token 有效期缩短 (当前 7 天，建议 2 小时)
- 添加 HTTPS 强制
- 添加用户枚举防护
- 前端错误状态显示优化

---

## 修复文件列表

| 文件 | 操作 |
|------|------|
| server.js | 修改 |
| package.json | 修改 |
| .env.production | 新增 |
| ecosystem.config.js | 新增 |

---

## 回滚说明

如需回滚到修复前状态：
```bash
git checkout -- server.js package.json
git checkout HEAD -- .
# 移除新增依赖
npm uninstall express-rate-limit
npm uninstall -D pm2
```