import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCurrentUser } from '../utils/db'

export default function AdminRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const currentUser = getCurrentUser()
  const isAdmin = currentUser && currentUser.role === 'admin'

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
