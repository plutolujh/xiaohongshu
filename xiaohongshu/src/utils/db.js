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
export async function getAllNotes(page = 1, limit = 10) {
  const res = await fetch(`${API_BASE}/notes?page=${page}&limit=${limit}`, {
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

// 当前用户操作
const CURRENT_USER_KEY = 'xiaohongshu_current_user'

export function getCurrentUser() {
  const user = sessionStorage.getItem(CURRENT_USER_KEY)
  return user ? JSON.parse(user) : null
}

export function setCurrentUser(user) {
  if (user) {
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  } else {
    sessionStorage.removeItem(CURRENT_USER_KEY)
  }
}

export function initDatabase() {
  return Promise.resolve()
}
