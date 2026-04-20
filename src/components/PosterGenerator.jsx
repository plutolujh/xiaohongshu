import { useRef, useState, useEffect } from 'react'
import './PosterGenerator.css'

export default function PosterGenerator({ note, onClose }) {
  const posterRef = useRef(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const images = note?.images || []
  const sections = [
    { title: '简介', content: note?.content },
    { title: '食材', content: note?.ingredients },
    { title: '做法', content: note?.steps }
  ]

  // 处理图片URL，确保可以跨域加载
  const processImageUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('data:')) {
      return url
    }
    return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now()
  }

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`无法加载图片: ${src}`))
      img.src = src
    })
  }

  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const lines = text.split('\n')
    let currentY = y
    for (let i = 0; i < lines.length; i++) {
      const words = lines[i].split('')
      let line = ''
      for (let j = 0; j < words.length; j++) {
        const testLine = line + words[j]
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && j > 0) {
          ctx.fillText(line, x, currentY)
          line = words[j]
          currentY += lineHeight
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, x, currentY)
      currentY += lineHeight
    }
    return currentY
  }

  const generatePoster = async () => {
    setGenerating(true)
    setProgress(0)
    try {
      const width = 400
      const height = 700
      const canvas = document.createElement('canvas')
      canvas.width = width * 2 // 2x for retina
      canvas.height = height * 2
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)

      // Background gradient
      setProgress(10)
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#ff9a9e')
      gradient.addColorStop(1, '#fecfef')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Watermark text
      ctx.save()
      ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillStyle = 'rgba(255, 154, 158, 0.4)'
      ctx.translate(width / 2, height / 2)
      ctx.rotate(-15 * Math.PI / 180)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('看了好心情', 0, 0)
      ctx.restore()

      // Title
      setProgress(20)
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillStyle = '#333'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const titleY = 20
      wrapText(ctx, note.title || '笔记分享', 10, titleY, width - 20, 28)
      // Title underline
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(50, 55)
      ctx.lineTo(width - 50, 55)
      ctx.stroke()

      // Author
      setProgress(30)
      const avatarUrl = processImageUrl(note.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${note.author_id}`)
      try {
        const avatarImg = await loadImage(avatarUrl)
        ctx.save()
        ctx.beginPath()
        ctx.arc(30, 80, 16, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(avatarImg, 14, 64, 32, 32)
        ctx.restore()
      } catch (e) {
        // Fallback circle
        ctx.fillStyle = '#ddd'
        ctx.beginPath()
        ctx.arc(30, 80, 16, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillStyle = '#666'
      ctx.textAlign = 'left'
      ctx.fillText(note.author_name || '匿名', 55, 73)

      // Content sections
      let currentY = 110
      const contentX = 16
      const contentWidth = width - 32

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        if (!section.content) continue

        // Section title
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.fillStyle = '#333'
        ctx.textAlign = 'left'
        ctx.fillText(section.title, contentX, currentY)
        currentY += 22

        // Section content
        ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.fillStyle = '#555'
        const lines = section.content.split('\n')
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j].trim()
          if (line) {
            const textY = wrapText(ctx, line, contentX, currentY, contentWidth, 18)
            currentY = textY
          } else {
            currentY += 8
          }
        }
        currentY += 10

        // Section image
        if (i < images.length) {
          setProgress(30 + (i * 15))
          try {
            const imgUrl = processImageUrl(images[i])
            const img = await loadImage(imgUrl)
            const imgWidth = contentWidth
            const imgHeight = imgWidth * img.height / img.width
            ctx.drawImage(img, contentX, currentY, imgWidth, imgHeight)
            currentY += imgHeight + 10
          } catch (e) {
            // Skip failed images
          }
        }
      }

      // Footer
      setProgress(90)
      ctx.fillStyle = '#f8f8f8'
      ctx.fillRect(0, height - 50, width, 50)
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillStyle = '#999'
      ctx.textAlign = 'left'
      ctx.fillText('小红书美食分享', contentX, height - 30)

      // QR placeholder
      ctx.fillStyle = '#eee'
      ctx.fillRect(width - 76, height - 46, 60, 40)

      // Download
      setProgress(95)
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${note.title || '笔记'}_海报.png`
          a.style.display = 'none'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          onClose && onClose()
        } else {
          alert('生成海报失败：图片为空')
        }
      }, 'image/png')

      setProgress(100)
    } catch (error) {
      console.error('生成海报失败:', error)
      alert(`生成海报失败: ${error.message}\n请稍后重试`)
    } finally {
      setGenerating(false)
      setProgress(0)
    }
  }

  useEffect(() => {
    const imgs = posterRef.current?.querySelectorAll('img') || []
    imgs.forEach((img) => {
      if (img.src && !img.src.startsWith('data:')) {
        img.src = `${img.src.split('?')[0]}?t=${Date.now()}`
      }
    })
  }, [])
  return (
    <div className="poster-modal" onClick={onClose}>
      <div className="poster-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="poster-modal-header">
          <h3>生成海报</h3>
          <button className="poster-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="poster-preview">
          <div ref={posterRef} className="poster-container">
            {/* Background */}
            <div className="poster-background">
              <div className="poster-bg-text">看了好心情</div>
            </div>

            {/* Title */}
            <div className="poster-title">
              {note.title}
            </div>

            {/* Author */}
            <div className="poster-author">
              <img
                src={processImageUrl(note.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${note.author_id}`)}
                alt={note.author_name}
                className="poster-avatar"
                crossOrigin="anonymous"
              />
              <span className="poster-author-name">{note.author_name}</span>
            </div>

            {/* Content with interspersed images */}
            <div className="poster-content">
              {sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="poster-section">
                  {section.content && (
                    <>
                      <h4 className="poster-section-title">{section.title}</h4>
                      <p className="poster-section-content">{section.content}</p>
                    </>
                  )}

                  {/* Intersperse images */}
                  {images.length > 0 && sectionIndex < images.length && (
                    <div className="poster-image-wrapper">
                      <img
                        src={processImageUrl(images[sectionIndex])}
                        alt={`图片${sectionIndex + 1}`}
                        className="poster-image"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Remaining images */}
              {images.slice(sections.length).map((img, index) => (
                <div key={`extra-${index}`} className="poster-image-wrapper">
                  <img
                    src={processImageUrl(img)}
                    alt={`图片${sections.length + index + 1}`}
                    className="poster-image"
                    crossOrigin="anonymous"
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="poster-footer">
              <div className="poster-app-name">小红书美食分享</div>
              <div className="poster-qr-placeholder">二维码</div>
            </div>
          </div>
        </div>

        <div className="poster-modal-actions">
          <button 
            className="poster-generate-btn" 
            onClick={generatePoster}
            disabled={generating}
          >
            {generating ? '生成中...' : '下载海报'}
          </button>
          <button 
            className="poster-cancel-btn" 
            onClick={onClose}
            disabled={generating}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}