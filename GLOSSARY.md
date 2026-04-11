# 项目技术案例学习指南

> 项目: 小红书美食分享
> 适合: 初学者
> 日期: 2026-04-08

---

## React 基础

### 1. useState - 状态管理

**概念**: 用于在组件中存储和管理数据

**语法**:
```javascript
const [状态名, set状态名] = useState(初始值)
```

**案例 - Home.jsx**:
```javascript
const [notes, setNotes] = useState([])       // 笔记列表
const [page, setPage] = useState(1)         // 当前页码
const [total, setTotal] = useState(0)         // 总数
const [loading, setLoading] = useState(false) // 加载状态
const [pageSize, setPageSize] = useState(10) // 每页数量
const [popularTags, setPopularTags] = useState([]) // 标签列表
const [selectedTag, setSelectedTag] = useState('') // 选中的标签
```

**更新状态**:
```javascript
setNotes(newNotes)          // 直接设置新值
setPage(page + 1)         // 基于旧值计算新值
```

---

### 2. useEffect - 副作用处理

**概念**: 在组件渲染后执行副作用操作，如请求数据、定时器等

**语法**:
```javascript
useEffect(() => {
  // 执行逻辑
}, [依赖数组])  // 依赖变化时重新执行
```

**案例 - 首页加载数据**:
```javascript
useEffect(() => {
  loadNotes()
  loadPopularTags()
}, [page, pageSize])  // page 或 pageSize 变化时重新执行
```

**案例 - 笔记详情加载**:
```javascript
useEffect(() => {
  if (id) {
    findNoteById(id).then(setNote)
    getCommentsByNoteId(id).then(setComments)
    getNoteTags(id).then(setTags)
  }
}, [id])  // id 变化时重新执行
```

**常用场景**:
- 组件加载时请求数据
- 依赖变化时重新请求
- 组件卸载时清理（如清除定时器）

---

### 3. useParams - 获取 URL 参数

**概念**: 获取路由中的参数

**案例 - NoteDetail.jsx**:
```javascript
// 路由: /note/:id
const { id } = useParams()
// 访问: /note/123 → id = '123'
```

---

### 4. useNavigate - 编程式导航

**概念**: 在代码中实现页面跳转

**案例 - NoteDetail.jsx**:
```javascript
const navigate = useNavigate()

// 跳转到编辑页面
onClick={() => navigate(`/edit/${note.id}`)}

// 登录后跳转
navigate('/profile')
```

---

### 5. 条件渲染

**概念**: 根据状态显示不同内容

**案例 - 加载状态**:
```javascript
{loading ? (
  <Loading text="加载中..." />
) : (
  <div>内容</div>
)}
```

**案例 - 空列表**:
```javascript
{notes.length > 0 ? (
  notes.map(note => <NoteCard key={note.id} note={note} />)
) : (
  <p>没有笔记</p>
)}
```

---

### 6. 事件处理

**概念**: 处理用户交互

**案例 - 点赞**:
```javascript
const handleLike = async () => {
  if (!note) return

  const newLiked = !note.liked
  const newLikes = note.liked ? note.likes - 1 : note.likes + 1

  // 乐观更新
  setNote({ ...note, liked: newLiked, likes: newLikes })

  try {
    await updateNote({ ...note, liked: newLiked, likes: newLikes })
  } catch (error) {
    setNote(note)  // 失败回滚
  }
}
```

**案例 - 表单提交**:
```javascript
const handleComment = async (e) => {
  e.preventDefault()  // 阻止表单默认提交
  if (!newComment.trim()) return

  setLoading(true)
  try {
    await createComment({ note_id: id, content: newComment })
    setComments([commentData, ...comments])
    setNewComment('')  // 清空输入框
  } catch (err) {
    console.error('评论失败:', err)
  } finally {
    setLoading(false)
  }
}
```

---

### 7. 表单输入处理

**案例 - 输入框绑定**:
```javascript
const [newComment, setNewComment] = useState('')

<input
  type="text"
  value={newComment}
  onChange={(e) => setNewComment(e.target.value)}
  placeholder="添加评论..."
/>
```

---

### 8. 受控组件

**概念**: 组件状态完全由 React 控制的表单元素

**案例**:
```javascript
function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // 使用 username 和 password
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={username} onChange={e => setUsername(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">登录</button>
    </form>
  )
}
```

---

## React Context - 状态共享

### 9. 创建 Context

**案例 - AuthContext.jsx**:
```javascript
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = (userData) => setUser(userData)
  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

### 10. 使用 Context

```javascript
import { useAuth } from '../context/AuthContext'

function Profile() {
  const { user, logout } = useAuth()

  if (!user) return <p>请先登录</p>

  return (
    <div>
      <p>欢迎, {user.nickname}</p>
      <button onClick={logout}>退出</button>
    </div>
  )
}
```

---

## React Router - 路由管理

### 11. 路由配置

**案例 - App.jsx**:
```javascript
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/note/:id" element={<NoteDetail />} />
    </Routes>
  )
}
```

### 12. 导航链接

```javascript
import { Link } from 'react-router-dom'

// 文字链接
<Link to="/">首页</Link>

// 图片链接
<Link to={`/note/${note.id}`}>
  <img src={note.images[0]} alt={note.title} />
</Link>
```

---

## Express 后端

### 13. 中间件配置

**概念**: 处理请求的函数，链式调用

**基本结构**:
```javascript
function middleware(req, res, next) {
  // 处理逻辑
  next()  // 传递给下一个中间件
}
```

**案例 - CORS 配置**:
```javascript
const allowedOrigins = ['http://localhost:3000']

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))
```

### 14. express.json() 解析

**概念**: 解析请求体中的 JSON 数据

```javascript
app.use(express.json({ limit: '10mb' }))
```

---

### 15. RESTful 路由

**概念**: 统一的路由设计风格

| 方法 | 路径 | 操作 |
|------|------|------|
| GET | /api/users | 获取所有用户 |
| GET | /api/users/:id | 获取单个用户 |
| POST | /api/users | 创建用户 |
| PUT | /api/users/:id | 更新用户 |
| DELETE | /api/users/:id | 删除用户 |

**案例 - GET**:
```javascript
app.get('/api/users', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users')
    res.json(result.rows)
  } catch (e) {
    res.json({ error: e.message })
  }
})
```

**案例 - POST**:
```javascript
app.post('/api/register', async (req, res) => {
  const { username, password, nickname } = req.body

  // 输入验证
  if (!username || !password) {
    return res.json({ success: false, message: '请填写所有字段' })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    await query(
      'INSERT INTO users (id, username, password, nickname) VALUES ($1, $2, $3, $4)',
      [id, username, hashedPassword, nickname]
    )
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})
```

**案例 - PUT**:
```javascript
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  const { title, content } = req.body

  try {
    await query(
      'UPDATE notes SET title = $1, content = $2 WHERE id = $3',
      [title, content, req.params.id]
    )
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})
```

**案例 - DELETE**:
```javascript
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM notes WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})
```

---

### 16. 获取请求参数

**URL 参数**:
```javascript
app.get('/api/notes/:id', async (req, res) => {
  req.params.id  // :id 的值
})
```

**查询参数**:
```javascript
app.get('/api/notes', async (req, res) => {
  req.query.page   // ?page=1
  req.query.limit // ?limit=10
})
```

**请求体**:
```javascript
app.post('/api/register', async (req, res) => {
  req.body.username  // { username: 'xxx', ... }
  req.body.password
})
```

---

### 17. 数据库操作

**连接池**:
```javascript
const pool = new Pool({ connectionString })
async function query(text, params) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}
```

**参数化查询（防 SQL 注入）**:
```javascript
// 单参数
await query('SELECT * FROM users WHERE id = $1', [userId])

// 多参数
await query(
  'INSERT INTO users (id, username, password) VALUES ($1, $2, $3)',
  [id, username, hashedPassword]
)
```

**分页查询**:
```javascript
app.get('/api/notes', async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = Math.min(parseInt(req.query.limit) || 10, 100)
  const offset = (page - 1) * limit

  const countResult = await query('SELECT COUNT(*) FROM notes')
  const total = parseInt(countResult.rows[0].count)

  const result = await query(
    'SELECT * FROM notes ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )

  res.json({ notes: result.rows, total, page, limit })
})
```

---

### 18. JWT 认证

**生成 Token**:
```javascript
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key'

app.post('/api/login', async (req, res) => {
  // 验证用户...
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ success: true, token })
})
```

**验证中间件**:
```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: '需要认证' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '无效的token' })
    }
    req.user = user
    next()
  })
}

// 使用
app.get('/api/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  // 查询用户信息
})
```

---

### 19. 错误处理

**try-catch**:
```javascript
app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }
    res.json(result.rows[0])
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})
```

**全局错误处理**:
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: '服务器错误' })
})
```

---

### 20. 密码加密

```javascript
import bcrypt from 'bcrypt'

// 加密
const hashedPassword = await bcrypt.hash(password, 10)

// 验证
const match = await bcrypt.compare(password, hashedPassword)
if (match) {
  // 密码正确
}
```

**bcrypt 轮数**: 轮数越高越安全，10 是默认值，生产环境可用 12

---

### 21. 速率限制

```javascript
import rateLimit from 'express-rate-limit'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15分钟
  max: 10,                   // 最多10次
  message: { message: '请求过于频繁' }
})

app.post('/api/login', authLimiter, async (req, res) => {
  // 登录逻辑
})
```

---

## 常用代码片段

### 22. 组件模板

```javascript
import { useState, useEffect } from 'react'

export default function ComponentName() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <div>
      {/* 内容 */}
    </div>
  )
}
```

### 23. API 封装

```javascript
// utils/api.js
const API_BASE = '/api'

function getHeaders() {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function getNotes(page = 1, limit = 10) {
  const res = await fetch(`${API_BASE}/notes?page=${page}&limit=${limit}`, {
    headers: getHeaders()
  })
  return res.json()
}
```

### 24. 环境变量使用

```bash
# .env
DATABASE_URL=postgresql://...
JWT_SECRET=secret
```

```javascript
// 使用
import dotenv from 'dotenv'
dotenv.config()

const dbUrl = process.env.DATABASE_URL
const jwtSecret = process.env.JWT_SECRET
```

---

## 学习路线建议

1. **第一阶段**: React 基础
   - useState, useEffect, 条件渲染
   - 事件处理, 表单

2. **第二阶段**: React 进阶
   - Context 状态共享
   - React Router 路由
   - 组件通信

3. **第三阶段**: Express 后端
   - 路由定义, 中间件
   - RESTful API 设计
   - 数据库操作

4. **第四阶段**: 认证与安全
   - JWT 实现登录
   - 密码加密
   - 权限控制

---

## API 接口文档

### 1. 认证相关 API

| 方法 | 路径 | 功能 | 认证 | 请求体 (JSON) | 响应 |
|------|------|------|------|--------------|------|
| POST | /api/login | 用户登录 | 否 | `{"username": "admin", "password": "123456"}` | `{"success": true, "user": {...}, "token": "..."}` |
| POST | /api/register | 用户注册 | 否 | `{"username": "user1", "password": "123456", "nickname": "用户1"}` | `{"success": true}` |

### 2. 用户相关 API

| 方法 | 路径 | 功能 | 认证 | 请求体 (JSON) | 响应 |
|------|------|------|------|--------------|------|
| GET | /api/users | 获取所有用户 | 是 (管理员) | N/A | `[{"id": "...", "username": "...", ...}]` |
| POST | /api/users | 创建用户 | 否 | `{"id": "...", "username": "...", "password": "...", "nickname": "...", "avatar": "...", "created_at": "..."}` | `{"success": true}` |
| PUT | /api/users/:id | 更新用户信息 | 是 | `{"nickname": "...", "avatar": "...", "bio": "..."}` | `{"success": true}` |
| PUT | /api/users/:id/password | 修改密码 | 是 | `{"oldPassword": "...", "newPassword": "..."}` | `{"success": true}` |
| DELETE | /api/users/:id | 删除用户 | 是 (管理员) | N/A | `{"success": true}` |
| PUT | /api/users/:id/status | 修改用户状态 | 是 (管理员) | `{"status": "active"}` | `{"success": true}` |
| PUT | /api/users/:id/role | 修改用户角色 | 是 (管理员) | `{"role": "admin"}` | `{"success": true}` |
| GET | /api/users/:username | 根据用户名获取用户 | 否 | N/A | `{"id": "...", "username": "...", ...}` |
| GET | /api/user/:id | 根据 ID 获取用户 | 否 | N/A | `{"id": "...", "username": "...", ...}` |
| GET | /api/user/:id/tags | 获取用户喜欢的标签 | 否 | N/A | `[{"id": "...", "name": "..."}]` |
| POST | /api/users/:id/follow | 关注用户 | 是 | N/A | `{"success": true, "message": "关注成功"}` |
| DELETE | /api/users/:id/follow | 取消关注 | 是 | N/A | `{"success": true, "message": "取消关注成功"}` |
| GET | /api/users/:id/followers | 获取用户粉丝列表 | 是 | N/A | `{"success": true, "data": {"users": [...], "total": 10, "page": 1, "limit": 20}}` |
| GET | /api/users/:id/following | 获取用户关注列表 | 是 | N/A | `{"success": true, "data": {"users": [...], "total": 10, "page": 1, "limit": 20}}` |
| GET | /api/users/:id/follow-status/:targetId | 检查关注状态 | 是 | N/A | `{"isFollowing": true}` |
| GET | /api/users/:id/follow-counts | 获取关注和粉丝数量 | 否 | N/A | `{"followerCount": 10, "followingCount": 5}` |

### 3. 笔记相关 API

| 方法 | 路径 | 功能 | 认证 | 请求体 (JSON) | 响应 |
|------|------|------|------|--------------|------|
| GET | /api/notes | 获取笔记列表 | 否 | N/A (支持查询参数: page, limit, author) | `{"success": true, "data": {"rows": [...], "total": 100, "page": 1, "limit": 10}}` |
| POST | /api/notes | 创建笔记 | 是 | `{"id": "...", "title": "...", "content": "...", "images": [...], "author_id": "...", "author_name": "..."}` | `{"success": true, "note": {...}}` |
| PUT | /api/notes/:id | 更新笔记 | 是 | `{"title": "...", "content": "...", "images": [...]}` | `{"success": true}` |
| DELETE | /api/notes/:id | 删除笔记 | 是 | N/A | `{"success": true}` |
| GET | /api/notes/:id | 获取笔记详情 | 否 | N/A | `{"success": true, "data": {...}}` |
| POST | /api/notes/:id/like | 点赞笔记 | 是 | N/A | `{"success": true, "liked": true}` |
| DELETE | /api/notes/:id/like | 取消点赞 | 是 | N/A | `{"success": true, "liked": false}` |
| GET | /api/notes/:id/like-status | 获取点赞状态 | 是 | N/A | `{"liked": true}` |
| GET | /api/notes/:id/tags | 获取笔记标签 | 否 | N/A | `[{"id": "...", "name": "..."}]` |
| POST | /api/notes/:id/tags | 保存笔记标签 | 否 | `{"tags": ["tag1", "tag2"]}` | `{"success": true}` |

### 4. 评论相关 API

| 方法 | 路径 | 功能 | 认证 | 请求体 (JSON) | 响应 |
|------|------|------|------|--------------|------|
| GET | /api/comments/:noteId | 获取笔记评论 | 否 | N/A | `[{"id": "...", "content": "...", "user_name": "...", ...}]` |
| POST | /api/comments | 创建评论 | 是 | `{"note_id": "...", "content": "...", "user_id": "...", "user_name": "..."}` | `{"success": true, "comment": {...}}` |
| DELETE | /api/comments/:id | 删除评论 | 是 | N/A | `{"success": true}` |

### 5. 反馈相关 API

| 方法 | 路径 | 功能 | 认证 | 请求体 (JSON) | 响应 |
|------|------|------|------|--------------|------|
| POST | /api/feedback | 提交反馈 | 是 | `{"content": "...", "user_id": "...", "user_name": "..."}` | `{"success": true}` |
| GET | /api/feedback | 获取所有反馈 | 是 (管理员) | N/A | `[{"id": "...", "content": "...", "user_name": "...", ...}]` |
| GET | /api/feedback/me | 获取我的反馈 | 是 | N/A | `[{"id": "...", "content": "...", "status": "...", ...}]` |
| PUT | /api/feedback/:id | 更新反馈状态 | 是 (管理员) | `{"status": "resolved"}` | `{"success": true}` |

### 6. 标签相关 API

| 方法 | 路径 | 功能 | 认证 | 请求体 (JSON) | 响应 |
|------|------|------|------|--------------|------|
| GET | /api/tags | 获取所有标签 | 否 | N/A | `[{"id": "...", "name": "...", "created_at": "..."}]` |
| GET | /api/tags/popular | 获取热门标签 | 否 | N/A | `[{"id": "...", "name": "...", "note_count": 10}]` |
| POST | /api/tags | 创建标签 | 是 | `{"id": "...", "name": "...", "created_at": "..."}` | `{"success": true}` |
| GET | /api/tags/:id/notes | 获取标签相关笔记 | 否 | N/A | `{"success": true, "data": {"rows": [...], "total": 10, "page": 1, "limit": 10}}` |

### 7. 数据库管理 API

| 方法 | 路径 | 功能 | 认证 | 请求体 (JSON) | 响应 |
|------|------|------|------|--------------|------|
| GET | /api/status | 获取系统状态 | 是 (管理员) | N/A | `{"success": true, "data": {...}}` |
| GET | /api/db/info | 获取数据库信息 | 是 (管理员) | N/A | `{"success": true, "data": {...}}` |
| GET | /api/db/tables | 获取数据库表列表 | 是 (管理员) | N/A | `{"success": true, "data": {"tables": [...]}}` |
| GET | /api/db/table/:tableName | 获取表数据 | 是 (管理员) | N/A | `{"success": true, "data": {"rows": [...], "total": 100, "page": 1, "limit": 10}}` |
| POST | /api/db/query | 执行 SQL 查询 | 是 (管理员) | `{"query": "SELECT * FROM users"}` | `{"success": true, "data": [...]}` |
| GET | /api/db/table/:tableName/structure | 获取表结构 | 是 (管理员) | N/A | `{"success": true, "data": {"columns": [...], "primaryKeys": [...]}}` |
| GET | /api/db/backup | 数据库备份 | 是 (管理员) | N/A | `{"success": true, "data": {"backup": "..."}}` |

### 8. 其他 API

| 方法 | 路径 | 功能 | 认证 | 请求体 (JSON) | 响应 |
|------|------|------|------|--------------|------|
| POST | /api/upload | 上传图片 | 是 | `{"image": "base64...", "filename": "image.jpg"}` | `{"success": true, "url": "..."}` |
| GET | /api/health | 健康检查 | 否 | N/A | `{"success": true, "message": "Server is running"}` |

### 9. 认证说明

- **需要认证**：请求头中需要携带 `Authorization: Bearer <token>`
- **token 获取**：通过 `/api/login` 接口登录后获取
- **token 有效期**：7 天
- **管理员权限**：某些接口需要管理员角色才能访问

---

## Supabase CLI 管理

### 1. 安装 Supabase CLI

**使用 Homebrew (macOS)**:  
```bash
brew install supabase/tap/supabase
```

**使用 npx (临时运行)**:  
```bash
npx supabase --version
```

### 2. 登录与项目链接

**登录 Supabase**:
```bash
npx supabase login
```

**链接到现有项目**:
```bash
npx supabase link --project-ref fzxuotfihpbzozjoplim
```

### 3. 数据库管理命令

**查询数据库**:
```bash
# 查询远程数据库
npx supabase db query "SELECT * FROM notes" --linked

# 执行 SQL 文件
npx supabase db reset --linked
```

**数据库迁移**:
```bash
# 创建迁移文件
npx supabase migration new add-users-table

# 应用迁移
npx supabase db push --linked
```

### 4. Storage 管理命令

**列出存储桶中的文件**:
```bash
# 列出根目录文件
npx supabase storage ls ss:///xiaohongbucket --experimental

# 递归列出所有文件
npx supabase storage ls ss:///xiaohongbucket --recursive --experimental

# 列出特定目录
npx supabase storage ls ss:///xiaohongbucket/files --experimental
```

**上传文件**:
```bash
npx supabase storage cp ./local-image.jpg ss:///xiaohongbucket/files/image.jpg --experimental
```

**下载文件**:
```bash
npx supabase storage cp ss:///xiaohongbucket/files/image.jpg ./downloaded-image.jpg --experimental
```

**删除文件**:
```bash
npx supabase storage rm ss:///xiaohongbucket/files/unwanted-image.jpg --experimental
```

**移动文件**:
```bash
npx supabase storage mv ss:///xiaohongbucket/files/old-image.jpg ss:///xiaohongbucket/files/new-image.jpg --experimental
```

### 5. 注意事项

- **实验性命令**：Storage 相关命令需要添加 `--experimental` 标志
- **链接标志**：操作远程数据库需要添加 `--linked` 标志
- **权限**：确保您有足够的权限执行相应操作
- **路径格式**：Storage 命令使用 `ss:///bucket/path` 格式

### 6. 常用操作示例

**检查 Storage 中的图片文件**:
```bash
npx supabase storage ls ss:///xiaohongbucket/files --recursive --experimental
```

**备份数据库**:
```bash
npx supabase db dump --linked > backup.sql
```

**查看项目状态**:
```bash
npx supabase status --linked
```

---

## 数据库结构

### 1. 表结构概览

| 表名 | 描述 |
|------|------|
| users | 用户表 |
| notes | 笔记表 |
| comments | 评论表 |
| tags | 标签表 |
| note_tags | 笔记标签关联表 |
| follows | 关注关系表 |
| feedback | 反馈表 |

### 2. 详细表结构

#### users 表
| 列名 | 数据类型 | 是否为空 | 描述 |
|------|---------|----------|------|
| id | uuid | NO | 用户ID，UUID格式 |
| username | text | NO | 用户名，唯一 |
| password | text | NO | 密码，加密存储 |
| nickname | text | NO | 用户昵称 |
| avatar | text | YES | 用户头像URL |
| bio | text | YES | 用户简介 |
| role | text | YES | 用户角色，如admin、user |
| status | text | YES | 用户状态，如active、inactive |
| created_at | text | YES | 创建时间 |

#### notes 表
| 列名 | 数据类型 | 是否为空 | 描述 |
|------|---------|----------|------|
| id | uuid | NO | 笔记ID，UUID格式 |
| title | text | NO | 笔记标题 |
| content | text | YES | 笔记内容 |
| ingredients | text | YES | 食材列表，JSON格式 |
| steps | text | YES | 步骤列表，JSON格式 |
| images | text | YES | 图片URL列表，JSON格式 |
| author_id | uuid | NO | 作者ID，外键关联users表 |
| author_name | text | YES | 作者名称 |
| likes | integer | YES | 点赞数 |
| liked | integer | YES | 是否点赞，0或1 |
| created_at | text | YES | 创建时间 |

#### comments 表
| 列名 | 数据类型 | 是否为空 | 描述 |
|------|---------|----------|------|
| id | uuid | NO | 评论ID，UUID格式 |
| note_id | uuid | NO | 笔记ID，外键关联notes表 |
| user_id | uuid | NO | 用户ID，外键关联users表 |
| user_name | text | YES | 用户名 |
| content | text | YES | 评论内容 |
| reply_to_id | uuid | YES | 回复的评论ID |
| reply_to_user_name | text | YES | 被回复的用户名 |
| reply_to_content | text | YES | 被回复的评论内容 |
| created_at | text | YES | 创建时间 |

#### tags 表
| 列名 | 数据类型 | 是否为空 | 描述 |
|------|---------|----------|------|
| id | uuid | NO | 标签ID，UUID格式 |
| name | text | NO | 标签名称，唯一 |
| created_at | text | YES | 创建时间 |

#### note_tags 表
| 列名 | 数据类型 | 是否为空 | 描述 |
|------|---------|----------|------|
| id | uuid | NO | 笔记标签关联ID，UUID格式 |
| note_id | uuid | NO | 笔记ID，外键关联notes表 |
| tag_id | uuid | YES | 标签ID，外键关联tags表 |
| created_at | text | YES | 创建时间 |

#### follows 表
| 列名 | 数据类型 | 是否为空 | 描述 |
|------|---------|----------|------|
| id | uuid | NO | 关注记录ID，UUID格式 |
| follower_id | uuid | NO | 关注者ID，外键关联users表 |
| following_id | uuid | NO | 被关注者ID，外键关联users表 |
| created_at | text | YES | 创建时间 |

#### feedback 表
| 列名 | 数据类型 | 是否为空 | 描述 |
|------|---------|----------|------|
| id | uuid | NO | 反馈ID，UUID格式 |
| user_id | uuid | NO | 用户ID，外键关联users表 |
| user_name | text | YES | 用户名 |
| title | text | NO | 反馈标题 |
| content | text | NO | 反馈内容 |
| category | text | NO | 反馈类别 |
| contact | text | YES | 联系方式 |
| status | text | YES | 反馈状态，如pending、resolved |
| created_at | text | YES | 创建时间 |

### 3. 索引信息

| 表名 | 索引名 | 索引定义 |
|------|--------|----------|
| comments | idx_comments_note_id | CREATE INDEX idx_comments_note_id ON comments(note_id) |
| comments | idx_comments_user_id | CREATE INDEX idx_comments_user_id ON comments(user_id) |
| follows | idx_follows_follower_id | CREATE INDEX idx_follows_follower_id ON follows(follower_id) |
| follows | idx_follows_following_id | CREATE INDEX idx_follows_following_id ON follows(following_id) |
| note_tags | idx_note_tags_note_id | CREATE INDEX idx_note_tags_note_id ON note_tags(note_id) |
| note_tags | idx_note_tags_tag_id | CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id) |
| notes | idx_notes_author_id | CREATE INDEX idx_notes_author_id ON notes(author_id) |

### 4. 外键约束

数据库已建立完整的外键关系，确保数据一致性和引用完整性：

| 表 | 字段 | 引用 | 删除行为 |
|-----|------|------|----------|
| notes | author_id | → users.id | SET NULL |
| comments | note_id | → notes.id | CASCADE |
| comments | user_id | → users.id | CASCADE |
| note_tags | note_id | → notes.id | CASCADE |
| note_tags | tag_id | → tags.id | CASCADE |
| follows | follower_id | → users.id | CASCADE |
| follows | following_id | → users.id | CASCADE |
| feedback | user_id | → users.id | SET NULL |

**说明**：
- **CASCADE**：删除主记录时，自动删除关联记录
- **SET NULL**：删除主记录时，将外键设为 NULL

### 5. ID 类型统一

所有表的 ID 类型已统一为 UUID，具有以下优势：

- **全球唯一性**：避免ID冲突
- **分布式友好**：支持分布式系统
- **安全性**：不易被猜测
- **一致性**：所有表使用相同的ID类型

### 6. 数据迁移说明

数据库结构已通过以下步骤进行了优化：

1. **创建临时表**：使用 UUID 类型创建临时表
2. **数据迁移**：将数据从原表迁移到临时表
3. **替换原表**：将临时表重命名为原表名
4. **创建索引**：为相关字段创建索引以提高查询性能
5. **添加列说明**：为每个表的列添加详细注释

这些优化确保了数据库结构的一致性和可扩展性，为后续的开发和维护提供了更好的基础。

---

## REST + Repository 架构

### 1. 架构概述

当前项目采用 **REST API + Repository 模式** 的分层架构：

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (server.js)                  │
│  - 路由定义 (app.get, app.post, app.put, app.delete)        │
│  - 请求验证                                                 │
│  - 认证/授权中间件                                          │
│  - 响应处理                                                 │
└────────────────────────────┬────────────────────────────────┘
                             │ 调用
┌────────────────────────────▼────────────────────────────────┐
│                    Repository Layer (repositories/)          │
│  - 数据访问逻辑封装                                          │
│  - 业务规则处理                                              │
│  - 关联数据处理                                              │
│  - 错误转换                                                  │
└────────────────────────────┬────────────────────────────────┘
                             │ 调用
┌────────────────────────────▼────────────────────────────────┐
│                      Data Layer (Supabase)                   │
│  - PostgreSQL 数据库                                        │
│  - Row Level Security (RLS)                                  │
│  - Supabase SDK                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Repository 文件结构

```
repositories/
├── index.js              # 统一导出
├── BaseRepository.js     # 基类，包含通用 CRUD
├── TagRepository.js      # 标签相关数据操作
├── NoteRepository.js     # 笔记相关数据操作
├── UserRepository.js      # 用户相关数据操作
├── CommentRepository.js   # 评论相关数据操作
└── FeedbackRepository.js  # 反馈相关数据操作
```

### 3. BaseRepository 通用方法

```javascript
// repositories/BaseRepository.js
export class BaseRepository {
  constructor(supabase, tableName) {
    this.supabase = supabase
    this.tableName = tableName
  }

  // 查询所有
  async findAll(options = {}) {
    let query = this.supabase.from(this.tableName).select('*', { count: 'exact' })
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true })
    }
    if (options.limit) {
      query = query.limit(options.limit)
    }
    const { data, error, count } = await query
    if (error) throw error
    return { data, count }
  }

  // 根据 ID 查询
  async findById(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  // 条件查询
  async findWhere(column, value) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(column, value)
    if (error) throw error
    return data
  }

  // 创建
  async create(item) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // 更新
  async update(id, updates) {
    const { error } = await this.supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
    if (error) throw error
    return true
  }

  // 删除
  async delete(id) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
    if (error) throw error
    return true
  }

  // 统计数量
  async count() {
    const { count, error } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
    if (error) throw error
    return count
  }
}
```

### 4. TagRepository 示例

```javascript
// repositories/TagRepository.js
import { BaseRepository } from './BaseRepository.js'

export class TagRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'tags')
  }

  // 获取带笔记数量的标签
  async findWithNoteCount(limit) {
    const { data, error } = await this.supabase.from('tags').select('*')
    if (error) throw error

    const tagsWithCount = await Promise.all(data.map(async (tag) => {
      const { count } = await this.supabase
        .from('note_tags')
        .select('*', { count: 'exact', head: true })
        .eq('tag_id', tag.id)
      return { ...tag, note_count: count || 0 }
    }))

    const sorted = tagsWithCount.sort((a, b) => {
      if (b.note_count !== a.note_count) return b.note_count - a.note_count
      return a.name.localeCompare(b.name)
    })

    return limit ? sorted.slice(0, limit) : sorted
  }

  // 根据名称查找
  async findByName(name) {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('name', name)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  // 查找或创建
  async findOrCreate(name) {
    const existing = await this.findByName(name)
    if (existing) return existing

    const { data, error } = await this.supabase
      .from('tags')
      .insert({ id: crypto.randomUUID(), name })
      .select()
      .single()
    if (error) throw error
    return data
  }

  // 添加笔记标签关联
  async addNoteTag(noteId, tagId) {
    const { error } = await this.supabase
      .from('note_tags')
      .insert({ id: crypto.randomUUID(), note_id: noteId, tag_id: tagId })
    if (error) throw error
    return true
  }
}
```

### 5. API 层使用 Repository

```javascript
// server.js
import { TagRepository } from './repositories/TagRepository.js'

const supabase = createClient(url, key)
const tagRepo = new TagRepository(supabase)

// GET /api/tags
app.get('/api/tags', async (req, res) => {
  try {
    const tags = await tagRepo.findAll({ orderBy: { column: 'name' } })
    res.json(tags.data || [])
  } catch (e) {
    console.error('Error fetching tags:', e)
    res.json([])
  }
})

// GET /api/tags/popular
app.get('/api/tags/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const tags = await tagRepo.findWithNoteCount(limit)
    res.json(tags)
  } catch (e) {
    res.json([])
  }
})

// POST /api/tags
app.post('/api/tags', authenticateToken, async (req, res) => {
  const { name } = req.body

  if (!name || name.trim().length === 0) {
    return res.json({ success: false, message: '标签名称不能为空' })
  }

  try {
    const tag = await tagRepo.create({
      id: crypto.randomUUID(),
      name: name.trim()
    })
    res.json({ success: true, tag })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// DELETE /api/admin/tags/:id
app.delete('/api/admin/tags/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 删除关联数据
    await supabase.from('note_tags').delete().eq('tag_id', req.params.id)
    await supabase.from('user_likes').delete().eq('tag_id', req.params.id)
    // 删除标签
    await tagRepo.delete(req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})
```

### 6. 架构优势

| 优势 | 说明 |
|------|------|
| **代码复用** | BaseRepository 提供通用 CRUD，子类专注业务逻辑 |
| **易于维护** | 数据访问逻辑集中管理，修改一处即可 |
| **可测试性** | Repository 可单独测试，无需启动服务器 |
| **清晰分层** | API 层只负责请求/响应，业务逻辑在 Repository |
| **减少重复** | 避免在多个 API 端点中重复相同的查询逻辑 |

### 7. pg_graphql 对比（不采用）

| 维度 | pg_graphql | 当前 Repository 模式 |
|------|------------|---------------------|
| 数据来源 | 直接查询数据库，自动生成 API | 通过 Supabase SDK 调用，封装业务逻辑 |
| Schema | 自动从数据库表结构反射生成 | 代码中手动定义 |
| 关系处理 | 自动支持嵌套查询 | 需要手动处理关联 |
| 灵活性 | 受限于 pg_graphql 的查询能力 | 完全自定义业务逻辑 |
| 适用场景 | 简单 CRUD、复杂嵌套查询 | 复杂业务逻辑、统计、权限判断 |

**结论**：对于当前项目复杂度，REST + Repository 模式已足够，且提供更好的业务逻辑封装和可维护性。

### 8. 添加新 Repository 步骤

1. **创建文件**：`repositories/NewEntityRepository.js`
2. **继承基类**：
```javascript
import { BaseRepository } from './BaseRepository.js'

export class NewEntityRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'new_entities')
  }

  // 添加自定义方法
  async findWithRelation(id) {
    // 自定义实现
  }
}
```
3. **导出**：在 `repositories/index.js` 添加导出
4. **在 server.js 中使用**：实例化并调用方法