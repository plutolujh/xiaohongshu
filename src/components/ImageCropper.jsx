import { useState, useRef, useEffect } from 'react'
import './ImageCropper.css'

export default function ImageCropper({ image, aspectRatio = 1, onCancel, onConfirm, maxWidth = 400, maxHeight = 400 }) {
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, size: 100 })

  const displayWidth = 300
  const displayHeight = aspectRatio === 1 ? 300 : 100
  const isBackground = aspectRatio !== 1
  const maxCropSize = isBackground ? displayWidth : displayWidth * 0.8

  useEffect(() => {
    if (isBackground) {
      setCropArea({ x: 0, y: 0, size: displayWidth })
    } else {
      setCropArea({ x: 0, y: 0, size: maxCropSize })
    }
  }, [isBackground])

  const handleAreaMouseDown = (e) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleResizeMouseDown = (e) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({ x: e.clientX, y: e.clientY, size: cropArea.size })
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      const newX = Math.max(0, Math.min(cropArea.x + dx, displayWidth - cropArea.size))
      const newY = Math.max(0, Math.min(cropArea.y + dy, displayHeight - cropArea.size))
      setCropArea(prev => ({ ...prev, x: newX, y: newY }))
      setDragStart({ x: e.clientX, y: e.clientY })
    }
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x
      const deltaSize = deltaX
      const newSize = Math.max(80, Math.min(resizeStart.size + deltaSize, maxCropSize))
      const newX = Math.max(0, Math.min(cropArea.x, displayWidth - newSize))
      const newY = Math.max(0, Math.min(cropArea.y, displayHeight - newSize))
      setCropArea(prev => ({ ...prev, x: newX, y: newY, size: newSize }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing])

  const handleConfirm = () => {
    if (isBackground) {
      const canvas = document.createElement('canvas')
      canvas.width = maxWidth
      canvas.height = maxHeight
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const imgRatio = img.width / img.height
        const canvasRatio = maxWidth / maxHeight

        let sx = 0, sy = 0, sw = img.width, sh = img.height
        if (imgRatio > canvasRatio) {
          sw = img.height * canvasRatio
          sx = (img.width - sw) / 2
        } else {
          sh = img.width / canvasRatio
          sy = (img.height - sh) / 2
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, maxWidth, maxHeight)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        onConfirm(dataUrl)
      }
      img.src = image
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const imgRatio = img.width / img.height
      const containerRatio = displayWidth / displayHeight

      let actualDisplayW, actualDisplayH, offsetX, offsetY
      if (imgRatio > containerRatio) {
        actualDisplayW = displayWidth
        actualDisplayH = displayWidth / imgRatio
        offsetX = 0
        offsetY = (displayHeight - actualDisplayH) / 2
      } else {
        actualDisplayH = displayHeight
        actualDisplayW = displayHeight * imgRatio
        offsetX = (displayWidth - actualDisplayW) / 2
        offsetY = 0
      }

      const scaleFromDisplayToSourceX = img.width / actualDisplayW
      const scaleFromDisplayToSourceY = img.height / actualDisplayH

      let sourceX = Math.max(0, (cropArea.x - offsetX) * scaleFromDisplayToSourceX)
      let sourceY = Math.max(0, (cropArea.y - offsetY) * scaleFromDisplayToSourceY)
      let sourceW = cropArea.size * scaleFromDisplayToSourceX
      let sourceH = cropArea.size * scaleFromDisplayToSourceX

      sourceX = Math.min(sourceX, img.width)
      sourceY = Math.min(sourceY, img.height)
      sourceW = Math.min(sourceW, img.width - sourceX)
      sourceH = Math.min(sourceH, img.height - sourceY)

      const canvas = document.createElement('canvas')
      canvas.width = maxWidth
      canvas.height = maxHeight
      const ctx = canvas.getContext('2d')

      ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, maxWidth, maxHeight)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      onConfirm(dataUrl)
    }
    img.src = image
  }

  return (
    <div className="image-cropper-overlay">
      <div className="image-cropper-modal">
        <h3>{isBackground ? '调整背景图位置' : '裁剪图片'}</h3>
        <div className="image-cropper-container" style={{ width: displayWidth, height: displayHeight }}>
          <img src={image} alt="待裁剪" className="image-cropper-preview" style={{ width: displayWidth, height: displayHeight }} />
          <div className="image-cropper-mask" />
          <div
            className="image-cropper-area"
            style={{
              left: cropArea.x,
              top: cropArea.y,
              width: cropArea.size,
              height: cropArea.size * (1 / aspectRatio)
            }}
            onMouseDown={handleAreaMouseDown}
          >
            <div className="image-cropper-grid">
              <div className="grid-line horizontal" style={{ top: '33%' }} />
              <div className="grid-line horizontal" style={{ top: '66%' }} />
              <div className="grid-line vertical" style={{ left: '33%' }} />
              <div className="grid-line vertical" style={{ left: '66%' }} />
            </div>
            {!isBackground && (
              <div
                className="image-cropper-resize-handle"
                onMouseDown={handleResizeMouseDown}
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="white" d="M10.5 19.5L19 11l-1.5-1.5L9 18l1.5 1.5zm-7-7L12 4l1.5 1.5L4 13l-1.5-1.5z"/>
                </svg>
              </div>
            )}
          </div>
        </div>
        <div className="image-cropper-hint">
          {isBackground ? '拖动选择区域调整背景位置' : '拖动选择区域调整位置，拖动右下角调整大小'}
        </div>
        <div className="image-cropper-actions">
          <button onClick={onCancel} className="cropper-cancel">取消</button>
          <button onClick={handleConfirm} className="cropper-confirm">确认</button>
        </div>
      </div>
    </div>
  )
}
