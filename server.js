import express from 'express'
import cors from 'cors'
import initSqlJs from 'sql.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import crypto from 'crypto'
import logger from './src/utils/logger.js'
import monitor from './src/utils/monitor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// JWT密钥安全配置
const generateSecretKey = () => {
  return crypto.randomBytes(64).toString('hex')
}

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('警告: 生产环境未设置JWT_SECRET环境变量，使用临时密钥')
  }
  return generateSecretKey()
})()

const app = express()
const PORT = process.env.PORT || 3001

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
    req.user = user
    next()
  })
}

// 管理员权限验证中间件
function requireAdmin(req, res, next) {
  const userId = req.user.userId
  
  const stmt = db.prepare('SELECT role FROM users WHERE id = ?')
  stmt.bind([userId])
  const result = stmt.step()
  const user = result ? stmt.getAsObject() : null
  stmt.free()
  
  if (!user || user.role !== 'admin') {
    return res.json({ success: false, message: '需要管理员权限' })
  }
  
  next()
}

// API请求验证中间件
function validateRequest(req, res, next) {
  // 验证请求方法
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE']
  if (!validMethods.includes(req.method)) {
    return res.json({ success: false, message: '无效的请求方法' })
  }
  
  // 验证请求路径
  const validPaths = [
    '/users', '/users/:username', '/users/:id', '/users/:id/password', '/users/:id/status', '/users/:id/role', '/login', '/register',
    '/notes', '/notes/:id',
    '/comments', '/comments/:noteId', '/comments/:id',
    '/feedback', '/feedback/:id',
    '/status'
  ]
  
  let pathValid = false
  for (const path of validPaths) {
    const regex = new RegExp('^' + path.replace(/:\w+/g, '[^/]+') + '$')
    if (regex.test(req.path)) {
      pathValid = true
      break
    }
  }
  
  if (!pathValid) {
    return res.json({ success: false, message: '无效的请求路径' })
  }
  
  // 验证请求体（对于POST和PUT请求）
  if (['POST', 'PUT'].includes(req.method)) {
    if (!req.body || typeof req.body !== 'object') {
      return res.json({ success: false, message: '无效的请求体' })
    }
  }
  
  next()
}

// 优化CORS配置，限制为特定域名
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL || '*']
  : ['http://localhost:3000', 'http://localhost:3002']

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// 生产环境下提供静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')))
}

// 日志记录中间件
app.use((req, res, next) => {
  const start = Date.now()
  
  // 增加请求计数
  monitor.incrementRequestCount()
  
  // 记录请求开始
  logger.info('API Request', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body
  })
  
  // 监听响应完成事件
  const originalSend = res.send
  res.send = function(body) {
    const duration = Date.now() - start
    
    // 如果是错误状态码，增加错误计数
    if (res.statusCode >= 400) {
      monitor.incrementErrorCount()
    }
    
    // 记录访问信息
    monitor.recordAccessInfo(req.method, req.path, res.statusCode)
    
    // 记录响应完成
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

// 应用API请求验证中间件
app.use('/api', validateRequest)

// 全局错误处理中间件
app.use((err, req, res, next) => {
  logger.error('Server Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path
  })
  res.status(500).json({ success: false, message: '服务器内部错误' })
})

let db = null
// 支持环境变量配置数据库路径，解决render.com文件系统临时性问题
const DB_PATH = process.env.DB_PATH || join(dirname(fileURLToPath(import.meta.url)), 'xiaohongshu.db')

// 初始化数据库
async function initDb() {
  const SQL = await initSqlJs()

  // 确保数据库目录存在
  const dbDir = dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // 尝试加载已存在的数据库
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `)

  // 检查并添加字段（用于已存在的数据库）
  try {
    const columns = db.exec("PRAGMA table_info(users)")
    const columnNames = columns[0].values.map(col => col[1])
    
    if (!columnNames.includes('role')) {
      db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`)
    }
    
    if (!columnNames.includes('status')) {
      db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`)
    }
    
    if (!columnNames.includes('bio')) {
      db.run(`ALTER TABLE users ADD COLUMN bio TEXT`)
    }
  } catch (e) {
    console.log('Error adding columns:', e.message)
  }

  // 设置lujh用户为管理员
  try {
    const stmt = db.prepare('SELECT id FROM users WHERE username = ?')
    stmt.bind(['lujh'])
    const result = stmt.step()
    if (result) {
      db.run(`UPDATE users SET role = 'admin' WHERE username = 'lujh'`)
      saveDb()
      console.log('已将lujh用户设置为管理员')
    } else {
      // 如果lujh用户不存在，创建它
      const adminPassword = await bcrypt.hash('123456', 10)
      db.run(`INSERT INTO users (id, username, password, nickname, avatar, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['admin', 'lujh', adminPassword, '管理员', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lujh', 'admin', 'active', new Date().toISOString()])
      saveDb()
      console.log('已创建lujh管理员用户')
    }
    stmt.free()
  } catch (e) {
    console.log('Error setting admin:', e.message)
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      ingredients TEXT,
      steps TEXT,
      images TEXT,
      author_id TEXT NOT NULL,
      author_name TEXT,
      likes INTEGER DEFAULT 0,
      liked INTEGER DEFAULT 0,
      created_at TEXT,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      content TEXT,
      reply_to_id TEXT,
      reply_to_user_name TEXT,
      reply_to_content TEXT,
      created_at TEXT,
      FOREIGN KEY (note_id) REFERENCES notes(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // 检查并添加reply_to_id等字段（用于已存在的数据库）
  try {
    const columns = db.exec("PRAGMA table_info(comments)")
    if (columns.length > 0) {
      const columnNames = columns[0].values.map(col => col[1])
      
      if (!columnNames.includes('reply_to_id')) {
        db.run(`ALTER TABLE comments ADD COLUMN reply_to_id TEXT`)
      }
      
      if (!columnNames.includes('reply_to_user_name')) {
        db.run(`ALTER TABLE comments ADD COLUMN reply_to_user_name TEXT`)
      }
      
      if (!columnNames.includes('reply_to_content')) {
        db.run(`ALTER TABLE comments ADD COLUMN reply_to_content TEXT`)
      }
    }
  } catch (e) {
    console.log('Error adding reply columns:', e.message)
  }

  // 初始化意见反馈表
  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      contact TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // 初始化样板数据
  const userCount = db.exec('SELECT COUNT(*) FROM users')[0]?.values[0][0] || 0
  if (userCount === 0) {
    // 添加示例用户
    const hashedPassword = await bcrypt.hash('123456', 10)
    db.run(`INSERT INTO users (id, username, password, nickname, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ['demo', 'demo', hashedPassword, '美食达人', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo', '2024-01-01T00:00:00Z'])
    
    // 添加管理员用户
    const adminPassword = await bcrypt.hash('123456', 10)
    db.run(`INSERT INTO users (id, username, password, nickname, avatar, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['admin', 'lujh', adminPassword, '管理员', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lujh', 'admin', '2024-01-01T00:00:00Z'])

    // 添加示例笔记
    const notes = [
      ['1', '超级美味的番茄炒蛋', '这道番茄炒蛋是家常必备，简单易学又好吃！', '番茄2个、鸡蛋3个、盐适量、糖少许、葱花适量', '1. 番茄切块，鸡蛋打散\n2. 炒鸡蛋至半熟盛出\n3. 炒番茄出汁\n4. 加入鸡蛋一起翻炒\n5. 出锅前撒上葱花', '["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"]', 'demo', '美食达人', 128, 0, '2024-01-15T10:30:00Z'],
      ['2', '香喷喷的红烧肉', '肥而不腻入口即化的红烧肉，太香了！', '五花肉500g、生抽2勺、老抽1勺、糖2勺、料酒1勺', '1. 五花肉切块焯水\n2. 炒糖色\n3. 加入肉块翻炒\n4. 加调料和水慢炖1小时', '["https://images.unsplash.com/photo-1623689046286-d4ca3f6b2f52?w=400"]', 'demo', '美食达人', 256, 0, '2024-01-14T15:20:00Z'],
      ['3', '清爽凉拌黄瓜', '夏天必吃的清爽小菜，简单又开胃', '黄瓜2根、蒜末、醋、酱油、香油、辣椒油', '1. 黄瓜拍碎切块\n2. 加入蒜末和调料\n3. 拌匀即可', '["https://images.unsplash.com/photo-1580442151529-343f2f6e0e27?w=400"]', 'demo', '美食达人', 89, 0, '2024-01-13T09:00:00Z'],
      ['4', '美味披萨在家做', '自己动手做披萨，成就感满满！', '面粉200g、酵母3g、番茄酱、芝士、各种喜欢的配菜', '1. 和面发酵\n2. 擀成饼底\n3. 抹上番茄酱\n4. 铺上芝士和配菜\n5. 烤箱200度烤15分钟', '["https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400"]', 'demo', '美食达人', 312, 0, '2024-01-11T12:00:00Z']
    ]

    notes.forEach(note => {
      db.run(`INSERT INTO notes (id, title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, note)
    })

    saveDb()
  }
  
  // 检查并更新demo用户的密码，如果是明文则加密
  try {
    const stmt = db.prepare('SELECT password FROM users WHERE username = ?')
    stmt.bind(['demo'])
    const result = stmt.step()
    if (result) {
      const user = stmt.getAsObject()
      // 检查密码是否为明文（长度小于60，bcrypt哈希值长度为60）
      if (user.password && user.password.length < 60) {
        const hashedPassword = await bcrypt.hash('123456', 10)
        db.run(`UPDATE users SET password = ? WHERE username = 'demo'`, [hashedPassword])
        saveDb()
        console.log('已更新demo用户的密码为加密版本')
      }
    }
    stmt.free()
  } catch (e) {
    console.log('Error checking demo user password:', e.message)
  }

  console.log('Database initialized')
}

// 保存数据库到文件
function saveDb() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }
}

// 用户API
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const result = db.exec('SELECT * FROM users')
  if (result.length === 0) return res.json([])
  const users = result[0].values.map(row => ({
    id: row[0], 
    username: row[1], 
    nickname: row[3], 
    avatar: row[4], 
    bio: row[5],
    role: row[6] || 'user',
    status: row[7] || 'active',
    created_at: row[8] || row[5]
  }))
  res.json(users)
})

app.post('/api/users', async (req, res) => {
  const { id, username, password, nickname, avatar, created_at } = req.body
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const role = 'user'
    const status = 'active'
    db.run(`INSERT INTO users (id, username, password, nickname, avatar, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, username, hashedPassword, nickname, avatar, role, status, created_at])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/users/:id', authenticateToken, (req, res) => {
  const { nickname, avatar, bio } = req.body
  
  // 输入验证
  if (!nickname || nickname.trim().length === 0) {
    return res.json({ success: false, message: '昵称不能为空' })
  }
  if (nickname.length > 30) {
    return res.json({ success: false, message: '昵称长度不能超过30个字符' })
  }
  if (bio && bio.length > 200) {
    return res.json({ success: false, message: '个性签名长度不能超过200个字符' })
  }
  
  try {
    db.run(`UPDATE users SET nickname = ?, avatar = ?, bio = ? WHERE id = ?`,
      [nickname.trim(), avatar, bio ? bio.trim() : '', req.params.id])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 修改密码API
app.put('/api/users/:id/password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body
  try {
    // 验证旧密码
    const stmt = db.prepare('SELECT password FROM users WHERE id = ?')
    stmt.bind([req.params.id])
    const result = stmt.step()
    const user = result ? stmt.getAsObject() : null
    stmt.free()
    
    if (!user) {
      return res.json({ success: false, message: '用户不存在' })
    }
    
    const passwordMatch = await bcrypt.compare(oldPassword, user.password)
    if (!passwordMatch) {
      return res.json({ success: false, message: '旧密码错误' })
    }
    
    // 验证新密码长度
    if (newPassword.length < 6) {
      return res.json({ success: false, message: '密码长度至少6位' })
    }
    
    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    db.run(`UPDATE users SET password = ? WHERE id = ?`,
      [hashedPassword, req.params.id])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    // 检查是否为管理员
    const stmt = db.prepare('SELECT role FROM users WHERE id = ?')
    stmt.bind([req.params.id])
    const result = stmt.step()
    const user = result ? stmt.getAsObject() : null
    stmt.free()
    
    if (user && user.role === 'admin') {
      return res.json({ success: false, message: '不能删除管理员用户' })
    }
    
    db.run(`DELETE FROM users WHERE id = ?`, [req.params.id])
    db.run(`DELETE FROM notes WHERE author_id = ?`, [req.params.id])
    db.run(`DELETE FROM comments WHERE user_id = ?`, [req.params.id])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/users/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { status } = req.body
  try {
    // 检查是否为管理员
    const stmt = db.prepare('SELECT role FROM users WHERE id = ?')
    stmt.bind([req.params.id])
    const result = stmt.step()
    const user = result ? stmt.getAsObject() : null
    stmt.free()
    
    if (user && user.role === 'admin') {
      return res.json({ success: false, message: '不能修改管理员用户状态' })
    }
    
    db.run(`UPDATE users SET status = ? WHERE id = ?`, [status, req.params.id])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  const { role } = req.body
  try {
    db.run(`UPDATE users SET role = ? WHERE id = ?`, [role, req.params.id])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.get('/api/users/:username', (req, res) => {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
  stmt.bind([req.params.username])
  const result = stmt.step()
  const user = result ? stmt.getAsObject() : null
  stmt.free()
  if (user) {
    // 移除密码字段
    delete user.password
  }
  res.json(user || null)
})

// 登录API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
    stmt.bind([username])
    const result = stmt.step()
    const user = result ? stmt.getAsObject() : null
    stmt.free()
    
    if (!user) {
      return res.json({ success: false, message: '用户名或密码错误' })
    }
    
    // 检查用户状态
    if (user.status === 'inactive') {
      return res.json({ success: false, message: '用户已被停用，请联系管理员' })
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.json({ success: false, message: '用户名或密码错误' })
    }
    
    // 移除密码字段
    delete user.password
    
    // 生成JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({ success: true, user, token })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 注册API
app.post('/api/register', async (req, res) => {
  const { username, password, nickname } = req.body
  
  // 输入验证
  if (!username || !password || !nickname) {
    return res.json({ success: false, message: '请填写所有字段' })
  }
  
  if (username.length < 3 || username.length > 20) {
    return res.json({ success: false, message: '用户名长度必须在3-20个字符之间' })
  }
  
  if (password.length < 6) {
    return res.json({ success: false, message: '密码长度至少6位' })
  }
  
  if (nickname.length < 2 || nickname.length > 30) {
    return res.json({ success: false, message: '昵称长度必须在2-30个字符之间' })
  }
  
  try {
    // 检查用户名是否已存在
    const stmt = db.prepare('SELECT id FROM users WHERE username = ?')
    stmt.bind([username])
    const existingUser = stmt.step()
    stmt.free()
    
    if (existingUser) {
      return res.json({ success: false, message: '用户名已存在' })
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // 创建用户
    const id = Date.now().toString()
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
    const role = 'user'
    const status = 'active'
    const created_at = new Date().toISOString()
    
    db.run(`INSERT INTO users (id, username, password, nickname, avatar, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, username, hashedPassword, nickname, avatar, role, status, created_at])
    saveDb()
    
    // 返回用户信息（不包含密码）
    res.json({ 
      success: true, 
      user: { id, username, nickname, avatar, role, status, created_at }
    })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 笔记API
app.get('/api/notes', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const offset = (page - 1) * limit
  
  // 获取总数
  const countResult = db.exec('SELECT COUNT(*) FROM notes')
  const total = countResult[0]?.values[0][0] || 0
  
  // 获取分页数据
  const result = db.exec(`SELECT * FROM notes ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`)
  if (result.length === 0) return res.json({ notes: [], total, page, limit })
  
  const notes = result[0].values.map(row => ({
    id: row[0], title: row[1], content: row[2], ingredients: row[3], steps: row[4],
    images: JSON.parse(row[5] || '[]'), author_id: row[6], author_name: row[7],
    likes: row[8], liked: row[9], created_at: row[10]
  }))
  
  res.json({ notes, total, page, limit })
})

app.post('/api/notes', authenticateToken, (req, res) => {
  const { id, title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at } = req.body
  
  // 输入验证
  if (!title || title.trim().length === 0) {
    return res.json({ success: false, message: '标题不能为空' })
  }
  if (title.length > 100) {
    return res.json({ success: false, message: '标题长度不能超过100个字符' })
  }
  if (!content || content.trim().length === 0) {
    return res.json({ success: false, message: '内容不能为空' })
  }
  if (content.length > 5000) {
    return res.json({ success: false, message: '内容长度不能超过5000个字符' })
  }
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.json({ success: false, message: '至少需要上传一张图片' })
  }
  if (images.length > 9) {
    return res.json({ success: false, message: '最多上传9张图片' })
  }
  
  try {
    db.run(`INSERT INTO notes (id, title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title.trim(), content.trim(), ingredients, steps, JSON.stringify(images), author_id, author_name, likes || 0, liked ? 1 : 0, created_at])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/notes/:id', authenticateToken, (req, res) => {
  const { title, content, ingredients, steps, images, likes, liked } = req.body
  
  // 输入验证
  if (!title || title.trim().length === 0) {
    return res.json({ success: false, message: '标题不能为空' })
  }
  if (title.length > 100) {
    return res.json({ success: false, message: '标题长度不能超过100个字符' })
  }
  if (!content || content.trim().length === 0) {
    return res.json({ success: false, message: '内容不能为空' })
  }
  if (content.length > 5000) {
    return res.json({ success: false, message: '内容长度不能超过5000个字符' })
  }
  if (images && images.length > 9) {
    return res.json({ success: false, message: '最多上传9张图片' })
  }
  
  try {
    db.run(`UPDATE notes SET title = ?, content = ?, ingredients = ?, steps = ?, images = ?, likes = ?, liked = ? WHERE id = ?`,
      [title.trim(), content.trim(), ingredients, steps, JSON.stringify(images), likes, liked ? 1 : 0, req.params.id])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.delete('/api/notes/:id', authenticateToken, (req, res) => {
  try {
    db.run(`DELETE FROM notes WHERE id = ?`, [req.params.id])
    db.run(`DELETE FROM comments WHERE note_id = ?`, [req.params.id])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.get('/api/notes/:id', (req, res) => {
  const stmt = db.prepare('SELECT * FROM notes WHERE id = ?')
  stmt.bind([req.params.id])
  const result = stmt.step()
  const note = result ? stmt.getAsObject() : null
  stmt.free()
  if (note && note.images) {
    note.images = JSON.parse(note.images || '[]')
  }
  res.json(note || null)
})

// 评论API
app.get('/api/comments/:noteId', (req, res) => {
  const stmt = db.prepare('SELECT * FROM comments WHERE note_id = ? ORDER BY created_at DESC')
  stmt.bind([req.params.noteId])
  const comments = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    comments.push({
      id: row.id,
      note_id: row.note_id,
      user_id: row.user_id,
      user_name: row.user_name,
      content: row.content,
      reply_to_id: row.reply_to_id || null,
      reply_to_user_name: row.reply_to_user_name || null,
      reply_to_content: row.reply_to_content || null,
      created_at: row.created_at
    })
  }
  stmt.free()
  res.json(comments)
})

app.post('/api/comments', authenticateToken, (req, res) => {
  const { id, note_id, user_id, user_name, content, reply_to_id, reply_to_user_name, reply_to_content, created_at } = req.body
  
  // 输入验证
  if (!content || content.trim().length === 0) {
    return res.json({ success: false, message: '评论内容不能为空' })
  }
  if (content.length > 500) {
    return res.json({ success: false, message: '评论内容不能超过500个字符' })
  }
  
  try {
    db.run(`INSERT INTO comments (id, note_id, user_id, user_name, content, reply_to_id, reply_to_user_name, reply_to_content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, note_id, user_id, user_name, content.trim(), reply_to_id || null, reply_to_user_name || null, reply_to_content || null, created_at])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.delete('/api/comments/:id', authenticateToken, (req, res) => {
  try {
    db.run(`DELETE FROM comments WHERE id = ?`, [req.params.id])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 意见反馈API

// 提交意见反馈
app.post('/api/feedback', authenticateToken, (req, res) => {
  const { title, content, category, contact, user_id, user_name } = req.body
  
  // 输入验证
  if (!title || title.trim().length === 0) {
    return res.json({ success: false, message: '标题不能为空' })
  }
  if (title.length > 50) {
    return res.json({ success: false, message: '标题长度不能超过50个字符' })
  }
  if (!content || content.trim().length === 0) {
    return res.json({ success: false, message: '内容不能为空' })
  }
  if (content.length > 1000) {
    return res.json({ success: false, message: '内容长度不能超过1000个字符' })
  }
  if (!category) {
    return res.json({ success: false, message: '请选择分类' })
  }
  
  try {
    const id = Date.now().toString()
    const created_at = new Date().toISOString()
    
    db.run(`INSERT INTO feedback (id, user_id, user_name, title, content, category, contact, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, user_name, title.trim(), content.trim(), category, contact?.trim() || '', created_at])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 获取意见反馈列表（管理员）
app.get('/api/feedback', authenticateToken, (req, res) => {
  try {
    // 检查用户是否为管理员
    const userId = req.user.userId
    const stmt = db.prepare('SELECT role FROM users WHERE id = ?')
    stmt.bind([userId])
    const result = stmt.step()
    const user = result ? stmt.getAsObject() : null
    stmt.free()
    
    if (!user || user.role !== 'admin') {
      return res.json({ success: false, message: '权限不足' })
    }
    
    const stmtFeedback = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC')
    const feedbackList = []
    while (stmtFeedback.step()) {
      const row = stmtFeedback.getAsObject()
      feedbackList.push({
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name,
        title: row.title,
        content: row.content,
        category: row.category,
        contact: row.contact,
        status: row.status,
        created_at: row.created_at
      })
    }
    stmtFeedback.free()
    
    res.json(feedbackList)
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 获取用户自己的意见反馈
app.get('/api/feedback/me', authenticateToken, (req, res) => {
  try {
    const currentUser = req.user
    
    const stmt = db.prepare('SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC')
    stmt.bind([currentUser.userId])
    const feedbackList = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      feedbackList.push({
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name,
        title: row.title,
        content: row.content,
        category: row.category,
        contact: row.contact,
        status: row.status,
        created_at: row.created_at
      })
    }
    stmt.free()
    res.json(feedbackList)
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 更新意见状态（管理员）
app.put('/api/feedback/:id', authenticateToken, (req, res) => {
  const { status } = req.body
  
  try {
    // 检查用户是否为管理员
    const userId = req.user.userId
    const stmt = db.prepare('SELECT role FROM users WHERE id = ?')
    stmt.bind([userId])
    const result = stmt.step()
    const user = result ? stmt.getAsObject() : null
    stmt.free()
    
    if (!user || user.role !== 'admin') {
      return res.json({ success: false, message: '权限不足' })
    }
    
    // 验证状态值
    const validStatuses = ['pending', 'processing', 'resolved', 'closed']
    if (!validStatuses.includes(status)) {
      return res.json({ success: false, message: '无效的状态值' })
    }
    
    db.run(`UPDATE feedback SET status = ? WHERE id = ?`, [status, req.params.id])
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 启动服务器
initDb().then(() => {
  // 系统状态监控API
  app.get('/api/status', authenticateToken, requireAdmin, (req, res) => {
    const status = monitor.collectSystemStatus()
    res.json({ success: true, status })
  })

  // 生产环境下处理前端路由
  if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
      res.sendFile(join(__dirname, 'dist', 'index.html'))
    })
  }

  // 服务器启动
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
    if (process.env.NODE_ENV === 'production') {
      logger.info('Running in production mode')
    }
  })
})
