import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { t } from '../i18n/i18n'
import { getCurrentUser } from '../utils/db'
import './Navbar.css'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { language, changeLanguage, languages } = useI18n()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)

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
          🍜 {t('home.title', language)}
        </Link>
        
        {/* 桌面菜单 */}
        <div className="navbar-links">
          <Link to="/" className="navbar-link">{t('navbar.home', language)}</Link>
          {user ? (
            <>
              <Link to="/publish" className="navbar-link">{t('navbar.publish', language)}</Link>
              <Link to="/profile" className="navbar-user">
                <img src={user.avatar} alt={user.nickname} className="navbar-avatar" />
                <span className="navbar-username">{user.nickname}</span>
              </Link>
              <Link to="/feedback" className="navbar-link">{t('navbar.feedback', language)}</Link>
              <Link to="/my-uploads" className="navbar-link">{t('navbar.myUploads', language)}</Link>
              {isAdmin && (
                <>
                  <Link to="/system-status" className="navbar-link">{t('navbar.systemStatus', language)}</Link>
                  <Link to="/user-management" className="navbar-link">{t('navbar.userManagement', language)}</Link>
                  <Link to="/tag-management" className="navbar-link">{t('navbar.tagManagement', language)}</Link>
                  <Link to="/note-management" className="navbar-link">{t('navbar.noteManagement', language)}</Link>
                  <Link to="/feedback-management" className="navbar-link">{t('navbar.feedbackManagement', language)}</Link>
                  <Link to="/database-management" className="navbar-link">{t('navbar.databaseManagement', language)}</Link>
                </>
              )}
              <button onClick={handleLogout} className="navbar-link navbar-logout">
                {t('navbar.logout', language)}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">{t('navbar.login', language)}</Link>
              <Link to="/register" className="navbar-link">{t('navbar.register', language)}</Link>
            </>
          )}
          
          {/* 语言切换 */}
          <div className="navbar-language">
            <button 
              className="navbar-language-toggle"
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
            >
              {languages.find(lang => lang.code === language)?.flag}
            </button>
            {isLanguageMenuOpen && (
              <div className="navbar-language-dropdown">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    className={`navbar-language-option ${language === lang.code ? 'active' : ''}`}
                    onClick={() => {
                      changeLanguage(lang.code)
                      setIsLanguageMenuOpen(false)
                    }}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
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
          <Link to="/" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.home', language)}</Link>
          {user ? (
            <>
              <Link to="/profile" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.profile', language)}</Link>
              <Link to="/publish" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.publish', language)}</Link>
              <Link to="/feedback" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.feedback', language)}</Link>
              {isAdmin && (
                <>
                  <Link to="/system-status" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.systemStatus', language)}</Link>
                  <Link to="/user-management" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.userManagement', language)}</Link>
                  <Link to="/tag-management" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.tagManagement', language)}</Link>
                  <Link to="/note-management" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.noteManagement', language)}</Link>
                  <Link to="/feedback-management" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.feedbackManagement', language)}</Link>
                  <Link to="/database-management" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.databaseManagement', language)}</Link>
                </>
              )}
              <button onClick={() => {
                handleLogout()
                setIsMenuOpen(false)
              }} className="navbar-mobile-link navbar-mobile-logout">
                {t('navbar.logout', language)}
              </button>
              
              {/* 移动端语言切换 */}
              <div className="navbar-mobile-language">
                <span className="navbar-mobile-language-label">{t('footer.language', language)}</span>
                <div className="navbar-mobile-language-options">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      className={`navbar-mobile-language-option ${language === lang.code ? 'active' : ''}`}
                      onClick={() => {
                        changeLanguage(lang.code)
                      }}
                    >
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.login', language)}</Link>
              <Link to="/register" className="navbar-mobile-link" onClick={() => setIsMenuOpen(false)}>{t('navbar.register', language)}</Link>
              
              {/* 移动端语言切换 */}
              <div className="navbar-mobile-language">
                <span className="navbar-mobile-language-label">{t('footer.language', language)}</span>
                <div className="navbar-mobile-language-options">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      className={`navbar-mobile-language-option ${language === lang.code ? 'active' : ''}`}
                      onClick={() => {
                        changeLanguage(lang.code)
                      }}
                    >
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
