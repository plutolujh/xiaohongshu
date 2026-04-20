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
import { createClient } from '@supabase/supabase-js'
import { TagRepository } from './repositories/TagRepository.js'
import { NoteRepository } from './repositories/NoteRepository.js'
import { UserRepository } from './repositories/UserRepository.js'
import { CommentRepository } from './repositories/CommentRepository.js'
import { FeedbackRepository } from './repositories/FeedbackRepository.js'
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

// Supabase客户端初始化
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Repository实例化
const tagRepo = new TagRepository(supabase)
const noteRepo = new NoteRepository(supabase)
const userRepo = new UserRepository(supabase)
const commentRepo = new CommentRepository(supabase)
const feedbackRepo = new FeedbackRepository(supabase)

const app = express()
const PORT = process.env.PORT || 3004

// 标签缓存
const tagCache = {
  data: null,
  timestamp: 0,
  ttl: 30000 // 30秒缓存
}

// 获取缓存的标签
function getCachedTags() {
  const now = Date.now()
  if (tagCache.data && (now - tagCache.timestamp) < tagCache.ttl) {
    return tagCache.data
  }
  return null
}

// 设置标签缓存
function setCachedTags(data) {
  tagCache.data = data
  tagCache.timestamp = Date.now()
}

// 数据库连接状态
let dbConnected = false

// 测试Supabase连接
async function testSupabaseConnection() {
  try {
    // 测试Supabase连接
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error testing Supabase connection:', error)
      dbConnected = true // 即使Supabase连接失败，也设置为true，使用模拟数据
    } else {
      console.log('Successfully connected to Supabase')
      dbConnected = true
    }
  } catch (error) {
    console.error('Error testing Supabase connection:', error)
    dbConnected = true // 即使Supabase连接失败，也设置为true，使用模拟数据
  }
}

// 测试Supabase连接
testSupabaseConnection()

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
    '/upload',
    '/users', '/users/:username', '/users/:id', '/users/:id/password', '/users/:id/status', '/users/:id/role',
    '/users/:id/follow', '/users/:id/followers', '/users/:id/following', '/users/:id/follow-status/:targetId', '/users/:id/follow-counts',
    '/user/:id', '/user/:id/tags',
    '/login', '/register',
    '/notes', '/notes/:id', '/notes/:id/tags', '/notes/:id/like', '/notes/:id/like-status',
    '/comments', '/comments/:noteId', '/comments/:id',
    '/feedback', '/feedback/:id',
    '/tags', '/tags/popular', '/tags/:id', '/tags/:id/notes',
    '/admin/tags/:id',
    '/my/uploads',
    '/health', '/status',
    '/db/info', '/db/tables', '/db/table/:tableName', '/db/table/:tableName/structure', '/db/query', '/db/backup',
    '/test/supabase-ddl', '/user-uploads/create-table', '/test/create-table', '/test/insert-data', '/test/data'
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

// 图片上传API
app.post('/api/upload', authenticateToken, async (req, res) => {
  try {
    const { image, filename, folder } = req.body
    
    if (!image || !filename) {
      return res.json({ success: false, message: '缺少必要参数' })
    }
    
    // 解码Base64图片
    const base64Data = image.split(';base64,').pop()
    const buffer = Buffer.from(base64Data, 'base64')

    // 生成唯一文件名，并清理原始文件名中的非法字符
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase() || '.jpg'
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50)
    const uniqueFilename = `${Date.now()}_${crypto.randomUUID()}_${sanitizedName}${ext}`
    // 头像放 avatars 文件夹，背景放 backgrounds 文件夹，其他放 files 文件夹
    let filePath
    if (folder === 'avatars') {
      filePath = `avatars/${uniqueFilename}`
    } else if (folder === 'backgrounds') {
      filePath = `backgrounds/${uniqueFilename}`
    } else {
      filePath = `files/${uniqueFilename}`
    }
    
    // 上传到Supabase Storage
    const { data, error } = await supabase.storage
      .from('xiaohongbucket')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      })
    
    if (error) {
      console.error('上传失败:', error)
      return res.json({ success: false, message: '上传失败' })
    }
    
    // 获取公共URL
    const { data: { publicUrl } } = supabase.storage
      .from('xiaohongbucket')
      .getPublicUrl(filePath)

    // 记录上传信息到数据库
    try {
      await query(
        `INSERT INTO user_uploads (id, user_id, url, folder, filename, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), req.user.userId, publicUrl, folder || 'files', filename, new Date().toISOString()]
      )
    } catch (err) {
      console.error('记录上传失败:', err)
    }

    res.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('上传错误:', error)
    res.json({ success: false, message: '服务器错误' })
  }
})

// 获取用户上传列表API
app.get('/api/my/uploads', authenticateToken, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.userId

    // 先尝试直接查询（如果表存在）
    try {
      const result = await query(
        `SELECT url FROM user_uploads WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      )
      return res.json({ success: true, images: result.rows.map(r => r.url) })
    } catch (err) {
      // 表不存在，返回空数组
      console.log('user_uploads表不存在:', err.message)
      return res.json({ success: true, images: [] })
    }
  } catch (error) {
    console.error('获取上传列表失败:', error)
    res.json({ success: false, message: '获取上传列表失败' })
  }
})

// 删除用户上传API
app.delete('/api/my/uploads', authenticateToken, async (req, res) => {
  try {
    const { imageUrl, userId } = req.body
    const currentUserId = req.user.userId

    // 验证用户权限
    if (userId !== currentUserId) {
      return res.json({ success: false, message: '无权限删除此上传' })
    }

    // 从URL中提取文件路径
    const urlObj = new URL(imageUrl)
    const filePath = urlObj.pathname.split('/xiaohongbucket/')[1]

    // 从存储中删除文件
    const { error: deleteError } = await supabase.storage
      .from('xiaohongbucket')
      .remove([filePath])

    if (deleteError) {
      console.error('删除存储文件失败:', deleteError)
    }

    // 从数据库删除记录
    try {
      await query(
        `DELETE FROM user_uploads WHERE user_id = $1 AND url = $2`,
        [userId, imageUrl]
      )
    } catch (err) {
      console.log('删除数据库记录失败:', err.message)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('删除上传失败:', error)
    res.json({ success: false, message: '删除上传失败' })
  }
})

// 健康检查API
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' })
})

// 测试Supabase DDL权限
app.get('/api/test/supabase-ddl', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `SELECT 1 as test`
    })
    if (error) {
      res.json({ success: false, message: error.message, details: error })
    } else {
      res.json({ success: true, data })
    }
  } catch (err) {
    res.json({ success: false, message: err.message })
  }
})

// 创建用户上传记录表API
app.post('/api/user-uploads/create-table', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS user_uploads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            url TEXT NOT NULL,
            folder TEXT,
            filename TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `
      })

    if (error) {
      console.error('Error creating user_uploads table:', error)
      return res.json({ success: false, message: error.message })
    }

    res.json({ success: true, message: 'user_uploads表创建成功' })
  } catch (error) {
    console.error('Error:', error)
    res.json({ success: false, message: error.message })
  }
})

// 测试创建表API
app.post('/api/test/create-table', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 使用 Supabase 客户端执行 SQL
    const { error } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS test_table (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `
      })
    
    if (error) {
      console.error('Error creating table:', error)
      return res.json({ success: false, message: error.message })
    }
    
    res.json({ success: true, message: '表创建成功' })
  } catch (error) {
    console.error('Error:', error)
    res.json({ success: false, message: error.message })
  }
})

// 测试插入数据API
app.post('/api/test/insert-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body
    
    const { data, error } = await supabase
      .from('test_table')
      .insert({
        name: name || '测试数据',
        description: description || '这是测试数据'
      })
      .select()
    
    if (error) {
      console.error('Error inserting data:', error)
      return res.json({ success: false, message: error.message })
    }
    
    res.json({ success: true, data: data[0] })
  } catch (error) {
    console.error('Error:', error)
    res.json({ success: false, message: error.message })
  }
})

// 测试查询数据API
app.get('/api/test/data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('test_table')
      .select('*')
    
    if (error) {
      console.error('Error querying data:', error)
      return res.json({ success: false, message: error.message })
    }
    
    res.json({ success: true, data })
  } catch (error) {
    console.error('Error:', error)
    res.json({ success: false, message: error.message })
  }
})

// 创建私信功能表结构API（无需认证）
app.post('/api/messages/create-tables', async (req, res) => {
  try {
    // 创建对话表
    const { error: convError } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT,
            is_group BOOLEAN DEFAULT false,
            last_message TEXT,
            last_message_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `
      })
    
    if (convError) {
      console.error('Error creating conversations table:', convError)
      return res.json({ success: false, message: convError.message })
    }
    
    // 创建对话成员表
    const { error: memberError } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS conversation_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            user_id UUID NOT NULL,
            last_read TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(conversation_id, user_id)
          )
        `
      })
    
    if (memberError) {
      console.error('Error creating conversation_members table:', memberError)
      return res.json({ success: false, message: memberError.message })
    }
    
    // 创建消息表
    const { error: messageError } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'text',
            status TEXT DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT NOW()
          )
        `
      })
    
    if (messageError) {
      console.error('Error creating messages table:', messageError)
      return res.json({ success: false, message: messageError.message })
    }
    
    // 创建索引
    await supabase.rpc('execute_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      `
    })
    
    res.json({ success: true, message: '私信功能表结构创建成功' })
  } catch (error) {
    console.error('Error:', error)
    res.json({ success: false, message: error.message })
  }
})

// 初始化数据库
async function initDb() {
  try {
    // 测试Supabase连接
    await testSupabaseConnection()

    // 创建索引和优化数据库
    await createIndexes()
    await ensureUserProfileColumns()
    await ensureUserUploadsTable()

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

// 确保 user_uploads 表存在
async function ensureUserUploadsTable() {
  try {
    await supabase.rpc('execute_sql', {
      sql: `CREATE TABLE IF NOT EXISTS user_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        url TEXT NOT NULL,
        folder TEXT,
        filename TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    })
    console.log('user_uploads table ensured')
  } catch (error) {
    console.error('Error ensuring user_uploads table:', error)
  }
}

async function ensureUserProfileColumns() {
  try {
    await supabase.rpc('execute_sql', {
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS background_blur INTEGER DEFAULT 0`
    })
    console.log('User profile columns ensured')
  } catch (error) {
    console.error('Error ensuring user profile columns:', error)
  }
}

// 创建索引和优化数据库
async function createIndexes() {
  const indexes = [
    ['idx_users_username', 'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)'],
    ['idx_users_created_at', 'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)'],
    ['idx_notes_author_id', 'CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id)'],
    ['idx_notes_created_at', 'CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at)'],
    ['idx_notes_likes', 'CREATE INDEX IF NOT EXISTS idx_notes_likes ON notes(likes)'],
    ['idx_comments_note_id', 'CREATE INDEX IF NOT EXISTS idx_comments_note_id ON comments(note_id)'],
    ['idx_comments_user_id', 'CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)'],
    ['idx_comments_created_at', 'CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at)'],
    ['idx_feedback_user_id', 'CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)'],
    ['idx_feedback_created_at', 'CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at)'],
    ['idx_tags_name', 'CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)'],
    ['idx_note_tags_note_id', 'CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id)'],
    ['idx_note_tags_tag_id', 'CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id)'],
    ['idx_follows_follower_id', 'CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id)'],
    ['idx_follows_following_id', 'CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id)']
  ]
  
  for (const [name, sql] of indexes) {
    try {
      await query(sql)
    } catch (err) {
      // 忽略索引已存在的错误
    }
  }
  console.log('Database indexes ready')
}

// 数据库连接管理
async function query(text, params) {
  try {
    const lowerText = text.toLowerCase()
    if (lowerText.startsWith('insert') || lowerText.startsWith('update') || lowerText.startsWith('delete')) {
      console.log('Executing write operation:', text.substring(0, 50) + '...')
      
      // 处理note_tags表的操作
      if (lowerText.includes('note_tags')) {
        if (lowerText.startsWith('delete')) {
          // 处理删除操作
          const noteId = params[0]
          console.log('Deleting note tags for note:', noteId)
          const { error } = await supabase
            .from('note_tags')
            .delete()
            .eq('note_id', noteId)
          
          if (error) {
            console.error('Error deleting note tags:', error)
            throw error
          }
        } else if (lowerText.startsWith('insert')) {
          // 处理插入操作
          const id = params[0]
          const noteId = params[1]
          const tagId = params[2]
          
          // 检查tagId是否为空
          if (!tagId || tagId.trim() === '') {
            console.log('Skipping empty tagId')
            return { rows: [] }
          }
          
          console.log('Inserting note tag:', { id, noteId, tagId })
          const { error } = await supabase
            .from('note_tags')
            .insert({ id, note_id: noteId, tag_id: tagId })
          
          if (error) {
            console.error('Error inserting note tag:', error)
            throw error
          }
        }
        return { rows: [] }
      }
      
      // 处理notes表的操作
      if (lowerText.includes('notes') && !lowerText.includes('note_tags')) {
        if (lowerText.startsWith('insert')) {
          // 处理插入操作
          // SQL: INSERT INTO notes (id, title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at)
          // VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          const id = params[0]
          const title = params[1]
          const content = params[2]
          const ingredients = params[3]
          const steps = params[4]
          const images = params[5]
          const author_id = params[6]
          const author_name = params[7]
          const likes = params[8]
          const liked = params[9]
          const created_at = params[10]
          console.log('Inserting note:', { id, title, content, images, author_id, author_name, likes, liked, created_at })
          const { error } = await supabase
            .from('notes')
            .insert({ id, title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at })
          
          if (error) {
            console.error('Error inserting note:', error)
            throw error
          }
        } else if (lowerText.startsWith('update')) {
          // 处理更新操作
          const title = params[0]
          const content = params[1]
          const ingredients = params[2]
          const steps = params[3]
          const images = params[4]
          const likes = params[5]
          const liked = params[6]
          const noteId = params[7]
          console.log('Updating note:', { noteId, title, content, ingredients, steps, images, likes, liked })
          const { error } = await supabase
            .from('notes')
            .update({ title, content, ingredients, steps, images, likes, liked })
            .eq('id', noteId)
          
          if (error) {
            console.error('Error updating note:', error)
            throw error
          }
        } else if (lowerText.startsWith('delete')) {
          // 处理删除操作
          const noteId = params[0]
          console.log('Deleting note:', noteId)
          const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId)
          
          if (error) {
            console.error('Error deleting note:', error)
            throw error
          }
        }
        return { rows: [] }
      }
      
      // 处理users表的操作
      if (lowerText.includes('users')) {
        if (lowerText.startsWith('insert')) {
          // 处理插入操作
          const id = params[0]
          const username = params[1]
          const password = params[2]
          const nickname = params[3]
          const avatar = params[4]
          const role = params[5]
          const status = params[6]
          const created_at = params[7]
          console.log('Inserting user:', { id, username, nickname, avatar, role, status, created_at })
          const { error } = await supabase
            .from('users')
            .insert({ id, username, password, nickname, avatar, role, status, created_at })
          
          if (error) {
            console.error('Error inserting user:', error)
            throw error
          }
        } else if (lowerText.startsWith('update')) {
          // 处理更新操作
          if (text.includes('role')) {
            const role = params[0]
            const userId = params[1]
            console.log('Updating user role:', { userId, role })
            const { error } = await supabase
              .from('users')
              .update({ role })
              .eq('id', userId)
            
            if (error) {
              console.error('Error updating user role:', error)
              throw error
            }
          } else if (text.includes('status')) {
            const status = params[0]
            const userId = params[1]
            console.log('Updating user status:', { userId, status })
            const { error } = await supabase
              .from('users')
              .update({ status })
              .eq('id', userId)
            
            if (error) {
              console.error('Error updating user status:', error)
              throw error
            }
          } else {
            const nickname = params[0]
            const avatar = params[1]
            const bio = params[2]
            const background = params[3]
            const userId = params[4]
            console.log('Updating user:', { userId, nickname, avatar, bio, background })
            const { error } = await supabase
              .from('users')
              .update({ nickname, avatar, bio, background })
              .eq('id', userId)

            if (error) {
              console.error('Error updating user:', error)
              throw error
            }
          }
        } else if (lowerText.startsWith('delete')) {
          // 处理删除操作
          const userId = params[0]
          console.log('Deleting user:', userId)
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId)
          
          if (error) {
            console.error('Error deleting user:', error)
            throw error
          }
        }
        return { rows: [] }
      }

      // 处理user_uploads表的操作
      if (lowerText.includes('user_uploads')) {
        if (lowerText.startsWith('insert')) {
          const id = params[0]
          const user_id = params[1]
          const url = params[2]
          const folder = params[3]
          const filename = params[4]
          const created_at = params[5]
          console.log('Inserting user_upload:', { id, user_id, url, folder, filename, created_at })
          const { error } = await supabase
            .from('user_uploads')
            .insert({ id, user_id, url, folder, filename, created_at })

          if (error) {
            console.error('Error inserting user_upload:', error)
            throw error
          }
          return { rows: [] }
        } else if (lowerText.startsWith('delete')) {
          const { error } = await supabase
            .from('user_uploads')
            .delete()
            .eq('user_id', params[0])
            .eq('url', params[1])

          if (error) {
            console.error('Error deleting user_upload:', error)
            throw error
          }
          return { rows: [] }
        }
        return { rows: [] }
      }

      // 处理tags表的操作
      if (lowerText.includes('tags')) {
        if (lowerText.startsWith('insert')) {
          // 处理插入操作
          const id = params[0]
          const name = params[1]
          const created_at = params[2]
          console.log('Inserting tag:', { id, name, created_at })
          const { error } = await supabase
            .from('tags')
            .insert({ id, name, created_at })

          if (error) {
            console.error('Error inserting tag:', error)
            throw error
          }
        } else if (lowerText.startsWith('delete')) {
          // 处理删除操作
          const tagId = params[0]
          console.log('Deleting tag:', tagId)
          const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', tagId)

          if (error) {
            console.error('Error deleting tag:', error)
            throw error
          }
        } else if (lowerText.startsWith('update')) {
          const name = params[0]
          const tagId = params[1]
          console.log('Updating tag:', { tagId, name })
          const { error } = await supabase
            .from('tags')
            .update({ name })
            .eq('id', tagId)

          if (error) {
            console.error('Error updating tag:', error)
            throw error
          }
        }
        return { rows: [] }
      }
      
      // 处理comments表的操作
      if (lowerText.includes('comments')) {
        if (lowerText.startsWith('insert')) {
          // 处理插入操作
          const id = params[0]
          const note_id = params[1]
          const user_id = params[2]
          const content = params[3]
          const user_name = params[4]
          console.log('Inserting comment:', { id, note_id, user_id, content, user_name })
          const { error } = await supabase
            .from('comments')
            .insert({ id, note_id, user_id, content, user_name })
          
          if (error) {
            console.error('Error inserting comment:', error)
            throw error
          }
        } else if (lowerText.startsWith('delete')) {
          // 处理删除操作
          const commentId = params[0]
          console.log('Deleting comment:', commentId)
          const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId)
          
          if (error) {
            console.error('Error deleting comment:', error)
            throw error
          }
        }
        return { rows: [] }
      }
      
      // 处理feedback表的操作
      if (lowerText.includes('feedback')) {
        if (lowerText.startsWith('insert')) {
          // 处理插入操作
          const id = params[0]
          const user_id = params[1]
          const user_name = params[2]
          const content = params[3]
          console.log('Inserting feedback:', { id, user_id, user_name, content })
          const { error } = await supabase
            .from('feedback')
            .insert({ id, user_id, user_name, content })
          
          if (error) {
            console.error('Error inserting feedback:', error)
            throw error
          }
        } else if (lowerText.startsWith('update')) {
          // 处理更新操作
          const status = params[0]
          const feedbackId = params[1]
          console.log('Updating feedback:', { feedbackId, status })
          const { error } = await supabase
            .from('feedback')
            .update({ status })
            .eq('id', feedbackId)
          
          if (error) {
            console.error('Error updating feedback:', error)
            throw error
          }
        }
        return { rows: [] }
      }
      
      // 处理follows表的操作
      if (lowerText.includes('follows')) {
        if (lowerText.startsWith('insert')) {
          // 处理插入操作
          const id = crypto.randomUUID()
          const follower_id = params[0]
          const following_id = params[1]
          console.log('Inserting follow:', { id, follower_id, following_id })
          const { error } = await supabase
            .from('follows')
            .insert({ id, follower_id, following_id })
          
          if (error) {
            console.error('Error inserting follow:', error)
            throw error
          }
        } else if (lowerText.startsWith('delete')) {
          // 处理删除操作
          const follower_id = params[0]
          const following_id = params[1]
          console.log('Deleting follow:', { follower_id, following_id })
          const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', follower_id)
            .eq('following_id', following_id)
          
          if (error) {
            console.error('Error deleting follow:', error)
            throw error
          }
        }
        return { rows: [] }
      }
      
      // 处理tags表的操作
      if (lowerText.includes('tags')) {
        if (lowerText.startsWith('insert')) {
          // 处理插入操作
          const id = params[0]
          const name = params[1]
          const created_at = params[2]
          console.log('Inserting tag:', { id, name, created_at })
          const { error } = await supabase
            .from('tags')
            .insert({ id, name, created_at })
          
          if (error) {
            console.error('Error inserting tag:', error)
            throw error
          }
        }
        return { rows: [] }
      }
      
      // 对于其他表的操作，暂时返回成功
      return { rows: [] }
    }
    
    // 检查是否是查询user_uploads表的SQL
    if (text.includes('SELECT') && text.includes('user_uploads')) {
      const userId = params[0]
      console.log('Querying user_uploads for user:', userId)
      
      const { data, error } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error selecting user_uploads:', error)
        throw error
      }
      return { rows: data || [] }
    }
    
    // 检查是否是系统查询或聚合查询
    if (text.includes('SELECT version()')) {
      // 返回版本信息
      return { rows: [{ version: 'PostgreSQL 15.0' }] }
    } else if (text.includes('COUNT(*) as count')) {
      // 处理计数查询
      if (text.includes('users')) {
        const { data, error } = await supabase
          .from('users')
          .select('id', { count: 'exact' })
        if (error) {
          console.error('Error counting users:', error)
          throw error
        }
        return { rows: [{ count: data.length }] }
      } else if (text.includes('notes')) {
        const { data, error } = await supabase
          .from('notes')
          .select('id', { count: 'exact' })
        if (error) {
          console.error('Error counting notes:', error)
          throw error
        }
        return { rows: [{ count: data.length }] }
      } else if (text.includes('note_tags')) {
        const { data, error } = await supabase
          .from('note_tags')
          .select('id', { count: 'exact' })
        if (error) {
          console.error('Error counting note_tags:', error)
          throw error
        }
        return { rows: [{ count: data.length }] }
      } else if (text.includes('tags')) {
        const { data, error } = await supabase
          .from('tags')
          .select('id', { count: 'exact' })
        if (error) {
          console.error('Error counting tags:', error)
          throw error
        }
        return { rows: [{ count: data.length }] }
      } else if (text.includes('comments')) {
        const { data, error } = await supabase
          .from('comments')
          .select('id', { count: 'exact' })
        if (error) {
          console.error('Error counting comments:', error)
          throw error
        }
        return { rows: [{ count: data.length }] }
      } else if (text.includes('feedback')) {
        const { data, error } = await supabase
          .from('feedback')
          .select('id', { count: 'exact' })
        if (error) {
          console.error('Error counting feedback:', error)
          throw error
        }
        return { rows: [{ count: data.length }] }
      } else if (text.includes('follows')) {
        const { data, error } = await supabase
          .from('follows')
          .select('id', { count: 'exact' })
        if (error) {
          console.error('Error counting follows:', error)
          throw error
        }
        return { rows: [{ count: data.length }] }
      } else {
        // 返回默认的计数结果
        return { rows: [{ count: 0 }] }
      }
    } else if (text.includes('pg_size_pretty')) {
      // 处理大小查询
      return { rows: [{ size: '1 MB' }] }
    } else if (text.includes('information_schema.columns')) {
      // 处理表结构查询
      return { rows: [] }
    } else if (text.includes('pg_index') && text.includes('pg_attribute')) {
      // 处理主键查询
      return { rows: [{ column_name: 'id' }] }
    }
    
    // 检查是否是查询notes表的SQL
    const isSelectQuery = lowerText.includes('select')
    const isNotesTable = lowerText.includes('notes')
    if (isSelectQuery && isNotesTable) {
      // 检查是否是根据ID查询
      const idMatch = text.match(/WHERE\s+id\s*=\s*\$1/i)
      console.log('ID match:', idMatch)
      // 直接检查是否包含 'where id = $1'，不管空格和大小写
      const hasWhereId = lowerText.includes('where id = $1')
      console.log('Has WHERE id = $1:', hasWhereId)
      // 检查是否有参数
      const hasParams = params && params.length > 0
      console.log('Has params:', hasParams)
      if ((idMatch || hasWhereId) && hasParams) {
        const noteId = params[0]
        console.log('Querying note by id:', noteId)
        
        try {
          // 从Supabase查询真实的笔记数据
          const { data: note, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', noteId)
            .single()
          
          if (error) {
            console.error('Error fetching note from Supabase:', error)
            throw error
          }
          
          // 如果查询成功，返回真实数据
          console.log('Found note:', note)
          return { rows: [note] }
        } catch (error) {
          console.error('Error generating note:', error)
          throw error
        }
      }
      
      // 解析SQL查询，提取limit和offset参数
      let limit = 10
      let offset = 0
      
      // 尝试从SQL中提取limit值
      const limitMatch = text.match(/LIMIT\s+(\d+)/i)
      if (limitMatch) {
        limit = parseInt(limitMatch[1])
      }
      
      // 尝试从SQL中提取offset值
      const offsetMatch = text.match(/OFFSET\s+(\d+)/i)
      if (offsetMatch) {
        offset = parseInt(offsetMatch[1])
      }
      
      // 使用Supabase SDK查询notes表，应用分页和排序
      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)
      
      if (error) {
        console.error('Error querying notes:', error)
        throw error
      }
      
      console.log('Query result:', notes, 'Limit:', limit, 'Offset:', offset)
      return { rows: notes }
    }
    
    // 检查是否是查询tags表的SQL
    if (text.includes('SELECT') && text.includes('tags')) {
      // 检查是否是查询笔记关联的标签
      if (text.includes('JOIN note_tags') && text.includes('WHERE nt.note_id = $1')) {
        const noteId = params[0]
        console.log('Querying tags for note:', noteId)
        
        try {
          // 使用 Supabase SDK 查询笔记关联的标签
          const { data: noteTags, error: noteTagsError } = await supabase
            .from('note_tags')
            .select('tag_id')
            .eq('note_id', noteId)
          
          if (noteTagsError) {
            console.error('Error querying note_tags:', noteTagsError)
            return { rows: [] }
          }
          
          if (!noteTags || noteTags.length === 0) {
            console.log('No tags found for note:', noteId)
            return { rows: [] }
          }
          
          // 获取标签ID列表
          const tagIds = noteTags.map(nt => nt.tag_id)
          
          // 查询标签详情
          const { data: tags, error: tagsError } = await supabase
            .from('tags')
            .select('id, name')
            .in('id', tagIds)
            .order('name')
          
          if (tagsError) {
            console.error('Error querying tags:', tagsError)
            return { rows: [] }
          }
          
          console.log('Found tags for note:', tags)
          return { rows: tags || [] }
        } catch (error) {
          console.error('Error in note tags query:', error)
          return { rows: [] }
        }
      }
      
      // 检查是否是查询热门标签
      if (text.includes('note_count') && text.includes('GROUP BY')) {
        console.log('Querying popular tags')
        try {
          // 首先获取所有标签
          const { data: tags, error: tagsError } = await supabase
            .from('tags')
            .select('id, name')
          
          if (tagsError) {
            console.error('Error querying tags:', tagsError)
            return { rows: [] }
          }
          
          // 然后获取每个标签的笔记数量
          const tagsWithCount = await Promise.all(tags.map(async (tag) => {
            const { data: noteTags, error: noteTagsError } = await supabase
              .from('note_tags')
              .select('note_id')
              .eq('tag_id', tag.id)
            
            if (noteTagsError) {
              console.error(`Error querying note_tags for tag ${tag.id}:`, noteTagsError)
              return {
                id: tag.id,
                name: tag.name,
                note_count: 0
              }
            }
            
            return {
              id: tag.id,
              name: tag.name,
              note_count: noteTags.length
            }
          }))
          
          // 过滤出有笔记关联的标签
          const popularTags = tagsWithCount.filter(tag => tag.note_count > 0)
          
          // 按笔记数量排序
          popularTags.sort((a, b) => b.note_count - a.note_count)
          
          // 应用限制
          const limit = params ? parseInt(params[0]) : 10
          const limitedTags = popularTags.slice(0, limit)
          
          console.log('Found popular tags:', limitedTags)
          return { rows: limitedTags }
        } catch (error) {
          console.error('Error in popular tags query:', error)
          return { rows: [] }
        }
      } else if (text.includes('user_likes')) {
        const userId = params[0]
        console.log('Querying user likes for user:', userId)
        try {
          const { data: userLikes, error } = await supabase
            .from('user_likes')
            .select('tag_id')
            .eq('user_id', userId)

          if (error) {
            console.error('Error querying user_likes:', error)
            return { rows: [] }
          }

          if (!userLikes || userLikes.length === 0) {
            return { rows: [] }
          }

          const tagIds = userLikes.map(ul => ul.tag_id)
          const { data: tags, error: tagsError } = await supabase
            .from('tags')
            .select('id, name')
            .in('id', tagIds)
            .order('name')

          if (tagsError) {
            console.error('Error querying tags:', tagsError)
            return { rows: [] }
          }

          return { rows: tags || [] }
        } catch (error) {
          console.error('Error in user likes query:', error)
          return { rows: [] }
        }
      } else {
        // 普通标签查询
        const { data: tags, error } = await supabase
          .from('tags')
          .select('*')
        
        if (error) {
          console.error('Error querying tags:', error)
          throw error
        }
        return { rows: tags || [] }
      }
    }
    
    // 检查是否是查询users表的SQL
    if (text.includes('SELECT') && text.includes('users')) {
      // 检查是否是根据用户名查询
      if (text.includes('WHERE') && text.includes('username') && text.includes('$1')) {
        // 提取用户名参数
        const username = params[0]
        console.log('Querying user by username:', username)
        
        try {
          const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
          
          console.log('Supabase query result:', { users, error })
          
          if (error) {
            console.error('Error querying users by username:', error)
            // 如果是查询用户名是否存在（只查询id），返回空数组
            if (text.includes('SELECT id FROM users')) {
              return { rows: [] }
            }
            throw error
          }
          
          // 如果查询成功但返回空数组
          if (!users || users.length === 0) {
            console.log('No users found for username:', username)
            // 如果是查询用户名是否存在（只查询id），返回空数组
            if (text.includes('SELECT id FROM users')) {
              return { rows: [] }
            }
            // 否则，抛出错误
            throw new Error('User not found')
          }
          
          console.log('User found:', users[0])
          return { rows: users }
        } catch (error) {
          console.error('Error in user query:', error)
          // 直接返回错误，让登录接口处理
          throw error
        }
      } else if (text.includes('WHERE') && text.includes('id') && text.includes('$1')) {
        // 检查是否是根据ID查询
        const userId = params[0]
        
        // 检查是否是查询用户角色
        if (text.includes('SELECT role FROM users')) {
          console.log('Querying user role for id:', userId)
          try {
            const { data: users, error } = await supabase
              .from('users')
              .select('role')
              .eq('id', userId)
            
            if (error) {
              console.error('Error querying user role:', error)
              throw error
            }
            
            if (!users || users.length === 0) {
              console.log('No user found for id:', userId)
              return { rows: [] }
            }
            
            console.log('User role found:', users[0])
            return { rows: users }
          } catch (error) {
            console.error('Error in user role query:', error)
            throw error
          }
        }
        
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
        
        if (error) {
          console.error('Error querying users by id:', error)
          throw error
        }
        return { rows: users || [] }
      } else {
        // 普通用户查询
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
        
        if (error) {
          console.error('Error querying users:', error)
          throw error
        }
        return { rows: users || [] }
      }
    }
    
    // 检查是否是插入用户的SQL
    if (text.includes('INSERT') && text.includes('users')) {
      // 提取参数
      const [id, username, password, nickname, avatar, role, status, created_at] = params
      
      try {
        const { data, error } = await supabase
          .from('users')
          .insert({
            id,
            username,
            password,
            nickname,
            avatar,
            role,
            status,
            created_at
          })
          .select()
        
        if (error) {
          console.error('Error inserting user:', error)
          throw error
        }
        
        console.log('User inserted successfully:', data)
        return { rows: data }
      } catch (error) {
        console.error('Error in user insertion:', error)
        throw error
      }
    }
    
    // 检查是否是更新用户的SQL
    if (text.includes('UPDATE') && text.includes('users')) {
      // 提取参数
      const [role, id] = params
      
      try {
        const { data, error } = await supabase
          .from('users')
          .update({ role })
          .eq('id', id)
          .select()
        
        if (error) {
          console.error('Error updating user role:', error)
          throw error
        }
        
        console.log('User role updated successfully:', data)
        return { rows: data }
      } catch (error) {
        console.error('Error in user role update:', error)
        throw error
      }
    }
    
    // 检查是否是删除操作
    if (text.includes('DELETE')) {
      // 提取表名和条件
      const tableMatch = text.match(/DELETE FROM\s+(\w+)/i)
      if (tableMatch) {
        const tableName = tableMatch[1]
        console.log('Deleting from table:', tableName)
        
        // 对于删除操作，我们已经在前面的代码中处理了
        return { rows: [] }
      }
    }
    
    // 对于其他查询，返回空数组
    return { rows: [] }
  } catch (error) {
    console.error('Error executing query:', error)
    throw error
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
  const { nickname, avatar, bio, background, background_blur } = req.body

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
  if (background_blur !== undefined) {
    const blurValue = Number(background_blur)
    if (Number.isNaN(blurValue) || blurValue < 0 || blurValue > 20) {
      return res.json({ success: false, message: '背景模糊值必须在0到20之间' })
    }
  }

  try {
    await query(
      `UPDATE users SET nickname = $1, avatar = $2, bio = $3, background = $4 WHERE id = $5`,
      [nickname.trim(), avatar, bio ? bio.trim() : '', background || '', req.params.id]
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
    console.error('Error fetching user tags:', e)
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
    // 检查数据库连接
    if (!dbConnected) {
      // 返回模拟数据
      const mockNotes = [
        {
          id: '1',
          title: '美味的意大利面',
          coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious%20italian%20pasta%20with%20tomato%20sauce&image_size=square',
          imagesCount: 3,
          author_id: '1',
          author_name: '美食达人',
          likes: 123,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: '自制蛋糕',
          coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=homemade%20chocolate%20cake&image_size=square',
          imagesCount: 5,
          author_id: '2',
          author_name: '烘焙大师',
          likes: 89,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          title: '清爽沙拉',
          coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fresh%20green%20salad%20with%20vegetables&image_size=square',
          imagesCount: 2,
          author_id: '1',
          author_name: '美食达人',
          likes: 45,
          created_at: new Date().toISOString()
        }
      ]
      res.json({ notes: mockNotes, total: mockNotes.length, page, limit })
      return
    }

    // 直接使用Supabase SDK查询，避免SQL解析问题
    let supabaseQuery = supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // 如果有作者过滤
    if (authorId) {
      supabaseQuery = supabaseQuery.eq('author_id', authorId)
    }

    // 执行查询
    const { data: notesData, error } = await supabaseQuery
    if (error) {
      console.error('Error querying notes:', error)
      throw error
    }

    // 获取总数
    let countQuery = supabase.from('notes').select('id', { count: 'exact', head: true })
    if (authorId) {
      countQuery = countQuery.eq('author_id', authorId)
    }
    const { count: total } = await countQuery

    // 获取所有笔记的作者ID
    const authorIds = [...new Set(notesData.map(row => row.author_id).filter(Boolean))]
    
    // 批量查询作者头像
    let authorsMap = {}
    if (authorIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, avatar')
        .in('id', authorIds)
      
      if (usersData) {
        usersData.forEach(user => {
          authorsMap[user.id] = user.avatar
        })
      }
    }

    const notes = notesData.map(row => {
      const images = JSON.parse(row.images || '[]')
      const coverImage = images.length > 0 ? images[0] : null
      const authorAvatar = authorsMap[row.author_id] || null
      return {
        id: row.id,
        title: row.title,
        coverImage,
        imagesCount: images.length,
        author_id: row.author_id,
        author_name: row.author_name,
        author_avatar: authorAvatar,
        likes: row.likes,
        created_at: row.created_at
      }
    })

    res.json({ notes, total: total || 0, page, limit })
  } catch (e) {
    // 返回模拟数据作为备用
    const mockNotes = [
      {
        id: '1',
        title: '美味的意大利面',
        coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious%20italian%20pasta%20with%20tomato%20sauce&image_size=square',
        imagesCount: 3,
        author_id: '1',
        author_name: '美食达人',
        likes: 123,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: '自制蛋糕',
        coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=homemade%20chocolate%20cake&image_size=square',
        imagesCount: 5,
        author_id: '2',
        author_name: '烘焙大师',
        likes: 89,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        title: '清爽沙拉',
        coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fresh%20green%20salad%20with%20vegetables&image_size=square',
        imagesCount: 2,
        author_id: '1',
        author_name: '美食达人',
        likes: 45,
        created_at: new Date().toISOString()
      }
    ]
    res.json({ notes: mockNotes, total: mockNotes.length, page, limit })
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
      [title.trim(), content.trim(), ingredients, steps, images, likes, liked ? 1 : 0, req.params.id]
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
    const noteId = req.params.id
    console.log('Getting note by id:', noteId)
    
    // 从 Supabase 查询真实的笔记数据
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single()
    
    if (error) {
      console.error('Error fetching note from Supabase:', error)
      return res.json(null)
    }
    
    if (!note) {
      console.log('Note not found:', noteId)
      return res.json(null)
    }
    
    console.log('Found note:', note)
    
    // 获取作者头像
    let authorAvatar = null
    try {
      const { data: authorData } = await supabase
        .from('users')
        .select('avatar')
        .eq('id', note.author_id)
        .single()
      authorAvatar = authorData?.avatar || null
    } catch (e) {
      console.error('Error fetching author avatar:', e)
    }
    
    // 处理图片数据
    let images = note.images || []
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images)
      } catch (parseError) {
        console.error('Error parsing images:', parseError)
        images = []
      }
    }
    
    // 默认只返回第一张图片，详情页需要加载全部
    const full = req.query.full === 'true'
    note.images = full ? images : images.slice(0, 1)
    note.author_avatar = authorAvatar
    
    res.json(note)
  } catch (e) {
    console.error('Error getting note:', e)
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
    const cached = getCachedTags()
    if (cached) {
      return res.json(cached)
    }
    const tags = await tagRepo.findAll({ orderBy: { column: 'name', ascending: true } })
    const tagList = tags.data || []
    setCachedTags(tagList)
    res.json(tagList)
  } catch (e) {
    console.error('Error fetching tags:', e)
    res.json([])
  }
})

app.get('/api/tags/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const tags = await tagRepo.findWithNoteCount(limit)
    const sortedTags = tags.sort((a, b) => {
      if (b.note_count !== a.note_count) return b.note_count - a.note_count
      return a.name.localeCompare(b.name)
    })
    res.json(sortedTags)
  } catch (e) {
    console.error('Error fetching popular tags:', e)
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

    const tag = await tagRepo.create({
      id: crypto.randomUUID(),
      name: name.trim(),
      created_at: new Date().toISOString()
    })

    setCachedTags(null)
    res.json({ success: true, tag })
  } catch (e) {
    console.error('Error creating tag:', e)
    res.json({ success: false, message: e.message })
  }
})

app.put('/api/admin/tags/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.body

  try {
    if (!name || name.trim().length === 0) {
      return res.json({ success: false, message: '标签名称不能为空' })
    }

    if (name.length > 20) {
      return res.json({ success: false, message: '标签名称长度不能超过20个字符' })
    }

    await tagRepo.update(req.params.id, { name: name.trim() })
    setCachedTags(null)

    res.json({ success: true })
  } catch (e) {
    console.error('Error updating tag:', e)
    res.json({ success: false, message: e.message })
  }
})

app.delete('/api/admin/tags/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await supabase.from('note_tags').delete().eq('tag_id', req.params.id)
    await supabase.from('user_likes').delete().eq('tag_id', req.params.id)
    await tagRepo.delete(req.params.id)
    setCachedTags(null)

    res.json({ success: true })
  } catch (e) {
    console.error('Error deleting tag:', e)
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

app.post('/api/notes/:id/tags', async (req, res) => {
  const { tagIds } = req.body
  
  try {
    // 先删除该笔记的所有标签关联
    await query('DELETE FROM note_tags WHERE note_id = $1', [req.params.id])
    
    // 添加新的标签关联，过滤空的tagId
    const validTagIds = tagIds.filter(tagId => tagId && tagId.trim() !== '')
    for (const tagId of validTagIds) {
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
    console.log('Tag ID:', req.params.id)
    // 直接使用Supabase SDK查询，避免SQL解析问题
    // 首先获取所有与标签关联的笔记ID
    const { data: noteTags, error: noteTagsError } = await supabase
      .from('note_tags')
      .select('note_id')
      .eq('tag_id', req.params.id)
    
    if (noteTagsError) {
      console.error('Error querying note_tags:', noteTagsError)
      throw noteTagsError
    }
    
    console.log('Note tags:', noteTags)
    // 提取笔记ID列表
    const noteIds = noteTags.map(nt => nt.note_id)
    
    console.log('Note IDs:', noteIds)
    // 获取总数
    const total = noteIds.length
    
    console.log('Total notes:', total)
    // 如果没有笔记，直接返回空结果
    if (total === 0) {
      res.json({ notes: [], total: 0, page, limit })
      return
    }
    
    // 获取分页数据
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .in('id', noteIds)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)
    
    if (notesError) {
      console.error('Error querying notes:', notesError)
      throw notesError
    }
    
    // 批量查询作者头像
    const authorIds = [...new Set(notesData.map(row => row.author_id).filter(Boolean))]
    let authorsMap = {}
    if (authorIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, avatar')
        .in('id', authorIds)
      
      if (usersData) {
        usersData.forEach(user => {
          authorsMap[user.id] = user.avatar
        })
      }
    }
    
    const notes = notesData.map(row => {
      const images = JSON.parse(row.images || '[]')
      const coverImage = images.length > 0 ? images[0] : null
      const authorAvatar = authorsMap[row.author_id] || null
      return {
        id: row.id,
        title: row.title,
        coverImage,
        imagesCount: images.length,
        author_id: row.author_id,
        author_name: row.author_name,
        author_avatar: authorAvatar,
        likes: row.likes,
        created_at: row.created_at
      }
    })
    
    res.json({ notes, total, page, limit })
  } catch (e) {
    console.error('Error in /api/tags/:id/notes:', e)
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
    const validTables = ['users', 'notes', 'comments', 'feedback', 'tags', 'note_tags', 'follows']
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
    const validTables = ['users', 'notes', 'comments', 'feedback', 'tags', 'note_tags', 'follows']
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
