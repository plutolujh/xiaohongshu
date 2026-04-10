import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { likeNote, unlikeNote } from '../utils/db'
import { useAuth } from '../context/AuthContext'
import FollowButton from './FollowButton'
import './NoteCard.css'

export default function NoteCard({ note, onNoteUpdate }) {
  const [localNote, setLocalNote] = useState(note)
  const { user } = useAuth()

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  // 支持多图：优先使用 coverImage，否则兼容旧的 images 数组
  const coverImage = localNote.coverImage || localNote.images?.[0] || null
  // 从coverImage创建单元素数组，确保即使后端只返回coverImage也能正确显示
  const images = localNote.images || (coverImage ? [coverImage] : [])
  // 使用后端返回的图片数量，如果没有则使用本地计算的数量
  const imagesCount = localNote.imagesCount || images.length

  // 兼容旧数据
  const authorId = localNote.author_id || localNote.authorId || ''
  const authorName = localNote.author_name || localNote.authorName || ''
  const likes = localNote.likes || 0
  const title = localNote.title || ''
  // 列表接口不再返回 content，详情页才返回，所以这里不显示描述
  // 使用传入的 liked 状态，如果没有则使用本地存储的点赞时间判断
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    // 从 localStorage 读取点赞状态作为初始值
    const lastLikeKey = `note_liked_${localNote.id}`
    const liked = localStorage.getItem(lastLikeKey)
    setIsLiked(liked === 'true')
  }, [localNote.id])

  const handleLike = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      alert('请先登录后再点赞')
      return
    }

    try {
      if (isLiked) {
        await unlikeNote(localNote.id)
        setIsLiked(false)
        setLocalNote({ ...localNote, likes: Math.max(0, likes - 1) })
        localStorage.setItem(`note_liked_${localNote.id}`, 'false')
      } else {
        await likeNote(localNote.id)
        setIsLiked(true)
        setLocalNote({ ...localNote, likes: likes + 1 })
        localStorage.setItem(`note_liked_${localNote.id}`, 'true')
      }
      if (onNoteUpdate) {
        onNoteUpdate({ ...localNote, likes: isLiked ? Math.max(0, likes - 1) : likes + 1 })
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  return (
    <Link to={`/note/${localNote.id}`} className="note-card">
      <div className={`note-card-image ${images.length > 1 ? 'multi-images' : ''} ${images.length > 4 ? 'grid-3' : ''}`}>
        {images.length === 1 ? (
          <img src={coverImage} alt={title} loading="lazy" />
        ) : images.length > 1 ? (
          <div className="image-grid">
            {images.slice(0, 9).map((image, index) => (
              <div key={index} className="grid-item">
                <img src={image} alt={`${title} - 图片 ${index + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <div className="no-image">
            <span>📷</span>
          </div>
        )}
        {(imagesCount > 1) && (
          <div className="note-card-more">
            <span>{imagesCount}</span>
          </div>
        )}
      </div>
      <div className="note-card-content">
        <h3 className="note-card-title">{title}</h3>
        <div className="note-card-footer">
          <div className="note-card-author">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId}`}
              alt={authorName}
              className="note-card-avatar"
            />
            <span className="note-card-username">{authorName}</span>
            <FollowButton userId={authorId} size="small" showText={false} />
          </div>
          <div className="note-card-info">
            <button 
              className={`note-card-like ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              {isLiked ? '❤️' : '🤍'} {likes}
            </button>
            <span className="note-card-date">{formatDate(localNote.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
