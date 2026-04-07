import { useState, useEffect } from 'react'
import './Footer.css'

export default function Footer() {
  const [appInfo, setAppInfo] = useState({
    version: '1.0.0',
    lastPublishTime: new Date().toLocaleString()
  })

  useEffect(() => {
    // 尝试从系统状态API获取版本信息
    const fetchAppInfo = async () => {
      try {
        // 注意：这里需要认证，所以在非登录状态下可能会失败
        // 失败时使用默认值
        const response = await fetch('/api/status')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.status) {
            setAppInfo({
              version: data.status.version || '1.0.0',
              lastPublishTime: data.status.lastPublishTime || new Date().toLocaleString()
            })
          }
        }
      } catch (error) {
        // 忽略错误，使用默认值
      }
    }

    fetchAppInfo()
  }, [])

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-info">
          <p>© 2026 美食笔记</p>
          <p>版本: {appInfo.version}</p>
          <p>最后发布: {appInfo.lastPublishTime}</p>
        </div>
        <div className="footer-links">
          <a href="/changelog" className="footer-link">修改日志</a>
          <a href="/feedback" className="footer-link">意见反馈</a>
        </div>
      </div>
    </footer>
  )
}