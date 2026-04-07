import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import './TagInput.css'

const TagInput = ({ selectedTags = [], onChange, placeholder = '输入标签...' }) => {
  const [tags, setTags] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useContext(AuthContext)

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      const data = await response.json()
      setTags(data)
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
  }

  const handleInputKeyPress = async (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const tagName = inputValue.trim()
      
      // 检查标签是否已存在
      const existingTag = tags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase())
      
      if (existingTag) {
        // 标签已存在，直接添加
        if (!selectedTags.some(tag => tag.id === existingTag.id)) {
          onChange([...selectedTags, existingTag])
        }
      } else {
        // 创建新标签
        try {
          const token = user ? user.token : null
          const headers = {
            'Content-Type': 'application/json'
          }
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }
          const response = await fetch('/api/tags', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ name: tagName })
          })
          
          const data = await response.json()
          if (data.success) {
            // 添加新标签到列表
            const newTag = data.tag
            setTags([...tags, newTag])
            onChange([...selectedTags, newTag])
          }
        } catch (error) {
          console.error('Error creating tag:', error)
        }
      }
      
      setInputValue('')
    }
  }

  const handleTagClick = (tag) => {
    if (selectedTags.some(t => t.id === tag.id)) {
      // 移除标签
      onChange(selectedTags.filter(t => t.id !== tag.id))
    } else {
      // 添加标签
      onChange([...selectedTags, tag])
    }
  }

  const handleRemoveTag = (e, tagId) => {
    e.stopPropagation()
    onChange(selectedTags.filter(tag => tag.id !== tagId))
  }

  if (isLoading) {
    return <div className="tag-input-loading">加载标签中...</div>
  }

  return (
    <div className="tag-input-container">
      <div className="selected-tags">
        {selectedTags.map(tag => (
          <div key={tag.id} className="selected-tag">
            <span>{tag.name}</span>
            <button 
              className="remove-tag-btn"
              onClick={(e) => handleRemoveTag(e, tag.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      <div className="tag-input-wrapper">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleInputKeyPress}
          placeholder={placeholder}
          className="tag-input"
        />
      </div>
      
      {tags.length > 0 && (
        <div className="tag-suggestions">
          <h4>推荐标签</h4>
          <div className="tag-list">
            {tags.map(tag => (
              <div
                key={tag.id}
                className={`tag-item ${selectedTags.some(t => t.id === tag.id) ? 'selected' : ''}`}
                onClick={() => handleTagClick(tag)}
              >
                {tag.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TagInput