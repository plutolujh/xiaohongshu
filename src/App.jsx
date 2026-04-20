import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ThemeManager from './components/ThemeManager'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Loading from './components/Loading'
import { ThemeProvider } from './context/ThemeContext'
import { I18nProvider } from './context/I18nContext'
import './styles/theme.css'

// 懒加载页面组件
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Publish = lazy(() => import('./pages/Publish'))
const NoteDetail = lazy(() => import('./pages/NoteDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const EditNote = lazy(() => import('./pages/EditNote'))
const Changelog = lazy(() => import('./pages/Changelog'))
const SystemStatus = lazy(() => import('./pages/SystemStatus'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const NoteManagement = lazy(() => import('./pages/NoteManagement'))
const MyUploads = lazy(() => import('./pages/MyUploads'))
const Feedback = lazy(() => import('./pages/Feedback'))
const FeedbackManagement = lazy(() => import('./pages/FeedbackManagement'))
const DatabaseManagement = lazy(() => import('./pages/DatabaseManagement'))
const TagManagement = lazy(() => import('./pages/TagManagement'))
const FollowersPage = lazy(() => import('./pages/FollowersPage'))

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ThemeManager />
        <div className="app">
          <Navbar />
          <Suspense fallback={<Loading />}>
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
              path="/profile/:id"
              element={
                <Profile isOtherUser={true} />
              }
            />
            <Route
              path="/users/:userId/followers"
              element={
                <ProtectedRoute>
                  <FollowersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:userId/following"
              element={
                <ProtectedRoute>
                  <FollowersPage />
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
                <AdminRoute>
                  <SystemStatus />
                </AdminRoute>
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
            <Route
              path="/tag-management"
              element={
                <AdminRoute>
                  <TagManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/my-uploads"
              element={
                <ProtectedRoute>
                  <MyUploads />
                </ProtectedRoute>
              }
            />
          </Routes>
          </Suspense>
          <Footer />
        </div>
      </ThemeProvider>
    </I18nProvider>
  )
}
