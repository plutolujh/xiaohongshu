import { useState, useEffect } from 'react'
import { getHeaders } from '../utils/db'
import './DatabaseManagement.css'

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
      const res = await fetch('/api/db/info', {
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setDbInfo(data)
      }
    } catch (err) {
      console.error('加载数据库信息失败:', err)
    }
  }

  const loadTables = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/db/tables', {
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setTables(data.tables)
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
      const res = await fetch(`/api/db/table/${tableName}`, {
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setSelectedTable(tableName)
        setTableData(data)
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
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ sql: sqlQuery })
      })
      const data = await res.json()
      if (data.success) {
        setQueryResult(data)
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
            <strong>数据库文件路径:</strong> {dbInfo.dbPath}
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
            <div className="loading">加载中...</div>
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
                <div className="loading">加载中...</div>
              ) : tableData ? (
                <div>
                  <div className="table-info">
                    <h3>表结构</h3>
                    <table className="structure-table">
                      <thead>
                        <tr>
                          <th>字段名</th>
                          <th>类型</th>
                          <th>是否为空</th>
                          <th>默认值</th>
                          <th>主键</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.columns.map(column => (
                          <tr key={column.cid}>
                            <td>{column.name}</td>
                            <td>{column.type}</td>
                            <td>{column.notnull ? '否' : '是'}</td>
                            <td>{column.dflt_value || '-'}</td>
                            <td>{column.pk ? '是' : '否'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-rows">
                    <h3>表数据</h3>
                    {tableData.rows.length > 0 ? (
                      <table className="data-table">
                        <thead>
                          <tr>
                            {tableData.columns.map(column => (
                              <th key={column.cid}>{column.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.rows.map((row, index) => (
                            <tr key={index}>
                              {row.map((value, colIndex) => (
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
              {loading ? '执行中...' : '执行'}
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