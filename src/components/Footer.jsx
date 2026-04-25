import { useState, useEffect } from 'react'
import { useTheme, ThemeMode } from '../context/ThemeContext'
import { useI18n } from '../context/I18nContext'
import { t } from '../i18n/i18n'
import './Footer.css'

export default function Footer() {
  const { themeMode, setTheme, ThemeMode } = useTheme()
  const { language } = useI18n()
  const [appInfo, setAppInfo] = useState({
    version: '2.4.2',
    lastPublishTime: new Date().toLocaleString()
  })

  useEffect(() => {
    // 尝试从系统状态API获取版本信息
    const fetchAppInfo = async () => {
      try {
        // 注意：这里需要认证，所以在非登录状态下可能会失败
        // 失败时使用默认值
        const response = await fetch(`/api/status`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.status) {
            setAppInfo({
              version: data.status.version || '1.0.0',
              lastPublishTime: data.status.lastPublishTime || new Date().toLocaleString()
            })
          }
        }
      } catch (error) {
        // 忽略错误，使用默认值
      }
    }

    fetchAppInfo()
  }, [])

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-info">
          <p>{t('footer.copyright', language)}</p>
          <p>{t('footer.version', language)}: {appInfo.version}</p>
          <p>{t('footer.lastPublish', language)}: {appInfo.lastPublishTime}</p>
        </div>
        <div className="footer-links">
          <a href="/changelog" className="footer-link">{t('footer.changelog', language)}</a>
          <a href="/feedback" className="footer-link">{t('footer.feedback', language)}</a>
          <a href="https://github.com/plutolujh/xiaohongshu" className="footer-link" target="_blank" rel="noopener noreferrer">
            <span className="github-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </span> {t('footer.github', language)}
          </a>
        </div>
        <div className="footer-theme">
          <span className="theme-label">{t('footer.themeMode', language)}：</span>
          <div className="theme-options">
            <button 
              className={`theme-option ${themeMode === ThemeMode.SYSTEM ? 'active' : ''}`}
              onClick={() => setTheme(ThemeMode.SYSTEM)}
              title={t('footer.system', language)}
            >
              🌙
            </button>
            <button 
              className={`theme-option ${themeMode === ThemeMode.LIGHT ? 'active' : ''}`}
              onClick={() => setTheme(ThemeMode.LIGHT)}
              title={t('footer.light', language)}
            >
              ☀️
            </button>
            <button 
              className={`theme-option ${themeMode === ThemeMode.DARK ? 'active' : ''}`}
              onClick={() => setTheme(ThemeMode.DARK)}
              title={t('footer.dark', language)}
            >
              🌑
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}