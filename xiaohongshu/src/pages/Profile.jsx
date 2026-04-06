import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllNotes, deleteNoteById, updateUser, getHeaders } from '../utils/db'
import './Profile.css'

export default function Profile() {
  const { user, logout, refreshUser } = useAuth()
  const [notes, setNotes] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    avatar: user?.avatar || '',
    bio: user?.bio || '',
    oldPassword: '',
    newPassword: ''
  })
  const [message, setMessage] = useState('')
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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // 这里可以添加图片上传逻辑，暂时使用DiceBear API
      const randomSeed = Math.random().toString(36).substring(2, 10)
      setFormData(prev => ({ ...prev, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}` }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    try {
      // 更新用户信息
      const userData = { nickname: formData.nickname, avatar: formData.avatar, bio: formData.bio }
      const result = await updateUser(user.id, userData)
      
      if (result.success) {
        // 刷新用户信息
        await refreshUser()
        setMessage('个人资料更新成功')
        setIsEditing(false)
      } else {
        setMessage('更新失败：' + result.message)
      }
    } catch (error) {
      setMessage('更新失败：' + error.message)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!user) return

    try {
      // 这里需要添加修改密码的API调用
      const result = await fetch('/api/users/' + user.id + '/password', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword
        })
      })
      
      const data = await result.json()
      if (data.success) {
        setMessage('密码修改成功')
        // 清空密码字段
        setFormData(prev => ({ ...prev, oldPassword: '', newPassword: '' }))
      } else {
        setMessage('密码修改失败：' + data.message)
      }
    } catch (error) {
      setMessage('密码修改失败：' + error.message)
    }
  }

  if (!user) {
    return <div className="profile"><div className="profile-empty">请先登录</div></div>
  }

  return (
    <div className="profile">
      {isEditing ? (
        <div className="profile-edit">
          <h2>编辑个人资料</h2>
          {message && <p className="profile-message">{message}</p>}
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="profile-form-group">
              <label>头像</label>
              <div className="profile-avatar-upload">
                <img src={formData.avatar} alt={formData.nickname} className="profile-avatar" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </div>
            </div>
            <div className="profile-form-group">
              <label>昵称</label>
              <input type="text" name="nickname" value={formData.nickname} onChange={handleInputChange} />
            </div>
            <div className="profile-form-group">
              <label>个性签名</label>
              <textarea name="bio" value={formData.bio} onChange={handleInputChange} rows={3} />
            </div>
            <div className="profile-form-actions">
              <button type="submit" className="profile-save">保存</button>
              <button type="button" onClick={() => setIsEditing(false)} className="profile-cancel">取消</button>
            </div>
          </form>

          <div className="profile-password-section">
            <h3>修改密码</h3>
            <form onSubmit={handlePasswordChange} className="profile-form">
              <div className="profile-form-group">
                <label>旧密码</label>
                <input type="password" name="oldPassword" value={formData.oldPassword} onChange={handleInputChange} />
              </div>
              <div className="profile-form-group">
                <label>新密码</label>
                <input type="password" name="newPassword" value={formData.newPassword} onChange={handleInputChange} />
              </div>
              <button type="submit" className="profile-save">修改密码</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="profile-header">
            <img src={user.avatar} alt={user.nickname} className="profile-avatar" />
            <h2 className="profile-nickname">{user.nickname}</h2>
            <p className="profile-username">@{user.username}</p>
            {user.bio && <p className="profile-bio">{user.bio}</p>}
          </div>

          <div className="profile-actions">
            <button onClick={() => setIsEditing(true)} className="profile-edit-btn">编辑资料</button>
            <button onClick={handleLogout} className="profile-logout">退出登录</button>
          </div>
        </>
      )}

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
