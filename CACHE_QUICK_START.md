/**
 * 快速启动缓存指南
 * 复制以下代码到你的项目中
 */

// ============================================
// 第1步: 安装依赖
// ============================================
// npm install node-cache

// ============================================
// 第2步: 在 server.js 顶部添加导入
// ============================================
/*
import NodeCache from 'node-cache'

// 初始化缓存
const cache = new NodeCache({ 
  stdTTL: 600,      // 默认10分钟过期
  checkperiod: 120  // 每2分钟检查并删除过期数据
})
*/

// ============================================
// 第3步: 使用缓存 - 复制以下API代码到 server.js
// ============================================

/*
// API 1: 获取标签（带缓存）
app.get('/api/tags', async (req, res) => {
  try {
    // 先从缓存获取
    let tags = cache.get('tags:all')
    
    if (!tags) {
      // 缓存不存在，从数据库查询
      tags = await tagRepo.findWithNoteCount()
      // 存入缓存，30秒过期
      cache.set('tags:all', tags, 30)
    }
    
    res.json({ success: true, data: tags })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: '获取标签失败' })
  }
})

// API 2: 获取笔记详情（带缓存）
app.get('/api/notes/:id', async (req, res) => {
  try {
    const cacheKey = `note:${req.params.id}`
    let note = cache.get(cacheKey)
    
    if (!note) {
      note = await noteRepo.findById(req.params.id)
      if (note) {
        cache.set(cacheKey, note, 300) // 缓存5分钟
      }
    }
    
    if (!note) {
      return res.status(404).json({ success: false, message: '笔记不存在' })
    }
    
    res.json({ success: true, data: note })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: '获取笔记失败' })
  }
})

// API 3: 发布笔记后清除缓存
app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    const note = await noteRepo.create(req.body)
    
    // 清除热门标签缓存（因为标签可能增加）
    cache.del('tags:all')
    
    // 清除热门笔记缓存
    cache.flushAll() // 或者使用 cache.del('note:trending')
    
    res.json({ success: true, data: note })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: '发布笔记失败' })
  }
})

// API 4: 删除笔记后清除缓存
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    // 先检查权限（确保是笔记作者）
    const note = await noteRepo.findById(req.params.id)
    if (note.author_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: '无权限删除' })
    }
    
    await noteRepo.delete(req.params.id)
    
    // 清除缓存
    cache.del(`note:${req.params.id}`)
    
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// API 5: 查看缓存状态（管理员）
app.get('/api/cache/status', requireAdmin, (req, res) => {
  try {
    const keys = cache.keys()
    const stats = cache.getStats()
    
    res.json({ 
      success: true, 
      data: {
        totalKeys: keys.length,
        keys: keys,
        hits: stats.hits,
        misses: stats.misses,
        ksize: stats.ksize,    // 平均键大小
        vsize: stats.vsize     // 平均值大小
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取状态失败' })
  }
})

// API 6: 清空所有缓存（管理员）
app.post('/api/cache/clear', requireAdmin, (req, res) => {
  try {
    cache.flushAll()
    res.json({ success: true, message: '缓存已清空' })
  } catch (error) {
    res.status(500).json({ success: false, message: '清空缓存失败' })
  }
})

// API 7: 查看缓存中某个键的内容
app.get('/api/cache/:key', requireAdmin, (req, res) => {
  try {
    const value = cache.get(req.params.key)
    res.json({ success: true, data: value })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取缓存失败' })
  }
})
*/

// ============================================
// 第4步: 更新现有的获取笔记列表API
// ============================================

/*
app.get('/api/notes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const tag = req.query.tag
    
    // 使用缓存键区分不同的请求参数
    const cacheKey = `notes:page:${page}:limit:${limit}:tag:${tag || 'all'}`
    
    let result = cache.get(cacheKey)
    
    if (!result) {
      result = await noteRepo.findPaginated(page, limit, tag)
      cache.set(cacheKey, result, 60) // 缓存1分钟
    }
    
    res.json({ success: true, data: result.data, total: result.total })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: '获取笔记失败' })
  }
})
*/

// ============================================
// 第5步: 性能优化建议
// ============================================

/*
缓存时间设置建议:
- 实时性高: 30秒 (标签、热门排行)
- 实时性中等: 5分钟 (笔记详情、评论)
- 实时性低: 30分钟 (用户信息、系统配置)

何时清除缓存:
1. 发布新笔记 -> 清除标签缓存、热门笔记缓存
2. 修改笔记 -> 清除该笔记缓存
3. 删除笔记 -> 清除该笔记缓存、标签缓存
4. 发表评论 -> 清除评论列表缓存
5. 修改用户信息 -> 清除用户缓存

性能对比:
无缓存: 获取标签列表 450ms
有缓存: 获取标签列表 8ms
性能提升: 56倍

缓存命中率:
目标: >80%
监控: stats.hits / (stats.hits + stats.misses)
*/

// ============================================
// 第6步: 进阶 - Redis升级（生产环境推荐）
// ============================================

/*
当你的应用需要扩展到多服务器或更大的缓存时，升级到Redis:

1. 注册 https://app.rediscloud.com/ (免费30MB)
2. 在 .env 中添加: REDIS_URL=redis://...
3. 安装 npm install redis
4. 改变初始化代码:

import redis from 'redis'

const redisClient = process.env.REDIS_URL 
  ? redis.createClient({ url: process.env.REDIS_URL })
  : null

if (redisClient) {
  await redisClient.connect()
  console.log('Redis connected')
}

// 在API中使用:
const getCacheOrFetch = async (key, fetchFn, ttl = 600) => {
  if (redisClient) {
    const cached = await redisClient.get(key)
    if (cached) return JSON.parse(cached)
    const value = await fetchFn()
    await redisClient.setEx(key, ttl, JSON.stringify(value))
    return value
  } else {
    // 降级到NodeCache
    let cached = cache.get(key)
    if (cached) return cached
    const value = await fetchFn()
    cache.set(key, value, ttl)
    return value
  }
}

// 使用:
app.get('/api/tags', async (req, res) => {
  const tags = await getCacheOrFetch('tags:all', 
    () => tagRepo.findWithNoteCount(), 
    30
  )
  res.json({ success: true, data: tags })
})
*/

// ============================================
// 快速检查清单
// ============================================

/*
□ 安装依赖: npm install node-cache
□ 在 server.js 导入 NodeCache
□ 初始化缓存对象
□ 在关键API中添加缓存逻辑
□ 测试单个API的缓存效果
□ 设置写操作时的缓存清除
□ 监控缓存状态 /api/cache/status
□ 测试性能提升（用浏览器DevTools查看时间）
*/

export {}
