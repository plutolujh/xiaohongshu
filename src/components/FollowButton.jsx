import { useState, useEffect } from 'react'
import { followUser, unfollowUser, getFollowStatus } from '../utils/db'
import { useAuth } from '../context/AuthContext'
import './FollowButton.css'

export default function FollowButton({ userId, size = 'normal', showText = true }) {
  const { user: authUser } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Check follow status when userId or authUser changes
  useEffect(() => {
    // Check if user is logged in and not trying to follow themselves
    if (!authUser || authUser.id === userId) {
      return
    }

    // Check follow status
    checkFollowStatus()
  }, [userId, authUser])

  const checkFollowStatus = async () => {
    if (!authUser) return
    try {
      const data = await getFollowStatus(authUser.id, userId)
      if (data.success) {
        setIsFollowing(data.data.isFollowing)
      }
    } catch (err) {
      console.error('检查关注状态失败:', err)
    }
  }

  const handleFollow = async () => {
    setLoading(true)
    setError(null)
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
    setError(null)
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

  // Don't render if not logged in or trying to follow yourself
  if (!authUser || authUser.id === userId) {
    return null
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