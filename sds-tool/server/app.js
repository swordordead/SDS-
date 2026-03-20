const express = require('express')
const path = require('path')
const cors = require('cors')
const rateLimit = require('express-rate-limit')

const uploadRouter = require('./routes/upload')
const generateRouter = require('./routes/generate')
const batchRouter = require('./routes/batch')
const aiFillRouter = require('./routes/aiFill')

const app = express()
const PORT = process.env.PORT || 3100

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false // 生产环境：同源，不需要 CORS
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ── Rate Limiting ──────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 60,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 20, // AI 接口限制更严格
  message: { error: 'AI 请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/upload', apiLimiter, uploadRouter)
app.use('/api/generate', apiLimiter, generateRouter)
app.use('/api/batch', apiLimiter, batchRouter)
app.use('/api/ai-fill', aiLimiter, aiFillRouter)

// ── 健康检查 ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    aiEnabled: !!process.env.GEMINI_API_KEY,
  })
})

// ── 静态文件 & SPA Fallback ─────────────────────────────────────
const publicDir = path.join(__dirname, 'public')
app.use(express.static(publicDir))

// SPA fallback: 所有非 API 路由返回 index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next()
  }
  const indexPath = path.join(publicDir, 'index.html')
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(404).json({ error: '页面不存在' })
    }
  })
})

// ── 全局错误处理 ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]', err)
  res.status(500).json({ error: err.message || '服务器内部错误' })
})

// ── 启动服务 ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 SDS Tool Server running at http://localhost:${PORT}`)
  console.log(`   AI 功能: ${process.env.GEMINI_API_KEY ? '✅ 已配置' : '⚠️  未配置 GEMINI_API_KEY'}`)
  console.log(`   环境: ${process.env.NODE_ENV || 'development'}\n`)
})

module.exports = app
