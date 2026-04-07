import React from 'react'
import './Loading.css'

export default function Loading({ text = '加载中...', size = 'medium' }) {
  return (
    <div className={`loading-container ${size}`}>
      <div className="loading-spinner">
        <div className="loading-circle"></div>
        <div className="loading-circle"></div>
        <div className="loading-circle"></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  )
}