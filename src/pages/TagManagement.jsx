import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { t } from '../i18n/i18n'
import Loading from '../components/Loading'
import './TagManagement.css'

const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3004/api'

export default function TagManagement() {
  const { user } = useAuth()
  const { language } = useI18n()
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}/tags`)
      const data = await response.json()
      if (Array.isArray(data)) {
        setTags(data)
      } else {
        setError('获取标签列表失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = async (e) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setAddingTag(true)
    try {
      const response = await fetch(`${API_BASE}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ name: newTagName.trim() })
      })
      const result = await response.json()
      if (result.success) {
        setNewTagName('')
        fetchTags()
      } else {
        setError(result.message || '添加标签失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setAddingTag(false)
    }
  }

  const handleEditTag = (tag) => {
    setEditingId(tag.id)
    setEditingName(tag.name)
  }

  const handleSaveEdit = async () => {
    if (!editingName.trim()) return

    setUpdating(true)
    try {
      const response = await fetch(`${API_BASE}/admin/tags/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ name: editingName.trim() })
      })
      const result = await response.json()
      if (result.success) {
        setEditingId(null)
        setEditingName('')
        fetchTags()
      } else {
        setError(result.message || '更新标签失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleDeleteTag = async (tagId) => {
    setUpdating(true)
    try {
      const response = await fetch(`${API_BASE}/admin/tags/${tagId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      const result = await response.json()
      if (result.success) {
        setDeleteConfirm(null)
        fetchTags()
      } else {
        setError(result.message || '删除标签失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loading text={t('tagManagement.loading', language)} size="large" />
      </div>
    )
  }

  return (
    <div className="tag-management-container">
      <h1>{t('tagManagement.title', language)}</h1>

      {error && (
        <div className="tag-management-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="tag-management-stats">
        <div className="stat-item">
          <span className="stat-value">{tags.length}</span>
          <span className="stat-label">{t('tagManagement.totalTags', language)}</span>
        </div>
      </div>

      <div className="tag-management-add">
        <h2>{t('tagManagement.addTag', language)}</h2>
        <form onSubmit={handleAddTag} className="add-tag-form">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder={t('tagManagement.tagNamePlaceholder', language)}
            maxLength={20}
            disabled={addingTag}
          />
          <button type="submit" disabled={addingTag || !newTagName.trim()}>
            {addingTag ? t('tagManagement.adding', language) : t('tagManagement.add', language)}
          </button>
        </form>
      </div>

      <div className="tag-management-list">
        <h2>{t('tagManagement.existingTags', language)}</h2>
        {tags.length === 0 ? (
          <p className="no-tags">{t('tagManagement.noTags', language)}</p>
        ) : (
          <div className="tags-grid">
            {tags.map(tag => (
              <div key={tag.id} className="tag-item">
                {editingId === tag.id ? (
                  <div className="tag-edit">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      maxLength={20}
                      autoFocus
                      disabled={updating}
                    />
                    <button
                      className="btn-save"
                      onClick={handleSaveEdit}
                      disabled={updating}
                    >
                      {t('common.save', language)}
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={handleCancelEdit}
                      disabled={updating}
                    >
                      {t('common.cancel', language)}
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="tag-name">{tag.name}</span>
                    <div className="tag-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditTag(tag)}
                      >
                        {t('common.edit', language)}
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => setDeleteConfirm(tag.id)}
                      >
                        {t('common.delete', language)}
                      </button>
                    </div>
                  </>
                )}

                {deleteConfirm === tag.id && (
                  <div className="delete-confirm">
                    <p>{t('tagManagement.confirmDelete', language)}</p>
                    <button
                      className="btn-confirm-delete"
                      onClick={() => handleDeleteTag(tag.id)}
                      disabled={updating}
                    >
                      {t('common.confirm', language)}
                    </button>
                    <button
                      className="btn-cancel-delete"
                      onClick={() => setDeleteConfirm(null)}
                      disabled={updating}
                    >
                      {t('common.cancel', language)}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
