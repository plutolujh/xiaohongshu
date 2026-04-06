import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { findNoteById, updateNote, getCommentsByNoteId, createComment, deleteCommentById } from '../utils/db'
import { useAuth } from '../context/AuthContext'
import './NoteDetail.css'

export default function NoteDetail() {
  const { id } = useParams()
  const [note, setNote] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [replyToComment, setReplyToComment] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) {
      findNoteById(id).then(setNote)
      getCommentsByNoteId(id).then(setComments)
    }
  }, [id])

  const handleLike = async () => {
    if (!note) return
    const newLiked = !note.liked
    const updatedNote = {
      ...note,
      liked: newLiked,
      likes: newLiked ? note.likes + 1 : note.likes - 1
    }
    await updateNote(updatedNote)
    setNote(updatedNote)
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

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
        <div className="note-detail-loading">加载中...</div>
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
                onClick={() => setSelectedImage(images[0])}
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
                    onClick={() => setSelectedImage(img)}
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
                className={`note-detail-like ${note.liked ? 'liked' : ''}`}
                onClick={handleLike}
              >
                {note.liked ? '❤️' : '🤍'} {note.likes}
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
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${note.author_id}`}
              alt={note.author_name}
              className="note-detail-avatar"
            />
            <div className="note-detail-author-info">
              <span className="note-detail-author-name">{note.author_name}</span>
              <span className="note-detail-date">{formatDate(note.created_at)}</span>
            </div>
          </div>

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
                  />
                </div>
                <button type="submit" className="comment-submit">发布</button>
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
            <img src={selectedImage} alt="预览" className="image-modal-img" />
          </div>
        </div>
      )}
    </div>
  )
}
