/**
 * NoteCard.jsx 集成示例
 * 
 * 在笔记卡片上添加快速进入海报浏览模式的按钮
 * 
 * 修改步骤:
 * 1. 接收新的 onEnterPosterMode 属性
 * 2. 在卡片上添加快速按钮
 * 3. 处理点击事件
 * 
 * 文件位置: src/components/NoteCard.jsx
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { likeNote, unlikeNote } from '../utils/db'
import { useAuth } from '../context/AuthContext'
import FollowButton from './FollowButton'
import './NoteCard.css'

export default function NoteCard({ 
  note, 
  onNoteUpdate,
  onEnterPosterMode  // 新增: 进入海报模式的回调
}) {
  const [localNote, setLocalNote] = useState(note)
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(false)

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

  const coverImage = localNote.coverImage || localNote.images?.[0] || null
  const images = localNote.images || (coverImage ? [coverImage] : [])
  const imagesCount = localNote.imagesCount || images.length
  const authorId = localNote.author_id || localNote.authorId || ''
  const authorName = localNote.author_name || localNote.authorName || ''
  const likes = localNote.likes || 0
  const title = localNote.title || ''

  useEffect(() => {
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
        onNoteUpdate({ 
          ...localNote, 
          likes: isLiked ? Math.max(0, likes - 1) : likes + 1 
        })
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  /**
   * 新增: 处理快速进入海报模式
   */
  const handleQuickPoster = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onEnterPosterMode) {
      onEnterPosterMode()
    }
  }

  return (
    <Link to={`/note/${localNote.id}`} className="note-card">
      {/* 新增: 快速海报按钮 */}
      <button 
        className="btn-quick-poster"
        onClick={handleQuickPoster}
        title="快速查看海报版本"
        aria-label="进入海报浏览模式"
      >
        <span className="poster-icon">🎨</span>
        <span className="poster-tooltip">海报模式</span>
      </button>

      {/* 图片区域 */}
      <div className={`note-card-image ${images.length > 1 ? 'multi-images' : ''} ${images.length > 4 ? 'grid-3' : ''}`}>
        {images.length === 1 ? (
          <img src={coverImage} alt={title} loading="lazy" />
        ) : images.length > 1 ? (
          <div className="image-grid">
            {images.slice(0, 9).map((image, index) => (
              <div key={index} className="grid-item">
                <img 
                  src={image} 
                  alt={`${title} - 图片 ${index + 1}`} 
                  loading="lazy" 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="no-image">
            <span>📷</span>
          </div>
        )}
        
        {imagesCount > 1 && (
          <div className="note-card-more">
            <span>{imagesCount}</span>
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="note-card-info">
        <h3 className="note-card-title">{title}</h3>
        
        <div className="note-card-meta">
          <span className="author">{authorName}</span>
          <span className="date">{formatDate(localNote.created_at)}</span>
        </div>

        <div className="note-card-actions">
          <button 
            className={`like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
            title={isLiked ? '取消点赞' : '点赞'}
          >
            <span className="like-icon">{isLiked ? '❤️' : '🤍'}</span>
            <span className="like-count">{localNote.likes || 0}</span>
          </button>

          {authorId && user?.id !== authorId && (
            <FollowButton userId={authorId} />
          )}
        </div>
      </div>
    </Link>
  )
}
