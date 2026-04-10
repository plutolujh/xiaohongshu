import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllNotes, deleteNoteById, updateUser, getHeaders, getFollowCounts, getUserTags } from '../utils/db'
import Loading from '../components/Loading'
import FollowButton from '../components/FollowButton'
import './Profile.css'

export default function Profile({ isOtherUser = false, userId: propUserId }) {
  const { user, logout, refreshUser } = useAuth()
  const params = useParams()
  const urlUserId = params.id
  // 优先使用 prop传入的 userId，否则使用 URL 参数
  const effectiveUserId = propUserId || urlUserId
  const [targetUser, setTargetUser] = useState(null)
  const [notes, setNotes] = useState([])
  const [feedback, setFeedback] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    avatar: user?.avatar || '',
    bio: user?.bio || '',
    oldPassword: '',
    newPassword: ''
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 })
  const [userTags, setUserTags] = useState([])
  const [loadingUser, setLoadingUser] = useState(isOtherUser)
  const navigate = useNavigate()

  // 确定显示哪个用户的信息
  const displayUser = isOtherUser ? targetUser : user

  useEffect(() => {
    if (isOtherUser && effectiveUserId) {
      setLoadingUser(true)
      // 获取其他用户信息 - 使用 /api/user/:id (根据ID查询)
      fetch(`/api/user/${effectiveUserId}`, { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data) setTargetUser(data)
          setLoadingUser(false)
        })
        .catch(() => setLoadingUser(false))
    }
  }, [isOtherUser, effectiveUserId])

  useEffect(() => {
    const fetchFollowCounts = async () => {
      const uid = isOtherUser ? effectiveUserId : user?.id
      if (!uid) return
      const result = await getFollowCounts(uid)
      if (result.success) {
        setFollowCounts(result.data)
      }
    }
    fetchFollowCounts()
  }, [isOtherUser, effectiveUserId, user])

  useEffect(() => {
    const fetchUserTags = async () => {
      const uid = isOtherUser ? effectiveUserId : user?.id
      if (!uid) return
      const result = await getUserTags(uid)
      if (Array.isArray(result)) {
        setUserTags(result)
      }
    }
    fetchUserTags()
  }, [isOtherUser, effectiveUserId, user])

  useEffect(() => {
    const userToFetch = displayUser
    if (userToFetch) {
      // 获取用户的笔记（获取所有页数据）
      const fetchAllNotes = async () => {
        let allNotes = []
        let page = 1
        let hasMore = true

        while (hasMore) {
          const result = await getAllNotes(page, 10)
          const pageNotes = result.notes || []
          allNotes = [...allNotes, ...pageNotes]
          hasMore = pageNotes.length === 10
          page++
        }

        // 过滤当前用户的笔记
        setNotes(allNotes.filter(n => n.author_id === userToFetch.id || n.author_id === userToFetch.username))
        setLoadingNotes(false)
      }

      fetchAllNotes()

      // 获取用户的意见反馈（仅自己的 profile）
      if (!isOtherUser && user) {
        fetch('/api/feedback/me', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        })
        .then(response => response.json())
        .then(result => {
          if (Array.isArray(result)) {
            setFeedback(result)
          }
        })
      }
    }
  }, [displayUser, isOtherUser])

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

  const handleAvatarChange = () => {
    // 生成随机的DiceBear头像
    const randomSeed = Math.random().toString(36).substring(2, 10)
    setFormData(prev => ({ ...prev, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}` }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  // 非登录用户查看自己资料时需要登录，但查看他人资料不需要
  if (!user && !isOtherUser) {
    return <div className="profile"><div className="profile-empty">请先登录</div></div>
  }

  // 查看其他用户资料时，如果还没加载完成，显示 loading
  if (isOtherUser && loadingUser && !targetUser) {
    return (
      <div className="profile">
        <div className="page-loading">
          <Loading text="正在加载用户资料..." size="large" />
        </div>
      </div>
    )
  }

  // 查看其他用户资料时，如果没有获取到用户信息
  if (isOtherUser && !targetUser) {
    return <div className="profile"><div className="profile-empty">用户不存在</div></div>
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
                <button type="button" onClick={handleAvatarChange} className="profile-avatar-btn">更换头像</button>
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
              <button type="submit" className="profile-save" disabled={loading}>
                {loading ? '保存中...' : '保存'}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="profile-cancel" disabled={loading}>取消</button>
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
              <button type="submit" className="profile-save" disabled={loading}>
                {loading ? '修改中...' : '修改密码'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="profile-header">
            <img src={displayUser.avatar} alt={displayUser.nickname} className="profile-avatar" />
            <h2 className="profile-nickname">{displayUser.nickname}</h2>
            <p className="profile-username">@{displayUser.username}</p>
            {displayUser.bio && <p className="profile-bio">{displayUser.bio}</p>}

            {/* 关注/粉丝数量 */}
            <div className="profile-follow-counts">
              <Link to={`/users/${displayUser.id}/following`} className="profile-follow-link">
                <span className="profile-follow-num">{followCounts.following}</span>
                <span className="profile-follow-label">关注</span>
              </Link>
              <Link to={`/users/${displayUser.id}/followers`} className="profile-follow-link">
                <span className="profile-follow-num">{followCounts.followers}</span>
                <span className="profile-follow-label">粉丝</span>
              </Link>
            </div>

            {/* 喜欢的标签 */}
            {userTags.length > 0 && (
              <div className="profile-tags">
                <span className="profile-tags-label">喜欢的标签</span>
                <div className="profile-tags-list">
                  {userTags.map(tag => (
                    <span key={tag.id} className="profile-tag">{tag.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="profile-actions">
            {isOtherUser ? (
              <FollowButton userId={displayUser.id} size="large" />
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="profile-edit-btn">编辑资料</button>
                <button onClick={handleLogout} className="profile-logout">退出登录</button>
              </>
            )}
          </div>
        </>
      )}

      <div className="profile-notes">
        <h3>{isOtherUser ? 'TA的笔记' : '我的笔记'} ({notes.length})</h3>
        {loadingNotes ? (
          <div className="page-loading">
            <Loading text="正在加载笔记..." size="medium" />
          </div>
        ) : notes.length > 0 ? (
          <div className="profile-notes-grid">
            {notes.map(note => {
              const coverImage = note.coverImage || (note.images && note.images[0]) || null
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

      {/* 只有查看自己的资料时才显示意见反馈 */}
      {!isOtherUser && (
      <div className="profile-feedback">
        <h3>我的意见反馈 ({feedback.length})</h3>
        {feedback.length > 0 ? (
          <div className="profile-feedback-list">
            {feedback.map(item => (
              <div key={item.id} className="profile-feedback-item">
                <div className="profile-feedback-header">
                  <h4>{item.title}</h4>
                  <span className={`status-badge status-${item.status}`}>
                    {item.status === 'pending' && '待处理'}
                    {item.status === 'processing' && '处理中'}
                    {item.status === 'resolved' && '已解决'}
                    {item.status === 'closed' && '已关闭'}
                  </span>
                </div>
                <div className="profile-feedback-content">
                  <p>{item.content}</p>
                  {item.contact && (
                    <p className="profile-feedback-contact">
                      <strong>联系方式:</strong> {item.contact}
                    </p>
                  )}
                </div>
                <div className="profile-feedback-meta">
                  <span className="profile-feedback-category">
                    {item.category === 'feature' && '功能建议'}
                    {item.category === 'bug' && 'Bug报告'}
                    {item.category === 'ui' && '界面优化'}
                    {item.category === 'other' && '其他'}
                  </span>
                  <span className="profile-feedback-time">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="profile-empty-feedback">
            <p>还没有提交过意见反馈</p>
            <Link to="/feedback" className="profile-feedback-btn">提交意见反馈</Link>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
