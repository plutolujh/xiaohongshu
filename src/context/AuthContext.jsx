import { createContext, useContext, useState } from 'react'
import { initDatabase, getAllUsers, createUser, findUserByUsername, findUserById, getCurrentUser, setCurrentUser } from '../utils/db'

export const AuthContext = createContext(null)

// 初始化数据库
initDatabase()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser)
  const [users, setUsers] = useState([])

  // 注册
  const register = async (username, password, nickname) => {
    if (!username || !password || !nickname) {
      return { success: false, message: '请填写所有字段' }
    }
    if (password.length < 6) {
      return { success: false, message: '密码长度至少6位' }
    }

    try {
      // 调用后端注册API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname })
      })
      const result = await response.json()
      
      if (result.success) {
        // 注册成功后自动登录
        const loginResponse = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })
        const loginResult = await loginResponse.json()
        
        if (loginResult.success) {
          const user = loginResult.user
          const token = loginResult.token
          // 注册成功后默认不记住用户
          setCurrentUser({ ...user, token }, false)
          setUser({ ...user, token })
          return { success: true }
        } else {
          return { success: false, message: '注册成功，但自动登录失败' }
        }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, message: '注册失败，请重试' }
    }
  }

  // 登录
  const login = async (username, password, remember = false) => {
    if (!username || !password) {
      return { success: false, message: '请填写用户名和密码' }
    }

    try {
      // 发送登录请求到服务器
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const result = await response.json()
      
      if (result.success) {
        const user = result.user
        const token = result.token
        // 存储用户信息和token，根据remember参数决定存储位置
        setCurrentUser({ ...user, token }, remember)
        setUser({ ...user, token })
        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: '登录失败，请重试' }
    }
  }

  // 登出
  const logout = () => {
    setCurrentUser(null)
    setUser(null)
    // 清除记住的用户名
    localStorage.removeItem('xiaohongshu_username')
  }

  // 更新用户信息
  const refreshUser = async () => {
    if (user) {
      const updated = await findUserById(user.id)
      if (updated) {
        setUser(updated)
        setCurrentUser(updated)
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, users, register, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
