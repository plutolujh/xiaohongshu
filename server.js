import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { Pool } from 'pg'
import logger from './src/utils/logger.js'
import monitor from './src/utils/monitor.js'

// 读取环境变量
import dotenv from 'dotenv'
dotenv.config()

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
const PORT = process.env.PORT || 3002

// PostgreSQL数据库连接
const dbUrl = process.env.DATABASE_URL || 'postgresql://lu_xiaohong_user:YOUR_PASSWORD@dpg-d79o5l15pdvs73bn8jfg-a.oregon-postgres.render.com:5432/lu_xiaohong?sslmode=require'

// 解析PostgreSQL连接URL
const parseDbUrl = (url) => {
  const match = url.match(/postgresql:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*?)\?(.*)/)
  if (!match) {
    // 尝试匹配没有参数的URL格式
    const matchWithoutParams = url.match(/postgresql:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*)/)
    if (matchWithoutParams) {
      const [, user, password, host, port, database] = matchWithoutParams
      return {
        host,
        port: parseInt(port),
        database,
        user,
        password,
        ssl: true,
        sslmode: 'require'
      }
    }
    throw new Error('Invalid PostgreSQL URL')
  }
  const [, user, password, host, port, database, params] = match
  const paramsObj = {}
  params.split('&').forEach(param => {
    const [key, value] = param.split('=')
    paramsObj[key] = value
  })
  return {
    host,
    port: parseInt(port),
    database,
    user,
    password,
    ssl: paramsObj.ssl === 'true' || paramsObj.sslmode === 'require',
    sslmode: paramsObj.sslmode
  }
}

const dbConfig = parseDbUrl(dbUrl)
const pool = new Pool(dbConfig)

// 测试数据库连接
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error connecting to database', err.stack)
  }
  console.log('Successfully connected to PostgreSQL database')
  release()
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
    req.user = user
    next()
  })
}

// 管理员权限验证中间件
async function requireAdmin(req, res, next) {
  const userId = req.user.userId
  
  try {
    const result = await query('SELECT role FROM users WHERE id = $1', [userId])
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.json({ success: false, message: '需要管理员权限' })
    }
    next()
  } catch (e) {
    return res.json({ success: false, message: '服务器错误' })
  }
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
    '/status',
    '/db/info', '/db/tables', '/db/table/:tableName', '/db/query'
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

// 初始化数据库
async function initDb() {
  try {
    const client = await pool.connect()
    
    // 创建用户表
    await client.query(`
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

    // 创建笔记表
    await client.query(`
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

    // 创建评论表
    await client.query(`
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

    // 创建意见反馈表
    await client.query(`
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

    // 检查并添加示例用户
    const userCountResult = await client.query('SELECT COUNT(*) FROM users')
    const userCount = parseInt(userCountResult.rows[0].count)
    
    if (userCount === 0) {
      // 添加示例用户
      const hashedPassword = await bcrypt.hash('123456', 10)
      await client.query(
        `INSERT INTO users (id, username, password, nickname, avatar, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['demo', 'demo', hashedPassword, '美食达人', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo', '2024-01-01T00:00:00Z']
      )
      
      // 添加管理员用户
      const adminPassword = await bcrypt.hash('123456', 10)
      await client.query(
        `INSERT INTO users (id, username, password, nickname, avatar, role, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin', 'lujh', adminPassword, '管理员', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lujh', 'admin', '2024-01-01T00:00:00Z']
      )
      
      console.log('已创建示例用户')
    } else {
      // 确保lujh用户存在且为管理员
      const adminResult = await client.query('SELECT * FROM users WHERE username = $1', ['lujh'])
      if (adminResult.rows.length === 0) {
        const adminPassword = await bcrypt.hash('123456', 10)
        await client.query(
          `INSERT INTO users (id, username, password, nickname, avatar, role, status, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          ['admin', 'lujh', adminPassword, '管理员', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lujh', 'admin', 'active', new Date().toISOString()]
        )
        console.log('已创建lujh管理员用户')
      } else {
        await client.query('UPDATE users SET role = $1 WHERE username = $2', ['admin', 'lujh'])
        console.log('已将lujh用户设置为管理员')
      }
    }

    // 检查并添加示例笔记
    const noteCountResult = await client.query('SELECT COUNT(*) FROM notes')
    const noteCount = parseInt(noteCountResult.rows[0].count)
    
    if (noteCount === 0) {
      // 确保demo用户存在
      let demoUserId = 'demo'
      const demoResult = await client.query('SELECT id FROM users WHERE username = $1', ['demo'])
      if (demoResult.rows.length > 0) {
        demoUserId = demoResult.rows[0].id
      }
      
      // 添加示例笔记
      const notes = [
        ['1', '超级美味的番茄炒蛋', '这道番茄炒蛋是家常必备，简单易学又好吃！', '番茄2个、鸡蛋3个、盐适量、糖少许、葱花适量', '1. 番茄切块，鸡蛋打散\n2. 炒鸡蛋至半熟盛出\n3. 炒番茄出汁\n4. 加入鸡蛋一起翻炒\n5. 出锅前撒上葱花', '["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"]', demoUserId, '美食达人', 128, 0, '2024-01-15T10:30:00Z'],
        ['2', '香喷喷的红烧肉', '肥而不腻入口即化的红烧肉，太香了！', '五花肉500g、生抽2勺、老抽1勺、糖2勺、料酒1勺', '1. 五花肉切块焯水\n2. 炒糖色\n3. 加入肉块翻炒\n4. 加调料和水慢炖1小时', '["https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg?auto=compress&cs=tinysrgb&w=400"]', demoUserId, '美食达人', 256, 0, '2024-01-14T15:20:00Z'],
        ['3', '清爽凉拌黄瓜', '夏天必吃的清爽小菜，简单又开胃', '黄瓜2根、蒜末、醋、酱油、香油、辣椒油', '1. 黄瓜拍碎切块\n2. 加入蒜末和调料\n3. 拌匀即可', '["https://images.unsplash.com/photo-1580442151529-343f2f6e0e27?w=400"]', demoUserId, '美食达人', 89, 0, '2024-01-13T09:00:00Z'],
        ['4', '美味披萨在家做', '自己动手做披萨，成就感满满！', '面粉200g、酵母3g、番茄酱、芝士、各种喜欢的配菜', '1. 和面发酵\n2. 擀成饼底\n3. 抹上番茄酱\n4. 铺上芝士和配菜\n5. 烤箱200度烤15分钟', '["https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400"]', demoUserId, '美食达人', 312, 0, '2024-01-11T12:00:00Z']
      ]

      for (const note of notes) {
        await client.query(
          `INSERT INTO notes (id, title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          note
        )
      }

      console.log('已添加示例笔记')
    }

    client.release()
    console.log('Database initialized')
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

// 数据库连接池管理
async function query(text, params) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

// 用户API
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM users')
    const users = result.rows.map(row => ({
      id: row.id, 
      username: row.username, 
      nickname: row.nickname, 
      avatar: row.avatar, 
      bio: row.bio,
      role: row.role || 'user',
      status: row.status || 'active',
      created_at: row.created_at
    }))
    res.json(users)
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.post('/api/users', async (req, res) => {
  const { id, username, password, nickname, avatar, created_at } = req.body
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const role = 'user'
    const status = 'active'
    await query(
      `INSERT INTO users (id, username, password, nickname, avatar, role, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, username, hashedPassword, nickname, avatar, role, status, created_at]
    )
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/users/:id', authenticateToken, async (req, res) => {
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
    await query(
      `UPDATE users SET nickname = $1, avatar = $2, bio = $3 WHERE id = $4`,
      [nickname.trim(), avatar, bio ? bio.trim() : '', req.params.id]
    )
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
    const result = await query('SELECT password FROM users WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.json({ success: false, message: '用户不存在' })
    }
    
    const user = result.rows[0]
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
    await query(`UPDATE users SET password = $1 WHERE id = $2`,
      [hashedPassword, req.params.id]
    )
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 检查是否为管理员
    const result = await query('SELECT role FROM users WHERE id = $1', [req.params.id])
    if (result.rows.length > 0 && result.rows[0].role === 'admin') {
      return res.json({ success: false, message: '不能删除管理员用户' })
    }
    
    await query(`DELETE FROM users WHERE id = $1`, [req.params.id])
    await query(`DELETE FROM notes WHERE author_id = $1`, [req.params.id])
    await query(`DELETE FROM comments WHERE user_id = $1`, [req.params.id])
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { status } = req.body
  try {
    // 检查是否为管理员
    const result = await query('SELECT role FROM users WHERE id = $1', [req.params.id])
    if (result.rows.length > 0 && result.rows[0].role === 'admin') {
      return res.json({ success: false, message: '不能修改管理员用户状态' })
    }
    
    await query(`UPDATE users SET status = $1 WHERE id = $2`, [status, req.params.id])
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  const { role } = req.body
  try {
    await query(`UPDATE users SET role = $1 WHERE id = $2`, [role, req.params.id])
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.get('/api/users/:username', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users WHERE username = $1', [req.params.username])
    if (result.rows.length === 0) {
      return res.json(null)
    }
    const user = result.rows[0]
    // 移除密码字段
    delete user.password
    res.json(user)
  } catch (e) {
    res.json(null)
  }
})

// 登录API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const result = await query('SELECT * FROM users WHERE username = $1', [username])
    if (result.rows.length === 0) {
      return res.json({ success: false, message: '用户名或密码错误' })
    }
    
    const user = result.rows[0]
    
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
    const existingResult = await query('SELECT id FROM users WHERE username = $1', [username])
    if (existingResult.rows.length > 0) {
      return res.json({ success: false, message: '用户名已存在' })
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // 创建用户
    const id = crypto.randomUUID()
    await query(
      `INSERT INTO users (id, username, password, nickname, avatar, role, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, username, hashedPassword, nickname, `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, 'user', 'active', new Date().toISOString()]
    )
    
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 笔记API
app.get('/api/notes', async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const offset = (page - 1) * limit
  
  try {
    // 获取总数
    const countResult = await query('SELECT COUNT(*) FROM notes')
    const total = parseInt(countResult.rows[0].count) || 0
    
    // 获取分页数据
    const result = await query(
      'SELECT * FROM notes ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    )
    
    const notes = result.rows.map(row => ({
      id: row.id, title: row.title, content: row.content, ingredients: row.ingredients, steps: row.steps,
      images: JSON.parse(row.images || '[]'), author_id: row.author_id, author_name: row.author_name,
      likes: row.likes, liked: row.liked, created_at: row.created_at
    }))
    
    res.json({ notes, total, page, limit })
  } catch (e) {
    res.json({ notes: [], total: 0, page, limit })
  }
})

app.post('/api/notes', authenticateToken, async (req, res) => {
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
    await query(
      `INSERT INTO notes (id, title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, title.trim(), content.trim(), ingredients, steps, JSON.stringify(images), author_id, author_name, likes || 0, liked ? 1 : 0, created_at]
    )
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
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
    await query(
      `UPDATE notes SET title = $1, content = $2, ingredients = $3, steps = $4, images = $5, likes = $6, liked = $7 WHERE id = $8`,
      [title.trim(), content.trim(), ingredients, steps, JSON.stringify(images), likes, liked ? 1 : 0, req.params.id]
    )
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    await query(`DELETE FROM notes WHERE id = $1`, [req.params.id])
    await query(`DELETE FROM comments WHERE note_id = $1`, [req.params.id])
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.get('/api/notes/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM notes WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.json(null)
    }
    const note = result.rows[0]
    if (note.images) {
      note.images = JSON.parse(note.images || '[]')
    }
    res.json(note)
  } catch (e) {
    res.json(null)
  }
})

// 评论API
app.get('/api/comments/:noteId', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM comments WHERE note_id = $1 ORDER BY created_at DESC',
      [req.params.noteId]
    )
    
    const comments = result.rows.map(row => ({
      id: row.id,
      note_id: row.note_id,
      user_id: row.user_id,
      user_name: row.user_name,
      content: row.content,
      reply_to_id: row.reply_to_id || null,
      reply_to_user_name: row.reply_to_user_name || null,
      reply_to_content: row.reply_to_content || null,
      created_at: row.created_at
    }))
    
    res.json(comments)
  } catch (e) {
    res.json([])
  }
})

app.post('/api/comments', authenticateToken, async (req, res) => {
  const { id, note_id, user_id, user_name, content, reply_to_id, reply_to_user_name, reply_to_content, created_at } = req.body
  
  // 输入验证
  if (!content || content.trim().length === 0) {
    return res.json({ success: false, message: '评论内容不能为空' })
  }
  if (content.length > 500) {
    return res.json({ success: false, message: '评论内容不能超过500个字符' })
  }
  
  try {
    await query(
      `INSERT INTO comments (id, note_id, user_id, user_name, content, reply_to_id, reply_to_user_name, reply_to_content, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, note_id, user_id, user_name, content.trim(), reply_to_id || null, reply_to_user_name || null, reply_to_content || null, created_at]
    )
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
  try {
    await query(`DELETE FROM comments WHERE id = $1`, [req.params.id])
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 意见反馈API

// 提交意见反馈
app.post('/api/feedback', authenticateToken, async (req, res) => {
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
    
    await query(
      `INSERT INTO feedback (id, user_id, user_name, title, content, category, contact, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, user_id, user_name, title.trim(), content.trim(), category, contact?.trim() || '', created_at]
    )
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 获取意见反馈列表（管理员）
app.get('/api/feedback', authenticateToken, async (req, res) => {
  try {
    // 检查用户是否为管理员
    const userId = req.user.userId
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.json({ success: false, message: '权限不足' })
    }
    
    const result = await query('SELECT * FROM feedback ORDER BY created_at DESC')
    const feedbackList = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      title: row.title,
      content: row.content,
      category: row.category,
      contact: row.contact,
      status: row.status,
      created_at: row.created_at
    }))
    
    res.json(feedbackList)
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 获取用户自己的意见反馈
app.get('/api/feedback/me', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user
    
    const result = await query(
      'SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC',
      [currentUser.userId]
    )
    
    const feedbackList = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      title: row.title,
      content: row.content,
      category: row.category,
      contact: row.contact,
      status: row.status,
      created_at: row.created_at
    }))
    
    res.json(feedbackList)
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 更新意见状态（管理员）
app.put('/api/feedback/:id', authenticateToken, async (req, res) => {
  const { status } = req.body
  
  try {
    // 检查用户是否为管理员
    const userId = req.user.userId
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.json({ success: false, message: '权限不足' })
    }
    
    // 验证状态值
    const validStatuses = ['pending', 'processing', 'resolved', 'closed']
    if (!validStatuses.includes(status)) {
      return res.json({ success: false, message: '无效的状态值' })
    }
    
    await query(`UPDATE feedback SET status = $1 WHERE id = $2`, [status, req.params.id])
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
    // 添加版本信息和最后发布时间
    status.version = '1.0.0'
    status.lastPublishTime = '2026-04-06 11:00:00'
    res.json({ success: true, status })
  })
  
  // 数据库管理API
  app.get('/api/db/info', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const result = await query('SELECT version() as version')
      res.json({ success: true, data: {
        database: 'PostgreSQL',
        version: result.rows[0].version,
        tables: ['users', 'notes', 'comments', 'feedback']
      } })
    } catch (e) {
      res.json({ success: false, message: e.message })
    }
  })
  
  app.get('/api/db/tables', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const tables = ['users', 'notes', 'comments', 'feedback']
      const tableInfo = []
      
      for (const table of tables) {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`)
        tableInfo.push({
          name: table,
          count: result.rows[0].count
        })
      }
      
      res.json({ success: true, data: tableInfo })
    } catch (e) {
      res.json({ success: false, message: e.message })
    }
  })
  
  app.get('/api/db/table/:tableName', authenticateToken, requireAdmin, async (req, res) => {
    const { tableName } = req.params
    const { page = 1, limit = 10 } = req.query
    
    try {
      const validTables = ['users', 'notes', 'comments', 'feedback']
      if (!validTables.includes(tableName)) {
        return res.json({ success: false, message: '无效的表名' })
      }
      
      const offset = (page - 1) * limit
      const result = await query(`SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset])
      const countResult = await query(`SELECT COUNT(*) as total FROM ${tableName}`)
      
      res.json({ success: true, data: {
        rows: result.rows,
        total: countResult.rows[0].total,
        page: parseInt(page),
        limit: parseInt(limit)
      } })
    } catch (e) {
      res.json({ success: false, message: e.message })
    }
  })
  
  app.post('/api/db/query', authenticateToken, requireAdmin, async (req, res) => {
    const { query: sqlQuery } = req.body
    
    try {
      // 限制只能执行SELECT查询
      if (!sqlQuery.toLowerCase().startsWith('select')) {
        return res.json({ success: false, message: '只能执行SELECT查询' })
      }
      
      const result = await query(sqlQuery)
      res.json({ success: true, data: result.rows })
    } catch (e) {
      res.json({ success: false, message: e.message })
    }
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
