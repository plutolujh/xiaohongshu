import { useState, useRef, useEffect } from 'react'
import './ImageCropper.css'

export default function ImageCropper({ image, aspectRatio = 1, onCancel, onConfirm, maxWidth = 400, maxHeight = 400 }) {
  const containerRef = useRef(null)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 100 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const displayWidth = 300
  const displayHeight = aspectRatio === 1 ? 300 : 150

  const handleMouseDown = (e) => {
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e) => {
    if (!dragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    const newX = Math.max(0, Math.min(cropArea.x + dx, displayWidth - cropArea.size))
    const newY = Math.max(0, Math.min(cropArea.y + dy, displayHeight - cropArea.size))
    setCropArea(prev => ({ ...prev, x: newX, y: newY }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setDragging(false)
  }

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging])

  const handleConfirm = () => {
    const scaleX = maxWidth / displayWidth
    const scaleY = (maxWidth / displayWidth) / aspectRatio
    const crop = {
      x: cropArea.x * scaleX,
      y: cropArea.y * scaleY,
      width: cropArea.size * scaleX,
      height: cropArea.size * scaleY
    }

    const canvas = document.createElement('canvas')
    canvas.width = maxWidth
    canvas.height = maxHeight
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, maxWidth, maxHeight)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      onConfirm(dataUrl)
    }
    img.src = image
  }

  return (
    <div className="image-cropper-overlay">
      <div className="image-cropper-modal">
        <h3>裁剪图片</h3>
        <div className="image-cropper-container" style={{ width: displayWidth, height: displayHeight }}>
          <img src={image} alt="待裁剪" className="image-cropper-preview" style={{ width: displayWidth, height: displayHeight }} />
          <div className="image-cropper-mask" />
          <div
            className="image-cropper-area"
            style={{
              left: cropArea.x,
              top: cropArea.y,
              width: cropArea.size,
              height: cropArea.size
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="image-cropper-grid">
              <div className="grid-line horizontal" style={{ top: '33%' }} />
              <div className="grid-line horizontal" style={{ top: '66%' }} />
              <div className="grid-line vertical" style={{ left: '33%' }} />
              <div className="grid-line vertical" style={{ left: '66%' }} />
            </div>
          </div>
        </div>
        <div className="image-cropper-hint">拖动选择区域调整位置</div>
        <div className="image-cropper-actions">
          <button onClick={onCancel} className="cropper-cancel">取消</button>
          <button onClick={handleConfirm} className="cropper-confirm">确认</button>
        </div>
      </div>
    </div>
  )
}
