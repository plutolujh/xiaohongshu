import React, { createContext, useState, useEffect, useContext } from 'react'
import { getDefaultLanguage, languages } from '../i18n/i18n'

// 创建i18n上下文
const I18nContext = createContext()

// i18n提供者组件
export function I18nProvider({ children }) {
  // 从localStorage加载语言设置，默认为浏览器语言
  const [language, setLanguage] = useState(() => {
    return getDefaultLanguage()
  })

  // 当语言变化时，保存到localStorage
  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  // 切换语言
  const changeLanguage = (langCode) => {
    setLanguage(langCode)
  }

  return (
    <I18nContext.Provider value={{ language, changeLanguage, languages }}>
      {children}
    </I18nContext.Provider>
  )
}

// 自定义钩子，用于使用i18n上下文
export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
