import React, { useState, useEffect } from 'react'
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
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 定期获取系统状态数据
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status')
        const data = await response.json()
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
  }, [])

  // 内存使用图表数据
  const memoryData = {
    labels: ['已用内存', '可用内存'],
    datasets: [
      {
        label: '内存使用情况 (MB)',
        data: status ? [
          status.system.totalMemory - status.system.freeMemory,
          status.system.freeMemory
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
        data: status ? status.system.cpuUsage : [0, 0, 0],
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
        data: status ? [status.requests.total, status.requests.errors] : [0, 0],
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

  // 图表配置
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      }
    }
  }

  if (loading) {
    return <div className="loading">加载系统状态中...</div>
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
          <p>运行时间: {Math.round(status.server.uptime)} 秒</p>
          <p>Node版本: {status.server.nodeVersion}</p>
        </div>
        
        <div className="status-card">
          <h3>系统信息</h3>
          <p>平台: {status.system.platform}</p>
          <p>架构: {status.system.arch}</p>
          <p>CPU核心数: {status.system.cpuCount}</p>
        </div>
        
        <div className="status-card">
          <h3>进程信息</h3>
          <p>内存使用: {status.process.memoryUsage.toFixed(2)} MB</p>
          <p>进程运行时间: {Math.round(status.process.uptime)} 秒</p>
        </div>
        
        <div className="status-card">
          <h3>请求统计</h3>
          <p>总请求数: {status.requests.total}</p>
          <p>错误数: {status.requests.errors}</p>
        </div>
      </div>
      
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
      </div>
    </div>
  )
}

export default SystemStatus
