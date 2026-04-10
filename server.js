import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
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
const PORT = process.env.PORT || 3004

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
    console.error('Error connecting to database:', err.stack)
    console.log('Starting server without database connection...')
    // 不退出进程，继续启动服务器
  } else {
    console.log('Successfully connected to PostgreSQL database')
    release()
  }
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
    '/users', '/users/:username', '/users/:id', '/users/:id/password', '/users/:id/status', '/users/:id/role',
    '/users/:id/follow', '/users/:id/followers', '/users/:id/following', '/users/:id/follow-status/:targetId', '/users/:id/follow-counts',
    '/user/:id', '/user/:id/tags',
    '/login', '/register',
    '/notes', '/notes/:id', '/notes/:id/tags', '/notes/:id/like', '/notes/:id/like-status',
    '/comments', '/comments/:noteId', '/comments/:id',
    '/feedback', '/feedback/:id',
    '/tags', '/tags/popular', '/tags/:id', '/tags/:id/notes',
    '/status',
    '/db/info', '/db/tables', '/db/table/:tableName', '/db/table/:tableName/structure', '/db/query', '/db/backup'
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
  ? process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : []  // 生产环境必须设置
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003']

// 如果生产环境没有设置 FRONTEND_URL，启动时警告
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.error('错误: 生产环境必须设置 FRONTEND_URL 环境变量')
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

// 速率限制配置
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 500, // 每个IP每15分钟最多500个请求
  message: { success: false, message: '请求过于频繁，请稍后再试' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 登录注册每15分钟最多50次
  message: { success: false, message: '请求过于频繁，请稍后再试' }
})

app.use(generalLimiter)
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

// 健康检查API
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' })
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

    // 创建标签表
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TEXT
      )
    `)

    // 创建笔记-标签关联表
    await client.query(`
      CREATE TABLE IF NOT EXISTS note_tags (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id),
        FOREIGN KEY (tag_id) REFERENCES tags(id),
        UNIQUE (note_id, tag_id)
      )
    `)

    // 创建关注表
    await client.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT NOW(),
        UNIQUE (follower_id, following_id)
      )
    `)

    // 创建用户-标签喜欢表
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_likes (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT NOW(),
        UNIQUE (user_id, tag_id)
      )
    `)

    // 创建笔记点赞表（用户点赞笔记的记录）
    await client.query(`
      CREATE TABLE IF NOT EXISTS note_likes (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT NOW(),
        UNIQUE (user_id, note_id)
      )
    `)

    // 创建索引以提升查询性能
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comments_note_id ON comments(note_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_note_likes_user_id ON note_likes(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_note_likes_note_id ON note_likes(note_id)`)

    // 检查并添加示例用户
    const userCountResult = await client.query('SELECT COUNT(*) FROM users')
    const userCount = parseInt(userCountResult.rows[0].count)
    
    if (userCount === 0) {
      // 添加示例用户
      const hashedPassword = await bcrypt.hash('123456', 12)
      await client.query(
        `INSERT INTO users (id, username, password, nickname, avatar, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['demo', 'demo', hashedPassword, '美食达人', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo', '2024-01-01T00:00:00Z']
      )
      
      // 添加管理员用户
      const adminPassword = await bcrypt.hash('123456', 12)
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
        const adminPassword = await bcrypt.hash('123456', 12)
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

  // IDOR 防护：验证当前用户是否有权限修改该用户
  const currentUserId = req.user.userId
  const targetUserId = req.params.id
  if (currentUserId !== targetUserId) {
    return res.status(403).json({ success: false, message: '无权限修改此用户' })
  }

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

  // IDOR 防护：验证当前用户是否有权限修改该用户密码
  const currentUserId = req.user.userId
  const targetUserId = req.params.id
  if (currentUserId !== targetUserId) {
    return res.status(403).json({ success: false, message: '无权限修改此用户密码' })
  }

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

// 根据ID获取用户信息
app.get('/api/user/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [req.params.id])
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

// 获取用户喜欢的标签
app.get('/api/user/:id/tags', async (req, res) => {
  try {
    const result = await query(
      `SELECT t.id, t.name
       FROM tags t
       JOIN user_likes ut ON t.id = ut.tag_id
       WHERE ut.user_id = $1
       ORDER BY t.name`,
      [req.params.id]
    )
    const tags = result.rows.map(row => ({
      id: row.id,
      name: row.name
    }))
    res.json(tags)
  } catch (e) {
    res.json([])
  }
})

// 关注用户
app.post('/api/users/:id/follow', authenticateToken, async (req, res) => {
  const { id: followingId } = req.params
  const followerId = req.user.userId

  try {
    // 不能关注自己
    if (followerId === followingId) {
      return res.json({ success: false, message: '不能关注自己' })
    }

    // 检查目标用户是否存在
    const userResult = await query('SELECT id FROM users WHERE id = $1', [followingId])
    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: '用户不存在' })
    }

    // 检查是否已经关注
    const existResult = await query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    )
    if (existResult.rows.length > 0) {
      return res.json({ success: false, message: '已经关注了该用户' })
    }

    // 添加关注
    await query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, followingId]
    )

    res.json({ success: true, message: '关注成功' })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 取消关注
app.delete('/api/users/:id/follow', authenticateToken, async (req, res) => {
  const { id: followingId } = req.params
  const followerId = req.user.userId

  try {
    await query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    )

    res.json({ success: true, message: '取消关注成功' })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 点赞笔记
app.post('/api/notes/:id/like', authenticateToken, async (req, res) => {
  const { id: noteId } = req.params
  const userId = req.user.userId

  try {
    // 检查笔记是否存在
    const noteResult = await query('SELECT id FROM notes WHERE id = $1', [noteId])
    if (noteResult.rows.length === 0) {
      return res.json({ success: false, message: '笔记不存在' })
    }

    // 插入点赞记录（使用 INSERT ... ON CONFLICT 避免重复）
    await query(
      `INSERT INTO note_likes (user_id, note_id) VALUES ($1, $2)
       ON CONFLICT (user_id, note_id) DO NOTHING`,
      [userId, noteId]
    )

    // 更新笔记点赞数
    await query(
      'UPDATE notes SET likes = likes + 1 WHERE id = $1 AND likes >= 0',
      [noteId]
    )

    res.json({ success: true, liked: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 取消点赞笔记
app.delete('/api/notes/:id/like', authenticateToken, async (req, res) => {
  const { id: noteId } = req.params
  const userId = req.user.userId

  try {
    // 删除点赞记录
    const result = await query(
      'DELETE FROM note_likes WHERE user_id = $1 AND note_id = $2 RETURNING id',
      [userId, noteId]
    )

    // 如果删除成功（之前有点赞），则减少点赞数
    if (result.rows.length > 0) {
      await query(
        'UPDATE notes SET likes = likes - 1 WHERE id = $1 AND likes > 0',
        [noteId]
      )
    }

    res.json({ success: true, liked: false })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 获取笔记点赞状态
app.get('/api/notes/:id/like-status', authenticateToken, async (req, res) => {
  const { id: noteId } = req.params
  const userId = req.user.userId

  try {
    const result = await query(
      'SELECT id FROM note_likes WHERE user_id = $1 AND note_id = $2',
      [userId, noteId]
    )

    res.json({ liked: result.rows.length > 0 })
  } catch (e) {
    res.json({ liked: false })
  }
})

// 获取用户粉丝列表
app.get('/api/users/:id/followers', authenticateToken, async (req, res) => {
  const { id: userId } = req.params
  const { page = 1, limit = 20 } = req.query
  const currentUserId = req.user?.id

  try {
    const offset = (page - 1) * limit

    // 获取粉丝数量
    const countResult = await query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [userId]
    )

    // 获取粉丝列表
    const result = await query(`
      SELECT u.id, u.username, u.nickname, u.avatar, u.bio, u.created_at,
             f.created_at as followed_at
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    // 如果有当前用户，检查关注状态
    let users = result.rows
    if (currentUserId) {
      const userIds = users.map(u => u.id)
      if (userIds.length > 0) {
        const followResult = await query(
          `SELECT following_id FROM follows
           WHERE follower_id = $1 AND following_id = ANY($2)`,
          [currentUserId, userIds]
        )
        const followingIds = new Set(followResult.rows.map(r => r.following_id))
        users = users.map(u => ({
          ...u,
          isFollowing: followingIds.has(u.id)
        }))
      }
    }

    res.json({
      success: true,
      data: {
        users,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 获取用户关注列表
app.get('/api/users/:id/following', authenticateToken, async (req, res) => {
  const { id: userId } = req.params
  const { page = 1, limit = 20 } = req.query
  const currentUserId = req.user?.id

  try {
    const offset = (page - 1) * limit

    // 获取关注数量
    const countResult = await query(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [userId]
    )

    // 获取关注列表
    const result = await query(`
      SELECT u.id, u.username, u.nickname, u.avatar, u.bio, u.created_at,
             f.created_at as followed_at
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    // 如果有当前用户，检查关注状态
    let users = result.rows
    if (currentUserId) {
      const userIds = users.map(u => u.id)
      if (userIds.length > 0) {
        const followResult = await query(
          `SELECT following_id FROM follows
           WHERE follower_id = $1 AND following_id = ANY($2)`,
          [currentUserId, userIds]
        )
        const followingIds = new Set(followResult.rows.map(r => r.following_id))
        users = users.map(u => ({
          ...u,
          isFollowing: followingIds.has(u.id)
        }))
      }
    }

    res.json({
      success: true,
      data: {
        users,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 检查关注状态
app.get('/api/users/:id/follow-status/:targetId', authenticateToken, async (req, res) => {
  const { id: userId, targetId } = req.params

  try {
    const result = await query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [userId, targetId]
    )

    res.json({
      success: true,
      data: {
        isFollowing: result.rows.length > 0
      }
    })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 获取用户关注数和粉丝数
app.get('/api/users/:id/follow-counts', async (req, res) => {
  const { id: userId } = req.params

  try {
    const followingResult = await query(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [userId]
    )
    const followersResult = await query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [userId]
    )
    const notesResult = await query(
      'SELECT COUNT(*) FROM notes WHERE author_id = $1',
      [userId]
    )

    res.json({
      success: true,
      data: {
        following: parseInt(followingResult.rows[0].count),
        followers: parseInt(followersResult.rows[0].count),
        notes: parseInt(notesResult.rows[0].count)
      }
    })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 登录API (使用认证限流器)
app.post('/api/login', authLimiter, async (req, res) => {
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

// 注册API (使用认证限流器)
app.post('/api/register', authLimiter, async (req, res) => {
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
  let limit = parseInt(req.query.limit) || 10
  const authorId = req.query.author
  // 分页上限验证
  limit = Math.min(Math.max(limit, 1), 100)
  const offset = (page - 1) * limit

  try {
    // 获取总数
    let countQuery = 'SELECT COUNT(*) FROM notes'
    let countParams = []
    if (authorId) {
      countQuery += ' WHERE author_id = $1'
      countParams.push(authorId)
    }
    const countResult = await query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count) || 0

    // 获取分页数据
    let queryStr = 'SELECT * FROM notes'
    let params = [limit, offset]
    if (authorId) {
      queryStr += ' WHERE author_id = $1'
      params = [authorId, limit, offset]
    }
    queryStr += ' ORDER BY created_at DESC LIMIT $' + (authorId ? '2' : '1') + ' OFFSET $' + (authorId ? '3' : '2')

    const result = await query(queryStr, params)

    const notes = result.rows.map(row => {
      const images = JSON.parse(row.images || '[]')
      // 列表接口只返回第一张图片作为封面，不返回所有图片
      const coverImage = images.length > 0 ? images[0] : null
      // 只返回首页展示需要的字段，减少响应大小
      return {
        id: row.id,
        title: row.title,
        coverImage,
        author_id: row.author_id,
        author_name: row.author_name,
        likes: row.likes,
        created_at: row.created_at
      }
    })

    res.json({ notes, total, page, limit })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message, notes: [], total: 0, page, limit })
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
    // 如果没有传递created_at，设置为当前时间
    const now = new Date().toISOString()
    await query(
      `INSERT INTO notes (id, title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, title.trim(), content.trim(), ingredients, steps, JSON.stringify(images), author_id, author_name, likes || 0, liked ? 1 : 0, created_at || now]
    )
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  const { title, content, ingredients, steps, images, likes, liked } = req.body

  // IDOR 防护：验证当前用户是否有权限修改该笔记
  const currentUserId = req.user.userId
  try {
    const noteResult = await query('SELECT author_id FROM notes WHERE id = $1', [req.params.id])
    if (noteResult.rows.length === 0) {
      return res.json({ success: false, message: '笔记不存在' })
    }
    if (noteResult.rows[0].author_id !== currentUserId) {
      return res.status(403).json({ success: false, message: '无权限修改此笔记' })
    }
  } catch (e) {
    return res.json({ success: false, message: e.message })
  }

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
  // IDOR 防护：验证当前用户是否有权限删除该笔记
  const currentUserId = req.user.userId
  try {
    const noteResult = await query('SELECT author_id FROM notes WHERE id = $1', [req.params.id])
    if (noteResult.rows.length === 0) {
      return res.json({ success: false, message: '笔记不存在' })
    }
    if (noteResult.rows[0].author_id !== currentUserId) {
      return res.status(403).json({ success: false, message: '无权限删除此笔记' })
    }
  } catch (e) {
    return res.json({ success: false, message: e.message })
  }

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
    const images = JSON.parse(note.images || '[]')
    // 默认只返回第一张图片，详情页需要加载全部
    const full = req.query.full === 'true'
    note.images = full ? images : images.slice(0, 1)
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
  // IDOR 防护：验证当前用户是否有权限删除该评论
  const currentUserId = req.user.userId
  try {
    const commentResult = await query('SELECT user_id FROM comments WHERE id = $1', [req.params.id])
    if (commentResult.rows.length === 0) {
      return res.json({ success: false, message: '评论不存在' })
    }
    if (commentResult.rows[0].user_id !== currentUserId) {
      return res.status(403).json({ success: false, message: '无权限删除此评论' })
    }
  } catch (e) {
    return res.json({ success: false, message: e.message })
  }

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
// 标签API
app.get('/api/tags', async (req, res) => {
  try {
    const result = await query('SELECT * FROM tags ORDER BY name')
    const tags = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at
    }))
    res.json(tags)
  } catch (e) {
    res.json([])
  }
})

app.get('/api/tags/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const result = await query(
      `SELECT t.id, t.name, COUNT(nt.note_id) as note_count
       FROM tags t
       LEFT JOIN note_tags nt ON t.id = nt.tag_id
       GROUP BY t.id, t.name
       ORDER BY note_count DESC, t.name ASC
       LIMIT $1`,
      [limit]
    )
    const tags = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      note_count: parseInt(row.note_count) || 0
    }))
    res.json(tags)
  } catch (e) {
    res.json([])
  }
})

app.post('/api/tags', authenticateToken, async (req, res) => {
  const { name } = req.body
  
  try {
    if (!name || name.trim().length === 0) {
      return res.json({ success: false, message: '标签名称不能为空' })
    }
    
    if (name.length > 20) {
      return res.json({ success: false, message: '标签名称长度不能超过20个字符' })
    }
    
    const id = crypto.randomUUID()
    const created_at = new Date().toISOString()
    
    await query(
      'INSERT INTO tags (id, name, created_at) VALUES ($1, $2, $3)',
      [id, name.trim(), created_at]
    )
    
    res.json({ success: true, tag: { id, name: name.trim(), created_at } })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.get('/api/notes/:id/tags', async (req, res) => {
  try {
    const result = await query(
      `SELECT t.id, t.name 
       FROM tags t 
       JOIN note_tags nt ON t.id = nt.tag_id 
       WHERE nt.note_id = $1 
       ORDER BY t.name`,
      [req.params.id]
    )
    const tags = result.rows.map(row => ({
      id: row.id,
      name: row.name
    }))
    res.json(tags)
  } catch (e) {
    res.json([])
  }
})

app.post('/api/notes/:id/tags', authenticateToken, async (req, res) => {
  const { tagIds } = req.body
  
  try {
    // 先删除该笔记的所有标签关联
    await query('DELETE FROM note_tags WHERE note_id = $1', [req.params.id])
    
    // 添加新的标签关联
    for (const tagId of tagIds) {
      const id = crypto.randomUUID()
      await query(
        'INSERT INTO note_tags (id, note_id, tag_id) VALUES ($1, $2, $3)',
        [id, req.params.id, tagId]
      )
    }
    
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.get('/api/tags/:id/notes', async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const offset = (page - 1) * limit
  
  try {
    // 获取总数
    const countResult = await query(
      `SELECT COUNT(DISTINCT nt.note_id) as count 
       FROM note_tags nt 
       WHERE nt.tag_id = $1`,
      [req.params.id]
    )
    const total = parseInt(countResult.rows[0].count) || 0
    
    // 获取分页数据
    const result = await query(
      `SELECT n.* 
       FROM notes n 
       JOIN note_tags nt ON n.id = nt.note_id 
       WHERE nt.tag_id = $1 
       ORDER BY n.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    )
    
    const notes = result.rows.map(row => ({
      id: row.id, title: row.title, content: row.content, ingredients: row.ingredients, steps: row.steps,
      images: JSON.parse(row.images || '[]'), author_id: row.author_id, author_name: row.author_name,
      likes: row.likes, liked: row.liked, created_at: row.created_at
    }))
    
    res.json({ notes, total, page, limit })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message, notes: [], total: 0, page, limit })
  }
})

// 系统状态监控API
app.get('/api/status', authenticateToken, requireAdmin, async (req, res) => {
  const status = monitor.collectSystemStatus()
  status.version = process.env.npm_package_version || '1.0.0'

  // 获取数据库表统计
  try {
    const tables = ['users', 'notes', 'comments', 'feedback', 'tags', 'note_tags', 'follows']
    const tableCounts = {}
    let totalRecords = 0

    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`)
        const count = parseInt(result.rows[0].count) || 0
        tableCounts[table] = count
        totalRecords += count
      } catch (e) {
        tableCounts[table] = 0
      }
    }

    // 估算数据库大小 (每条记录约 1KB)
    status.database = {
      totalSize: totalRecords * 1024,
      tables: tableCounts
    }
  } catch (e) {
    // 跳过数据库统计
  }

  res.json({ success: true, status })
})

// 数据库管理API
app.get('/api/db/info', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT version() as version')
    res.json({ success: true, data: {
      database: 'PostgreSQL',
      version: result.rows[0].version,
      tables: ['users', 'notes', 'comments', 'feedback', 'tags', 'note_tags']
    } })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

app.get('/api/db/tables', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tables = ['users', 'notes', 'comments', 'feedback', 'tags', 'note_tags', 'follows']
    const tableInfo = []
    
    for (const table of tables) {
      const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`)
      const sizeResult = await query(`SELECT pg_size_pretty(pg_total_relation_size('${table}')) as size`)
      tableInfo.push({
        name: table,
        count: countResult.rows[0].count,
        size: sizeResult.rows[0].size
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
    const validTables = ['users', 'notes', 'comments', 'feedback', 'tags', 'note_tags']
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

// 表结构查看 API
app.get('/api/db/table/:tableName/structure', authenticateToken, requireAdmin, async (req, res) => {
  const { tableName } = req.params

  try {
    const validTables = ['users', 'notes', 'comments', 'feedback', 'tags', 'note_tags']
    if (!validTables.includes(tableName)) {
      return res.json({ success: false, message: '无效的表名' })
    }

    const result = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName])

    // 同时获取表的主键信息
    const pkResult = await query(`
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `, [tableName])

    res.json({ success: true, data: {
      columns: result.rows,
      primaryKeys: pkResult.rows.map(r => r.column_name)
    } })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// 数据库备份 API
app.get('/api/db/backup', authenticateToken, requireAdmin, async (req, res) => {
  const { includeData = 'true' } = req.query

  try {
    const tables = ['users', 'notes', 'comments', 'feedback', 'tags', 'note_tags', 'follows']
    let backup = '-- 数据库备份\n-- 生成时间: ' + new Date().toISOString() + '\n\n'

    for (const table of tables) {
      // 获取表结构
      const columns = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns WHERE table_name = $1
      `, [table])

      // 生成 CREATE TABLE
      backup += `CREATE TABLE ${table} (\n`
      const columnDefs = columns.rows.map(col =>
        `  ${col.column_name} ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ' DEFAULT ' + col.column_default : ''}`
      )
      backup += columnDefs.join(',\n') + '\n);\n\n'

      // 包含数据时生成 INSERT
      if (includeData === 'true') {
        const data = await query(`SELECT * FROM ${table}`)
        for (const row of data.rows) {
          const values = Object.values(row).map(v =>
            v === null ? 'NULL' : typeof v === 'string' ? "'" + v.replace(/'/g, "''") + "'" : v
          ).join(', ')
          backup += `INSERT INTO ${table} VALUES (${values});\n`
        }
      }
      backup += '\n'
    }

    res.json({ success: true, data: { backup } })
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
function startServer() {
  // 直接启动服务器，不等待数据库初始化
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
    if (process.env.NODE_ENV === 'production') {
      logger.info('Running in production mode')
    }
  })
  
  // 后台初始化数据库
  initDb().then(() => {
    console.log('Database initialized successfully')
  }).catch((err) => {
    console.error('Failed to initialize database:', err)
    console.log('Server is running without database initialization...')
  })
}

startServer()
