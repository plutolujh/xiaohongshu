import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import './Auth.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  // 页面加载时，从localStorage读取保存的用户名
  useEffect(() => {
    const savedUsername = localStorage.getItem('xiaohongshu_username')
    if (savedUsername) {
      setUsername(savedUsername)
      setRemember(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    setLoading(true)
    try {
      const result = await login(username, password, remember)
      if (result.success) {
        // 如果选择记住我，保存用户名到localStorage
        if (remember) {
          localStorage.setItem('xiaohongshu_username', username)
        } else {
          localStorage.removeItem('xiaohongshu_username')
        }
        navigate(from, { replace: true })
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>登录</h2>
        <p className="auth-subtitle">欢迎回来，发现更多美食</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>

          <div className="auth-field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>

          <div className="auth-remember">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              记住我
            </label>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <div className="button-loading">
                <Loading text="" size="small" />
                <span>登录中...</span>
              </div>
            ) : '登录'}
          </button>
        </form>

        <p className="auth-footer">
          还没有账号？<Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  )
}
