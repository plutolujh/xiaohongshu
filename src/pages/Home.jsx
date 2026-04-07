import { useState, useEffect } from 'react'
import { getAllNotes } from '../utils/db'
import NoteCard from '../components/NoteCard'
import Loading from '../components/Loading'
import './Home.css'

export default function Home() {
  const [notes, setNotes] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    loadNotes()
  }, [page, pageSize])

  const loadNotes = async () => {
    setLoading(true)
    const result = await getAllNotes(page, pageSize)
    setNotes(result.notes)
    setTotal(result.total)
    setLoading(false)
  }

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value)
    setPageSize(newSize)
    setPage(1)
  }

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    const totalPages = Math.ceil(total / pageSize)
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
      <div className="home-controls">
        <div className="page-size-selector">
          <label htmlFor="pageSize">每页显示：</label>
          <select 
            id="pageSize" 
            value={pageSize} 
            onChange={handlePageSizeChange}
            className="page-size-select"
          >
            <option value={10}>10条</option>
            <option value={20}>20条</option>
            <option value={30}>30条</option>
            <option value={50}>50条</option>
          </select>
        </div>
      </div>
      <div className="notes-grid">
        {loading ? (
          <div className="page-loading">
            <Loading text="正在加载美食笔记..." size="large" />
          </div>
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
      {total > pageSize && (
        <div className="home-pagination">
          <button 
            className={`pagination-button ${page === 1 ? 'disabled' : ''}`}
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            上一页
          </button>
          <span className="pagination-info">
            第 {page} 页，共 {Math.ceil(total / pageSize)} 页
          </span>
          <button 
            className={`pagination-button ${page === Math.ceil(total / pageSize) ? 'disabled' : ''}`}
            onClick={handleNextPage}
            disabled={page === Math.ceil(total / pageSize)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
