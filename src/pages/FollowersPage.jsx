import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFollowers, getFollowing, getUserById } from '../utils/db'
import Loading from '../components/Loading'
import FollowButton from '../components/FollowButton'
import './FollowersPage.css'

export default function FollowersPage() {
  const { userId, type } = useParams()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [followersTotal, setFollowersTotal] = useState(0)
  const [followingTotal, setFollowingTotal] = useState(0)

  useEffect(() => {
    loadUserInfo()
  }, [userId])

  useEffect(() => {
    setPage(1)
    setUsers([])
    loadUsers(1, true)
  }, [type, userId])

  const loadUserInfo = async () => {
    try {
      const res = await fetch(`/api/users/${userId}`)
      const data = await res.json()
      if (data) setUserInfo(data)
    } catch (err) {
      console.error('加载用户信息失败:', err)
    }
  }

  const loadUsers = async (pageNum, reset = false) => {
    setLoading(true)
    try {
      const fetchFn = type === 'followers' ? getFollowers : getFollowing
      const result = await fetchFn(userId, pageNum, 20)

      if (result.success) {
        if (reset) {
          setUsers(result.data.users)
        } else {
          setUsers(prev => [...prev, ...result.data.users])
        }
        if (type === 'followers') {
          setFollowersTotal(result.data.total)
        } else {
          setFollowingTotal(result.data.total)
        }
        setHasMore(result.data.users.length === 20)
      }
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadUsers(nextPage)
  }

  const isFollowers = type === 'followers'

  return (
    <div className="followers-page">
      <div className="followers-header">
        <Link to={`/profile/${userId}`} className="back-link">← 返回个人主页</Link>
        {userInfo && (
          <h2>
            {userInfo.nickname}的{isFollowers ? '粉丝' : '关注'}
          </h2>
        )}
      </div>

      <div className="followers-tabs">
        <Link
          to={`/users/${userId}/followers`}
          className={`tab ${isFollowers ? 'active' : ''}`}
        >
          粉丝 {followersTotal}
        </Link>
        <Link
          to={`/users/${userId}/following`}
          className={`tab ${!isFollowers ? 'active' : ''}`}
        >
          关注 {followingTotal}
        </Link>
      </div>

      {loading && users.length === 0 ? (
        <Loading text="加载中..." />
      ) : users.length === 0 ? (
        <div className="empty-state">
          {isFollowers ? '还没有粉丝' : '还没有关注任何人'}
        </div>
      ) : (
        <div className="followers-list">
          {users.map(u => (
            <div key={u.id} className="follower-item">
              <Link to={`/profile/${u.id}`} className="follower-info">
                <img
                  src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                  alt={u.nickname}
                  className="follower-avatar"
                />
                <div className="follower-detail">
                  <span className="follower-name">{u.nickname}</span>
                  <span className="follower-username">@{u.username}</span>
                  {u.bio && <span className="follower-bio">{u.bio}</span>}
                </div>
              </Link>
              <FollowButton userId={u.id} size="small" />
            </div>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <button className="load-more-btn" onClick={loadMore}>
          加载更多
        </button>
      )}
    </div>
  )
}