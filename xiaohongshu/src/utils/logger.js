// 日志记录模块
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const LOG_DIR = path.join(__dirname, '../../logs')

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

// 日志级别
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
}

// 生成日志文件名
function getLogFileName() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}.log`
}

// 格式化日志消息
function formatLog(level, message, data = {}) {
  const timestamp = new Date().toISOString()
  const logMessage = {
    timestamp,
    level,
    message,
    data
  }
  return JSON.stringify(logMessage) + '\n'
}

// 写入日志到文件
function writeLog(level, message, data = {}) {
  const logFile = path.join(LOG_DIR, getLogFileName())
  const logEntry = formatLog(level, message, data)
  
  fs.appendFile(logFile, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err)
    }
  })
  
  // 同时输出到控制台
  console.log(`${level}: ${message}`, data)
}

// 日志记录器
const logger = {
  info: (message, data = {}) => writeLog(LOG_LEVELS.INFO, message, data),
  warn: (message, data = {}) => writeLog(LOG_LEVELS.WARN, message, data),
  error: (message, data = {}) => writeLog(LOG_LEVELS.ERROR, message, data),
  debug: (message, data = {}) => writeLog(LOG_LEVELS.DEBUG, message, data)
}

export default logger
