import { useEffect } from 'react'

export default function Changelog() {
  useEffect(() => {
    // 跳转到静态HTML页面
    window.location.replace('/changelog.html')
  }, [])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ color: '#333', marginBottom: '16px' }}>正在跳转到修改日志...</h1>
        <p style={{ color: '#666' }}>
          如果没有自动跳转，请 <a href="/changelog.html" style={{ color: '#ff2442' }}>点击这里</a> 查看
        </p>
      </div>
    </div>
  )
}
