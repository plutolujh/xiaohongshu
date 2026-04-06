import { Link } from 'react-router-dom'
import './NoteCard.css'

export default function NoteCard({ note }) {
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

  // 支持多图：使用 images 数组
  const images = note.images || []
  const coverImage = images[0]

  // 兼容旧数据
  const authorId = note.author_id || note.authorId || ''
  const authorName = note.author_name || note.authorName || ''
  const likes = note.likes || 0
  const title = note.title || ''
  const content = note.content || ''

  return (
    <Link to={`/note/${note.id}`} className="note-card">
      <div className="note-card-image">
        <img src={coverImage} alt={title} />
        {images.length > 1 && (
          <div className="note-card-more">
            <span>{images.length}</span>
          </div>
        )}
      </div>
      <div className="note-card-content">
        <h3 className="note-card-title">{title}</h3>
        <p className="note-card-desc">{content}</p>
        <div className="note-card-footer">
          <div className="note-card-author">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId}`}
              alt={authorName}
              className="note-card-avatar"
            />
            <span className="note-card-username">{authorName}</span>
          </div>
          <div className="note-card-info">
            <span className="note-card-likes">❤️ {likes}</span>
            <span className="note-card-date">{formatDate(note.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
