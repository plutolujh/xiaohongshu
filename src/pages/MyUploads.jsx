import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import './MyUploads.css'

const MyUploads = () => {
  const { user } = useAuth()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    loadImages()
  }, [user])

  const loadImages = async () => {
    if (!user) return
    setLoading(true)
    try {
      const response = await fetch(`/api/my/uploads?userId=${user.id}`)
      const data = await response.json()
      if (data.success) {
        setImages(data.images || [])
      }
    } catch (error) {
      console.error('加载图片失败:', error)
    }
    setLoading(false)
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

  if (loading) {
    return <Loading />
  }

  return (
    <div className="my-uploads-page">
      <div className="my-uploads-container">
        <h1 className="my-uploads-title">我的上传</h1>
        <p className="my-uploads-subtitle">管理您上传的所有图片</p>

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
                <div key={index} className="my-upload-item">
                  <img src={image} alt={`上传图片 ${index + 1}`} className="my-upload-image" />
                  <div className="my-upload-overlay">
                    <span className="my-upload-category">{getImageCategory(image)}</span>
                    <button 
                      className="my-upload-delete"
                      onClick={() => handleDelete(image)}
                      disabled={deletingId === image}
                    >
                      {deletingId === image ? '删除中...' : '删除'}
                    </button>
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