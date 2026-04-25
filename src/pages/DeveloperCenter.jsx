import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import './DeveloperCenter.css'

const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3004/api'

const DeveloperCenter = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cache management states
  const [cacheKeys, setCacheKeys] = useState([])
  const [selectedKey, setSelectedKey] = useState(null)
  const [keyContent, setKeyContent] = useState(null)
  const [cacheActionMsg, setCacheActionMsg] = useState('')
  const [deletePattern, setDeletePattern] = useState('')
  const [cacheStats, setCacheStats] = useState(null)

  // API list state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('api')

  // Fetch status on mount
  useEffect(() => {
    if (user?.token) {
      fetchStatus()
    }
  }, [user])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/status`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await response.json()
      if (data.success) {
        setStatus(data.status)
      } else {
        setError('获取状态失败')
      }
    } catch (err) {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const fetchCacheStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/cache/status`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await response.json()
      if (data.success) {
        setCacheKeys(data.data.keys || [])
        setCacheStats({
          hits: data.data.hits || 0,
          misses: data.data.misses || 0,
          sets: data.data.sets || 0,
          deletes: data.data.deletes || 0,
          hitRate: data.data.hitRate || 'N/A',
          backend: data.data.backend || 'Unknown'
        })
        setError(null)
      } else {
        setError(data.message || '获取缓存状态失败')
      }
    } catch (err) {
      setError('网络错误')
    }
  }

  const fetchKeyContent = async (key) => {
    try {
      const response = await fetch(`${API_BASE}/admin/cache/${key}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await response.json()
      if (data.success) {
        setKeyContent(data.data)
        setSelectedKey(key)
      } else {
        setCacheActionMsg(data.message || '获取缓存内容失败')
      }
    } catch (err) {
      setCacheActionMsg('网络错误')
    }
  }

  const clearAllCache = async () => {
    if (!confirm('确定要清空所有缓存吗？')) return
    try {
      const response = await fetch(`${API_BASE}/admin/cache/clear`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await response.json()
      setCacheActionMsg(data.message || (data.success ? '缓存已清空' : '操作失败'))
      if (data.success) {
        setCacheKeys([])
        setKeyContent(null)
        setSelectedKey(null)
      }
    } catch (err) {
      setCacheActionMsg('网络错误')
    }
    setTimeout(() => setCacheActionMsg(''), 3000)
  }

  const deleteCacheKey = async (key) => {
    if (!confirm(`确定要删除缓存键 ${key} 吗？`)) return
    try {
      const response = await fetch(`${API_BASE}/admin/cache/${key}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await response.json()
      setCacheActionMsg(data.message || (data.success ? '删除成功' : '删除失败'))
      if (data.success) {
        setCacheKeys(prev => prev.filter(k => k !== key))
        if (selectedKey === key) {
          setSelectedKey(null)
          setKeyContent(null)
        }
      }
    } catch (err) {
      setCacheActionMsg('网络错误')
    }
    setTimeout(() => setCacheActionMsg(''), 3000)
  }

  const clearByPattern = async () => {
    if (!deletePattern.trim()) {
      setCacheActionMsg('请输入要删除的模式')
      setTimeout(() => setCacheActionMsg(''), 3000)
      return
    }
    if (!confirm(`确定要删除所有匹配 "${deletePattern}" 的缓存键吗？`)) return
    try {
      const response = await fetch(`${API_BASE}/admin/cache/clear-pattern`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pattern: deletePattern })
      })
      const data = await response.json()
      setCacheActionMsg(data.message || (data.success ? '批量删除成功' : '删除失败'))
      if (data.success) {
        fetchCacheStatus()
        setKeyContent(null)
        setSelectedKey(null)
      }
    } catch (err) {
      setCacheActionMsg('网络错误')
    }
    setTimeout(() => setCacheActionMsg(''), 3000)
  }

  // Filter APIs based on search and category
  const filteredApis = status?.apis ? Object.entries(status.apis).reduce((acc, [category, apis]) => {
    const filtered = apis.filter(api => {
      const matchesSearch = !searchTerm ||
        api.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        api.desc.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || category === selectedCategory
      return matchesSearch && matchesCategory
    })
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    return acc
  }, {}) : {}

  // Permission check
  if (!user || user.role !== 'admin') {
    return (
      <div className="developer-center-container">
        <h1 className="developer-center-title">开发者中心</h1>
        <div className="error">
          <p>权限不足，只有管理员可以访问此功能</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loading text="正在加载开发者中心..." size="large" />
      </div>
    )
  }

  return (
    <div className="developer-center-container">
      <h1 className="developer-center-title">🛠️ 开发者中心</h1>

      <div className="developer-tabs">
        <button className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>📚 API接口</button>
        <button className={`tab-btn ${activeTab === 'cache' ? 'active' : ''}`} onClick={() => { setActiveTab('cache'); fetchCacheStatus(); setCacheActionMsg(''); }}>💾 缓存管理</button>
      </div>

      {/* API接口列表 */}
      <div className="api-section" style={{ display: activeTab === 'api' ? 'block' : 'none' }}>
        <div className="api-toolbar">
          <input
            type="text"
            placeholder="搜索 API..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="api-search-input"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="api-category-select"
          >
            <option value="all">全部分类</option>
            {status?.apis && Object.keys(status.apis).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="api-list">
          {Object.entries(filteredApis).map(([category, apis]) => (
            <div key={category} className="api-category">
              <h3 className="api-category-title">{category}</h3>
              <table className="api-table">
                <thead>
                  <tr>
                    <th>方法</th>
                    <th>路径</th>
                    <th>认证</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {apis.map((api, idx) => (
                    <tr key={idx}>
                      <td><span className={`method-badge method-${api.method.toLowerCase()}`}>{api.method}</span></td>
                      <td className="api-path">{api.path}</td>
                      <td><span className={`auth-badge auth-${api.auth}`}>{api.auth === false ? '公开' : api.auth === true ? '登录' : '管理员'}</span></td>
                      <td className="api-desc">{api.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {Object.keys(filteredApis).length === 0 && (
            <div className="no-data">没有找到匹配的 API</div>
          )}
        </div>
      </div>

      {/* 缓存管理 */}
      <div className={`cache-section ${activeTab === 'cache' ? 'active' : ''}`}>
        {/* 缓存命中统计 */}
        {cacheStats && (
          <div className="cache-stats-panel">
            <h3>📊 缓存命中统计</h3>
            <div className="cache-stats-grid">
              <div className="stat-item">
                <span className="stat-label">后端</span>
                <span className="stat-value">{cacheStats.backend}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">命中次数</span>
                <span className="stat-value hits">{cacheStats.hits}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">未命中</span>
                <span className="stat-value misses">{cacheStats.misses}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">设置次数</span>
                <span className="stat-value sets">{cacheStats.sets}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">删除次数</span>
                <span className="stat-value deletes">{cacheStats.deletes}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">命中率</span>
                <span className="stat-value hitrate">{cacheStats.hitRate}</span>
              </div>
            </div>
          </div>
        )}

        <div className="cache-toolbar">
          <div className="cache-info">
            <span className="cache-count">缓存键: {cacheKeys.length}</span>
            <button onClick={fetchCacheStatus} className="refresh-btn">🔄 刷新</button>
          </div>
          <button onClick={clearAllCache} className="clear-all-btn">🗑️ 清空所有缓存</button>
        </div>

        {cacheActionMsg && (
          <div className="cache-msg">{cacheActionMsg}</div>
        )}

        <div className="cache-main">
          <div className="cache-keys-panel">
            <h4>缓存键列表</h4>
            <div className="cache-keys-list">
              {cacheKeys.length === 0 ? (
                <div className="no-cache">暂无缓存数据</div>
              ) : (
                cacheKeys.map(key => (
                  <div key={key} className={`cache-key-item ${selectedKey === key ? 'selected' : ''}`}>
                    <span onClick={() => fetchKeyContent(key)} className="cache-key-name">{key}</span>
                    <button onClick={() => deleteCacheKey(key)} className="delete-key-btn" title="删除">×</button>
                  </div>
                ))
              )}
            </div>

            <div className="pattern-delete">
              <h4>按模式删除</h4>
              <div className="pattern-input-row">
                <input
                  type="text"
                  placeholder="如: notes:* 或 user:*"
                  value={deletePattern}
                  onChange={(e) => setDeletePattern(e.target.value)}
                  className="pattern-input"
                />
                <button onClick={clearByPattern} className="pattern-delete-btn">删除</button>
              </div>
            </div>
          </div>

          <div className="cache-content-panel">
            <h4>缓存内容 {selectedKey && <span className="key-name">- {selectedKey}</span>}</h4>
            {keyContent ? (
              <pre className="cache-content-pre">{JSON.stringify(keyContent, null, 2)}</pre>
            ) : (
              <div className="no-selection">点击左侧缓存键查看内容</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeveloperCenter
