import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCurrentUser } from '../utils/db'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const currentUser = getCurrentUser()
  const isAdmin = currentUser && currentUser.role === 'admin'

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          🍜 美食笔记
        </Link>
        <div className="navbar-links">
          <Link to="/" className="navbar-link">首页</Link>
          <Link to="/changelog" className="navbar-link">修改日志</Link>
          {user ? (
            <>
              <Link to="/publish" className="navbar-link">发布笔记</Link>
              <div className="navbar-user">
                <img src={user.avatar} alt={user.nickname} className="navbar-avatar" />
                <span className="navbar-username">{user.nickname}</span>
              </div>
              <Link to="/profile" className="navbar-link">个人中心</Link>
              <Link to="/system-status" className="navbar-link">系统状态</Link>
              {isAdmin && (
                <Link to="/user-management" className="navbar-link">用户管理</Link>
              )}
              <button onClick={handleLogout} className="navbar-link navbar-logout">
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">登录</Link>
              <Link to="/register" className="navbar-link">注册</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
