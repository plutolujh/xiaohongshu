import React, { createContext, useState, useEffect, useContext } from 'react'

// 主题模式类型
export const ThemeMode = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark'
}

// 创建主题上下文
const ThemeContext = createContext()

// 主题提供者组件
export function ThemeProvider({ children }) {
  // 从localStorage加载主题设置，默认为系统
  const [themeMode, setThemeMode] = useState(() => {
    const savedTheme = localStorage.getItem('themeMode')
    return savedTheme || ThemeMode.SYSTEM
  })

  // 计算当前实际主题（考虑系统设置）
  const [currentTheme, setCurrentTheme] = useState('light')

  // 监听系统主题变化
  useEffect(() => {
    const updateTheme = () => {
      if (themeMode === ThemeMode.SYSTEM) {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        setCurrentTheme(systemTheme)
      } else {
        setCurrentTheme(themeMode)
      }
    }

    // 初始化主题
    updateTheme()

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => updateTheme()
    mediaQuery.addEventListener('change', handleChange)

    // 清理监听器
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themeMode])

  // 当主题模式变化时，保存到localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode)
  }, [themeMode])

  // 切换主题模式
  const setTheme = (mode) => {
    setThemeMode(mode)
  }

  return (
    <ThemeContext.Provider value={{ themeMode, currentTheme, setTheme, ThemeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

// 自定义钩子，用于使用主题上下文
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
