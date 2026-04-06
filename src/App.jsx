import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Publish from './pages/Publish'
import NoteDetail from './pages/NoteDetail'
import Profile from './pages/Profile'
import EditNote from './pages/EditNote'
import Changelog from './pages/Changelog'
import SystemStatus from './pages/SystemStatus'
import UserManagement from './pages/UserManagement'
import NoteManagement from './pages/NoteManagement'
import Feedback from './pages/Feedback'
import FeedbackManagement from './pages/FeedbackManagement'
import DatabaseManagement from './pages/DatabaseManagement'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route
          path="/publish"
          element={
            <ProtectedRoute>
              <Publish />
            </ProtectedRoute>
          }
        />
        <Route path="/note/:id" element={<NoteDetail />} />
        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <EditNote />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system-status"
          element={
            <ProtectedRoute>
              <SystemStatus />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/note-management"
          element={
            <AdminRoute>
              <NoteManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/feedback-management"
          element={
            <AdminRoute>
              <FeedbackManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/database-management"
          element={
            <AdminRoute>
              <DatabaseManagement />
            </AdminRoute>
          }
        />
      </Routes>
      <Footer />
    </div>
  )
}
