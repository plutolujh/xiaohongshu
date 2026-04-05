// 系统状态监控模块
import os from 'os'

// 监控数据
const monitorData = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0
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
    }
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

// 监控模块
export default {
  collectSystemStatus,
  incrementRequestCount,
  incrementErrorCount
}
