import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import './FeedbackManagement.css'

// API基础URL
const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3004/api'

export default function FeedbackManagement() {
  const { user } = useAuth()
  const [feedbackList, setFeedbackList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    fetchFeedback()
  }, [])

  const fetchFeedback = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}/feedback`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      const result = await response.json()
      if (Array.isArray(result)) {
        setFeedbackList(result)
      } else if (result.success === false) {
        setError(result.message || '获取意见反馈失败')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    setEditingId(id)
    setNewStatus(status)
    setUpdatingStatus(true)
    
    try {
      const response = await fetch(`${API_BASE}/feedback/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ status })
      })
      const result = await response.json()
      if (result.success) {
        fetchFeedback()
      } else {
        setError(result.message || '更新状态失败')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    } finally {
      setEditingId(null)
      setUpdatingStatus(false)
    }
  }

  const getStatusText = (status) => {
    const statusMap = {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决',
      closed: '已关闭'
    }
    return statusMap[status] || status
  }

  const getStatusClass = (status) => {
    const classMap = {
      pending: 'status-pending',
      processing: 'status-processing',
      resolved: 'status-resolved',
      closed: 'status-closed'
    }
    return classMap[status] || ''
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loading text="正在加载反馈列表..." size="large" />
      </div>
    )
  }

  return (
    <div className="feedback-management-container">
      <h1>意见反馈管理</h1>
      
      {error && <div className="feedback-management-error">{error}</div>}
      
      <div className="feedback-management-stats">
        <div className="stat-item">
          <span className="stat-value">{feedbackList.length}</span>
          <span className="stat-label">总反馈数</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{feedbackList.filter(f => f.status === 'pending').length}</span>
          <span className="stat-label">待处理</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{feedbackList.filter(f => f.status === 'processing').length}</span>
          <span className="stat-label">处理中</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{feedbackList.filter(f => f.status === 'resolved').length}</span>
          <span className="stat-label">已解决</span>
        </div>
      </div>

      <div className="feedback-management-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户</th>
              <th>标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {feedbackList.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-message">暂无意见反馈</td>
              </tr>
            ) : (
              feedbackList.map(feedback => (
                <tr key={feedback.id} className="feedback-item">
                  <td>{feedback.id}</td>
                  <td>
                    <div className="user-info">
                      <span className="user-name">{feedback.user_name}</span>
                      <span className="user-id">({feedback.user_id})</span>
                    </div>
                  </td>
                  <td className="feedback-title">
                    <div className="title-content">{feedback.title}</div>
                    <div className="feedback-content">{feedback.content}</div>
                    {feedback.contact && (
                      <div className="feedback-contact">
                        <strong>联系方式:</strong> {feedback.contact}
                      </div>
                    )}
                  </td>
                  <td className="feedback-category">
                    <span className={`category-badge category-${feedback.category}`}>
                      {feedback.category === 'feature' && '功能建议'}
                      {feedback.category === 'bug' && 'Bug报告'}
                      {feedback.category === 'ui' && '界面优化'}
                      {feedback.category === 'other' && '其他'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(feedback.status)}`}>
                      {getStatusText(feedback.status)}
                    </span>
                  </td>
                  <td className="feedback-time">
                    {new Date(feedback.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div className="status-selector">
                      {updatingStatus && editingId === feedback.id ? (
                        <div className="status-loading">
                          <Loading text="" size="small" />
                        </div>
                      ) : editingId === feedback.id ? (
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          onBlur={() => handleStatusChange(feedback.id, newStatus)}
                          autoFocus
                        >
                          <option value="pending">待处理</option>
                          <option value="processing">处理中</option>
                          <option value="resolved">已解决</option>
                          <option value="closed">已关闭</option>
                        </select>
                      ) : (
                        <select
                          value={feedback.status}
                          onChange={(e) => handleStatusChange(feedback.id, e.target.value)}
                        >
                          <option value="pending">待处理</option>
                          <option value="processing">处理中</option>
                          <option value="resolved">已解决</option>
                          <option value="closed">已关闭</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}