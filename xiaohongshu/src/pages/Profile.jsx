import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllNotes, deleteNoteById } from '../utils/db'
import './Profile.css'

export default function Profile() {
  const { user, logout } = useAuth()
  const [notes, setNotes] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      getAllNotes().then(allNotes => {
        setNotes(allNotes.filter(n => n.author_id === user.id))
      })
    }
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('确定要删除这篇笔记吗？')) return
    await deleteNoteById(noteId)
    setNotes(notes.filter(n => n.id !== noteId))
  }

  const handleEditNote = (noteId) => {
    navigate(`/edit/${noteId}`)
  }

  if (!user) {
    return <div className="profile"><div className="profile-empty">请先登录</div></div>
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <img src={user.avatar} alt={user.nickname} className="profile-avatar" />
        <h2 className="profile-nickname">{user.nickname}</h2>
        <p className="profile-username">@{user.username}</p>
      </div>

      <div className="profile-actions">
        <button onClick={handleLogout} className="profile-logout">退出登录</button>
      </div>

      <div className="profile-notes">
        <h3>我的笔记 ({notes.length})</h3>
        {notes.length > 0 ? (
          <div className="profile-notes-grid">
            {notes.map(note => {
              const images = note.images || []
              const coverImage = images[0]
              return (
                <div key={note.id} className="profile-note-item">
                  <Link to={`/note/${note.id}`} className="profile-note-link">
                    <div className="profile-note-image">
                      {coverImage ? <img src={coverImage} alt={note.title} /> : <div style={{ background: '#f5f5f5', height: '100%' }} />}
                    </div>
                    <div className="profile-note-info">
                      <h4>{note.title}</h4>
                      <p>❤️ {note.likes}</p>
                    </div>
                  </Link>
                  <div className="profile-note-actions">
                    <button className="profile-note-edit" onClick={() => handleEditNote(note.id)}>编辑</button>
                    <button className="profile-note-delete" onClick={() => handleDeleteNote(note.id)}>删除</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="profile-empty-notes">
            <p>还没有发布过笔记</p>
            <Link to="/publish" className="profile-publish-btn">发布第一篇笔记</Link>
          </div>
        )}
      </div>
    </div>
  )
}
