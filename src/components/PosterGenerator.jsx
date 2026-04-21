import { useRef, useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import './PosterGenerator.css'

// 可爱的卡通字体选项
const FONTS = [
  { name: '系统默认', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
  { name: '思源黑体', value: '"Noto Sans SC", sans-serif' },
  { name: '趣味卡通', value: '"ZCOOL KuaiLe", sans-serif' },
  { name: '快乐字体', value: '"Ma Shan Zheng", cursive' },
  { name: '可爱圆润', value: '"M PLUS Rounded 1c", sans-serif' },
  { name: '童趣字体', value: '"Patrick Hand", cursive' },
  { name: '梦幻手写', value: '"Nanum Pen Script", cursive' },
  { name: '活泼涂鸦', value: '"Permanent Marker", cursive' },
]

// 预加载字体
const loadFont = (fontFamily) => {
  if (fontFamily.includes('M PLUS Rounded')) {
    return loadScript('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&display=swap')
  }
  if (fontFamily.includes('Patrick Hand')) {
    return loadScript('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap')
  }
  if (fontFamily.includes('Nanum Pen')) {
    return loadScript('https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap')
  }
  if (fontFamily.includes('Permanent Marker')) {
    return loadScript('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap')
  }
  if (fontFamily.includes('ZCOOL KuaiLe')) {
    return loadScript('https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap')
  }
  if (fontFamily.includes('Ma Shan Zheng')) {
    return loadScript('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap')
  }
  return Promise.resolve()
}

const loadScript = (url) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${url}"]`)) {
      resolve()
      return
    }
    const link = document.createElement('link')
    link.href = url
    link.rel = 'stylesheet'
    link.onload = resolve
    link.onerror = reject
    document.head.appendChild(link)
  })
}

// 背景颜色选项
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

// 字体大小选项
const FONT_SIZES = [
  { name: '小', value: 36 },
  { name: '中', value: 48 },
  { name: '大', value: 64 },
  { name: '特大', value: 80 },
]

export default function PosterGenerator({ note, onClose }) {
  const posterRef = useRef(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem('posterFont') || FONTS[0].value
  })
  const fontFamilyRef = useRef(fontFamily)
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('posterFontSize')) || 48
  })
  const fontSizeRef = useRef(fontSize)
  const [bgIndex, setBgIndex] = useState(() => {
    return parseInt(localStorage.getItem('posterBgIndex')) || 0
  })
  const bgIndexRef = useRef(bgIndex)
  const [watermark, setWatermark] = useState(() => {
    return localStorage.getItem('posterWatermark') || ''
  })
  const watermarkRef = useRef(watermark)
  const [qrUrl, setQrUrl] = useState(() => {
    return localStorage.getItem('posterQrUrl') || 'https://xiaohongshu-1k78.onrender.com/'
  })
  const qrUrlRef = useRef(qrUrl)

  // 同步watermark到ref
  useEffect(() => {
    watermarkRef.current = watermark
  }, [watermark])

  // 同步fontFamily到ref
  useEffect(() => {
    fontFamilyRef.current = fontFamily
  }, [fontFamily])

  // 同步fontSize到ref
  useEffect(() => {
    fontSizeRef.current = fontSize
  }, [fontSize])

  // 同步bgIndex到ref
  useEffect(() => {
    bgIndexRef.current = bgIndex
  }, [bgIndex])

  // 同步qrUrl到ref
  useEffect(() => {
    qrUrlRef.current = qrUrl
  }, [qrUrl])

  const { user } = useAuth()
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
    for (const line of lines) {
      const chars = line.split('')
      let lineContent = ''
      for (const char of chars) {
        const testLine = lineContent + char
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && lineContent) {
          ctx.fillText(lineContent, x, currentY)
          lineContent = char
          currentY += lineHeight
        } else {
          lineContent = testLine
        }
      }
      ctx.fillText(lineContent, x, currentY)
      currentY += lineHeight
    }
    return currentY
  }

  // Centered text wrapping function
  const wrapTextCentered = (ctx, text, centerX, y, maxWidth, lineHeight) => {
    const lines = text.split('\n')
    let currentY = y
    for (const line of lines) {
      const chars = line.split('')
      let lineContent = ''
      for (const char of chars) {
        const testLine = lineContent + char
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && lineContent) {
          ctx.fillText(lineContent, centerX - ctx.measureText(lineContent).width / 2, currentY)
          lineContent = char
          currentY += lineHeight
        } else {
          lineContent = testLine
        }
      }
      ctx.fillText(lineContent, centerX - ctx.measureText(lineContent).width / 2, currentY)
      currentY += lineHeight
    }
    return currentY
  }

  const generatePoster = async () => {
    setGenerating(true)
    setProgress(0)
    try {
      const width = 400
      const padding = 16
      const contentWidth = width - padding * 2
      let currentY = 0

      // 先计算需要的高度
      const headerHeight = 90  // 标题 + 作者区域
      const footerHeight = 60   // 底部区域
      const sectionSpacing = 26 // 标题高度 + 间距
      const lineHeight = 18
      const imageSpacing = 16
      const borderRadius = 16
      const borderWidth = 2

      // 计算文字高度
      let textHeight = 0
      for (const section of sections) {
        if (section.content) {
          const lines = section.content.split('\n').filter(l => l.trim())
          textHeight += sectionSpacing + lines.length * lineHeight + 10
        }
      }

      // 计算图片高度（保持原始比例）
      let imageHeight = 0
      const loadedImages = []
      for (const imgSrc of images) {
        try {
          const img = await loadImage(processImageUrl(imgSrc))
          const scaledHeight = contentWidth * img.height / img.width
          loadedImages.push({ img, height: scaledHeight })
          imageHeight += scaledHeight + imageSpacing
        } catch (e) {
          loadedImages.push({ img: null, height: 200 })
          imageHeight += 200 + imageSpacing
        }
      }

      // 总高度
      const totalHeight = Math.max(600, headerHeight + textHeight + imageHeight + footerHeight + 40)

      const canvas = document.createElement('canvas')
      canvas.width = width * 2 // 2x for retina
      canvas.height = totalHeight * 2
      canvas.style.width = width + 'px'
      canvas.style.height = totalHeight + 'px'
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)

      // 白色背景
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, totalHeight)

      // 渐变背景（8%透明度）
      setProgress(10)
      ctx.save()
      const bgColors = BACKGROUNDS[bgIndexRef.current].value
      const gradient = ctx.createLinearGradient(0, 0, width, totalHeight)
      gradient.addColorStop(0, bgColors[0])
      gradient.addColorStop(1, bgColors[1])
      ctx.fillStyle = gradient
      ctx.globalAlpha = 0.08
      ctx.fillRect(0, 0, width, totalHeight)
      ctx.restore()

      // 水印文字
      ctx.save()
      ctx.font = `bold ${fontSizeRef.current}px ${fontFamilyRef.current}`
      ctx.fillStyle = 'rgba(255, 154, 158, 0.4)'
      ctx.translate(width / 2, totalHeight / 2)
      ctx.rotate(-15 * Math.PI / 180)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(watermarkRef.current || '看了好心情', 0, 0)
      ctx.restore()

      // 外边框
      ctx.strokeStyle = '#f0f0f0'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(borderWidth, borderWidth, width - borderWidth * 2, totalHeight - borderWidth * 2, borderRadius)
      ctx.stroke()

      // 标题
      setProgress(20)
      currentY = 20
      ctx.font = `bold 24px ${fontFamilyRef.current}`
      ctx.fillStyle = '#333'
      wrapTextCentered(ctx, note.title || '笔记分享', width / 2, currentY, contentWidth, 30)
      currentY += 55

      // 标题下划线
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(50, currentY)
      ctx.lineTo(width - 50, currentY)
      ctx.stroke()
      currentY += 20

      // 作者信息
      setProgress(30)
      const avatarSize = 32
      const avatarX = (width - avatarSize) / 2
      const avatarUrl = processImageUrl(note.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${note.author_id}`)
      try {
        const avatarImg = await loadImage(avatarUrl)
        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarX + avatarSize / 2, currentY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(avatarImg, avatarX, currentY, avatarSize, avatarSize)
        ctx.restore()
      } catch (e) {
        ctx.fillStyle = '#ddd'
        ctx.beginPath()
        ctx.arc(avatarX + avatarSize / 2, currentY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.font = `14px ${fontFamilyRef.current}`
      ctx.fillStyle = '#666'
      ctx.textAlign = 'center'
      ctx.fillText(note.author_name || '匿名', width / 2, currentY + avatarSize + 15)
      currentY += avatarSize + 30

      // 内容区域
      const contentX = padding
      setProgress(40)

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        if (!section.content) continue

        // 章节标题
        ctx.font = `bold 18px ${fontFamilyRef.current}`
        ctx.fillStyle = '#333'
        ctx.textAlign = 'left'
        ctx.fillText(section.title, contentX, currentY)
        currentY += 24

        // 章节内容
        ctx.font = `14px ${fontFamilyRef.current}`
        ctx.fillStyle = '#555'
        const lines = section.content.split('\n')
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine) {
            const lines2 = []
            let currentLine = ''
            for (const char of trimmedLine) {
              const testLine = currentLine + char
              if (ctx.measureText(testLine).width > contentWidth && currentLine) {
                lines2.push(currentLine)
                currentLine = char
              } else {
                currentLine = testLine
              }
            }
            if (currentLine) lines2.push(currentLine)
            for (const l of lines2) {
              ctx.fillText(l, contentX, currentY)
              currentY += lineHeight
            }
          } else {
            currentY += 8
          }
        }
        currentY += 12

        // 插入图片
        if (i < loadedImages.length && loadedImages[i].img) {
          setProgress(40 + (i * 15))
          const imgHeight = loadedImages[i].height
          // 圆角裁剪
          ctx.save()
          const radius = 12
          ctx.beginPath()
          ctx.roundRect(contentX, currentY, contentWidth, imgHeight, radius)
          ctx.clip()
          ctx.drawImage(loadedImages[i].img, contentX, currentY, contentWidth, imgHeight)
          ctx.restore()
          currentY += imgHeight + 16
        }
      }

      // 额外的图片
      for (let i = sections.length; i < loadedImages.length; i++) {
        setProgress(40 + (i * 15))
        const imgHeight = loadedImages[i].height
        // 圆角裁剪
        ctx.save()
        const radius = 12
        ctx.beginPath()
        ctx.roundRect(contentX, currentY, contentWidth, imgHeight, radius)
        ctx.clip()
        ctx.drawImage(loadedImages[i].img, contentX, currentY, contentWidth, imgHeight)
        ctx.restore()
        currentY += imgHeight + 16
      }

      // 底部
      setProgress(90)
      ctx.fillStyle = '#f8f8f8'
      ctx.fillRect(0, totalHeight - footerHeight, width, footerHeight)

      ctx.font = `12px ${fontFamilyRef.current}`
      ctx.fillStyle = '#999'
      ctx.textAlign = 'left'
      ctx.fillText('小红书美食分享', padding, totalHeight - 30)

      // 二维码
      const qrUrlCanvas = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrlRef.current)}`
      try {
        const qrImg = await loadImage(qrUrlCanvas)
        ctx.drawImage(qrImg, width - padding - 60, totalHeight - 50, 60, 60)
      } catch (e) {
        ctx.fillStyle = '#eee'
        ctx.fillRect(width - padding - 60, totalHeight - 50, 60, 60)
      }

      // 下载
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
      if (img.src && !img.src.startsWith('data:') && !img.src.includes('api.qrserver.com')) {
        img.src = `${img.src.split('?')[0]}?t=${Date.now()}`
      }
    })
  }, [])

  // 当用户登录时，用昵称作为默认水印（覆盖任何旧的测试值）
  useEffect(() => {
    if (user?.nickname) {
      const savedWatermark = localStorage.getItem('posterWatermark')
      // 如果没有保存的水印，或者保存的是旧测试值，使用用户昵称
      if (!savedWatermark || savedWatermark === '测试水印ABC') {
        setWatermark(user.nickname)
        localStorage.setItem('posterWatermark', user.nickname)
      }
    }
  }, [user])
  return (
    <div className="poster-modal" onClick={onClose}>
      <div className="poster-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="poster-modal-header">
          <h3>生成海报</h3>
          <button className="poster-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="poster-preview">
          <div ref={posterRef} className="poster-container" style={{ fontFamily, fontSize: `${fontSize}px` }}>
            {/* Background */}
            <div
              className="poster-background"
              style={{ background: `linear-gradient(135deg, ${BACKGROUNDS[bgIndex].value[0]}, ${BACKGROUNDS[bgIndex].value[1]})` }}
            >
              <div className="poster-bg-text" style={{ fontSize: `${fontSize * 0.8}px` }}>{watermark}</div>
            </div>

            {/* Title */}
            <div className="poster-title" style={{ fontSize: `${fontSize * 0.5}px` }}>
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
                      <h4 className="poster-section-title" style={{ fontSize: `${fontSize * 0.38}px` }}>{section.title}</h4>
                      <p className="poster-section-content" style={{ fontSize: `${fontSize * 0.29}px` }}>{section.content}</p>
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
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(qrUrl)}`}
                alt="二维码"
                className="poster-qr-code"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        </div>

        <div className="poster-modal-actions">
          {user ? (
            <>
              <div className="poster-settings">
                <div className="poster-setting-row poster-setting-row-main">
                  <div className="poster-setting-item poster-watermark-input">
                    <label>水印</label>
                    <input
                      type="text"
                      value={watermark}
                      onChange={(e) => {
                        setWatermark(e.target.value)
                        localStorage.setItem('posterWatermark', e.target.value)
                      }}
                      placeholder="设置水印文字"
                      maxLength={20}
                    />
                  </div>
                  <div className="poster-setting-item poster-font-input">
                    <label>字体</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => {
                        const selectedFont = FONTS.find(f => f.value === e.target.value)
                        if (selectedFont) {
                          loadFont(selectedFont.value)
                          setFontFamily(e.target.value)
                          localStorage.setItem('posterFont', e.target.value)
                        }
                      }}
                    >
                      {FONTS.map(font => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="poster-setting-item poster-font-size-input">
                    <label>大小</label>
                    <select
                      value={fontSize}
                      onChange={(e) => {
                        setFontSize(parseInt(e.target.value))
                        localStorage.setItem('posterFontSize', e.target.value)
                      }}
                    >
                      {FONT_SIZES.map(size => (
                        <option key={size.value} value={size.value}>
                          {size.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="poster-setting-row">
                  <div className="poster-setting-item poster-bg-input">
                    <label>背景</label>
                    <div className="poster-bg-options">
                      {BACKGROUNDS.map((bg, index) => (
                        <button
                          key={index}
                          className={`poster-bg-option ${bgIndex === index ? 'active' : ''}`}
                          style={{ background: `linear-gradient(135deg, ${bg.value[0]}, ${bg.value[1]})` }}
                          onClick={() => {
                            setBgIndex(index)
                            localStorage.setItem('posterBgIndex', index.toString())
                          }}
                          title={bg.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="poster-buttons">
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
            </>
          ) : (
            <div className="poster-buttons">
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
          )}
        </div>
      </div>
    </div>
  )
}