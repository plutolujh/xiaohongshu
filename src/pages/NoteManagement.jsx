import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCurrentUser } from '../utils/db'
import './NoteManagement.css'

const NoteManagement = () => {
  const { user: currentUser } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch('/api/notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setNotes(data.notes)
      setLoading(false)
    } catch (err) {
      setError('获取笔记列表失败')
      setLoading(false)
      console.error('Error fetching notes:', err)
    }
  }

  const handleDelete = async (noteId) => {
    if (!window.confirm('确定要删除这篇笔记吗？')) {
      return
    }

    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setNotes(notes.filter(note => note.id !== noteId))
      } else {
        alert('删除笔记失败：' + data.message)
      }
    } catch (err) {
      alert('删除笔记失败')
      console.error('Error deleting note:', err)
    }
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.author_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="loading">加载笔记列表中...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="note-management-container">
      <h1 className="note-management-title">笔记管理</h1>

      <div className="note-management-controls">
        <input
          type="text"
          placeholder="搜索笔记标题或作者..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="notes-list">
        {filteredNotes.map(note => (
          <div key={note.id} className="note-card">
            <div className="note-info">
              <h3>{note.title}</h3>
              <p className="note-author">作者：{note.author_name}</p>
              <p className="note-date">发布时间: {new Date(note.created_at).toLocaleString()}</p>
              <p className="note-likes">点赞数: {note.likes}</p>
              {note.images && note.images.length > 0 && (
                <div className="note-images">
                  <img src={note.images[0]} alt={note.title} className="note-image" />
                  {note.images.length > 1 && (
                    <span className="more-images">+{note.images.length - 1}</span>
                  )}
                </div>
              )}
            </div>
            <div className="note-actions">
              <button onClick={() => handleDelete(note.id)} className="btn-delete">删除</button>
            </div>
          </div>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="no-notes">没有找到笔记</div>
      )}
    </div>
  )
}

export default NoteManagement