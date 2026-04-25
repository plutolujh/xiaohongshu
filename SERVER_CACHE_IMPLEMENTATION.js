/**
 * 缓存系统实现示例 (粘贴到 server.js 中使用)
 * 
 * 这是一个完整的、可以直接使用的缓存实现示例
 * 适合中型应用（<500K用户）
 */

// ========================================
// 第1部分: 在 server.js 顶部添加以下导入
// ========================================
/*
import NodeCache from 'node-cache'

// 初始化缓存管理器
const cache = new NodeCache({ 
  stdTTL: 600,      // 默认过期时间10分钟
  checkperiod: 120   // 每2分钟检查过期数据
})

console.log('✓ Cache system initialized')
*/

// ========================================
// 第2部分: 缓存工具函数 (添加到 server.js)
// ========================================
/*
// 缓存键生成
const cacheKeys = {
  TAGS_ALL: 'tags:all',
  TAGS_POPULAR: 'tags:popular',
  TAGS_SEARCH: (keyword) => `tags:search:${keyword}`,
  
  NOTE_DETAIL: (id) => `note:${id}`,
  NOTE_TRENDING_24H: 'note:trending:24h',
  NOTE_TRENDING_7D: 'note:trending:7d',
  NOTES_PAGE: (page, limit, tag) => `notes:page:${page}:limit:${limit}:tag:${tag || 'all'}`,
  NOTES_USER: (userId) => `notes:user:${userId}`,
  
  USER_PROFILE: (id) => `user:${id}:profile`,
  USER_FOLLOWERS: (id) => `user:${id}:followers`,
  USER_FOLLOWING: (id) => `user:${id}:following`,
  
  COMMENTS_NOTE: (noteId) => `comments:note:${noteId}`,
  COMMENTS_USER: (userId) => `comments:user:${userId}`,
  
  SEARCH_RESULTS: (keyword) => `search:${keyword}`,
  SEARCH_TRENDING: 'search:trending'
}

// 缓存辅助函数
const cacheHelpers = {
  // 获取或设置缓存
  async getOrSet(key, fetchFn, ttl = 600) {
    try {
      let cached = cache.get(key)
      if (cached !== undefined) {
        console.log(`✓ Cache HIT: ${key}`)
        return cached
      }
      
      console.log(`✗ Cache MISS: ${key}`)
      const value = await fetchFn()
      if (value !== undefined && value !== null) {
        cache.set(key, value, ttl)
      }
      return value
    } catch (error) {
      console.error(`Cache error for ${key}:`, error)
      return await fetchFn() // 降级处理
    }
  },

  // 删除缓存
  delete(key) {
    cache.del(key)
    console.log(`🗑️ Cache deleted: ${key}`)
  },

  // 删除匹配的缓存(通配符)
  deletePattern(pattern) {
    const keys = cache.keys()
    const regex = new RegExp(pattern)
    let count = 0
    keys.forEach(key => {
      if (regex.test(key)) {
        cache.del(key)
        count++
      }
    })
    console.log(`🗑️ Deleted ${count} cache entries matching ${pattern}`)
  },

  // 清空所有缓存
  clear() {
    cache.flushAll()
    console.log('🗑️ All cache cleared')
  },

  // 获取缓存统计
  getStats() {
    const keys = cache.keys()
    const stats = cache.getStats()
    return {
      totalKeys: keys.length,
      keys: keys,
      ...stats
    }
  }
}
*/

// ========================================
// 第3部分: 改造现有API - 示例代码
// ========================================

/*
// API 1: 获取所有标签 (原有API改造)
app.get('/api/tags', async (req, res) => {
  try {
    const tags = await cacheHelpers.getOrSet(
      cacheKeys.TAGS_ALL,
      async () => {
        return await tagRepo.findWithNoteCount()
      },
      30 // 30秒缓存
    )
    
    res.json({ success: true, data: tags })
  } catch (error) {
    console.error('Error getting tags:', error)
    res.status(500).json({ success: false, message: '获取标签失败' })
  }
})

// API 2: 获取笔记详情 (新增缓存)
app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await cacheHelpers.getOrSet(
      cacheKeys.NOTE_DETAIL(req.params.id),
      async () => {
        return await noteRepo.findById(req.params.id)
      },
      300 // 5分钟缓存
    )
    
    if (!note) {
      return res.status(404).json({ success: false, message: '笔记不存在' })
    }
    
    res.json({ success: true, data: note })
  } catch (error) {
    console.error('Error getting note:', error)
    res.status(500).json({ success: false, message: '获取笔记失败' })
  }
})

// API 3: 获取笔记列表 (新增缓存)
app.get('/api/notes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const tag = req.query.tag || null
    
    // 根据参数生成不同的缓存键
    const cacheKey = cacheKeys.NOTES_PAGE(page, limit, tag)
    
    const result = await cacheHelpers.getOrSet(
      cacheKey,
      async () => {
        return await noteRepo.findPaginated(page, limit, tag)
      },
      60 // 1分钟缓存
    )
    
    res.json({ 
      success: true, 
      data: result.data, 
      total: result.total,
      page,
      limit
    })
  } catch (error) {
    console.error('Error getting notes:', error)
    res.status(500).json({ success: false, message: '获取笔记失败' })
  }
})

// API 4: 发布笔记 (带缓存清除)
app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    const note = await noteRepo.create({
      ...req.body,
      author_id: req.user.userId
    })
    
    // 清除相关缓存
    cacheHelpers.delete(cacheKeys.TAGS_ALL)
    cacheHelpers.deletePattern('notes:page:.*') // 清除所有分页结果
    cacheHelpers.delete(cacheKeys.NOTES_USER(req.user.userId))
    
    res.json({ success: true, data: note })
  } catch (error) {
    console.error('Error creating note:', error)
    res.status(500).json({ success: false, message: '发布笔记失败' })
  }
})

// API 5: 更新笔记 (带缓存清除)
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const note = await noteRepo.findById(req.params.id)
    
    if (!note || note.author_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: '无权限修改' })
    }
    
    const updated = await noteRepo.update(req.params.id, req.body)
    
    // 清除该笔记相关缓存
    cacheHelpers.delete(cacheKeys.NOTE_DETAIL(req.params.id))
    cacheHelpers.deletePattern('notes:page:.*')
    
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating note:', error)
    res.status(500).json({ success: false, message: '更新笔记失败' })
  }
})

// API 6: 删除笔记 (带缓存清除)
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const note = await noteRepo.findById(req.params.id)
    
    if (!note || note.author_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: '无权限删除' })
    }
    
    await noteRepo.delete(req.params.id)
    
    // 清除相关缓存
    cacheHelpers.delete(cacheKeys.NOTE_DETAIL(req.params.id))
    cacheHelpers.delete(cacheKeys.TAGS_ALL)
    cacheHelpers.deletePattern('notes:page:.*')
    cacheHelpers.delete(cacheKeys.NOTES_USER(req.user.userId))
    
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Error deleting note:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// API 7: 获取用户信息 (新增缓存)
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await cacheHelpers.getOrSet(
      cacheKeys.USER_PROFILE(req.params.id),
      async () => {
        return await userRepo.findById(req.params.id)
      },
      1800 // 30分钟缓存
    )
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }
    
    // 不返回敏感信息
    delete user.password
    res.json({ success: true, data: user })
  } catch (error) {
    console.error('Error getting user:', error)
    res.status(500).json({ success: false, message: '获取用户信息失败' })
  }
})

// API 8: 获取笔记评论 (新增缓存)
app.get('/api/comments/:noteId', async (req, res) => {
  try {
    const comments = await cacheHelpers.getOrSet(
      cacheKeys.COMMENTS_NOTE(req.params.noteId),
      async () => {
        return await commentRepo.findByNoteId(req.params.noteId)
      },
      300 // 5分钟缓存
    )
    
    res.json({ success: true, data: comments })
  } catch (error) {
    console.error('Error getting comments:', error)
    res.status(500).json({ success: false, message: '获取评论失败' })
  }
})

// API 9: 发表评论 (带缓存清除)
app.post('/api/comments', authenticateToken, async (req, res) => {
  try {
    const comment = await commentRepo.create({
      ...req.body,
      user_id: req.user.userId
    })
    
    // 清除该笔记的评论缓存
    cacheHelpers.delete(cacheKeys.COMMENTS_NOTE(req.body.note_id))
    
    res.json({ success: true, data: comment })
  } catch (error) {
    console.error('Error creating comment:', error)
    res.status(500).json({ success: false, message: '发表评论失败' })
  }
})

// API 10: 管理员接口 - 查看缓存状态
app.get('/api/admin/cache/status', requireAdmin, (req, res) => {
  try {
    const stats = cacheHelpers.getStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取缓存状态失败' })
  }
})

// API 11: 管理员接口 - 清空所有缓存
app.post('/api/admin/cache/clear', requireAdmin, (req, res) => {
  try {
    cacheHelpers.clear()
    res.json({ success: true, message: '缓存已清空' })
  } catch (error) {
    res.status(500).json({ success: false, message: '清空缓存失败' })
  }
})

// API 12: 管理员接口 - 查看具体缓存键的值
app.get('/api/admin/cache/:key', requireAdmin, (req, res) => {
  try {
    const value = cache.get(req.params.key)
    if (value === undefined) {
      return res.status(404).json({ success: false, message: '缓存键不存在' })
    }
    res.json({ success: true, data: value })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取缓存失败' })
  }
})
*/

// ========================================
// 第4部分: 性能监控中间件 (可选)
// ========================================
/*
// 记录API响应时间
const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    // 超过1秒的请求需要优化
    if (duration > 1000) {
      console.warn(`⚠️ Slow API: ${req.method} ${req.path} took ${duration}ms`)
    }
  })
  
  next()
}

// app.use(responseTimeMiddleware) // 在路由之前添加这行
*/

// ========================================
// 测试代码 (复制到浏览器控制台测试)
// ========================================
/*
// 测试1: 获取标签（第一次-无缓存）
fetch('http://localhost:3004/api/tags').then(r => r.json()).then(console.log)
// 输出: ✗ Cache MISS: tags:all
// 响应时间: ~450ms

// 测试2: 再次获取标签（第二次-有缓存）
fetch('http://localhost:3004/api/tags').then(r => r.json()).then(console.log)
// 输出: ✓ Cache HIT: tags:all
// 响应时间: ~8ms (提升56倍！)

// 测试3: 查看缓存状态（需要管理员token）
fetch('http://localhost:3004/api/admin/cache/status', {
  headers: { 'Authorization': 'Bearer your-admin-token' }
}).then(r => r.json()).then(console.log)

// 输出示例:
// {
//   totalKeys: 15,
//   keys: ['tags:all', 'note:123', 'note:456', ...],
//   hits: 42,
//   misses: 8,
//   ksize: 150,
//   vsize: 2000
// }
*/

// ========================================
// 缓存预热 (应用启动时)
// ========================================
/*
async function preWarmCache() {
  console.log('🔥 Pre-warming cache...')
  try {
    // 预加载热门标签
    const tags = await tagRepo.findWithNoteCount()
    cache.set(cacheKeys.TAGS_ALL, tags, 30)
    console.log('✓ Tags pre-warmed')
    
    // 预加载热门笔记
    const trendingNotes = await noteRepo.findTrending(10, 24)
    cache.set(cacheKeys.NOTE_TRENDING_24H, trendingNotes, 300)
    console.log('✓ Trending notes pre-warmed')
  } catch (error) {
    console.error('Error pre-warming cache:', error)
  }
}

// 在启动服务器后调用: preWarmCache()
*/

export {}
