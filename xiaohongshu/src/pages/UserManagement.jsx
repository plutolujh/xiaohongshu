import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCurrentUser } from '../utils/db'
import './UserManagement.css'

const UserManagement = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch('http://localhost:3001/api/users', {
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

    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`http://localhost:3001/api/users/${userId}`, {
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
    }
  }

  const handleEdit = (user) => {
    setEditingUser({ ...user })
  }

  const handleSave = async () => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`http://localhost:3001/api/users/${editingUser.id}`, {
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
    }
  }

  const handleCancel = () => {
    setEditingUser(null)
  }

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`http://localhost:3001/api/users/${userId}/status`, {
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
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      const currentUser = getCurrentUser()
      const token = currentUser ? currentUser.token : null
      const response = await fetch(`http://localhost:3001/api/users/${userId}/role`, {
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
    return <div className="loading">加载用户列表中...</div>
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
                  <button onClick={handleSave} className="btn-save">保存</button>
                  <button onClick={handleCancel} className="btn-cancel">取消</button>
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
                      >
                        {user.status === 'active' ? '停用' : '启用'}
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleRoleChange(user.id, 'admin')}
                          className="btn-role"
                        >
                          设为管理员
                        </button>
                      )}
                      {user.role === 'admin' && user.id !== currentUser.id && (
                        <button
                          onClick={() => handleRoleChange(user.id, 'user')}
                          className="btn-role"
                        >
                          取消管理员
                        </button>
                      )}
                      <button onClick={() => handleDelete(user.id)} className="btn-delete">删除</button>
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
