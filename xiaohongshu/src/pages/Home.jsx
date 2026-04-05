import { useState, useEffect } from 'react'
import { getAllNotes } from '../utils/db'
import NoteCard from '../components/NoteCard'
import './Home.css'

export default function Home() {
  const [notes, setNotes] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [page])

  const loadNotes = async () => {
    setLoading(true)
    const result = await getAllNotes(page)
    setNotes(result.notes)
    setTotal(result.total)
    setLoading(false)
  }

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    const totalPages = Math.ceil(total / 10)
    if (page < totalPages) {
      setPage(page + 1)
    }
  }

  return (
    <div className="home">
      <div className="home-header">
        <h1>发现美食</h1>
        <p>发现更多美食灵感</p>
      </div>
      <div className="notes-grid">
        {loading ? (
          <div className="home-loading">加载中...</div>
        ) : notes.length > 0 ? (
          notes.map(note => (
            <NoteCard key={note.id} note={note} />
          ))
        ) : (
          <div className="home-empty">
            <p>暂无美食笔记，快去发布第一篇吧！</p>
          </div>
        )}
      </div>
      {total > 10 && (
        <div className="home-pagination">
          <button 
            className={`pagination-button ${page === 1 ? 'disabled' : ''}`}
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            上一页
          </button>
          <span className="pagination-info">
            第 {page} 页，共 {Math.ceil(total / 10)} 页
          </span>
          <button 
            className={`pagination-button ${page === Math.ceil(total / 10) ? 'disabled' : ''}`}
            onClick={handleNextPage}
            disabled={page === Math.ceil(total / 10)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
