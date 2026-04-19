# 小红书美食分享平台 - 完整架构分析

> **项目版本**: 2.2.0  
> **最后更新**: 2026-04-19  
> **分析范围**: 全栈架构、技术选型、设计模式、数据流

---

## 一、项目概览

### 1.1 项目定位
- **名称**: 小红书美食分享平台 (xiaohongshu-food-share)
- **类型**: 全栈社交内容分享平台
- **核心功能**: 美食笔记发布、浏览、评论、点赞、关注、标签分类
- **目标用户**: 美食爱好者、烹饪分享者

### 1.2 核心特性
```
✅ 用户系统 (注册、登录、个人资料、关注)
✅ 内容系统 (发布、编辑、删除笔记)
✅ 社交功能 (点赞、评论、关注)
✅ 标签系统 (分类、筛选)
✅ 管理后台 (用户、内容、数据库管理)
✅ 国际化 (中英双语)
✅ 主题系统 (浅色/深色主题)
✅ 图片处理 (上传、裁剪、格式转换)
✅ 数据可视化 (图表、统计)
✅ 系统监控 (性能、日志)
```

---

## 二、技术栈详解

### 2.1 前端技术栈

```
┌─────────────────────────────────────┐
│         React 18.2.0                │  UI框架
│  + React Router 6.20.0              │  路由管理
│  + Vite 5.0.0                       │  构建工具
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│      状态与上下文管理                 │
│  • AuthContext - 用户认证            │
│  • ThemeContext - 主题管理           │
│  • I18nContext - 国际化             │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│         功能库                       │
│  • Chart.js 4.5.1 - 数据可视化       │
│  • heic2any 0.0.4 - 图片格式转换    │
│  • html2canvas 1.4.1 - 截图功能    │
└─────────────────────────────────────┘
```

**版本要求**:
```json
{
  "node": ">=18.0.0",
  "npm": ">=9.0.0",
  "React": "18.2.0",
  "ReactDOM": "18.2.0",
  "ReactRouter": "6.20.0"
}
```

### 2.2 后端技术栈

```
┌─────────────────────────────────────┐
│    Express.js 4.18.2 &              │
│    Node.js 18+                      │
│    (Web应用服务器)                  │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│    安全和认证层                      │
│  • bcrypt 6.0.0 - 密码加密          │
│  • jwt 9.0.3 - Token认证            │
│  • cors 2.8.5 - 跨域处理            │
│  • rate-limit 8.3.2 - 速率限制     │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│    数据库&ORM层                      │
│  • PostgreSQL (via Supabase)         │
│  • pg 8.20.0 - PostgreSQL驱动      │
│  • Supabase 2.103.0 - BaaS平台    │
│  • Repository模式 - 数据访问抽象    │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│    工具与中间件                      │
│  • dotenv - 环境配置                │
│  • crypto - 加密/UUID生成           │
│  • Logger - 日志系统                │
│  • Monitor - 监控系统               │
└─────────────────────────────────────┘
```

**NPM依赖总结**:
| 分类 | 包 | 版本 |
|------|-----|------|
| 框架 | express | 4.18.2 |
| 认证 | jsonwebtoken | 9.0.3 |
| 加密 | bcrypt | 6.0.0 |
| 数据库 | pg, @supabase/supabase-js | 8.20.0, 2.103.0 |
| 安全 | cors, express-rate-limit | 2.8.5, 8.3.2 |
| 工具 | dotenv, concurrently | 17.4.1, 8.2.2 |

### 2.3 数据库选型

**为什么选择 PostgreSQL + Supabase?**

| 特性 | PostgreSQL | Supabase |
|------|------------|----------|
| **成熟度** | 30年历史,企业级 | 快速增长的BaaS |
| **功能** | 复杂查询,事务,索引 | REST API,RLS,存储 |
| **成本** | 免费(自托管) | 免费层可用 |
| **SDK** | pg驱动 | 官方JS SDK |
| **认证** | 应用层 | 内置Auth系统 |
| **存储** | 数据库 | S3兼容存储 |

**PostgreSQL核心特性**:
```sql
✓ ACID事务支持
✓ UUID类型原生支持
✓ JSON/JSONB支持
✓ 强大的索引系统
✓ 角色和权限管理
✓ 触发器和存储过程
```

### 2.4 部署架构

```
┌─────────────────────────────────┐
│    Render.com (PaaS)            │
│  ├─ Node.js Web Service        │
│  ├─ PostgreSQL Database        │
│  └─ 1GB持久化存储              │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│    PM2 集群模式                  │
│  ├─ 实例数: max (全CPU核)       │
│  ├─ 自动重启                    │
│  ├─ 负载均衡                    │
│  └─ 日志轮转                    │
└─────────────────────────────────┘
```

**PM2配置** (ecosystem.config.js):
```javascript
{
  "script": "server.js",
  "instances": "max",           // 根据CPU核数自动设置
  "exec_mode": "cluster",       // 集群模式
  "env": { "NODE_ENV": "production" },
  "error_file": "./logs/err.log",
  "max_memory_restart": "500M",
  "autorestart": true,
  "max_restarts": 10,
  "rotate": {
    "enabled": true,
    "max_size": "10M",
    "max_days": 7
  }
}
```

---

## 三、前端架构详解

### 3.1 项目结构

```
src/
├── pages/                          # 页面组件
│   ├── Home.jsx                   # 首页 (笔记列表)
│   ├── Login.jsx                  # 登录页
│   ├── Register.jsx               # 注册页
│   ├── Publish.jsx                # 发布笔记页
│   ├── EditNote.jsx               # 编辑笔记页
│   ├── NoteDetail.jsx             # 笔记详情页
│   ├── Profile.jsx                # 个人资料页
│   ├── MyUploads.jsx              # 我的上传
│   ├── FollowersPage.jsx          # 关注者列表
│   ├── Feedback.jsx               # 用户反馈
│   ├── Changelog.jsx              # 更新日志
│   ├── SystemStatus.jsx           # 系统状态 (管理员)
│   ├── UserManagement.jsx         # 用户管理 (管理员)
│   ├── NoteManagement.jsx         # 笔记管理 (管理员)
│   ├── FeedbackManagement.jsx     # 反馈管理 (管理员)
│   ├── DatabaseManagement.jsx     # 数据库管理 (管理员)
│   └── TagManagement.jsx          # 标签管理 (管理员)
│
├── components/                     # 可复用组件
│   ├── Navbar.jsx                 # 导航栏
│   ├── Footer.jsx                 # 页脚
│   ├── ThemeManager.jsx           # 主题管理器
│   ├── NoteCard.jsx               # 笔记卡片
│   ├── FollowButton.jsx           # 关注按钮
│   ├── ImageCropper.jsx           # 图片裁剪
│   ├── TagInput.jsx               # 标签输入
│   ├── Loading.jsx                # 加载状态
│   ├── ErrorBoundary.jsx          # 错误边界
│   ├── ProtectedRoute.jsx         # 受保护路由 (认证)
│   └── AdminRoute.jsx             # 管理员路由 (权限)
│
├── context/                        # React Context (全局状态)
│   ├── AuthContext.jsx            # 认证上下文
│   ├── ThemeContext.jsx           # 主题上下文
│   └── I18nContext.jsx            # 国际化上下文
│
├── i18n/                          # 国际化
│   ├── i18n.js                    # i18n配置
│   ├── en-US.js                   # 英文翻译
│   └── zh-CN.js                   # 中文翻译
│
├── lib/                           # 库
│   └── database.js                # 初始化脚本
│
├── utils/                         # 工具函数
│   ├── db.js                      # 数据库API调用
│   ├── logger.js                  # 日志工具
│   ├── monitor.js                 # 监控工具
│   └── supabase.ts                # Supabase配置
│
├── styles/                        # 全局样式
│   └── theme.css                  # 主题变量
│
├── App.jsx                        # 根组件
├── main.jsx                       # 入口文件
└── App.css                        # 根样式
```

### 3.2 路由设计

```jsx
// src/App.jsx 路由配置
<Routes>
  {/* 公开路由 */}
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/note/:id" element={<NoteDetail />} />
  <Route path="/users/:id" element={<Profile />} />
  
  {/* 受保护路由 (需要登录) */}
  <Route element={<ProtectedRoute />}>
    <Route path="/publish" element={<Publish />} />
    <Route path="/note/:id/edit" element={<EditNote />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/feedback" element={<Feedback />} />
    <Route path="/my-uploads" element={<MyUploads />} />
  </Route>
  
  {/* 管理员路由 */}
  <Route element={<AdminRoute />}>
    <Route path="/admin/users" element={<UserManagement />} />
    <Route path="/admin/notes" element={<NoteManagement />} />
    <Route path="/admin/feedback" element={<FeedbackManagement />} />
    <Route path="/admin/database" element={<DatabaseManagement />} />
    <Route path="/admin/status" element={<SystemStatus />} />
    <Route path="/admin/tags" element={<TagManagement />} />
  </Route>
</Routes>
```

### 3.3 全局状态管理

**使用React Context实现的三层上下文**:

```
┌──────────────────┐
│  AuthContext     │  ← 用户身份、登录状态、权限
├──────────────────┤
│  ThemeContext    │  ← 主题(亮/暗)、CSS变量
├──────────────────┤
│  I18nContext     │  ← 语言(中/英)、翻译函数
└──────────────────┘
        ↓
   用户界面响应式更新
```

**AuthContext功能**:
```javascript
export interface AuthContext {
  user: User | null                 // 当前登录用户
  login(username, password)          // 登录
  register(username, password, nick) // 注册
  logout()                           // 登出
  refreshUser()                      // 刷新用户信息
  users: User[]                      // 所有用户列表
}
```

**数据持久化**:
```javascript
// localStorage: 记住我功能
localStorage.setItem('xiaohongshu_current_user', JSON.stringify(user))

// sessionStorage: 会话期间有效
sessionStorage.setItem('xiaohongshu_current_user', JSON.stringify(user))

// 主题偏好
localStorage.setItem('theme', 'dark')

// 语言偏好
localStorage.setItem('language', 'zh-CN')
```

### 3.4 API调用层 (src/utils/db.js)

**统一的API调用接口**:

```javascript
const API_BASE = '/api'

// 自动处理token
export function getHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

// 用户相关
getAllUsers()           // 获取所有用户
createUser(user)        // 创建用户
findUserById(id)        // 查找用户
updateUser(id, data)    // 更新用户
async function getUserById(id)
async function getUserTags(userId)  // 获取用户标签
async function getFollowCounts(userId) // 获取关注数

// 笔记相关
getAllNotes(page, limit)           // 分页获取笔记
createNote(data)                   // 创建笔记
updateNote(data)                   // 更新笔记
deleteNoteById(id)                 // 删除笔记
findNoteById(id)                   // 获取笔记详情
getNoteTags(noteId)                // 获取笔记标签
likeNote(noteId)                   // 点赞
getNoteLikeStatus(noteId)          // 获取点赞状态

// 评论相关
getCommentsByNoteId(noteId)        // 获取评论
createComment(data)                // 创建评论
deleteCommentById(id)              // 删除评论

// 关注相关
follow(targetId)                   // 关注用户
unfollow(targetId)                 // 取消关注
getFollowStatus(targetId)          // 获取关注状态
```

### 3.5 构建配置 (Vite)

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3004',    // 代理到后端
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

**开发流程**:
```bash
npm run dev:full        # 同时启动前端(3000) + 后端(3004)
                        # 前端自动代理/api到后端

npm run build           # 生产构建 → dist/
npm run preview         # 本地预览生产构建
```

---

## 四、后端架构详解

### 4.1 服务器启动流程

```javascript
// server.js 启动顺序

// 1️⃣ 环境配置
dotenv.config()                    // 加载 .env 文件
const JWT_SECRET = ...             // JWT密钥生成
const supabase = createClient()    // Supabase客户端

// 2️⃣ Repository层初始化
const tagRepo = new TagRepository(supabase)
const noteRepo = new NoteRepository(supabase)
const userRepo = new UserRepository(supabase)
const commentRepo = new CommentRepository(supabase)
const feedbackRepo = new FeedbackRepository(supabase)

// 3️⃣ 中间件栈配置
app.use(cors({...}))               // CORS
app.use(generalLimiter)            // 通用速率限制
app.use(express.json())            // JSON解析
app.use(validateRequest)           // 请求验证
app.use(logMiddleware)             // 请求日志

// 4️⃣ 测试连接
testSupabaseConnection()           // 检测数据库连接

// 5️⃣ 创建索引
createIndexes()                    // 数据库优化

// 6️⃣ 启动监听
const PORT = process.env.PORT || 3004
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### 4.2 中间件架构

```
HTTP请求
  ↓
┌─────────────────────────────────┐
│ CORSMiddleware                  │  跨域处理
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ RateLimitMiddleware             │  15分钟/500请求
│ AuthLimitMiddleware             │  15分钟/50次登录
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ BodyParserMiddleware            │  解析JSON(10MB限制)
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ ValidationMiddleware            │  方法/路径/请求体验证
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ LoggingMiddleware               │  记录请求/响应
│ MonitoringMiddleware            │  监控指标(CPU/内存)
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ AuthenticationMiddleware        │  [可选] JWT验证
│ AuthorizationMiddleware         │  [可选] 权限检查
└─────────────────────────────────┘
  ↓
路由处理 (API端点)
```

### 4.3 认证系统流程

```
用户新建账户
  ↓
┌─────────────────────────────────┐
│ POST /api/register              │
│ { username, password, nickname }│
└─────────────────────────────────┘
  ↓
1️⃣ 验证用户名唯一性
2️⃣ 密码加密 (bcrypt)
3️⃣ 生成UUID
4️⃣ 创建用户记录
5️⃣ 自动登录
  ↓
POST /api/login
{ username, password }
  ↓
1️⃣ 查询用户
2️⃣ 密码对比 (bcrypt.compare)
3️⃣ 生成JWT Token
   • Header: {alg, typ}
   • Payload: {userId, username, iat, exp}
   • Signature: HMAC-SHA256
4️⃣ 返回用户信息 + Token
  ↓
客户端存储Token
  ↓
后续请求添加
Authorization: Bearer <token>
  ↓
服务器验证Token
  ↓
authenticateToken中间件
  ↓
解出userId
  ↓
允许访问受保护资源
```

**认证代码流程**:

```javascript
// 用户注册
app.post('/api/register', async (req, res) => {
  const { username, password, nickname } = req.body
  
  // 1. 检查用户是否已存在
  const existing = await query('SELECT id FROM users WHERE username = $1', [username])
  if (existing.rows.length > 0) {
    return res.json({ success: false, message: '用户已存在' })
  }
  
  // 2. 密码加密
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // 3. 生成UUID
  const id = crypto.randomUUID()
  
  // 4. 插入用户记录
  await query(
    `INSERT INTO users (id, username, password, nickname, avatar, role, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, username, hashedPassword, nickname, `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, 'user', 'active', new Date().toISOString()]
  )
  
  res.json({ success: true })
})

// 用户登录
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  
  // 1. 查询用户
  const result = await query('SELECT * FROM users WHERE username = $1', [username])
  const user = result.rows[0]
  
  if (!user) {
    return res.json({ success: false, message: '用户不存在' })
  }
  
  // 2. 密码验证
  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword) {
    return res.json({ success: false, message: '密码错误' })
  }
  
  // 3. 生成JWT Token
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role
    },
    token: token
  })
})

// JWT验证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.json({ success: false, message: '需要认证' })
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.json({ success: false, message: '无效的token' })
    }
    req.user = user              // 将用户信息attach到req
    next()
  })
}
```

### 4.4 Repository模式

**目的**: 数据访问层抽象,解耦业务逻辑和数据库操作

```javascript
// 基类: BaseRepository.js
export class BaseRepository {
  constructor(supabase, tableName) {
    this.supabase = supabase
    this.tableName = tableName
  }
  
  // CRUD操作集合
  async findAll(options = {})           // 查询所有
  async findById(id)                    // 按ID查询
  async findWhere(column, value)        // 条件查询
  async create(record)                  // 创建记录
  async update(id, record)              // 更新记录
  async delete(id)                      // 删除记录
}

// 具体实现: NoteRepository.js
export class NoteRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'notes')
  }
  
  // 扩展特定业务方法
  async findByAuthorId(authorId, options = {})
  async findWithTags(noteId)
  async incrementLikes(noteId)
  async decrementLikes(noteId)
}

// UserRepository, CommentRepository, TagRepository, FeedbackRepository 类似
```

**使用示例**:

```javascript
// server.js
const noteRepo = new NoteRepository(supabase)

// 获取笔记详情(含标签)
const note = await noteRepo.findWithTags(noteId)

// 查询用户笔记
const userNotes = await noteRepo.findByAuthorId(userId, {
  orderBy: { column: 'created_at', ascending: false },
  limit: 10
})

// 点赞
await noteRepo.incrementLikes(noteId)
```

### 4.5 API端点设计

**RESTful API架构**:

| 资源 | 方法 | 端点 | 功能 |
|------|------|------|------|
| **认证** | POST | /api/register | 用户注册 |
| | POST | /api/login | 用户登录 |
| **用户** | GET | /api/users | 列表 |
| | GET | /api/user/:id | 详情 |
| | POST | /api/users | 创建(管理员) |
| | PUT | /api/users/:id | 更新 |
| | DELETE | /api/users/:id | 删除(管理员) |
| | POST | /api/users/:id/follow | 关注 |
| | GET | /api/users/:id/followers | 粉丝 |
| | GET | /api/users/:id/following | 关注列表 |
| **笔记** | GET | /api/notes | 列表(分页) |
| | GET | /api/notes/:id | 详情 |
| | POST | /api/notes | 创建 |
| | PUT | /api/notes/:id | 编辑 |
| | DELETE | /api/notes/:id | 删除 |
| | POST | /api/notes/:id/like | 点赞 |
| | GET | /api/notes/:id/tags | 标签 |
| **评论** | GET | /api/comments/:noteId | 列表 |
| | POST | /api/comments | 创建 |
| | DELETE | /api/comments/:id | 删除 |
| **标签** | GET | /api/tags | 列表 |
| | GET | /api/tags/popular | 热门 |
| | GET | /api/tags/:id/notes | 笔记 |
| **管理** | POST | /api/upload | 图片上传 |
| | GET | /api/db/info | 数据库信息 |
| | GET | /api/db/tables | 表列表 |
| | GET | /api/db/backup | 数据库备份(管理员) |

**请求/响应示例**:

```javascript
// 发布笔记
POST /api/notes
{
  "title": "红烧肉做法",
  "content": "...",
  "ingredients": ["五花肉", "冰糖", "酱油"],
  "steps": ["1. 准备材料", "2. 焯水", "3. 炖煮"],
  "images": ["url1", "url2"],
  "tags": ["美食", "红烧肉"]
}
↓
200 OK
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-04-19T10:30:00Z"
}

// 获取笔记列表
GET /api/notes?page=1&limit=10&tag=美食
↓
200 OK
{
  "notes": [
    {
      "id": "...",
      "title": "红烧肉",
      "author": "张三",
      "likes": 42,
      "comments": 5,
      "created_at": "..."
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10
}
```

---

## 五、数据库架构

### 5.1 数据库模式

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  background TEXT,          -- 个人资料背景
  role TEXT DEFAULT 'user',  -- 'user' 或 'admin'
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
)

-- 笔记表
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  ingredients TEXT,         -- JSON格式: ["材料1", "材料2"]
  steps TEXT,               -- JSON格式: ["步骤1", "步骤2"]
  images TEXT,              -- JSON格式: ["url1", "url2"]
  author_id UUID NOT NULL REFERENCES users(id),
  author_name TEXT,
  likes INTEGER DEFAULT 0,
  liked INTEGER DEFAULT 0,  -- 当前用户是否点赞
  created_at TIMESTAMP DEFAULT NOW()
)

-- 评论表
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name TEXT,
  content TEXT NOT NULL,
  reply_to_id UUID,         -- 回复的评论ID
  reply_to_user_name TEXT,
  reply_to_content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- 标签表
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)

-- 笔记-标签关联表(多对多)
CREATE TABLE note_tags (
  id UUID PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(note_id, tag_id)
)

-- 关注关系表
CREATE TABLE follows (
  id UUID PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
)

-- 用户反馈表
CREATE TABLE feedback (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reply TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- 文件上传记录表
CREATE TABLE user_uploads (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  url TEXT NOT NULL,
  folder TEXT,  -- 'avatars', 'backgrounds', 'files'
  filename TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### 5.2 数据库索引

```sql
-- 用户查询加速
CREATE INDEX idx_users_username ON users(username)
CREATE INDEX idx_users_created_at ON users(created_at)

-- 笔记查询加速
CREATE INDEX idx_notes_author_id ON notes(author_id)
CREATE INDEX idx_notes_created_at ON notes(created_at)
CREATE INDEX idx_notes_likes ON notes(likes)

-- 评论查询加速
CREATE INDEX idx_comments_note_id ON comments(note_id)
CREATE INDEX idx_comments_user_id ON comments(user_id)
CREATE INDEX idx_comments_created_at ON comments(created_at)

-- 关注关系加速
CREATE INDEX idx_follows_follower_id ON follows(follower_id)
CREATE INDEX idx_follows_following_id ON follows(following_id)

-- 笔记标签查询加速
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id)
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id)

-- 反馈查询加速
CREATE INDEX idx_feedback_user_id ON feedback(user_id)
```

### 5.3 ER图

```
    ┌─────────┐
    │  users  │
    │  (用户)  │
    └────┬────┘
         │
    ┌────┴─────────────────────┬─────────────┐
    │                          │             │
    ▼                          ▼             ▼
┌────────┐              ┌──────────┐    ┌────────────┐
│ notes  │              │ follows  │    │  feedback  │
│(笔记)  │              │(关注)    │    │  (反馈)    │
└────┬───┘              └──────────┘    └────────────┘
     │
     ├─────────────────┬──────────────┐
     │                 │              │
     ▼                 ▼              ▼
┌─────────┐       ┌──────────┐  ┌──────────────┐
│comments │       │ note_tags│  │ user_uploads │
│ (评论)  │       │(多对多)  │  │ (文件上传)   │
└─────────┘       └──────┬───┘  └──────────────┘
                         │
                         ▼
                    ┌─────────┐
                    │  tags   │
                    │ (标签)  │
                    └─────────┘
```

### 5.4 数据流示例(发布笔记)

```
用户点击发布
  ↓
前端: /pages/Publish.jsx
  │ 收集: 标题、内容、食材、步骤、图片
  │ 验证: 标题不空、内容不空
  │
  └→ createNote(noteData) 
      ↓
API请求: POST /api/notes
  (包含token, 图片以Base64形式)
  ↓
后端: server.js
  │ authenticateToken() 验证登录
  │ validateRequest() 验证请求
  │
  └→ noteRepo.create({...})
      ↓
Supabase SQL
  INSERT INTO notes(id, title, content, ingredients, ...)
      VALUES($1, $2, $3, $4, ...)
  ↓
  获得insert成功反馈
  ↓
  noteTagRepo 处理标签关系:
    INSERT INTO note_tags(note_id, tag_id)
      SELECT $1, id FROM tags WHERE name = ANY($2)
  ↓
Response 200 OK
  {
    "success": true,
    "note": { "id": "...", "created_at": "..." }
  }
  ↓
前端: 页面跳转到笔记详情
  或 显示发布成功提示
```

---

## 六、安全性架构

### 6.1 密码安全

```javascript
// bcrypt 密码加密流程
const plainPassword = "user_password_123"

// 生成salt, 轮数=10
const salt = await bcrypt.genSalt(10)

// 加密
const hashedPassword = await bcrypt.hash(plainPassword, salt)
// 结果: $2b$10$NORmDHqg0p1UJyqXqKcxNOhB5cYzPH5Aslvk7Nd6ytA0I3y5qDRd6

// 存储到数据库

// 登录验证
const isValid = await bcrypt.compare(plainPassword, hashedPassword)
// 返回: true/false
```

### 6.2 JWT Token安全

```javascript
// Token生成
const token = jwt.sign(
  {
    userId: user.id,
    username: user.username,
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 7*24*60*60  // 7天过期
  },
  JWT_SECRET,
  { algorithm: 'HS256' }
)

// Token结构: header.payload.signature
// header: { alg: 'HS256', typ: 'JWT' }
// payload: { userId, username, iat, exp }
// signature: HMAC-SHA256(header+payload, SECRET)

// 验证
jwt.verify(token, JWT_SECRET, (err, decoded) => {
  if (err) {
    // 过期 | 签名不符 | 格式错误
  } else {
    // token有效, 返回decode的payload
    req.user = decoded
  }
})
```

### 6.3 API安全

```javascript
// CORS - 防止跨域攻击
app.use(cors({
  origin: ['https://xiaohongshu-food-share.onrender.com'],
  credentials: true
}))

// 速率限制 - 防止暴力攻击
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15分钟
  max: 500,                   // 最多500个请求
  message: '请求过于频繁'
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15分钟
  max: 50,                    // 最多50次登录尝试
  message: '尝试过于频繁'
})

// 请求体大小限制 - 防止DoS
app.use(express.json({ limit: '10mb' }))

// 输入验证 - 防止注入攻击
function validateRequest(req, res, next) {
  // 检查请求方法
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.json({ success: false, message: '无效的请求方法' })
  }
  
  // 检查API路径白名单
  const validPaths = ['/api/notes', '/api/users', ...]
  if (!validPaths.includes(req.path)) {
    return res.json({ success: false, message: '无效的请求路径' })
  }
  
  next()
}

// SQL参数化 - 防止SQL注入
// ✗ 不安全
const query = `SELECT * FROM users WHERE username = '${username}'`

// ✓ 安全
const { rows } = await client.query(
  'SELECT * FROM users WHERE username = $1',
  [username]
)
```

### 6.4 权限控制

```javascript
// 2-level权限检查

// 1️⃣ 认证检查
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]
  if (!token) {
    return res.json({ success: false, message: '需要登录' })
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.json({ success: false, message: 'Token无效' })
    req.user = user
    next()
  })
}

// 2️⃣ 授权检查(管理员)
async function requireAdmin(req, res, next) {
  const { rows } = await query(
    'SELECT role FROM users WHERE id = $1',
    [req.user.userId]
  )
  
  if (rows[0]?.role !== 'admin') {
    return res.json({ success: false, message: '需要管理员权限' })
  }
  
  next()
}

// 使用示例
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  // 只有登录且是管理员的用户可以访问
})
```

---

## 七、监控与日志系统

### 7.1 日志系统 (src/utils/logger.js)

```javascript
// 四个日志级别
logger.info(message, data)     // 信息类日志
logger.warn(message, data)     // 警告日志
logger.error(message, data)    // 错误日志
logger.debug(message, data)    // 调试日志

// 记录内容
logger.info('API Request', {
  method: 'POST',
  path: '/api/notes',
  query: {},
  body: { title: '...' }
})

// 输出格式
[2026-04-19 10:30:45.123] INFO: API Request
{
  "method": "POST",
  "path": "/api/notes",
  "timestamp": "2026-04-19T10:30:45Z"
}
```

### 7.2 监控系统 (src/utils/monitor.js)

```javascript
// 硬件监控指标
monitor.getCPUUsage()          // CPU使用率
monitor.getMemoryUsage()       // 内存使用信息
monitor.getLoadAverage()       // 平均负载

// 应用监控指标
monitor.incrementRequestCount() // API请求计数
monitor.incrementErrorCount()   // 错误计数
monitor.recordAccessInfo(method, path, status) // 访问记录

// 输出示例
{
  "cpu_usage": 45.3,
  "memory": {
    "used": 128,  // MB
    "total": 512,
    "percentage": 25
  },
  "requests": {
    "total": 12456,
    "errors": 23,
    "avg_response_time": "45ms"
  }
}
```

### 7.3 性能监控中间件

```javascript
app.use((req, res, next) => {
  const start = Date.now()
  
  monitor.incrementRequestCount()
  
  logger.info('API Request', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body
  })
  
  const originalSend = res.send
  res.send = function(body) {
    const duration = Date.now() - start
    
    if (res.statusCode >= 400) {
      monitor.incrementErrorCount()
    }
    
    monitor.recordAccessInfo(req.method, req.path, res.statusCode)
    
    logger.info('API Response', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      body: body.length > 1000 ? 'Response body too large' : body
    })
    
    return originalSend.call(this, body)
  }
  
  next()
})
```

---

## 八、部署流程

### 8.1 Render部署配置

```yaml
# render.yaml
services:
  - type: web
    name: xiaohongshu-food-share
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3004
      - key: DATABASE_URL
        value: postgresql://user:pass@host:port/db
      - key: JWT_SECRET
        sync: false  # 从Render Console设置
      - key: VITE_SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: FRONTEND_URL
        value: https://xiaohongshu-food-share.onrender.com
    disk:
      name: xiaohongshu-data
      mountPath: /app/data
      sizeGB: 1
    plan: free
```

### 8.2 PM2生产部署

```bash
# 本地启动
pm2 start ecosystem.config.js

# 查看日志
pm2 logs xiaohongshu-server

# 监控
pm2 monit

# 重启/停止
pm2 restart xiaohongshu-server
pm2 stop xiaohongshu-server
```

### 8.3 前端构建与部署

```bash
# 开发
npm run dev         # 启动Vite dev server (port 3000)

# 生产构建
npm run build       # 打包到 dist/
                    # 输出优化的JS、CSS、HTML

# 预览生产构建
npm run preview

# 完整开发环境
npm run dev:full    # concurrently 同时运行:
                    # - npm run server (port 3004)
                    # - npm run dev (port 3000)
                    # 自动代理 /api 到 3004
```

**构建输出优化**:
```
dist/
├── index.html                        # 入口HTML
├── assets/
│   ├── index-abc123.js              # JS bundle (tree-shaken, minified)
│   ├── index-def456.css             # CSS bundle (minified)
│   ├── NoteCard-ghi789.js          # 代码分割chunk
│   └── ...image assets
└── ...

// 优化特性
✓ Code splitting - 按需加载
✓ Tree-shaking - 移除未使用代码
✓ Minification - 代码压缩
✓ Source maps - 生产环境调试
✓ Hash文件名 - 缓存破坏
```

---

## 九、开发工作流

### 9.1 开发工作流程

```bash
# 1. 环境准备
npm install                 # 安装依赖

# 2. 环境配置
cp .env.example .env
# 编辑 .env:
# NODE_ENV=development
# PORT=3004
# JWT_SECRET=your-secret-key
# DATABASE_URL=postgresql://...
# VITE_SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...

# 3. 启动开发服务器
npm run dev:full            # 前端(3000) + 后端(3004)

# 或分别启动
npm run dev                 # 前端服务器
npm run server              # 后端服务器

# 4. 开发
# 编辑源代码 → HMR自动刷新

# 5. 构建
npm run build               # 生产构建

# 6. 预发布验证
npm run preview             # 本地预览生产版本

# 7. 停止服务
Ctrl+C
```

### 9.2 GitHub工作流

```bash
# 本地开发
git checkout -b feature/new-feature
# 编辑代码...
git add .
git commit -m "feat: add new feature"

# 推送和PR
git push origin feature/new-feature
# 在GitHub创建Pull Request

# 合并到main
git checkout main
git pull
git merge feature/new-feature
git push

# 自动部署到Render
# (配置webhook)
```

---

## 十、项目特色技术亮点

### 10.1 🎯 架构设计

| 特性 | 实现 | 优势 |
|------|------|------|
| 分层架构 | 页面/组件/上下文/工具 | 关注点分离,易于维护 |
| Repository模式 | CRUD抽象 | 数据访问灵活,可切换ORM |
| 中间件栈 | 多层验证/限流/日志 | 系统稳定,可观测性强 |
| Context API | 全局状态 | 避免prop drilling |
| 错误边界 | ErrorBoundary组件 | 优雅降级 |

### 10.2 🔐 安全架构

| 层级 | 措施 |
|------|------|
| 传输层 | HTTPS(生产环境) |
| 认证层 | JWT Token(7天过期) |
| 密码层 | bcrypt加密(salt=10) |
| 授权层 | 2级权限(auth+admin) |
| 输入层 | 参数化查询,白名单验证 |
| 速率限制 | 15分钟/500请求 |

### 10.3 🚀 性能优化

| 优化 | 实现 |
|------|------|
| 代码分割 | Vite tree-shaking |
| 数据库索引 | 8个复合索引 |
| 缓存 | 30秒标签缓存 |
| 分页 | 10条/页,最多100条 |
| 异步操作 | async/await编程 |
| 集群部署 | PM2多进程 |

### 10.4 🌍 国际化与主题

| 功能 | 实现 |
|------|------|
| 多语言 | React Context + i18n |
| 主题切换 | CSS变量 + Theme Context |
| 持久化 | localStorage存储 |
| 响应式 | 媒体查询 |

---

## 十一、核心文件速查表

| 文件 | 功能 | 关键内容 |
|------|------|---------|
| **前端** |
| src/App.jsx | 根组件 | 路由配置,全局提供者 |
| src/context/AuthContext.jsx | 认证管理 | 登录/注册/登出逻辑 |
| src/utils/db.js | API调用 | 统一API接口,token管理 |
| src/pages/Home.jsx | 首页 | 笔记列表,分页,标签筛选 |
| src/pages/Publish.jsx | 发布 | 表单验证,图片上传 |
| **后端** |
| server.js | 主服务器 | 中间件栈,路由定义 |
| repositories/*.js | 数据访问 | CRUD操作,业务逻辑 |
| ecosystem.config.js | PM2配置 | 集群部署配置 |
| render.yaml | 部署配置 | Render平台配置 |
| **数据库** |
| GLOSSARY.md | 数据库文档 | 表结构,字段描述 |
| unify-id-types.js | 数据迁移 | UUID统一脚本 |

---

## 十二、常见问题与最佳实践

### Q1: 为什么前端使用Context而不是Redux?

**A**: 项目规模中等,全局状态只有三个(Auth/Theme/I18n),足以用Context替代Redux,减少依赖。

### Q2: 为什么使用Supabase而不是自建PostgreSQL?

**A**: 
- 降低运维成本
- 内置REST API
- 免费存储(S3)
- 内置RLS权限系统
- 可轻松扩展

### Q3: PM2集群模式vs单进程?

**A**: 
- 集群: 充分利用多核CPU,自动负载均衡,一个进程崩溃其他继续
- 单进程: 简单但CPU利用率低,单点故障

### Q4: JWT过期时间为何设为7天?

**A**: 安全性与用户体验平衡
- 7天: 足够长,用户不频繁登出
- 可添加刷新令牌(RefreshToken)实现无感续期

---

## 十三、技术栈对比与选择理由

### 前端技术选择

| 选择 | 为什么 | 替代方案 |
|------|--------|---------|
| React 18 | 成熟,生态完整 | Vue/Svelte |
| React Router 6 | 支持嵌套路由 | Next.js/Remix |
| Vite | 快速构建,HMR | Webpack/Parcel |
| Context API | 简单轻量 | Redux/Zustand |

### 后端技术选择

| 选择 | 为什么 | 替代方案 |
|------|--------|---------|
| Express.js | 最流行的框架 | Koa/Fastify/NestJS |
| PostgreSQL | 功能强大 | MySQL/MongoDB/SQLite |
| Supabase | 降低成本 | Firebase/AWS RDS |
| JWT | 无状态认证 | Session-based/OAuth |

---

**总结**: 这个项目采用现代全栈架构,选择成熟稳定的技术栈,具有良好的代码组织、安全性和扩展性。特别是Repository模式和完整的中间件体系,值得参考学习。

---

**文档版本**: 1.0  
**最后更新**: 2026-04-19  
**作者**: GitHub Copilot
