import { createContext, useContext, useState } from 'react'
import { initDatabase, getAllUsers, createUser, findUserByUsername, findUserById, getCurrentUser, setCurrentUser } from '../utils/db'

const AuthContext = createContext(null)

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
      const existingUser = await findUserByUsername(username)
      if (existingUser) {
        return { success: false, message: '用户名已存在' }
      }

      const newUser = {
        id: Date.now().toString(),
        username,
        password,
        nickname,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        created_at: new Date().toISOString()
      }

      await createUser(newUser)
      setCurrentUser(newUser)
      setUser(newUser)

      return { success: true }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, message: '注册失败，请重试' }
    }
  }

  // 登录
  const login = async (username, password) => {
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
        // 存储用户信息和token
        setCurrentUser({ ...user, token })
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
