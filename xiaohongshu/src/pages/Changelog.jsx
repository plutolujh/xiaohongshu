import React, { useState, useEffect } from 'react'
import './Changelog.css'

const Changelog = () => {
  const [changelog, setChangelog] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 读取CHANGELOG.md文件内容
    fetch('/CHANGELOG.md')
      .then(response => response.text())
      .then(data => {
        setChangelog(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading changelog:', error)
        setChangelog('无法加载修改日志')
        setLoading(false)
      })
  }, [])

  // 解析Markdown格式的修改日志
  const renderChangelog = () => {
    if (loading) {
      return <div className="loading">加载中...</div>
    }

    // 简单的Markdown解析
    return changelog.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="changelog-title">{line.substring(2)}</h1>
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="changelog-version">{line.substring(3)}</h2>
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="changelog-section">{line.substring(4)}</h3>
      } else if (line.startsWith('- ')) {
        return <li key={index} className="changelog-item">{line.substring(2)}</li>
      } else if (line.trim() === '') {
        return <br key={index} />
      } else {
        return <p key={index} className="changelog-text">{line}</p>
      }
    })
  }

  return (
    <div className="changelog-container">
      <div className="changelog-content">
        {renderChangelog()}
      </div>
    </div>
  )
}

export default Changelog
