import { useState, useEffect } from 'react'
import { getHeaders } from '../utils/db'
import Loading from '../components/Loading'
import './DatabaseManagement.css'

// API基础URL
const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3004/api'

export default function DatabaseManagement() {
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableData, setTableData] = useState(null)
  const [sqlQuery, setSqlQuery] = useState('')
  const [queryResult, setQueryResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dbInfo, setDbInfo] = useState(null)
  // 新增：表结构和备份功能
  const [tableStructure, setTableStructure] = useState(null)
  const [showStructure, setShowStructure] = useState(false)
  const [backupData, setBackupData] = useState(null)
  const [showBackup, setShowBackup] = useState(false)
  const [includeData, setIncludeData] = useState(true)

  useEffect(() => {
    loadDbInfo()
    loadTables()
  }, [])

  const loadDbInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/db/info`, {
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setDbInfo(data.data)
      }
    } catch (err) {
      console.error('加载数据库信息失败:', err)
    }
  }

  const loadTables = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/db/tables`, {
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setTables(data.data)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('加载表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadTableData = async (tableName) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/db/table/${tableName}`, {
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setSelectedTable(tableName)
        setTableData(data.data)
        setQueryResult(null)
        setError('')
        // 每次切换表时清除结构查看
        setShowStructure(false)
        setTableStructure(null)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('加载表数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载表结构
  const loadTableStructure = async (tableName) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/db/table/${tableName}/structure`, {
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setTableStructure(data.data)
        setShowStructure(true)
        setError('')
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('加载表结构失败')
    } finally {
      setLoading(false)
    }
  }

  // 生成数据库备份
  const generateBackup = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/db/backup?includeData=${includeData}`, {
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setBackupData(data.data.backup)
        setShowBackup(true)
        setError('')
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('生成备份失败')
    } finally {
      setLoading(false)
    }
  }

  // 下载备份文件
  const downloadBackup = () => {
    if (!backupData) return
    const blob = new Blob([backupData], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `database_backup_${new Date().toISOString().slice(0, 10)}.sql`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      setError('SQL语句不能为空')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/db/query`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ sql: sqlQuery })
      })
      const data = await res.json()
      if (data.success) {
        setQueryResult(data.data)
        setError('')
        // 如果是修改操作，重新加载当前表数据
        if (selectedTable && (sqlQuery.trim().toUpperCase().startsWith('INSERT') || 
            sqlQuery.trim().toUpperCase().startsWith('UPDATE') || 
            sqlQuery.trim().toUpperCase().startsWith('DELETE'))) {
          loadTableData(selectedTable)
        }
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('执行查询失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="database-management">
      <div className="database-header">
        <h1>数据库管理</h1>
        <p>仅管理员可访问的数据库管理功能</p>
        {dbInfo && (
          <div className="database-info">
            <strong>数据库类型:</strong> {dbInfo.database}<br/>
            <strong>版本:</strong> {dbInfo.version}<br/>
            <strong>表数量:</strong> {dbInfo.tables.length}
          </div>
        )}
      </div>
      
      {error && (
        <div className="database-error">
          {error}
        </div>
      )}

      <div className="database-content">
        {/* 表列表 */}
        <div className="tables-list">
          <h2>数据库表</h2>
          <div className="backup-section">
            <button
              className="backup-btn"
              onClick={generateBackup}
              disabled={loading}
            >
              备份数据库
            </button>
          </div>
          {loading && !selectedTable ? (
            <div className="table-loading">
              <Loading text="正在加载表列表..." size="medium" />
            </div>
          ) : (
            <ul>
              {tables.map(table => (
                <li
                  key={table.name}
                  className={selectedTable === table.name ? 'active' : ''}
                  onClick={() => loadTableData(table.name)}
                >
                  <div className="table-info">
                    <span className="table-name">{table.name}</span>
                    <div className="table-stats">
                      <span className="table-count">{table.count} 行</span>
                      <span className="table-size">{table.size}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 表数据 */}
        <div className="table-data">
          {selectedTable ? (
            <div>
              <div className="table-header">
                <h2>{selectedTable} 表</h2>
              </div>

              {/* 表结构显示 */}
              {showStructure && tableStructure && (
                <div className="table-structure">
                  <h3>表结构</h3>
                  {tableStructure.primaryKeys && tableStructure.primaryKeys.length > 0 && (
                    <div className="primary-keys">
                      <strong>主键:</strong> {tableStructure.primaryKeys.join(', ')}
                    </div>
                  )}
                  <table className="structure-table">
                    <thead>
                      <tr>
                        <th>列名</th>
                        <th>类型</th>
                        <th>可空</th>
                        <th>默认值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableStructure.columns.map((col, index) => (
                        <tr key={index}>
                          <td>
                            {tableStructure.primaryKeys && tableStructure.primaryKeys.includes(col.column_name) && (
                              <span className="pk-badge">PK</span>
                            )}
                            {col.column_name}
                          </td>
                          <td>{col.data_type}</td>
                          <td>{col.is_nullable === 'YES' ? '是' : '否'}</td>
                          <td>{col.column_default || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {loading ? (
                <div className="table-loading">
                  <Loading text="正在加载表数据..." size="medium" />
                </div>
              ) : tableData ? (
                <div>
                  <div className="table-rows">
                    <h3>表数据</h3>
                    {tableData.rows.length > 0 ? (
                      <table className="data-table">
                        <thead>
                          <tr>
                            {Object.keys(tableData.rows[0]).map((column, index) => (
                              <th key={index}>{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.rows.map((row, index) => (
                            <tr key={index}>
                              {Object.values(row).map((value, colIndex) => (
                                <td key={colIndex}>{value || '-'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-data">表中暂无数据</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-table-selection">
              <h2>请选择一个表</h2>
              <p>从左侧的表列表中选择一个表来查看其数据</p>
            </div>
          )}
        </div>

        {/* SQL查询 */}
        <div className="sql-query">
          <h2>SQL查询</h2>
          <div className="query-input">
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="输入SQL语句，例如：SELECT * FROM users"
              rows={6}
            />
            <button 
              className="execute-btn"
              onClick={executeQuery}
              disabled={loading}
            >
              {loading ? (
                <div className="button-loading">
                  <Loading text="" size="small" />
                  <span>执行中...</span>
                </div>
              ) : '执行'}
            </button>
          </div>

          {queryResult && (
            <div className="query-result">
              <h3>查询结果</h3>
              {queryResult.rows ? (
                <table className="result-table">
                  <thead>
                    <tr>
                      {queryResult.columns.map((column, index) => (
                        <th key={index}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, index) => (
                      <tr key={index}>
                        {row.map((value, colIndex) => (
                          <td key={colIndex}>{value || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="affected-rows">
                  影响行数: {queryResult.affectedRows}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 备份弹窗 */}
      {showBackup && (
        <div className="backup-modal">
          <div className="backup-modal-content">
            <div className="backup-modal-header">
              <h2>数据库备份</h2>
              <button className="close-btn" onClick={() => setShowBackup(false)}>×</button>
            </div>
            <div className="backup-options">
              <label>
                <input
                  type="checkbox"
                  checked={includeData}
                  onChange={(e) => setIncludeData(e.target.checked)}
                />
                包含数据
              </label>
              <button
                className="regenerate-btn"
                onClick={generateBackup}
                disabled={loading}
              >
                重新生成
              </button>
            </div>
            <div className="backup-preview">
              <textarea
                value={backupData}
                readOnly
                rows={20}
              />
            </div>
            <div className="backup-actions">
              <button className="download-btn" onClick={downloadBackup}>
                下载 SQL 文件
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}