import React, { useState, useEffect } from 'react'

// API基础URL
const API_BASE = 'http://localhost:3004/api'
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
          <p>运行时间: {Math.round(status?.server?.uptime || 0)} 秒</p>
          <p>Node版本: {status?.server?.nodeVersion || '未知'}</p>
          <p>项目版本: {status?.version || '1.0.0'}</p>
        </div>
        
        <div className="status-card">
          <h3>系统信息</h3>
          <p>平台: {status?.system?.platform || '未知'}</p>
          <p>架构: {status?.system?.arch || '未知'}</p>
          <p>CPU核心数: {status?.system?.cpuCount || 0}</p>
        </div>
        
        <div className="status-card">
          <h3>进程信息</h3>
          <p>内存使用: {(status?.process?.memoryUsage || 0).toFixed(2)} MB</p>
          <p>进程运行时间: {Math.round(status?.process?.uptime || 0)} 秒</p>
        </div>
        
        <div className="status-card">
          <h3>请求统计</h3>
          <p>总请求数: {status?.requests?.total || 0}</p>
          <p>错误数: {status?.requests?.errors || 0}</p>
        </div>
        
        <div className="status-card">
          <h3>访问统计</h3>
          <p>今日访问: {(status?.accessStats?.daily?.[new Date().toISOString().split('T')[0]] || 0)}</p>
          <p>方法数: {Object.keys(status?.accessStats?.methodStats || {}).length}</p>
          <p>路径数: {Object.keys(status?.accessStats?.pathStats || {}).length}</p>
        </div>
      </div>
      
      {status && (
        <div className="charts-container">
          <div className="chart-item">
            <h3>内存使用情况</h3>
            <Pie data={memoryData} options={chartOptions}/>
          </div>
          
          <div className="chart-item">
            <h3>CPU负载</h3>
            <Line data={cpuData} options={chartOptions}/>
          </div>
          
          <div className="chart-item">
            <h3>请求统计</h3>
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