import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Loading from '../components/Loading'
import './MyUploads.css'

const MyUploads = () => {
  const { user, refreshUser } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)

  const selectMode = searchParams.get('mode') // 'avatar' or 'background'

  useEffect(() => {
    loadImages()
  }, [user])

  const loadImages = async () => {
    if (!user) return
    setLoading(true)
    try {
      const response = await fetch(`/api/my/uploads?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setImages(data.images || [])
      }
    } catch (error) {
      console.error('加载图片失败:', error)
    }
    setLoading(false)
  }

  const handleUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // 将文件转换为 base64
      const reader = new FileReader()
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          image: base64,
          filename: file.name,
          folder: 'files'
        })
      })

      const data = await response.json()
      if (data.success) {
        setImages([data.url, ...images])
        alert('上传成功')
      } else {
        alert(data.message || '上传失败')
      }
    } catch (error) {
      console.error('上传失败:', error)
      alert('上传失败，请重试')
    }
    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (imageUrl, filename) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `image_${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败，请重试')
    }
  }

  const handleDelete = async (imageUrl) => {
    if (!confirm('确定要删除这张图片吗？')) return

    setDeletingId(imageUrl)
    try {
      const response = await fetch('/api/my/uploads', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ imageUrl, userId: user.id })
      })
      const data = await response.json()
      if (data.success) {
        setImages(images.filter(img => img !== imageUrl))
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
    setDeletingId(null)
  }

  const getImageCategory = (url) => {
    if (url.includes('/avatars/')) return '头像'
    if (url.includes('/backgrounds/')) return '背景图'
    if (url.includes('/notes/')) return '笔记图片'
    return '其他'
  }

  const handleBack = () => {
    navigate('/profile')
  }

  const handleSelect = async (imageUrl) => {
    if (!user) return
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(
          selectMode === 'avatar'
            ? { avatar: imageUrl, nickname: user.nickname, bio: user.bio || '', background: user.background, background_blur: user.background_blur || 0 }
            : { background: imageUrl, nickname: user.nickname, bio: user.bio || '', avatar: user.avatar, background_blur: user.background_blur || 0 }
        )
      })
      const data = await response.json()
      if (data.success) {
        // 刷新用户信息
        await refreshUser()
        alert(selectMode === 'avatar' ? '头像更新成功' : '背景图更新成功')
        // 短暂延迟确保状态更新完成
        setTimeout(() => navigate('/profile'), 100)
      } else {
        alert(data.message || '更新失败')
      }
    } catch (error) {
      console.error('更新失败:', error)
      alert('更新失败')
    }
  }

  if (loading) {
    return <Loading />
  }

  const title = selectMode === 'avatar' ? '选择头像' : selectMode === 'background' ? '选择背景图' : '我的上传'
  const subtitle = selectMode ? '点击图片选择，或上传新图片' : '管理您上传的所有图片'

  return (
    <div className="my-uploads-page">
      <div className="my-uploads-container">
        {selectMode && (
          <div className="my-uploads-header">
            <button className="my-uploads-back-btn" onClick={handleBack}>← 返回</button>
          </div>
        )}
        <h1 className="my-uploads-title">{title}</h1>
        <p className="my-uploads-subtitle">{subtitle}</p>

        <div className="my-uploads-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            className="my-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '上传中...' : '+ 上传图片'}
          </button>
          {uploading && (
            <div className="upload-progress">
              <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
              <span className="upload-progress-text">{uploadProgress}%</span>
            </div>
          )}
        </div>

        {images.length === 0 ? (
          <div className="my-uploads-empty">
            <p>暂无上传记录</p>
          </div>
        ) : (
          <>
            <div className="my-uploads-stats">
              <span>共 {images.length} 张图片</span>
            </div>
            <div className="my-uploads-grid">
              {images.map((image, index) => (
                <div key={index} className={`my-upload-item ${selectMode ? 'selectable' : ''}`} onClick={() => selectMode && handleSelect(image)}>
                  <img src={image} alt={`上传图片 ${index + 1}`} className="my-upload-image" />
                  <div className="my-upload-overlay">
                    <span className="my-upload-category">{getImageCategory(image)}</span>
                    <div className="my-upload-actions">
                      {!selectMode && (
                        <button
                          className="my-upload-download"
                          onClick={(e) => { e.stopPropagation(); handleDownload(image, `image_${index + 1}.jpg`); }}
                          title="下载图片"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        className="my-upload-delete"
                        onClick={(e) => { e.stopPropagation(); handleDelete(image); }}
                        disabled={deletingId === image}
                      >
                        {deletingId === image ? '删除中...' : '×'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MyUploads