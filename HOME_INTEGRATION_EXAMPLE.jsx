/**
 * Home.jsx 集成示例
 * 
 * 这是一个展示如何将PosterBrowseMode和PosterModeToggle集成到Home页面的完整示例
 * 
 * 集成步骤:
 * 1. 在文件顶部添加导入
 * 2. 在Home组件中添加状态管理
 * 3. 更新JSX渲染逻辑
 * 
 * 文件位置: src/pages/Home.jsx
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getAllNotes, getHeaders } from '../utils/db'
import NoteCard from '../components/NoteCard'
import Loading from '../components/Loading'
import PosterBrowseMode from '../components/PosterBrowseMode'  // 新增
import PosterModeToggle from '../components/PosterModeToggle'   // 新增
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
  const [loadingMoreTags, setLoadingMoreTags] = useState(false)
  const [tagLimit, setTagLimit] = useState(10)
  const [allTagsLoaded, setAllTagsLoaded] = useState(false)
  const [infiniteScroll, setInfiniteScroll] = useState(false)
  const loaderRef = useRef(null)

  // 新增: 海报浏览模式状态
  const [posterMode, setPosterMode] = useState(false)
  const [posterStartIndex, setPosterStartIndex] = useState(0)

  // 现有的加载逻辑...
  useEffect(() => {
    if (selectedTag === '') {
      loadNotes()
    }
    loadPopularTags(tagLimit)
  }, [page, pageSize, authorId, selectedTag, tagLimit])

  // ... 现有的其他useEffect和函数 ...

  /**
   * 新增: 进入海报浏览模式
   * @param {number} startIndex - 开始浏览的笔记索引，默认为0
   */
  const handleEnterPosterMode = useCallback((startIndex = 0) => {
    setPosterStartIndex(startIndex)
    setPosterMode(true)
    // 防止背景滚动
    document.body.style.overflow = 'hidden'
  }, [])

  /**
   * 新增: 退出海报浏览模式
   */
  const handleExitPosterMode = useCallback(() => {
    setPosterMode(false)
    document.body.style.overflow = ''
  }, [])

  /**
   * 新增: 从笔记卡片快速进入海报模式
   * 这会在NoteCard中被调用
   */
  const handleQuickPosterMode = useCallback((noteId) => {
    const index = notes.findIndex(n => n.id === noteId)
    if (index !== -1) {
      handleEnterPosterMode(index)
    }
  }, [notes])

  // 注: 这里只展示新增的部分，原有的loadNotes, loadPopularTags等函数保持不变

  return (
    <div className="home">
      {/* 头部区域保持不变 */}
      <div className="home-header">
        {/* ... 现有的搜索和筛选组件 ... */}
      </div>

      {/* 主要内容区 - 条件渲染 */}
      {!posterMode ? (
        // 正常模式：显示笔记列表
        <>
          {/* 笔记列表头部 - 新增海报模式切换按钮 */}
          <div className="notes-header">
            <div className="notes-controls">
              {/* 现有的筛选和排序控件... */}
              
              {/* 新增: 海报模式切换按钮 */}
              <PosterModeToggle 
                notesCount={notes.length}
                onToggle={() => handleEnterPosterMode(0)}
                isActive={false}
              />
            </div>
          </div>

          {/* 笔记列表 */}
          <div className="notes-list">
            {loading ? (
              <Loading />
            ) : notes.length > 0 ? (
              notes.map((note, index) => (
                <NoteCard 
                  key={note.id} 
                  note={note}
                  onNoteUpdate={(updatedNote) => {
                    // 处理笔记更新...
                  }}
                  // 新增: 快速进入海报模式的回调
                  onEnterPosterMode={() => handleQuickPosterMode(note.id)}
                />
              ))
            ) : (
              <div className="empty-state">没有笔记</div>
            )}
          </div>

          {/* 加载更多指示器 */}
          {infiniteScroll && loadingMore && <Loading />}
          <div ref={loaderRef} className="loader" />
        </>
      ) : (
        // 海报模式：显示海报浏览器
        <PosterBrowseMode 
          notes={notes}
          initialIndex={posterStartIndex}
          onClose={handleExitPosterMode}
          onDownload={(note) => {
            // 处理海报下载后的操作，比如显示提示
            console.log(`已下载海报: ${note.title}`)
          }}
        />
      )}
    </div>
  )
}
