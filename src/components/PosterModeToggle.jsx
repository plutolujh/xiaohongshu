import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import './PosterModeToggle.css'

/**
 * 海报浏览模式切换按钮
 * 集成到Home页面顶部
 */
export default function PosterModeToggle({ 
  notesCount = 0, 
  onToggle, 
  isActive = false 
}) {
  const { user } = useAuth()
  const [hovered, setHovered] = useState(false)

  return (
    <div className="poster-mode-toggle">
      <button
        className={`toggle-btn ${isActive ? 'active' : ''}`}
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="进入海报浏览模式 - 轻松浏览笔记的视觉海报版本"
      >
        <span className="icon">🎨</span>
        <span className="label">海报模式</span>
        {notesCount > 0 && <span className="badge">{notesCount}</span>}
      </button>

      {hovered && (
        <div className="tooltip">
          <div className="tooltip-content">
            <p className="tip-title">海报浏览模式</p>
            <ul className="tip-features">
              <li>✨ 沉浸式浏览笔记海报</li>
              <li>⌨️ 方向键切换笔记</li>
              <li>📥 一键下载高清海报</li>
              <li>🎨 实时调整字体和背景</li>
            </ul>
            <p className="tip-shortcut">
              快捷键: 
              <span className="keys">← →</span> 切换
              <span className="keys">D</span> 下载
              <span className="keys">F</span> 全屏
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
