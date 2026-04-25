import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import './PosterBrowseMode.css'
import html2canvas from 'html2canvas'

// 背景颜色选项（与PosterGenerator同步）
const BACKGROUNDS = [
  { name: '粉色浪漫', value: ['#ff9a9e', '#fecfef'] },
  { name: '清新蓝绿', value: ['#a8edea', '#fed6e3'] },
  { name: '阳光黄橙', value: ['#ffecd2', '#fcb69f'] },
  { name: '薰衣草紫', value: ['#e0c3fc', '#8ec5fc'] },
  { name: '薄荷绿', value: ['#d4fc79', '#96e6a1'] },
  { name: '珊瑚粉', value: ['#ffb199', '#ffcdc2'] },
  { name: '奶油白', value: ['#fff1eb', '#ace0f9'] },
  { name: '纯白', value: ['#ffffff', '#ffffff'] },
]

const FONTS = [
  { name: '系统默认', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
  { name: '思源黑体', value: '"Noto Sans SC", sans-serif' },
  { name: '趣味卡通', value: '"ZCOOL KuaiLe", sans-serif' },
  { name: '快乐字体', value: '"Ma Shan Zheng", cursive' },
]

export default function PosterBrowseMode({ notes, initialIndex = 0, onClose, onDownload }) {
  const { user } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [downloading, setDownloading] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('posterFontSize')) || 48
  })
  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem('posterFont') || FONTS[0].value
  })
  const [bgIndex, setBgIndex] = useState(() => {
    return parseInt(localStorage.getItem('posterBgIndex')) || 0
  })
  const [watermark, setWatermark] = useState(() => {
    return localStorage.getItem('posterWatermark') || user?.nickname || ''
  })
  const [fullscreen, setFullscreen] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const posterContainerRef = useRef(null)
  const touchRef = useRef(null)

  const currentNote = notes[currentIndex]

  // 处理键盘导航
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrevious()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'Escape') onClose()
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      if (e.key === 'd' || e.key === 'D') downloadPoster()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, notes.length])

  // 处理触摸滑动
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX)
    setTouchRef(e.touches[0].clientX)
  }

  const handleTouchEnd = (e) => {
    if (!touchStart) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd

    // 向左滑动 (>50px) 下一张
    if (diff > 50) handleNext()
    // 向右滑动 (<-50px) 上一张
    if (diff < -50) handlePrevious()
    
    setTouchStart(null)
  }

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % notes.length)
  }, [notes.length])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + notes.length) % notes.length)
  }, [notes.length])

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen)
  }

  const downloadPoster = async () => {
    if (!posterContainerRef.current || downloading) return
    
    setDownloading(true)
    try {
      const canvas = await html2canvas(posterContainerRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${currentNote.title || '笔记'}_海报.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      onDownload && onDownload(currentNote)
    } catch (error) {
      console.error('下载海报失败:', error)
      alert('下载失败，请重试')
    } finally {
      setDownloading(false)
    }
  }

  if (!currentNote) {
    return <div className="poster-browse-empty">没有笔记可浏览</div>
  }

  const images = currentNote.images || [currentNote.coverImage] || []

  return (
    <div className={`poster-browse-container ${fullscreen ? 'fullscreen' : ''}`}>
      {/* 顶部控制栏 */}
      <div className="poster-browse-header">
        <button className="btn-close" onClick={onClose} title="关闭 (Esc)">×</button>
        <div className="poster-info">
          <span>{currentIndex + 1} / {notes.length}</span>
          <span className="separator">|</span>
          <span className="note-title">{currentNote.title}</span>
        </div>
        <div className="poster-controls">
          <button 
            className="btn-control" 
            onClick={toggleFullscreen}
            title="全屏 (F)"
          >
            {fullscreen ? '⛶' : '⛶'}
          </button>
          <button 
            className="btn-control" 
            onClick={downloadPoster}
            disabled={downloading}
            title="下载 (D)"
          >
            {downloading ? '下载中...' : '⬇'}
          </button>
        </div>
      </div>

      {/* 主要内容区 */}
      <div 
        className="poster-browse-main"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 左导航 */}
        <button 
          className="btn-nav btn-prev"
          onClick={handlePrevious}
          disabled={notes.length <= 1}
          title="上一张"
        >
          ‹
        </button>

        {/* 海报容器 */}
        <div className="poster-display-wrapper">
          <div 
            ref={posterContainerRef}
            className="poster-display"
            style={{ fontFamily, fontSize: `${fontSize}px` }}
          >
            {/* 渐变背景 */}
            <div 
              className="poster-bg"
              style={{ 
                background: `linear-gradient(135deg, ${BACKGROUNDS[bgIndex].value[0]}, ${BACKGROUNDS[bgIndex].value[1]})` 
              }}
            />

            {/* 内容 */}
            <div className="poster-content">
              {/* 标题 */}
              <div className="poster-title">
                {currentNote.title}
              </div>

              {/* 作者信息 */}
              <div className="poster-author">
                {currentNote.author_name || '美食分享者'}
              </div>

              {/* 描述 */}
              <div className="poster-description">
                {currentNote.content ? currentNote.content.substring(0, 150) : '分享美食，分享生活'}
                {currentNote.content && currentNote.content.length > 150 ? '...' : ''}
              </div>

              {/* 主图 */}
              {images.length > 0 && (
                <div className="poster-image">
                  <img 
                    src={images[0]} 
                    alt={currentNote.title}
                    loading="lazy"
                  />
                </div>
              )}

              {/* 标签 */}
              {currentNote.tags && currentNote.tags.length > 0 && (
                <div className="poster-tags">
                  {currentNote.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="tag">#{tag}</span>
                  ))}
                </div>
              )}

              {/* 数据统计 */}
              <div className="poster-stats">
                <span>👍 {currentNote.likes || 0}</span>
                <span>💬 {currentNote.comments || 0}</span>
                <span>👀 {currentNote.views || 0}</span>
              </div>

              {/* 水印 */}
              <div className="poster-watermark">
                {watermark || '小红书美食分享'}
              </div>
            </div>
          </div>
        </div>

        {/* 右导航 */}
        <button 
          className="btn-nav btn-next"
          onClick={handleNext}
          disabled={notes.length <= 1}
          title="下一张"
        >
          ›
        </button>
      </div>

      {/* 底部控制栏 */}
      <div className="poster-browse-footer">
        <div className="customize-options">
          <div className="option-group">
            <label>字体：</label>
            <select value={fontFamily} onChange={(e) => {
              setFontFamily(e.target.value)
              localStorage.setItem('posterFont', e.target.value)
            }}>
              {FONTS.map(f => (
                <option key={f.value} value={f.value}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="option-group">
            <label>背景：</label>
            <select value={bgIndex} onChange={(e) => {
              setBgIndex(parseInt(e.target.value))
              localStorage.setItem('posterBgIndex', e.target.value)
            }}>
              {BACKGROUNDS.map((bg, idx) => (
                <option key={idx} value={idx}>{bg.name}</option>
              ))}
            </select>
          </div>

          <div className="option-group">
            <label>字号：</label>
            <input 
              type="range" 
              min="32" 
              max="72" 
              value={fontSize}
              onChange={(e) => {
                setFontSize(parseInt(e.target.value))
                localStorage.setItem('posterFontSize', e.target.value)
              }}
              className="font-size-slider"
            />
            <span>{fontSize}px</span>
          </div>

          <div className="option-group">
            <label>水印：</label>
            <input 
              type="text" 
              value={watermark}
              maxLength={20}
              onChange={(e) => {
                setWatermark(e.target.value)
                localStorage.setItem('posterWatermark', e.target.value)
              }}
              placeholder="输入水印文字"
              className="watermark-input"
            />
          </div>
        </div>

        {/* 快捷提示 */}
        <div className="keyboard-tips">
          <span>← → 切换</span>
          <span>|</span>
          <span>D 下载</span>
          <span>|</span>
          <span>F 全屏</span>
          <span>|</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  )
}
