import { useI18n } from '../context/I18nContext'
import { t } from '../i18n/i18n'
import './Changelog.css'

export default function Changelog() {
  const { language } = useI18n()

  return (
    <div className="changelog-container">
      <div className="changelog-header">
        <h1>{t('changelog.title', language)}</h1>
        <p className="changelog-date">{t('changelog.generateDate', language)}: 2026-04-08</p>
        <p className="changelog-project">{t('changelog.project', language)}: 小红书美食分享 (xiaohongshu-food-share)</p>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.overview', language)}</h2>
        <p>{t('changelog.overviewContent', language)}</p>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.securityFixes', language)}</h2>
        
        <div className="changelog-item">
          <h3>1.1 {t('changelog.idorVulnerability', language)} ({t('changelog.severity', language)}: {t('changelog.severe', language)})</h3>
          <p><strong>{t('changelog.problem', language)}:</strong> {t('changelog.idorProblem', language)}</p>
          <p><strong>{t('changelog.fixLocation', language)}:</strong> server.js</p>
          <p><strong>{t('changelog.fixContent', language)}:</strong></p>
          <ul>
            <li>PUT /api/users/:id - {t('changelog.addUserAuth', language)}</li>
            <li>PUT /api/users/:id/password - {t('changelog.addUserAuth', language)}</li>
            <li>PUT /api/notes/:id - {t('changelog.addNoteAuthorAuth', language)}</li>
            <li>DELETE /api/notes/:id - {t('changelog.addNoteAuthorAuth', language)}</li>
            <li>DELETE /api/comments/:id - {t('changelog.addCommentAuthorAuth', language)}</li>
          </ul>
          <pre className="code-block">{'// ' + t('changelog.fixExample', language) + '\nconst currentUserId = req.user.userId\nconst targetUserId = req.params.id\nif (currentUserId !== targetUserId) {\n  return res.status(403).json({ success: false, message: \'' + t('changelog.noPermission', language) + '\' })\n}'}</pre>
        </div>

        <div className="changelog-item">
          <h3>1.2 {t('changelog.rateLimiting', language)} ({t('changelog.severity', language)}: {t('changelog.high', language)})</h3>
          <p><strong>{t('changelog.problem', language)}:</strong> {t('changelog.rateLimitProblem', language)}</p>
          <p><strong>{t('changelog.fix', language)}:</strong></p>
          <ul>
            <li>{t('changelog.installRateLimit', language)} express-rate-limit {t('changelog.dependency', language)}</li>
            <li>{t('changelog.addGeneralLimiter', language)}: {t('changelog.generalLimiterDesc', language)}</li>
            <li>{t('changelog.addAuthLimiter', language)}: {t('changelog.authLimiterDesc', language)}</li>
          </ul>
          <p><strong>{t('changelog.fixLocation', language)}:</strong> server.js:182-199</p>
          <pre className="code-block">{`const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: '${t('changelog.rateLimitMessage', language)}' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: '${t('changelog.rateLimitMessage', language)}' }
})`}</pre>
        </div>

        <div className="changelog-item">
          <h3>1.3 CORS {t('changelog.security', language)} ({t('changelog.severity', language)}: {t('changelog.high', language)})</h3>
          <p><strong>{t('changelog.problem', language)}:</strong> {t('changelog.corsProblem', language)}</p>
          <p><strong>{t('changelog.fixLocation', language)}:</strong> server.js:163-177</p>
          <p><strong>{t('changelog.fixContent', language)}:</strong></p>
          <ul>
            <li>{t('changelog.corsFixContent1', language)}</li>
            <li>{t('changelog.corsFixContent2', language)}</li>
          </ul>
          <pre className="code-block">{`const allowedOrigins = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : []  // ${t('changelog.corsProductionNote', language)}
  : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003']

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.error('${t('changelog.corsErrorMessage', language)}')
}`}</pre>
        </div>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.dataPerformance', language)}</h2>
        
        <div className="changelog-item">
          <h3>2.1 {t('changelog.databaseIndex', language)} ({t('changelog.severity', language)}: {t('changelog.high', language)})</h3>
          <p><strong>{t('changelog.problem', language)}:</strong> {t('changelog.dbIndexProblem', language)}</p>
          <p><strong>{t('changelog.fixLocation', language)}:</strong> server.js:351-360</p>
          <p><strong>{t('changelog.fixContent', language)}:</strong> {t('changelog.dbIndexFixContent', language)}</p>
          <pre className="code-block">{`CREATE INDEX idx_notes_author_id ON notes(author_id)
CREATE INDEX idx_notes_created_at ON notes(created_at DESC)
CREATE INDEX idx_comments_note_id ON comments(note_id)
CREATE INDEX idx_comments_user_id ON comments(user_id)
CREATE INDEX idx_feedback_user_id ON feedback(user_id)
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id)
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id)`}</pre>
        </div>

        <div className="changelog-item">
          <h3>2.2 {t('changelog.paginationLimit', language)} ({t('changelog.severity', language)}: {t('changelog.high', language)})</h3>
          <p><strong>{t('changelog.problem', language)}:</strong> {t('changelog.paginationProblem', language)}</p>
          <p><strong>{t('changelog.fixLocation', language)}:</strong> server.js:683-685</p>
          <pre className="code-block">{`let limit = parseInt(req.query.limit) || 10
limit = Math.min(Math.max(limit, 1), 100)`}</pre>
        </div>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.errorHandling', language)}</h2>
        
        <div className="changelog-item">
          <h3>3.1 API {t('changelog.silentFailure', language)} ({t('changelog.severity', language)}: {t('changelog.medium', language)})</h3>
          <p><strong>{t('changelog.problem', language)}:</strong> {t('changelog.silentFailureProblem', language)}</p>
          <p><strong>{t('changelog.fixLocation', language)}:</strong> server.js:708,1168</p>
          <pre className="code-block">{`// ${t('changelog.beforeFix', language)}
res.json({ notes: [], total: 0, page, limit })

// ${t('changelog.afterFix', language)}
res.status(500).json({ success: false, message: e.message, notes: [], total: 0, page, limit })`}</pre>
        </div>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.configEncryption', language)}</h2>
        
        <div className="changelog-item">
          <h3>4.1 bcrypt {t('changelog.rounds', language)} ({t('changelog.severity', language)}: {t('changelog.medium', language)})</h3>
          <p><strong>{t('changelog.problem', language)}:</strong> bcrypt {t('changelog.roundsProblem', language)}</p>
          <p><strong>{t('changelog.fix', language)}:</strong> {t('changelog.roundsFix', language)}</p>
        </div>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.productionConfig', language)}</h2>
        
        <div className="changelog-item">
          <h3>5.1 {t('changelog.productionTemplate', language)}</h3>
          <p><strong>{t('changelog.newFile', language)}:</strong> .env.production</p>
          <pre className="code-block">{`# ${t('changelog.productionTemplate', language)}
NODE_ENV=production
PORT=3004
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your-secure-jwt-secret-key-here
DATABASE_URL=postgresql://user:password@host:port/database`}</pre>
        </div>

        <div className="changelog-item">
          <h3>5.2 PM2 {t('changelog.processManagement', language)}</h3>
          <p><strong>{t('changelog.newFile', language)}:</strong> ecosystem.config.js</p>
          <p><strong>{t('changelog.features', language)}:</strong></p>
          <ul>
            <li>{t('changelog.multiProcessLoadBalance', language)}</li>
            <li>{t('changelog.autoRestart', language)}</li>
            <li>{t('changelog.logRotation', language)} (7{t('changelog.days', language)}, 10MB)</li>
            <li>{t('changelog.memoryLimit', language)} (500MB)</li>
          </ul>
          <p><strong>{t('changelog.newNpmScripts', language)}:</strong></p>
          <ul>
            <li>pm2:start - {t('changelog.start', language)}</li>
            <li>pm2:stop - {t('changelog.stop', language)}</li>
            <li>pm2:restart - {t('changelog.restart', language)}</li>
            <li>pm2:logs - {t('changelog.viewLogs', language)}</li>
            <li>pm2:monit - {t('changelog.realtimeMonitor', language)}</li>
          </ul>
        </div>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.newDependencies', language)}</h2>
        <pre className="code-block">{`{
  "dependencies": {
    "express-rate-limit": "^8.3.2"
  },
  "devDependencies": {
    "pm2": "^6.0.14"
  }
}`}</pre>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.checklist', language)}</h2>
        
        <h3>{t('changelog.preLaunchConfig', language)}</h3>
        <ul className="checklist">
          <li><input type="checkbox" readOnly /> {t('changelog.copyEnvProduction', language)}</li>
          <li><input type="checkbox" readOnly /> {t('changelog.setFrontendUrl', language)}</li>
          <li><input type="checkbox" readOnly /> {t('changelog.generateJwtSecret', language)} (openssl rand -hex 64)</li>
          <li><input type="checkbox" readOnly /> {t('changelog.configDatabaseUrl', language)}</li>
          <li><input type="checkbox" readOnly /> {t('changelog.buildFrontend', language)}</li>
        </ul>

        <h3>{t('changelog.verificationSteps', language)}</h3>
        <ol>
          <li>{t('changelog.startBackend', language)}: npm run server {t('changelog.or', language)} npm run pm2:start</li>
          <li>{t('changelog.checkCorsWarning', language)}</li>
          <li>{t('changelog.testRateLimit', language)}</li>
          <li>{t('changelog.verifyIdor', language)}</li>
          <li>{t('changelog.checkDbIndex', language)}</li>
        </ol>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.optimization', language)}</h2>
        <ul>
          <li>{t('changelog.tokenExpiry', language)} ({t('changelog.current', language)} 7 {t('changelog.days', language)}, {t('changelog.suggest', language)} 2 {t('changelog.hours', language)})</li>
          <li>{t('changelog.addHttps', language)}</li>
          <li>{t('changelog.userEnumProtection', language)}</li>
          <li>{t('changelog.frontendErrorDisplay', language)}</li>
        </ul>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.modifiedFiles', language)}</h2>
        <table className="file-table">
          <thead>
            <tr>
              <th>{t('changelog.file', language)}</th>
              <th>{t('changelog.operation', language)}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>server.js</td>
              <td>{t('changelog.modify', language)}</td>
            </tr>
            <tr>
              <td>package.json</td>
              <td>{t('changelog.modify', language)}</td>
            </tr>
            <tr>
              <td>.env.production</td>
              <td>{t('changelog.add', language)}</td>
            </tr>
            <tr>
              <td>ecosystem.config.js</td>
              <td>{t('changelog.add', language)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="changelog-section">
        <h2>{t('changelog.rollback', language)}</h2>
        <p>{t('changelog.rollbackDesc', language)}:</p>
        <pre className="code-block">{`git checkout -- server.js package.json
git checkout HEAD -- .
# ${t('changelog.removeNewDeps', language)}
npm uninstall express-rate-limit
npm uninstall -D pm2`}</pre>
      </div>
    </div>
  )
}
