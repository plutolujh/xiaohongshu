import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import './SystemSettings.css'

const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3004/api'

// 默认笔记模板
const defaultTemplates = [
  {
    id: 'trending',
    name: '网红美食',
    icon: '🔥',
    description: '适合分享网红美食发现和打卡',
    template: {
      title: '发现超火的网红美食｜XXX',
      content: '最近被疯狂种草的XXX，终于打卡了！\n\n📍 店铺：XXX\n📍 地址：XXX\n\n🔥 推荐理由：\n• 颜值超高，拍照超好看\n• 味道惊艳，名不虚传\n• 排队超火，建议早点去\n\n💰 价格：XX元\n⏰ 营业时间：9:00-17:00',
      ingredients: '✨ 必点菜品：\n• XXX（招牌必点）\n• XXX（网红款）\n• XXX（隐藏菜单）',
      steps: '📸 打卡攻略：\n1️⃣ 最佳拍照位置：门口/窗边/吧台\n2️⃣ 最佳打卡时间：避开饭点，人少好拍照\n3️⃣ 点餐技巧：提前查看大众点评推荐\n\n💡 小贴士：\n• 建议提前预约，避免排队\n• 高峰期可能需要等位\n• 可以错峰前往，体验更好\n\n🌟 评分：⭐⭐⭐⭐⭐\n值得打卡的网红美食！'
    }
  },
  {
    id: 'home-cooking',
    name: '家常菜',
    icon: '🍳',
    description: '适合分享家常菜做法',
    template: {
      title: '超下饭的XXX',
      content: '今天分享一道家常必备的XXX，简单易做又好吃！\n\n✨ 特点：\n• 操作简单，新手也能成功\n• 食材常见，超市就能买到\n• 味道超赞，家人都爱吃',
      ingredients: '主料：\n• XXX 适量\n\n配料：\n• XXX 适量\n\n调料：\n• 生抽 1勺\n• 老抽 半勺\n• 盐 适量',
      steps: '1️⃣ 准备工作\n将XXX洗净切好备用\n\n2️⃣ 开始烹饪\n锅中倒油，油热后放入XXX\n\n3️⃣ 调味\n加入调料，翻炒均匀\n\n4️⃣ 出锅\n装盘即可享用\n\n💡 小贴士：\n• 注意火候控制\n• 可以根据个人口味调整'
    }
  },
  {
    id: 'dessert',
    name: '甜品烘焙',
    icon: '🍰',
    description: '适合分享甜品、蛋糕等',
    template: {
      title: '自制XXX｜超简单零失败',
      content: '今天做了超好吃的XXX！\n\n🌟 亮点：\n• 不需要烤箱也能做\n• 零失败，新手友好\n• 颜值超高，朋友圈必备\n\n准备材料很简单，跟着做准没错！',
      ingredients: '主料：\n• XXX 100g\n\n辅料：\n• XXX 50g\n• 鸡蛋 2个\n\n装饰：\n• 奶油 适量\n• 水果 适量',
      steps: '1️⃣ 准备材料\n所有材料称重备用\n\n2️⃣ 混合搅拌\n将XXX混合均匀\n\n3️⃣ 成型\n倒入模具，震出气泡\n\n4️⃣ 烘烤/冷藏\n按温度时间烘烤或冷藏定型\n\n5️⃣ 装饰\n挤上奶油，摆上水果\n\n💡 小贴士：\n• 室温软化很重要\n• 不要过度搅拌'
    }
  },
  {
    id: 'quick-meal',
    name: '快手菜',
    icon: '⚡',
    description: '适合分享简单快手菜',
    template: {
      title: '10分钟搞定XXX',
      content: '忙碌的一天，来个快手菜吧！\n\n⏰ 用时：10分钟\n👨‍🍳 难度：⭐\n🍽️ 份量：1-2人\n\n简单三步就能搞定，特别适合上班族！',
      ingredients: '• XXX 适量\n• XXX 适量\n• 调料：生抽、盐、胡椒粉',
      steps: '1️⃣ 备菜（2分钟）\n所有材料洗净切好\n\n2️⃣ 烹饪（6分钟）\n热锅下油，快速翻炒\n\n3️⃣ 调味出锅（2分钟）\n加调料，翻炒均匀即可\n\n💡 小贴士：\n• 提前备好所有材料\n• 大火快炒更香'
    }
  },
  {
    id: 'cafe',
    name: '咖啡店打卡',
    icon: '☕',
    description: '适合分享咖啡店探店体验',
    template: {
      title: '发现一家宝藏咖啡店｜XXX',
      content: '📍 店名：XXX\n📍 地址：XXX\n\n☕ 今天来打卡这家超火的咖啡店！\n\n✨ 推荐理由：\n• 环境超赞，很适合拍照\n• 咖啡品质在线\n• 甜品也很好吃\n\n💰 人均：XX元\n⏰ 营业时间：9:00-17:00',
      ingredients: '☕ 招牌咖啡：\n• XXX（招牌必点）\n\n🍰 推荐甜品：\n• XXX\n\n🍽️ 其他推荐：\n• XXX',
      steps: '📸 拍照攻略：\n1️⃣ 靠窗位置光线最好\n2️⃣ 拿铁拉花很出片\n3️⃣ 甜品摆盘精致\n\n💡 探店小贴士：\n• 建议下午去，人少好拍照\n• 周末需要排队，建议提前\n• 可以预约靠窗位置\n\n🌟 评分：⭐⭐⭐⭐⭐\n会再来的一家店！'
    }
  },
  {
    id: 'scenic',
    name: '风景打卡',
    icon: '🏞️',
    description: '适合分享风景地打卡体验',
    template: {
      title: 'XXX打卡｜超美的风景地',
      content: '📍 地点：XXX\n📍 地址：XXX\n\n🏞️ 今天来打卡这个超美的风景地！\n\n✨ 亮点：\n• 风景绝美，随手一拍都是大片\n• 空气清新，很适合放松\n• 人少小众，不用人挤人\n\n🕐 最佳拍摄时间：\n• 清晨/傍晚光线最好\n• 避开节假日，人少体验更佳\n\n💰 门票：XX元\n🚗 停车：方便/不方便',
      ingredients: '📸 推荐打卡点：\n• XXX（必拍）\n• XXX（超出片）\n• XXX（隐藏机位）\n\n🎒 建议携带：\n• 充电宝（拍照耗电）\n• 防晒/雨具\n• 舒适的运动鞋',
      steps: '📸 拍照攻略：\n1️⃣ 最佳机位：XXX\n2️⃣ 构图建议：三分法/对称构图\n3️⃣ 光线利用：顺光/逆光各有特色\n\n🚶 游览路线：\n入口 → XXX → XXX → XXX → 出口\n全程约XX小时，适合慢慢逛\n\n💡 温馨提示：\n• 注意安全，不要攀爬危险区域\n• 保护环境，不要乱扔垃圾\n• 建议提前查看天气\n\n🌟 评分：⭐⭐⭐⭐⭐\n值得二刷的风景地！'
    }
  }
]

const SystemSettings = () => {
  const { user } = useAuth()
  const [qrUrl, setQrUrl] = useState(() => localStorage.getItem('posterQrUrl') || 'https://xiaohongshu-1k78.onrender.com/')
  const [qrUrlSaved, setQrUrlSaved] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // 缓存配置状态
  const [cacheConfig, setCacheConfig] = useState(null)
  const [cacheConfigLoading, setCacheConfigLoading] = useState(true)
  const [cacheStdTTL, setCacheStdTTL] = useState('')
  const [cacheCheckperiod, setCacheCheckperiod] = useState('')
  const [cacheConfigSaved, setCacheConfigSaved] = useState(false)

  // 模板配置状态
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('noteTemplates')
    return saved ? JSON.parse(saved) : defaultTemplates
  })
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateSaved, setTemplateSaved] = useState(false)

  // Permission check
  if (!user || user.role !== 'admin') {
    return (
      <div className="system-settings-container">
        <h1 className="system-settings-title">系统参数设置</h1>
        <div className="error">
          <p>权限不足，只有管理员可以访问此功能</p>
        </div>
      </div>
    )
  }

  // 获取缓存配置
  useEffect(() => {
    const fetchCacheConfig = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/cache/config`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        })
        const data = await response.json()
        if (data.success) {
          setCacheConfig(data.data)
          setCacheStdTTL(data.data.stdTTL.toString())
          setCacheCheckperiod(data.data.checkperiod.toString())
        }
      } catch (err) {
        console.error('Failed to fetch cache config:', err)
      } finally {
        setCacheConfigLoading(false)
      }
    }
    fetchCacheConfig()
  }, [user])

  const saveQrUrl = () => {
    localStorage.setItem('posterQrUrl', qrUrl)
    setQrUrlSaved(true)
    setSavedMsg('保存成功！')
    setTimeout(() => {
      setQrUrlSaved(false)
      setSavedMsg('')
    }, 2000)
  }

  const saveCacheConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/cache/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stdTTL: parseInt(cacheStdTTL),
          checkperiod: parseInt(cacheCheckperiod)
        })
      })
      const data = await response.json()
      if (data.success) {
        setCacheConfig(data.data)
        setCacheConfigSaved(true)
        setTimeout(() => setCacheConfigSaved(false), 2000)
      }
    } catch (err) {
      console.error('Failed to save cache config:', err)
    }
  }

  const handleTemplateEdit = (template) => {
    setEditingTemplate({ ...template })
  }

  const handleTemplateSave = () => {
    const newTemplates = templates.map(t =>
      t.id === editingTemplate.id ? editingTemplate : t
    )
    setTemplates(newTemplates)
    localStorage.setItem('noteTemplates', JSON.stringify(newTemplates))
    // 通知其他页面模板已更新
    window.dispatchEvent(new Event('noteTemplatesUpdated'))
    setEditingTemplate(null)
    setTemplateSaved(true)
    setTimeout(() => setTemplateSaved(false), 2000)
  }

  const handleTemplateReset = () => {
    setTemplates(defaultTemplates)
    localStorage.setItem('noteTemplates', JSON.stringify(defaultTemplates))
    // 通知其他页面模板已更新
    window.dispatchEvent(new Event('noteTemplatesUpdated'))
    setEditingTemplate(null)
    setTemplateSaved(true)
    setTimeout(() => setTemplateSaved(false), 2000)
  }

  const handleTemplateChange = (field, value) => {
    setEditingTemplate({
      ...editingTemplate,
      [field]: value
    })
  }

  const handleTemplateContentChange = (field, value) => {
    setEditingTemplate({
      ...editingTemplate,
      template: {
        ...editingTemplate.template,
        [field]: value
      }
    })
  }

  return (
    <div className="system-settings-container">
      <h1 className="system-settings-title">⚙️ 系统参数设置</h1>

      <div className="settings-section">
        <h2 className="section-title">📱 海报二维码设置</h2>
        <div className="setting-card">
          <div className="setting-info">
            <label>海报扫码跳转网址</label>
            <p className="setting-desc">用户扫描海报底部二维码后访问的网址</p>
          </div>
          <div className="setting-control">
            <div className="input-row">
              <input
                type="text"
                value={qrUrl}
                onChange={(e) => {
                  setQrUrl(e.target.value)
                  setQrUrlSaved(false)
                }}
                className="setting-input"
                placeholder="输入二维码指向的网址"
              />
              <button onClick={saveQrUrl} className="save-btn">保存</button>
            </div>
            {qrUrlSaved && <p className="success-msg">{savedMsg}</p>}
            <p className="current-value">当前值: {qrUrl}</p>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">🔧 缓存配置</h2>

        {cacheConfigLoading ? (
          <div className="setting-card">
            <Loading text="加载缓存配置..." size="small" />
          </div>
        ) : (
          <div className="setting-card">
            <div className="setting-info">
              <label>缓存后端</label>
              <p className="setting-desc">当前使用的缓存存储</p>
            </div>
            <div className="setting-control">
              <div className="info-row">
                <span className="info-value">{cacheConfig?.backend || 'Memory (node-cache)'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="setting-card">
          <div className="setting-info">
            <label>默认 TTL</label>
            <p className="setting-desc">缓存默认过期时间（秒）</p>
          </div>
          <div className="setting-control">
            <div className="input-row">
              <input
                type="number"
                value={cacheStdTTL}
                onChange={(e) => {
                  setCacheStdTTL(e.target.value)
                  setCacheConfigSaved(false)
                }}
                className="setting-input"
                placeholder="600"
                min="1"
              />
              <button onClick={saveCacheConfig} className="save-btn">保存</button>
            </div>
            {cacheConfigSaved && <p className="success-msg">保存成功！</p>}
            <p className="current-value">当前值: {cacheConfig?.stdTTL || 600} 秒</p>
            <p className="setting-hint">建议值: 300-3600秒 (5分钟-1小时)</p>
          </div>
        </div>

        <div className="setting-card">
          <div className="setting-info">
            <label>清理周期</label>
            <p className="setting-desc">定期清理过期缓存的间隔（秒）</p>
          </div>
          <div className="setting-control">
            <div className="input-row">
              <input
                type="number"
                value={cacheCheckperiod}
                onChange={(e) => {
                  setCacheCheckperiod(e.target.value)
                  setCacheConfigSaved(false)
                }}
                className="setting-input"
                placeholder="120"
                min="1"
              />
              <button onClick={saveCacheConfig} className="save-btn">保存</button>
            </div>
            {cacheConfigSaved && <p className="success-msg">保存成功！</p>}
            <p className="current-value">当前值: {cacheConfig?.checkperiod || 120} 秒</p>
            <p className="setting-hint">建议值: 60-300秒 (1-5分钟)</p>
          </div>
        </div>

        <div className="setting-card">
          <div className="setting-info">
            <label>Redis配置</label>
            <p className="setting-desc">当设置 REDIS_URL 环境变量时自动启用 Redis 缓存</p>
          </div>
          <div className="setting-control">
            <div className="info-row">
              <span className="info-label">状态:</span>
              <span className="info-value inactive">未启用</span>
            </div>
            <p className="setting-hint">配置环境变量 REDIS_URL 即可切换到 Redis 缓存</p>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">📝 笔记模板设置</h2>
        <div className="setting-card">
          <div className="setting-info">
            <label>模板列表</label>
            <p className="setting-desc">点击模板进行编辑，修改后将自动保存</p>
          </div>
          <div className="setting-control">
            <div className="templates-list">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`template-item ${editingTemplate?.id === template.id ? 'editing' : ''}`}
                  onClick={() => handleTemplateEdit(template)}
                >
                  <span className="template-item-icon">{template.icon}</span>
                  <span className="template-item-name">{template.name}</span>
                  <span className="template-item-desc">{template.description}</span>
                </div>
              ))}
            </div>
            <button onClick={handleTemplateReset} className="save-btn" style={{ marginTop: '12px', background: '#666' }}>
              恢复默认模板
            </button>
          </div>
        </div>

        {editingTemplate && (
          <div className="setting-card template-editor">
            <div className="template-editor-header">
              <h3>编辑模板: {editingTemplate.icon} {editingTemplate.name}</h3>
              <button onClick={() => setEditingTemplate(null)} className="template-editor-close">✕</button>
            </div>

            <div className="template-editor-row">
              <label>图标 (emoji)</label>
              <input
                type="text"
                value={editingTemplate.icon}
                onChange={(e) => handleTemplateChange('icon', e.target.value)}
                className="setting-input"
                style={{ width: '80px' }}
              />
            </div>

            <div className="template-editor-row">
              <label>名称</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => handleTemplateChange('name', e.target.value)}
                className="setting-input"
              />
            </div>

            <div className="template-editor-row">
              <label>描述</label>
              <input
                type="text"
                value={editingTemplate.description}
                onChange={(e) => handleTemplateChange('description', e.target.value)}
                className="setting-input"
              />
            </div>

            <div className="template-editor-row">
              <label>标题模板</label>
              <input
                type="text"
                value={editingTemplate.template.title}
                onChange={(e) => handleTemplateContentChange('title', e.target.value)}
                className="setting-input"
                placeholder="标题将显示 XXX 占位符"
              />
            </div>

            <div className="template-editor-row">
              <label>内容模板</label>
              <textarea
                value={editingTemplate.template.content}
                onChange={(e) => handleTemplateContentChange('content', e.target.value)}
                className="setting-input"
                rows={6}
                placeholder="笔记正文内容"
              />
            </div>

            <div className="template-editor-row">
              <label>食材模板</label>
              <textarea
                value={editingTemplate.template.ingredients}
                onChange={(e) => handleTemplateContentChange('ingredients', e.target.value)}
                className="setting-input"
                rows={4}
                placeholder="食材列表"
              />
            </div>

            <div className="template-editor-row">
              <label>做法模板</label>
              <textarea
                value={editingTemplate.template.steps}
                onChange={(e) => handleTemplateContentChange('steps', e.target.value)}
                className="setting-input"
                rows={6}
                placeholder="步骤说明"
              />
            </div>

            <div className="template-editor-actions">
              <button onClick={handleTemplateSave} className="save-btn">保存模板</button>
              {templateSaved && <span className="success-msg" style={{ marginLeft: '12px' }}>保存成功！</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SystemSettings
