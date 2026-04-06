// 系统状态监控模块
import os from 'os'

// 监控数据
const monitorData = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  // 访问统计数据
  accessStats: {
    daily: {}, // 按天统计
    hourly: {}, // 按小时统计
    pathStats: {}, // 按路径统计
    methodStats: {}, // 按方法统计
    statusCodeStats: {} // 按状态码统计
  }
}

// 收集系统状态信息
function collectSystemStatus() {
  return {
    // 服务器信息
    server: {
      uptime: (Date.now() - monitorData.startTime) / 1000, // 秒
      nodeVersion: process.version
    },
    // 系统信息
    system: {
      platform: os.platform(),
      arch: os.arch(),
      totalMemory: os.totalmem() / 1024 / 1024, // MB
      freeMemory: os.freemem() / 1024 / 1024, // MB
      cpuUsage: os.loadavg(),
      cpuCount: os.cpus().length
    },
    // 进程信息
    process: {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      uptime: process.uptime()
    },
    // 请求统计
    requests: {
      total: monitorData.requestCount,
      errors: monitorData.errorCount
    },
    // 访问统计
    accessStats: monitorData.accessStats
  }
}

// 增加请求计数
function incrementRequestCount() {
  monitorData.requestCount++
}

// 增加错误计数
function incrementErrorCount() {
  monitorData.errorCount++
}

// 记录访问信息
function recordAccessInfo(method, path, statusCode) {
  const now = new Date()
  const dateKey = now.toISOString().split('T')[0] // YYYY-MM-DD
  const hourKey = `${dateKey} ${now.getHours()}:00` // YYYY-MM-DD HH:00
  
  // 按天统计
  if (!monitorData.accessStats.daily[dateKey]) {
    monitorData.accessStats.daily[dateKey] = 0
  }
  monitorData.accessStats.daily[dateKey]++
  
  // 按小时统计
  if (!monitorData.accessStats.hourly[hourKey]) {
    monitorData.accessStats.hourly[hourKey] = 0
  }
  monitorData.accessStats.hourly[hourKey]++
  
  // 按路径统计
  if (!monitorData.accessStats.pathStats[path]) {
    monitorData.accessStats.pathStats[path] = 0
  }
  monitorData.accessStats.pathStats[path]++
  
  // 按方法统计
  if (!monitorData.accessStats.methodStats[method]) {
    monitorData.accessStats.methodStats[method] = 0
  }
  monitorData.accessStats.methodStats[method]++
  
  // 按状态码统计
  const statusCodeKey = `${Math.floor(statusCode / 100)}xx` // 2xx, 4xx, 5xx
  if (!monitorData.accessStats.statusCodeStats[statusCodeKey]) {
    monitorData.accessStats.statusCodeStats[statusCodeKey] = 0
  }
  monitorData.accessStats.statusCodeStats[statusCodeKey]++
}

// 监控模块
export default {
  collectSystemStatus,
  incrementRequestCount,
  incrementErrorCount,
  recordAccessInfo
}
