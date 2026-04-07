import { useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'

// 主题管理器组件，用于根据主题设置更新文档的data-theme属性
export default function ThemeManager() {
  const { currentTheme } = useTheme()

  useEffect(() => {
    // 更新文档的data-theme属性
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [currentTheme])

  return null // 这个组件不渲染任何内容
}
