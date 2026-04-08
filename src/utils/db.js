// 使用相对路径，适配不同环境
const API_BASE = '/api'

// 获取token
function getToken() {
  const user = getCurrentUser()
  return user ? user.token : null
}

// 构建请求头
export function getHeaders() {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// 用户操作
export async function getAllUsers() {
  const res = await fetch(`${API_BASE}/users`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function createUser(user) {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(user)
  })
  return res.json()
}

export async function findUserByUsername(username) {
  const res = await fetch(`${API_BASE}/users/${username}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function getUserById(id) {
  const res = await fetch(`${API_BASE}/user/${id}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function getUserTags(userId) {
  const res = await fetch(`${API_BASE}/user/${userId}/tags`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function findUserById(id) {
  const users = await getAllUsers()
  return users.find(u => u.id === id)
}

export async function updateUser(id, userData) {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(userData)
  })
  return res.json()
}

// 笔记操作
export async function getAllNotes(page = 1, limit = 10, authorId = null) {
  let url = `${API_BASE}/notes?page=${page}&limit=${limit}`
  if (authorId) {
    url += `&author=${authorId}`
  }
  const res = await fetch(url, {
    headers: getHeaders()
  })
  return res.json()
}

export async function createNote(note) {
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(note)
  })
  return res.json()
}

export async function updateNote(note) {
  const res = await fetch(`${API_BASE}/notes/${note.id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(note)
  })
  return res.json()
}

export async function deleteNoteById(id) {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  return res.json()
}

export async function findNoteById(id) {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function getNoteTags(noteId) {
  const res = await fetch(`${API_BASE}/notes/${noteId}/tags`, {
    headers: getHeaders()
  })
  return res.json()
}

// 评论操作
export async function getCommentsByNoteId(noteId) {
  const res = await fetch(`${API_BASE}/comments/${noteId}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function createComment(comment) {
  const res = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(comment)
  })
  return res.json()
}

export async function deleteCommentById(id) {
  const res = await fetch(`${API_BASE}/comments/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  return res.json()
}

// 关注功能
export async function followUser(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
    method: 'POST',
    headers: getHeaders()
  })
  return res.json()
}

export async function unfollowUser(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  return res.json()
}

export async function getFollowers(userId, page = 1, limit = 20) {
  const res = await fetch(`${API_BASE}/users/${userId}/followers?page=${page}&limit=${limit}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function getFollowing(userId, page = 1, limit = 20) {
  const res = await fetch(`${API_BASE}/users/${userId}/following?page=${page}&limit=${limit}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function getFollowStatus(userId, targetId) {
  const res = await fetch(`${API_BASE}/users/${userId}/follow-status/${targetId}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function getFollowCounts(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}/follow-counts`)
  return res.json()
}

// 点赞笔记
export async function likeNote(noteId) {
  const res = await fetch(`${API_BASE}/notes/${noteId}/like`, {
    method: 'POST',
    headers: getHeaders()
  })
  return res.json()
}

// 取消点赞笔记
export async function unlikeNote(noteId) {
  const res = await fetch(`${API_BASE}/notes/${noteId}/like`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  return res.json()
}

// 获取笔记点赞状态
export async function getNoteLikeStatus(noteId) {
  const res = await fetch(`${API_BASE}/notes/${noteId}/like-status`, {
    headers: getHeaders()
  })
  return res.json()
}

// 当前用户操作
const CURRENT_USER_KEY = 'xiaohongshu_current_user'

export function getCurrentUser() {
  // 先从localStorage读取，如果没有再从sessionStorage读取
  const userLocal = localStorage.getItem(CURRENT_USER_KEY)
  if (userLocal) {
    return JSON.parse(userLocal)
  }
  const userSession = sessionStorage.getItem(CURRENT_USER_KEY)
  return userSession ? JSON.parse(userSession) : null
}

export function setCurrentUser(user, remember = false) {
  // 清除两个存储中的用户信息
  localStorage.removeItem(CURRENT_USER_KEY)
  sessionStorage.removeItem(CURRENT_USER_KEY)
  
  if (user) {
    // 根据remember参数决定存储位置
    if (remember) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    } else {
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    }
  }
}

export function initDatabase() {
  return Promise.resolve()
}
