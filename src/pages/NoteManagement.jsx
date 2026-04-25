import React, { useState, useEffect } from 'react'

const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3004/api'
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
  const [deleting, setDeleting] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [notesWithTags, setNotesWithTags] = useState({})
  const [editingTags, setEditingTags] = useState(null)
  const [tags, setTags] = useState([])
  const [selectedTag, setSelectedTag] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'table'

  const fetchTags = async () => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`${API_BASE}/tags`, {
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
        response = await fetch(`${API_BASE}/tags/${selectedTag}/notes?page=${page}&limit=${pageSize}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        data = await response.json()
      } else {
        response = await fetch(`${API_BASE}/notes?page=${page}&limit=${pageSize}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        data = await response.json()
      }

      setNotes(data.notes || [])
      setTotal(data.total || 0)

      const notesWithTagsData = {}
      for (const note of data.notes || []) {
        try {
          const tagsResponse = await fetch(`${API_BASE}/notes/${note.id}/tags`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          const tagsData = await tagsResponse.json()
          notesWithTagsData[note.id] = tagsData || []
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
    if (!window.confirm('确定要删除这篇笔记吗？此操作不可撤销。')) {
      return
    }

    setDeleting(noteId)
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`${API_BASE}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        await fetchNotes()
      } else {
        alert('删除笔记失败：' + data.message)
      }
    } catch (err) {
      alert('删除笔记失败')
      console.error('Error deleting note:', err)
    } finally {
      setDeleting(null)
    }
  }

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize)
    setPage(1)
  }

  const handleUpdateTags = async (noteId, newTags) => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const tagIds = newTags.map(tag => tag.id)

      await fetch(`${API_BASE}/notes/${noteId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tagIds })
      })

      setNotesWithTags(prev => ({
        ...prev,
        [noteId]: newTags
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

  const totalPages = Math.ceil(total / pageSize)

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
      <div className="note-management-header">
        <h1 className="note-management-title">📋 笔记管理</h1>
        <div className="note-management-stats">
          <span className="stat-item">共 {total} 篇笔记</span>
        </div>
      </div>

      <div className="note-management-controls">
        <div className="control-left">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索标题或作者..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="search-clear" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>

          <div className="filter-group">
            <label>标签：</label>
            <select
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value)
                setPage(1)
              }}
              className="filter-select"
            >
              <option value="">全部</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="control-right">
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ▦
            </button>
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              ☰
            </button>
          </div>

          <div className="size-selector">
            <label>显示：</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              className="size-select"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={30}>30条</option>
              <option value={50}>50条</option>
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="notes-grid">
          {filteredNotes.length > 0 ? (
            filteredNotes.map(note => (
              <div key={note.id} className="note-card">
                <div className="note-card-image">
                  {note.coverImage ? (
                    <img src={note.coverImage} alt={note.title} />
                  ) : (
                    <div className="no-image">无图片</div>
                  )}
                  {note.imagesCount > 1 && (
                    <span className="image-count">📷 {note.imagesCount}</span>
                  )}
                </div>

                <div className="note-card-body">
                  <h3 className="note-title" title={note.title}>{note.title}</h3>

                  <div className="note-meta">
                    <span className="meta-author">👤 {note.author_name}</span>
                    <span className="meta-date">{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="note-stats">
                    <span className="stat">❤️ {note.likes || 0}</span>
                    <span className="stat">💬 {note.comments?.length || 0}</span>
                  </div>

                  <div className="note-tags-section">
                    {editingTags === note.id ? (
                      <div className="tag-edit-mode">
                        <TagInput
                          selectedTags={notesWithTags[note.id] || []}
                          onChange={(tags) => handleUpdateTags(note.id, tags)}
                          placeholder="输入标签"
                        />
                        <button
                          className="tag-cancel-btn"
                          onClick={() => setEditingTags(null)}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="tags-row">
                        {(notesWithTags[note.id] || []).slice(0, 3).map(tag => (
                          <span key={tag.id} className="tag-badge">{tag.name}</span>
                        ))}
                        {(notesWithTags[note.id] || []).length > 3 && (
                          <span className="tag-more">+{notesWithTags[note.id].length - 3}</span>
                        )}
                        {(notesWithTags[note.id] || []).length === 0 && (
                          <span className="no-tags-text">暂无标签</span>
                        )}
                        <button
                          className="tag-edit-btn"
                          onClick={() => setEditingTags(note.id)}
                          title="编辑标签"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="note-card-actions">
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(note.id)}
                    disabled={deleting === note.id}
                  >
                    {deleting === note.id ? (
                      <Loading text="" size="small" />
                    ) : (
                      '🗑️ 删除'
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>没有找到笔记</p>
            </div>
          )}
        </div>
      ) : (
        <div className="notes-table-container">
          <table className="notes-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>图片</th>
                <th>标题</th>
                <th>作者</th>
                <th>发布时间</th>
                <th>点赞</th>
                <th>标签</th>
                <th style={{ width: '100px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.length > 0 ? (
                filteredNotes.map(note => (
                  <tr key={note.id}>
                    <td>
                      {note.coverImage ? (
                        <img src={note.coverImage} alt="" className="table-thumb" />
                      ) : (
                        <div className="table-no-img">-</div>
                      )}
                    </td>
                    <td className="table-title" title={note.title}>{note.title}</td>
                    <td>{note.author_name}</td>
                    <td>{new Date(note.created_at).toLocaleDateString()}</td>
                    <td>{note.likes || 0}</td>
                    <td>
                      <div className="table-tags">
                        {(notesWithTags[note.id] || []).slice(0, 2).map(tag => (
                          <span key={tag.id} className="tag-badge small">{tag.name}</span>
                        ))}
                        {(notesWithTags[note.id] || []).length > 2 && (
                          <span className="tag-more">+{notesWithTags[note.id].length - 2}</span>
                        )}
                        {(notesWithTags[note.id] || []).length === 0 && (
                          <span className="no-tags-text">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="table-btn edit"
                          onClick={() => setEditingTags(note.id)}
                          title="编辑标签"
                        >
                          ✏️
                        </button>
                        <button
                          className="table-btn delete"
                          onClick={() => handleDelete(note.id)}
                          disabled={deleting === note.id}
                          title="删除"
                        >
                          {deleting === note.id ? '...' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-cell">没有找到笔记</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            显示第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
          </div>
          <div className="pagination-controls">
            <button
              className={`page-btn ${page === 1 ? 'disabled' : ''}`}
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              ««
            </button>
            <button
              className={`page-btn ${page === 1 ? 'disabled' : ''}`}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              «
            </button>
            <span className="page-current">{page} / {totalPages}</span>
            <button
              className={`page-btn ${page === totalPages ? 'disabled' : ''}`}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              »
            </button>
            <button
              className={`page-btn ${page === totalPages ? 'disabled' : ''}`}
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              »»
            </button>
          </div>
        </div>
      )}

      {editingTags && (
        <div className="modal-overlay" onClick={() => setEditingTags(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>编辑标签</h3>
              <button className="modal-close" onClick={() => setEditingTags(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-note-title">{notes.find(n => n.id === editingTags)?.title}</p>
              <TagInput
                selectedTags={notesWithTags[editingTags] || []}
                onChange={(tags) => handleUpdateTags(editingTags, tags)}
                placeholder="输入标签，按回车添加"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NoteManagement