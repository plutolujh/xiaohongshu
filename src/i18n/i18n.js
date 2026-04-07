import zhCN from './zh-CN'
import enUS from './en-US'

// 语言列表
export const languages = [
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' }
]

// 翻译函数
export function t(key, lang = 'zh-CN') {
  const translations = {
    'zh-CN': zhCN,
    'en-US': enUS
  }
  
  const keys = key.split('.')
  let result = translations[lang]
  
  for (const k of keys) {
    if (result && result[k] !== undefined) {
      result = result[k]
    } else {
      return key // 如果找不到翻译，返回原键
    }
  }
  
  return result
}

// 获取默认语言
export function getDefaultLanguage() {
  const savedLang = localStorage.getItem('language')
  if (savedLang && languages.some(lang => lang.code === savedLang)) {
    return savedLang
  }
  
  // 检测浏览器语言
  const browserLang = navigator.language || navigator.userLanguage
  for (const lang of languages) {
    if (browserLang.startsWith(lang.code.split('-')[0])) {
      return lang.code
    }
  }
  
  return 'zh-CN' // 默认中文
}
