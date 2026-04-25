/**
 * 缓存管理系统 (Cache Manager)
 * 支持内存缓存和Redis两种模式
 * 
 * 使用方式:
 * const cache = new CacheManager({ useRedis: false }) // 开发环境用内存
 * const data = await cache.get('key') 
 * await cache.set('key', value, 3600) // 1小时过期
 */

import NodeCache from 'node-cache'
import redis from 'redis'

export class CacheManager {
  constructor(options = {}) {
    this.useRedis = options.useRedis || false
    this.redisClient = null

    // 缓存配置
    this.config = {
      stdTTL: options.stdTTL || 600,
      checkperiod: options.checkperiod || 120
    }

    this.memoryCache = new NodeCache({
      stdTTL: this.config.stdTTL,
      checkperiod: this.config.checkperiod
    })

    // 缓存命中统计
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    }

    if (this.useRedis && options.redisUrl) {
      this.initRedis(options.redisUrl)
    }
  }

  // 获取当前配置
  getConfig() {
    return { ...this.config }
  }

  // 更新配置
  updateConfig(newConfig) {
    if (newConfig.stdTTL !== undefined) {
      this.config.stdTTL = newConfig.stdTTL
    }
    if (newConfig.checkperiod !== undefined) {
      this.config.checkperiod = newConfig.checkperiod
    }
    // 重新创建 NodeCache 实例以应用新配置
    this.memoryCache = new NodeCache({
      stdTTL: this.config.stdTTL,
      checkperiod: this.config.checkperiod
    })
    return this.config
  }

  // Redis初始化
  async initRedis(redisUrl) {
    try {
      this.redisClient = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      })

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err)
        // 降级到内存缓存
        this.useRedis = false
      })

      await this.redisClient.connect()
      console.log('✓ Redis connected successfully')
    } catch (error) {
      console.error('Failed to connect Redis:', error)
      this.useRedis = false
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Promise<any>}
   */
  async get(key) {
    try {
      if (this.useRedis && this.redisClient) {
        const value = await this.redisClient.get(key)
        if (value) {
          this.stats.hits++
          return JSON.parse(value)
        } else {
          this.stats.misses++
          return null
        }
      } else {
        const value = this.memoryCache.get(key)
        if (value !== undefined) {
          this.stats.hits++
          return value
        } else {
          this.stats.misses++
          return null
        }
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      this.stats.misses++
      return null
    }
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间(秒)，默认600秒
   */
  async set(key, value, ttl = 600) {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value))
      } else {
        this.memoryCache.set(key, value, ttl)
      }
      this.stats.sets++
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  async delete(key) {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key)
      } else {
        this.memoryCache.del(key)
      }
      this.stats.deletes++
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
    }
  }

  /**
   * 批量删除缓存(支持通配符)
   * @param {string} pattern - 键的模式，如 'note:*'
   */
  async deletePattern(pattern) {
    try {
      if (this.useRedis && this.redisClient) {
        const keys = await this.redisClient.keys(pattern)
        if (keys.length > 0) {
          await this.redisClient.del(keys)
        }
      } else {
        const keys = this.memoryCache.keys()
        keys.forEach(key => {
          if (this.matchPattern(key, pattern)) {
            this.memoryCache.del(key)
          }
        })
      }
    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error)
    }
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.flushDb()
      } else {
        this.memoryCache.flushAll()
      }
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }

  /**
   * 获取或设置缓存(如果不存在则执行获取函数)
   * @param {string} key - 缓存键
   * @param {Function} fn - 异步函数，返回值将被缓存
   * @param {number} ttl - 过期时间(秒)
   */
  async getOrSet(key, fn, ttl = 600) {
    // 先尝试从缓存获取
    const cached = await this.get(key)
    if (cached !== undefined && cached !== null) {
      return cached
    }

    // 缓存不存在，执行函数获取数据
    const value = await fn()

    // 设置缓存
    if (value !== undefined && value !== null) {
      await this.set(key, value, ttl)
    }

    return value
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    if (this.useRedis && this.redisClient) {
      const info = await this.redisClient.info('stats')
      return {
        backend: 'Redis',
        info: info,
        hits: this.stats.hits,
        misses: this.stats.misses,
        sets: this.stats.sets,
        deletes: this.stats.deletes
      }
    } else {
      const keys = this.memoryCache.keys()
      const hitRate = (this.stats.hits + this.stats.misses) > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
        : '0.00'
      return {
        backend: 'Memory',
        keysCount: keys.length,
        keys: keys,
        hits: this.stats.hits,
        misses: this.stats.misses,
        sets: this.stats.sets,
        deletes: this.stats.deletes,
        hitRate: hitRate + '%'
      }
    }
  }

  // 重置统计
  resetStats() {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 }
  }

  /**
   * 简单的通配符匹配
   */
  matchPattern(str, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(str)
  }

  // 关闭连接
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit()
    }
  }
}

export default CacheManager
