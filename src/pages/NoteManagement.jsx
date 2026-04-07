import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCurrentUser } from '../utils/db'
import Loading from '../components/Loading'
import TagInput from '../components/TagInput'
import './NoteManagement.css'

const NoteManagement = () => {
  const { user: currentUser } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [notesWithTags, setNotesWithTags] = useState({})
  const [editingTags, setEditingTags] = useState(null)
  const [tags, setTags] = useState([])
  const [selectedTag, setSelectedTag] = useState('')

  const fetchTags = async () => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch('/api/tags', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setTags(data)
    } catch (err) {
      console.error('Error fetching tags:', err)
    }
  }

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      
      let response, data
      if (selectedTag) {
        // 按标签筛选
        response = await fetch(`/api/tags/${selectedTag}/notes?page=${page}&limit=${pageSize}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        data = await response.json()
      } else {
        // 获取所有笔记
        response = await fetch(`/api/notes?page=${page}&limit=${pageSize}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        data = await response.json()
      }
      
      setNotes(data.notes)
      setTotal(data.total || 0)
      
      // 为每个笔记获取标签
      const notesWithTagsData = {}
      for (const note of data.notes) {
        try {
          const tagsResponse = await fetch(`/api/notes/${note.id}/tags`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          const tagsData = await tagsResponse.json()
          notesWithTagsData[note.id] = tagsData
        } catch (err) {
          console.error(`Error fetching tags for note ${note.id}:`, err)
          notesWithTagsData[note.id] = []
        }
      }
      setNotesWithTags(notesWithTagsData)
      
      setLoading(false)
    } catch (err) {
      setError('获取笔记列表失败')
      setLoading(false)
      console.error('Error fetching notes:', err)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [page, pageSize, selectedTag])

  useEffect(() => {
    fetchTags()
  }, [])

  const handleDelete = async (noteId) => {
    if (!window.confirm('确定要删除这篇笔记吗？')) {
      return
    }

    setDeleting(true)
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
        // 重新加载当前页的笔记
        await fetchNotes()
      } else {
        alert('删除笔记失败：' + data.message)
      }
    } catch (err) {
      alert('删除笔记失败')
      console.error('Error deleting note:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value)
    setPageSize(newSize)
    setPage(1)
  }

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    const totalPages = Math.ceil(total / pageSize)
    if (page < totalPages) {
      setPage(page + 1)
    }
  }

  const handleUpdateTags = async (noteId, tags) => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const tagIds = tags.map(tag => tag.id)
      
      await fetch(`/api/notes/${noteId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tagIds })
      })
      
      // 更新本地状态
      setNotesWithTags(prev => ({
        ...prev,
        [noteId]: tags
      }))
      
      setEditingTags(null)
    } catch (err) {
      console.error('Error updating tags:', err)
      alert('更新标签失败')
    }
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.author_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="page-loading">
        <Loading text="正在加载笔记列表..." size="large" />
      </div>
    )
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
        <div className="tag-filter">
          <label htmlFor="tagFilter">按标签筛选：</label>
          <select 
            id="tagFilter" 
            value={selectedTag} 
            onChange={(e) => setSelectedTag(e.target.value)}
            className="tag-select"
          >
            <option value="">全部标签</option>
            {tags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
        </div>
        <div className="page-size-selector">
          <label htmlFor="pageSize">每页显示：</label>
          <select 
            id="pageSize" 
            value={pageSize} 
            onChange={handlePageSizeChange}
            className="page-size-select"
          >
            <option value={10}>10条</option>
            <option value={20}>20条</option>
            <option value={30}>30条</option>
            <option value={50}>50条</option>
          </select>
        </div>
      </div>

      <div className="notes-list">
        {filteredNotes.map(note => (
          <div key={note.id} className="note-card">
            <div className="note-info">
              <h3>{note.title}</h3>
              <p className="note-author">作者：{note.author_name}</p>
              <p className="note-date">发布时间: {new Date(note.created_at).toLocaleString()}</p>
              <p className="note-likes">点赞数: {note.likes}</p>
              
              {/* 标签显示 */}
              <div className="note-tags">
                <strong>标签：</strong>
                {editingTags === note.id ? (
                  <TagInput 
                    selectedTags={notesWithTags[note.id] || []} 
                    onChange={(tags) => handleUpdateTags(note.id, tags)}
                    placeholder="输入标签，按回车添加"
                  />
                ) : (
                  <div className="tags-display">
                    {notesWithTags[note.id] && notesWithTags[note.id].length > 0 ? (
                      notesWithTags[note.id].map(tag => (
                        <span key={tag.id} className="tag">{tag.name}</span>
                      ))
                    ) : (
                      <span className="no-tags">无标签</span>
                    )}
                    <button 
                      onClick={() => setEditingTags(note.id)}
                      className="edit-tags-btn"
                    >
                      编辑标签
                    </button>
                  </div>
                )}
              </div>
              
              {note.images && note.images.length > 0 && (
                <div className="note-images">
                  <img 
                    src={note.images[0]} 
                    alt={note.title} 
                    className="note-image" 
                    loading="lazy"
                  />
                  {note.images.length > 1 && (
                    <span className="more-images">+{note.images.length - 1}</span>
                  )}
                </div>
              )}
            </div>
            <div className="note-actions">
              <button onClick={() => handleDelete(note.id)} className="btn-delete" disabled={deleting}>
                {deleting ? (
                  <div className="button-loading">
                    <Loading text="" size="small" />
                    <span>删除中...</span>
                  </div>
                ) : '删除'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="no-notes">没有找到笔记</div>
      )}

      {total > pageSize && (
        <div className="note-management-pagination">
          <button 
            className={`pagination-button ${page === 1 ? 'disabled' : ''}`}
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            上一页
          </button>
          <span className="pagination-info">
            第 {page} 页，共 {Math.ceil(total / pageSize)} 页
          </span>
          <button 
            className={`pagination-button ${page === Math.ceil(total / pageSize) ? 'disabled' : ''}`}
            onClick={handleNextPage}
            disabled={page === Math.ceil(total / pageSize)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

export default NoteManagement