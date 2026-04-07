import React, { useState, useEffect } from 'react'

// API基础URL
const API_BASE = 'http://localhost:3004/api'
import { useAuth } from '../context/AuthContext'
import { getCurrentUser } from '../utils/db'
import Loading from '../components/Loading'
import './UserManagement.css'

const UserManagement = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingRole, setUpdatingRole] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setUsers(data)
      setLoading(false)
    } catch (err) {
      setError('获取用户列表失败')
      setLoading(false)
      console.error('Error fetching users:', err)
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？')) {
      return
    }

    setDeleting(true)
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setUsers(users.filter(u => u.id !== userId))
      } else {
        alert('删除用户失败：' + data.message)
      }
    } catch (err) {
      alert('删除用户失败')
      console.error('Error deleting user:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (user) => {
    setEditingUser({ ...user })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`${API_BASE}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingUser)
      })
      const data = await response.json()
      if (data.success) {
        setUsers(users.map(u => u.id === editingUser.id ? editingUser : u))
        setEditingUser(null)
      } else {
        alert('更新用户失败：' + data.message)
      }
    } catch (err) {
      alert('更新用户失败')
      console.error('Error updating user:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingUser(null)
  }

  const handleStatusChange = async (userId, newStatus) => {
    setUpdatingStatus(true)
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await response.json()
      if (data.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u))
      } else {
        alert('更新用户状态失败：' + data.message)
      }
    } catch (err) {
      alert('更新用户状态失败')
      console.error('Error updating user status:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRole(true)
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`${API_BASE}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      })
      const data = await response.json()
      if (data.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      } else {
        alert('更新用户角色失败：' + data.message)
      }
    } catch (err) {
      alert('更新用户角色失败')
      console.error('Error updating user role:', err)
    } finally {
      setUpdatingRole(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '启用'
      case 'inactive':
        return '停用'
      default:
        return '未知'
    }
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-active'
      case 'inactive':
        return 'status-inactive'
      default:
        return ''
    }
  }

  const getRoleText = (role) => {
    switch (role) {
      case 'admin':
        return '管理员'
      case 'user':
        return '普通用户'
      default:
        return '未知'
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loading text="正在加载用户列表..." size="large" />
      </div>
    )
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="user-management-container">
      <h1 className="user-management-title">用户管理</h1>

      <div className="user-management-controls">
        <input
          type="text"
          placeholder="搜索用户..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="users-list">
        {filteredUsers.map(user => (
          <div key={user.id} className="user-card">
            {editingUser && editingUser.id === user.id ? (
              <div className="user-edit-form">
                <div className="form-group">
                  <label>用户名：</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>昵称：</label>
                  <input
                    type="text"
                    value={editingUser.nickname}
                    onChange={(e) => setEditingUser({ ...editingUser, nickname: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>头像URL：</label>
                  <input
                    type="text"
                    value={editingUser.avatar}
                    onChange={(e) => setEditingUser({ ...editingUser, avatar: e.target.value })}
                  />
                </div>
                <div className="form-actions">
                  <button onClick={handleSave} className="btn-save" disabled={saving}>
                    {saving ? (
                      <div className="button-loading">
                        <Loading text="" size="small" />
                        <span>保存中...</span>
                      </div>
                    ) : '保存'}
                  </button>
                  <button onClick={handleCancel} className="btn-cancel" disabled={saving}>取消</button>
                </div>
              </div>
            ) : (
              <>
                <div className="user-info">
                  <img src={user.avatar} alt={user.nickname} className="user-avatar" />
                  <div className="user-details">
                    <h3>{user.nickname}</h3>
                    <p className="username">@{user.username}</p>
                    <p className="created-at">注册时间: {new Date(user.created_at).toLocaleDateString()}</p>
                    <div className="user-badges">
                      <span className={`status-badge ${getStatusClass(user.status)}`}>
                        {getStatusText(user.status)}
                      </span>
                      <span className="role-badge">{getRoleText(user.role)}</span>
                    </div>
                  </div>
                </div>
                <div className="user-actions">
                  <button onClick={() => handleEdit(user)} className="btn-edit">编辑</button>
                  {user.id !== currentUser.id && (
                    <>
                      <button
                        onClick={() => handleStatusChange(user.id, user.status === 'active' ? 'inactive' : 'active')}
                        className={`btn-status ${user.status === 'active' ? 'btn-deactivate' : 'btn-activate'}`}
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? (
                          <div className="button-loading">
                            <Loading text="" size="small" />
                            <span>处理中...</span>
                          </div>
                        ) : user.status === 'active' ? '停用' : '启用'}
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleRoleChange(user.id, 'admin')}
                          className="btn-role"
                          disabled={updatingRole}
                        >
                          {updatingRole ? (
                            <div className="button-loading">
                              <Loading text="" size="small" />
                              <span>处理中...</span>
                            </div>
                          ) : '设为管理员'}
                        </button>
                      )}
                      {user.role === 'admin' && user.id !== currentUser.id && (
                        <button
                          onClick={() => handleRoleChange(user.id, 'user')}
                          className="btn-role"
                          disabled={updatingRole}
                        >
                          {updatingRole ? (
                            <div className="button-loading">
                              <Loading text="" size="small" />
                              <span>处理中...</span>
                            </div>
                          ) : '取消管理员'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(user.id)} className="btn-delete" disabled={deleting}>
                        {deleting ? (
                          <div className="button-loading">
                            <Loading text="" size="small" />
                            <span>删除中...</span>
                          </div>
                        ) : '删除'}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="no-users">没有找到用户</div>
      )}
    </div>
  )
}

export default UserManagement
