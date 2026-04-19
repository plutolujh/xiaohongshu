import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { findNoteById, updateNote, getCommentsByNoteId, createComment, deleteCommentById, getNoteTags, likeNote, unlikeNote, getNoteLikeStatus } from '../utils/db'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import './NoteDetail.css'

export default function NoteDetail() {
  const { id } = useParams()
  const [note, setNote] = useState(null)
  const [comments, setComments] = useState([])
  const [tags, setTags] = useState([])
  const [newComment, setNewComment] = useState('')
  const [replyToComment, setReplyToComment] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(false)
  const [sharing, setSharing] = useState(false)
  const shareContentRef = useRef(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) {
      findNoteById(id).then(setNote)
      getCommentsByNoteId(id).then(setComments)
      getNoteTags(id).then(setTags)
      // 获取点赞状态
      if (user) {
        getNoteLikeStatus(id).then(result => {
          setLiked(result.liked || false)
        }).catch(() => {})
      }
    }
  }, [id, user])

  const handleLike = async () => {
    if (!note || !user) {
      // 未登录时提示登录
      alert('请先登录后再点赞')
      return
    }

    try {
      if (liked) {
        // 取消点赞
        await unlikeNote(note.id)
        setLiked(false)
        setNote({ ...note, likes: Math.max(0, (note.likes || 0) - 1) })
      } else {
        // 点赞
        await likeNote(note.id)
        setLiked(true)
        setNote({ ...note, likes: (note.likes || 0) + 1 })
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
      alert('操作失败，请稍后重试')
    }
  }

  const handleShare = async () => {
    if (!note) return

    setSharing(true)
    try {
      // 获取笔记信息
      const title = note.title || '笔记分享'
      const content = (note.content || '').substring(0, 100) + (note.content && note.content.length > 100 ? '...' : '')
      const shareUrl = window.location.href

      // 尝试使用 Web Share API
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: content,
          url: shareUrl
        })
        // 分享成功后不需要提示，因为系统会处理
      } else {
        // Web Share API 不可用，使用复制链接的方式
        await navigator.clipboard.writeText(shareUrl)
        alert('分享链接已复制到剪贴板，请粘贴到微信朋友圈分享~')
      }
    } catch (error) {
      console.error('分享失败:', error)
      // 如果是用户取消分享，不显示错误提示
      if (error.name !== 'AbortError') {
        // 尝试降级到复制链接
        try {
          const shareUrl = window.location.href
          await navigator.clipboard.writeText(shareUrl)
          alert('分享链接已复制到剪贴板，请粘贴到微信朋友圈分享~')
        } catch (clipboardError) {
          alert('分享失败，请手动复制链接分享')
        }
      }
    } finally {
      setSharing(false)
    }
  }

  // 辅助函数：自动换行绘制文本
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split('')
    let line = ''
    let currentY = y

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i]
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY)
        line = words[i]
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, currentY)
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setLoading(true)
    try {
      const commentData = {
        id: Date.now().toString(),
        note_id: id,
        user_id: user.id,
        user_name: user.nickname,
        content: newComment.trim(),
        created_at: new Date().toISOString()
      }

      if (replyToComment) {
        commentData.reply_to_id = replyToComment.id
        commentData.reply_to_user_name = replyToComment.user_name
        commentData.reply_to_content = replyToComment.content
      }

      await createComment(commentData)
      setComments([commentData, ...comments])
      setNewComment('')
      setReplyToComment(null)
    } catch (err) {
      console.error('评论失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = (comment) => {
    setReplyToComment(comment)
    setNewComment(`@${comment.user_name} `)
  }

  const handleCancelReply = () => {
    setReplyToComment(null)
    setNewComment('')
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('确定删除这条评论？')) return
    await deleteCommentById(commentId)
    setComments(comments.filter(c => c.id !== commentId))
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  if (!note) {
    return (
      <div className="note-detail">
        <div className="page-loading">
          <Loading text="正在加载笔记详情..." size="large" />
        </div>
      </div>
    )
  }

  const images = note.images || []

  return (
    <div className="note-detail">
      <div className="note-detail-container">
        <Link to="/" className="note-detail-back">← 返回首页</Link>

        <div className="note-detail-images">
          {images.length === 1 ? (
            <div className="note-detail-image">
              <img 
                src={images[0]} 
                alt={note.title} 
                onClick={() => {
                  setSelectedImage(images[0])
                  setSelectedImageIndex(0)
                  setRotation(0)
                }}
                className="clickable-image"
              />
            </div>
          ) : images.length > 1 ? (
            <div className="note-detail-image-grid">
              {images.slice(0, 9).map((img, index) => (
                <div key={index} className="note-detail-image-item">
                  <img 
                    src={img} 
                    alt={`${note.title}-${index + 1}`} 
                    onClick={() => {
                      setSelectedImage(img)
                      setSelectedImageIndex(index)
                      setRotation(0)
                    }}
                    className="clickable-image"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="note-detail-image">
              <div style={{ background: '#f5f5f5', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无图片
              </div>
            </div>
          )}
        </div>

        <div className="note-detail-content">
          <div className="note-detail-header">
            <h1>{note.title}</h1>
            <div className="note-detail-actions">
              <button
                className={`note-detail-like ${liked ? 'liked' : ''}`}
                onClick={handleLike}
              >
                {liked ? '❤️' : '🤍'} {note.likes || 0}
              </button>
              <button
                className="note-detail-share"
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? '生成中...' : '📤 分享'}
              </button>
              {user && user.id === note.author_id && (
                <button
                  className="note-detail-edit"
                  onClick={() => navigate(`/edit/${note.id}`)}
                >
                  编辑
                </button>
              )}
            </div>
          </div>

          <div className="note-detail-author">
            <img
              src={note.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${note.author_id}`}
              alt={note.author_name}
              className="note-detail-avatar clickable-avatar"
              onClick={() => navigate(`/profile/${note.author_id}`)}
              title="点击查看作者主页"
            />
            <div className="note-detail-author-info">
              <span
                className="note-detail-author-name clickable-name"
                onClick={() => navigate(`/profile/${note.author_id}`)}
              >
                {note.author_name}
              </span>
              <span className="note-detail-date">{formatDate(note.created_at)}</span>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="note-detail-tags">
              <h3>标签</h3>
              <div className="note-tags-container">
                {tags.map(tag => (
                  <span key={tag.id} className="note-tag">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="note-detail-section">
            <h3>简介</h3>
            <p>{note.content}</p>
          </div>

          <div className="note-detail-section">
            <h3>食材</h3>
            <pre>{note.ingredients}</pre>
          </div>

          <div className="note-detail-section">
            <h3>做法</h3>
            <pre>{note.steps}</pre>
          </div>

          <div className="note-detail-comments">
            <h3>评论 ({comments.length})</h3>

            {user ? (
              <form onSubmit={handleComment} className="comment-form">
                <img src={user.avatar} alt={user.nickname} className="comment-avatar" />
                <div className="comment-input-wrapper">
                  {replyToComment && (
                    <div className="comment-reply-info">
                      <span>回复 @{replyToComment.user_name}</span>
                      <button type="button" onClick={handleCancelReply} className="comment-cancel-reply">×</button>
                    </div>
                  )}
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyToComment ? `回复 @${replyToComment.user_name}...` : "添加评论..."}
                    className="comment-input"
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="comment-submit" disabled={loading}>
                  {loading ? (
                    <div className="button-loading">
                      <Loading text="" size="small" />
                      <span>发布中...</span>
                    </div>
                  ) : '发布'}
                </button>
              </form>
            ) : (
              <p className="comment-login-tip">登录后可以评论</p>
            )}

            <div className="comment-list">
              {comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`} alt={comment.user_name} className="comment-avatar" />
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">{comment.user_name}</span>
                      <span className="comment-time">{formatDate(comment.created_at)}</span>
                    </div>
                    {comment.reply_to_id && (
                      <div className="comment-reply-quote">
                        <span className="reply-quote-author">@{comment.reply_to_user_name}</span>
                        <span className="reply-quote-content">{comment.reply_to_content}</span>
                      </div>
                    )}
                    <p className="comment-text">{comment.content}</p>
                  </div>
                  <div className="comment-actions">
                    {user && (
                      <button className="comment-reply" onClick={() => handleReply(comment)}>回复</button>
                    )}
                    {user && user.id === comment.user_id && (
                      <button className="comment-delete" onClick={() => handleDeleteComment(comment.id)}>删除</button>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="comment-empty">还没有评论，快来抢沙发吧~</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 图片预览模态框 */}
      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setSelectedImage(null)}>×</button>
            
            {/* 图片导航按钮 */}
            {images.length > 1 && (
              <>
                <button 
                  className="image-modal-nav image-modal-prev"
                  onClick={() => {
                    const newIndex = (selectedImageIndex - 1 + images.length) % images.length
                    setSelectedImage(images[newIndex])
                    setSelectedImageIndex(newIndex)
                    setRotation(0)
                  }}
                >
                  ←
                </button>
                <button 
                  className="image-modal-nav image-modal-next"
                  onClick={() => {
                    const newIndex = (selectedImageIndex + 1) % images.length
                    setSelectedImage(images[newIndex])
                    setSelectedImageIndex(newIndex)
                    setRotation(0)
                  }}
                >
                  →
                </button>
                <div className="image-modal-counter">
                  {selectedImageIndex + 1} / {images.length}
                </div>
              </>
            )}
            
            {/* 旋转按钮 */}
            <button 
              className="image-modal-rotate"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
            >
              🔄
            </button>
            
            <img
              src={selectedImage}
              alt="预览"
              className="image-modal-img"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>
        </div>
      )}

    </div>
  )
}
