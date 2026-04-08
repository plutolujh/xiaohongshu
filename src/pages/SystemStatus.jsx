import React, { useState, useEffect } from 'react'

// API基础URL
const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3004/api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import './SystemStatus.css'

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const SystemStatus = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 格式化字节为可读大小
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const value = bytes / Math.pow(1024, i)
    return `${value.toFixed(2)} ${units[i]}`
  }

  // 格式化运行时间
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}天 ${hours}小时`
    if (hours > 0) return `${hours}小时 ${mins}分钟`
    return `${mins}分钟`
  }

  // 定期获取系统状态数据
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/status`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        })
        const data = await response.json()
        console.log('API Response:', data)
        if (data.success) {
          setStatus(data.status)
          setError(null)
        } else {
          setError('获取系统状态失败')
        }
      } catch (err) {
        setError('网络错误，无法获取系统状态')
        console.error('Error fetching system status:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // 每5秒更新一次

    return () => clearInterval(interval)
  }, [user])

  // 内存使用图表数据
  const memoryData = {
    labels: ['已用内存', '可用内存'],
    datasets: [
      {
        label: '内存使用情况 (MB)',
        data: status ? [
          (status?.system?.totalMemory || 0) - (status?.system?.freeMemory || 0),
          status?.system?.freeMemory || 0
        ] : [0, 0],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(75, 192, 192, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }
    ]
  }

  // CPU使用图表数据
  const cpuData = {
    labels: ['1分钟', '5分钟', '15分钟'],
    datasets: [
      {
        label: 'CPU负载',
        data: status ? status?.system?.cpuUsage || [0, 0, 0] : [0, 0, 0],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4
      }
    ]
  }

  // 硬盘使用图表数据
  const diskData = {
    labels: ['已用空间', '可用空间'],
    datasets: [
      {
        label: '硬盘使用情况',
        data: status ? [
          status?.system?.usedDisk || 0,
          status?.system?.freeDisk || 0
        ] : [0, 0],
        backgroundColor: [
          'rgba(255, 159, 64, 0.7)',
          'rgba(75, 192, 192, 0.7)'
        ],
        borderColor: [
          'rgba(255, 159, 64, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }
    ]
  }

  // 请求统计图表数据
  const requestData = {
    labels: ['总请求数', '错误数'],
    datasets: [
      {
        label: '请求统计',
        data: status ? [status?.requests?.total || 0, status?.requests?.errors || 0] : [0, 0],
        backgroundColor: [
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ],
        borderColor: [
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
      }
    ]
  }

  // 状态码统计图表数据
  const statusCodeData = {
    labels: Object.keys(status?.accessStats?.statusCodeStats || {}),
    datasets: [
      {
        label: '状态码分布',
        data: Object.values(status?.accessStats?.statusCodeStats || {}),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',  // 2xx
          'rgba(54, 162, 235, 0.6)',  // 3xx
          'rgba(255, 159, 64, 0.6)',  // 4xx
          'rgba(255, 99, 132, 0.6)'   // 5xx
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }
    ]
  }

  // 方法统计图表数据
  const methodData = {
    labels: Object.keys(status?.accessStats?.methodStats || {}),
    datasets: [
      {
        label: '请求方法分布',
        data: Object.values(status?.accessStats?.methodStats || {}),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1
      }
    ]
  }

  // 每日访问统计图表数据
  const dailyAccessData = {
    labels: Object.keys(status?.accessStats?.daily || {}).sort(),
    datasets: [
      {
        label: '每日访问量',
        data: Object.values(status?.accessStats?.daily || {}),
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.4
      }
    ]
  }

  // 图表配置
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      }
    }
  }

  // 权限检查
  if (!user || user.role !== 'admin') {
    return (
      <div className="system-status-container">
        <h1 className="system-status-title">系统状态监控</h1>
        <div className="error">
          <p>权限不足，只有管理员可以访问系统状态功能</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loading text="正在加载系统状态..." size="large" />
      </div>
    )
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="system-status-container">
      <h1 className="system-status-title">系统状态监控</h1>
      
      <div className="status-cards">
        <div className="status-card">
          <h3>服务器信息</h3>
          <p>运行时间: <span className="value">{formatUptime(status?.server?.uptime || 0)}</span></p>
          <p>Node版本: <span className="value">{status?.server?.nodeVersion || '-'}</span></p>
          <p>版本: <span className="value">{status?.version || '-'}</span></p>
        </div>

        <div className="status-card">
          <h3>系统信息</h3>
          <p>平台: <span className="value">{status?.system?.platform || '-'}</span></p>
          <p>架构: <span className="value">{status?.system?.arch || '-'}</span></p>
          <p>CPU核心: <span className="value">{status?.system?.cpuCount || 0}</span></p>
        </div>

        <div className="status-card">
          <h3>进程信息</h3>
          <p>内存: <span className="value">{(status?.process?.memoryUsage || 0).toFixed(1)} MB</span></p>
          <p>运行: <span className="value">{formatUptime(status?.process?.uptime || 0)}</span></p>
        </div>

        <div className="status-card">
          <h3>存储空间</h3>
          <p>总容量: <span className="value">{formatBytes(status?.system?.totalDisk || 0)}</span></p>
          <p>已用: <span className="value">{formatBytes(status?.system?.usedDisk || 0)}</span></p>
          <p>可用: <span className="value">{formatBytes(status?.system?.freeDisk || 0)}</span></p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${status?.system?.diskUsagePercent || 0}%` }}></div>
          </div>
          <p className="progress-text">使用率: {status?.system?.diskUsagePercent || 0}%</p>
        </div>

        <div className="status-card">
          <h3>数据库</h3>
          <p>总记录: <span className="value">{formatBytes(status?.database?.totalSize || 0)}</span></p>
          <table className="data-table">
            <thead>
              <tr><th>表名</th><th>记录数</th></tr>
            </thead>
            <tbody>
              {status?.database?.tables ? Object.entries(status.database.tables).map(([name, count]) => (
                <tr key={name}><td>{name}</td><td>{count}</td></tr>
              )) : <tr><td colSpan={2}>无数据</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="status-card">
          <h3>项目文件</h3>
          <p>总大小: <span className="value">{formatBytes(status?.project?.totalSize || 0)}</span></p>
          <p>文件数: <span className="value">{status?.project?.fileCount || 0}</span></p>
        </div>

        <div className="status-card">
          <h3>请求统计</h3>
          <p>总请求: <span className="value">{status?.requests?.total || 0}</span></p>
          <p>错误: <span className="value">{status?.requests?.errors || 0}</span></p>
          <p>今日: <span className="value">{status?.accessStats?.daily?.[new Date().toISOString().split('T')[0]] || 0}</span></p>
        </div>
      </div>
      
      {status && (
        <div className="charts-container">
          <div className="chart-item">
            <h3>存储使用情况</h3>
            <Pie data={diskData} options={chartOptions}/>
          </div>

          <div className="chart-item">
            <h3>内存使用情况</h3>
            <Pie data={memoryData} options={chartOptions}/>
          </div>

          <div className="chart-item">
            <h3>CPU负载</h3>
            <Line data={cpuData} options={chartOptions}/>
          </div>

          <div className="chart-item">
            <h3>📊 请求统计</h3>
            <Bar data={requestData} options={chartOptions}/>
          </div>
          
          <div className="chart-item">
            <h3>状态码分布</h3>
            <Bar data={statusCodeData} options={chartOptions}/>
          </div>
          
          <div className="chart-item">
            <h3>请求方法分布</h3>
            <Pie data={methodData} options={chartOptions}/>
          </div>
          
          <div className="chart-item">
            <h3>每日访问量</h3>
            <Line data={dailyAccessData} options={chartOptions}/>
          </div>
        </div>
      )}
    </div>
  )
}

export default SystemStatus