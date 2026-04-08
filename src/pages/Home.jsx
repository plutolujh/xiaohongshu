import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getAllNotes, getHeaders } from '../utils/db'
import NoteCard from '../components/NoteCard'
import Loading from '../components/Loading'
import { useI18n } from '../context/I18nContext'
import { t } from '../i18n/i18n'
import './Home.css'

export default function Home() {
  const { language } = useI18n()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const authorId = searchParams.get('author')
  const [notes, setNotes] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pageSize, setPageSize] = useState(10)
  const [popularTags, setPopularTags] = useState([])
  const [selectedTag, setSelectedTag] = useState('')
  const [tagsLoading, setTagsLoading] = useState(false)
  const [infiniteScroll, setInfiniteScroll] = useState(false)
  const loaderRef = useRef(null)

  useEffect(() => {
    loadNotes()
    loadPopularTags()
  }, [page, pageSize, authorId])

  // 无限滚动：使用 IntersectionObserver 检测滚动到底部
  useEffect(() => {
    if (!infiniteScroll) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && notes.length < total) {
          loadMoreNotes()
        }
      },
      { rootMargin: '400px' }
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [infiniteScroll, loadingMore, total, notes.length])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadMoreNotes = useCallback(async () => {
    if (loadingMore || notes.length >= total) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const result = await getAllNotes(nextPage, pageSize, authorId)
      setNotes(prev => [...prev, ...result.notes])
      setPage(nextPage)
      setTotal(result.total)
    } catch (err) {
      console.error('Error loading more notes:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, notes.length, total, page, pageSize, authorId])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const result = await getAllNotes(page, pageSize, authorId)
      setNotes(result.notes)
      setTotal(result.total)
    } catch (err) {
      console.error('Error loading notes:', err)
      setNotes([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const loadPopularTags = async () => {
    setTagsLoading(true)
    try {
      const tags = await fetch(`/api/tags/popular?limit=10`, {
        headers: getHeaders()
      })
      .then(response => response.json())
      setPopularTags(tags)
    } catch (err) {
      console.error('Error loading popular tags:', err)
    } finally {
      setTagsLoading(false)
    }
  }

  const handleTagFilter = async (tagId) => {
    if (tagId === '' || selectedTag === tagId) {
      setSelectedTag('')
      setPage(1)
      loadNotes()
    } else {
      setSelectedTag(tagId)
      try {
        setLoading(true)
        const data = await fetch(`/api/tags/${tagId}/notes?page=1&limit=${pageSize}`, {
          headers: getHeaders()
        })
        .then(response => response.json())
        setNotes(data.notes)
        setTotal(data.total || 0)
        setPage(1)
      } catch (err) {
        console.error('Error filtering notes by tag:', err)
      } finally {
        setLoading(false)
      }
    }
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

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="home">
      {authorId && (
        <div className="home-author-filter">
          <span>正在查看: </span>
          <button onClick={() => navigate('/')} className="clear-author-filter">
            清除过滤
          </button>
        </div>
      )}
      <div className="home-header">
        <h1>{t('home.title', language)}</h1>
        <p>{t('home.subtitle', language)}</p>
      </div>
      <div className="home-controls">
        <div className="popular-tags">
          <h3>{t('home.popularTags', language)}</h3>
          {tagsLoading ? (
            <div className="tags-loading">
              <Loading text={t('home.loading', language)} size="small" />
            </div>
          ) : popularTags.length > 0 ? (
            <div className="tags-list">
              <button 
                className={`tag-button ${selectedTag === '' ? 'active' : ''}`}
                onClick={() => handleTagFilter('')}
              >
                {t('home.all', language)}
              </button>
              {popularTags.map(tag => (
                <button
                  key={tag.id}
                  className={`tag-button ${selectedTag === tag.id ? 'active' : ''}`}
                  onClick={() => handleTagFilter(tag.id)}
                >
                  {tag.name}
                  <span className="tag-count">({tag.note_count})</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="tags-empty">
              <p>{t('home.noTags', language)}</p>
            </div>
          )}
        </div>
        <div className="page-size-selector">
          <label htmlFor="pageSize">{t('home.pageSize', language)}</label>
          <select 
            id="pageSize" 
            value={pageSize} 
            onChange={handlePageSizeChange}
            className="page-size-select"
          >
            <option value={10}>{language === 'zh-CN' ? '10条' : '10'}</option>
            <option value={20}>{language === 'zh-CN' ? '20条' : '20'}</option>
            <option value={30}>{language === 'zh-CN' ? '30条' : '30'}</option>
            <option value={50}>{language === 'zh-CN' ? '50条' : '50'}</option>
          </select>
        </div>
      </div>
      <div className="notes-grid" ref={loaderRef}>
        {loading ? (
          <div className="page-loading">
            <Loading text={t('home.loading', language)} size="large" />
          </div>
        ) : notes.length > 0 ? (
          notes.map(note => (
            <NoteCard key={note.id} note={note} />
          ))
        ) : (
          <div className="home-empty">
            <p>{t('home.noNotes', language)}</p>
          </div>
        )}
      </div>
      {loadingMore && (
        <div className="loading-more">
          <Loading text={t('home.loadingMore', language)} size="small" />
        </div>
      )}
      {!infiniteScroll && total > pageSize && (
        <div className="home-pagination">
          <button 
            className={`pagination-button ${page === 1 ? 'disabled' : ''}`}
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            {t('home.prevPage', language)}
          </button>
          <span className="pagination-info">
            {t('home.pageInfo', language).replace('{page}', page).replace('{totalPages}', totalPages)}
          </span>
          <button 
            className={`pagination-button ${page === totalPages ? 'disabled' : ''}`}
            onClick={handleNextPage}
            disabled={page === totalPages}
          >
            {t('home.nextPage', language)}
          </button>
        </div>
      )}
    </div>
  )
}
