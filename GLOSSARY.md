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