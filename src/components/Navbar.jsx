import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCurrentUser } from '../utils/db'
import './Navbar.css'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
        
        {/* 桌面菜单 */}
        <div className="navbar-links">
          <Link to="/" className="navbar-link">首页</Link>
          <Link to="/changelog" className="navbar-link">修改日志</Link>
          {user ? (
            <>
              <Link to="/publish" className="navbar-link">发布笔记</Link>
              <Link to="/profile" className="navbar-user">
                <img src={user.avatar} alt={user.nickname} className="navbar-avatar" />
                <span className="navbar-username">{user.nickname}</span>
              </Link>
              <Link to="/feedback" className="navbar-link">意见反馈</Link>
              <Link to="/system-status" className="navbar-link">系统状态</Link>
              {isAdmin && (
                <>
                  <Link to="/user-management" className="navbar-link">用户管理</Link>
                  <Link to="/note-management" className="navbar-link">笔记管理</Link>
                  <Link to="/feedback-management" className="navbar-link">意见管理</Link>
                  <Link to="/database-management" className="navbar-link">数据库管理</Link>
                </>
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
        
        {/* 移动端菜单按钮 */}
        <button 
          className="navbar-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>
      
      {/* 移动端菜单 */}
      {isMenuOpen && (
        <div className="navbar-mobile-menu">
          <Link to="/" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>首页</Link>
          <Link to="/changelog" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>修改日志</Link>
          {user ? (
            <>
              <Link to="/profile" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>个人主页</Link>
              <Link to="/publish" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>发布笔记</Link>
              <Link to="/feedback" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>意见反馈</Link>
              <Link to="/system-status" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>系统状态</Link>
              {isAdmin && (
                <>
                  <Link to="/user-management" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>用户管理</Link>
                  <Link to="/note-management" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>笔记管理</Link>
                  <Link to="/feedback-management" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>意见管理</Link>
                  <Link to="/database-management" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>数据库管理</Link>
                </>
              )}
              <button onClick={() => {
                handleLogout()
                setIsMenuOpen(false)
              }} className="navbar-mobile-link navbar-mobile-logout">
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>登录</Link>
              <Link to="/register" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>注册</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
