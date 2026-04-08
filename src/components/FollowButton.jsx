import { useState, useEffect } from 'react'
import { followUser, unfollowUser, getFollowStatus, getCurrentUser } from '../utils/db'
import './FollowButton.css'

export default function FollowButton({ userId, size = 'normal', showText = true }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentUser = getCurrentUser()

  // 未登录或自己不能关注
  if (!currentUser || currentUser.id === userId) {
    return null
  }

  useEffect(() => {
    checkFollowStatus()
  }, [userId])

  const checkFollowStatus = async () => {
    try {
      const data = await getFollowStatus(currentUser.id, userId)
      if (data.success) {
        setIsFollowing(data.data.isFollowing)
      }
    } catch (err) {
      console.error('检查关注状态失败:', err)
    }
  }

  const handleFollow = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await followUser(userId)
      if (data.success) {
        setIsFollowing(true)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('关注失败')
    } finally {
      setLoading(false)
    }
  }

  const handleUnfollow = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await unfollowUser(userId)
      if (data.success) {
        setIsFollowing(false)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('取消关注失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClick = () => {
    if (isFollowing) {
      handleUnfollow()
    } else {
      handleFollow()
    }
  }

  if (error) {
    return <span className="follow-error">{error}</span>
  }

  return (
    <button
      className={`follow-btn ${size} ${isFollowing ? 'following' : ''}`}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <span className="follow-loading">...</span>
      ) : isFollowing ? (
        showText ? '已关注' : '✓'
      ) : (
        showText ? '关注' : '+ 关注'
      )}
    </button>
  )
}