import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Feedback.css'

export default function Feedback() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'feature',
    contact: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    navigate('/login')
    return null
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.id,
          user_name: user.nickname
        })
      })

      const result = await response.json()
      if (result.success) {
        setSuccess('意见提交成功！我们会尽快处理您的反馈。')
        setFormData({
          title: '',
          content: '',
          category: 'feature',
          contact: ''
        })
      } else {
        setError(result.message || '提交失败，请重试')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="feedback-container">
      <div className="feedback-card">
        <h2>项目改进建议</h2>
        <p className="feedback-subtitle">您的意见对我们很重要，帮助我们改进产品</p>

        {error && <div className="feedback-error">{error}</div>}
        {success && <div className="feedback-success">{success}</div>}

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="feedback-field">
            <label>标题</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="请输入建议标题"
              required
              maxLength={50}
            />
          </div>

          <div className="feedback-field">
            <label>分类</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="feature">功能建议</option>
              <option value="bug">Bug报告</option>
              <option value="ui">界面优化</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div className="feedback-field">
            <label>详细内容</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="请详细描述您的建议..."
              required
              rows={6}
              maxLength={1000}
            />
          </div>

          <div className="feedback-field">
            <label>联系方式（可选）</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              placeholder="邮箱或其他联系方式"
              maxLength={100}
            />
          </div>

          <button 
            type="submit" 
            className="feedback-button"
            disabled={loading}
          >
            {loading ? '提交中...' : '提交建议'}
          </button>
        </form>

        <div className="feedback-tips">
          <h4>💡 提建议小贴士：</h4>
          <ul>
            <li>请尽可能详细描述您的建议</li>
            <li>如果是Bug报告，请描述复现步骤</li>
            <li>留下联系方式以便我们回复您</li>
          </ul>
        </div>
      </div>
    </div>
  )
}