import { useState, useEffect } from 'react'
import { getHeaders } from '../utils/db'
import Loading from '../components/Loading'
import './DatabaseManagement.css'

// API基础URL
const API_BASE = 'http://localhost:3004/api'

export default function DatabaseManagement() {
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableData, setTableData] = useState(null)
  const [sqlQuery, setSqlQuery] = useState('')
  const [queryResult, setQueryResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dbInfo, setDbInfo] = useState(null)

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
        setTables(data.data.map(table => table.name))
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
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('加载表数据失败')
    } finally {
      setLoading(false)
    }
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
          {loading && !selectedTable ? (
            <div className="table-loading">
              <Loading text="正在加载表列表..." size="medium" />
            </div>
          ) : (
            <ul>
              {tables.map(table => (
                <li 
                  key={table} 
                  className={selectedTable === table ? 'active' : ''}
                  onClick={() => loadTableData(table)}
                >
                  {table}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 表数据 */}
        <div className="table-data">
          {selectedTable && (
            <div>
              <h2>{selectedTable} 表</h2>
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
    </div>
  )
}