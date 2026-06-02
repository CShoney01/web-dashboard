import express from 'express'
import helmet from 'helmet'
import cors from 'cors'

import todosRouter          from './routes/todos.js'
import memosRouter          from './routes/memos.js'
import bookmarksRouter      from './routes/bookmarks.js'
import stocksRouter         from './routes/stocks.js'
import cryptosRouter        from './routes/cryptos.js'
import budgetRouter         from './routes/budget.js'
import rssRouter            from './routes/rss.js'
import widgetSettingsRouter from './routes/widgetSettings.js'

const app  = express()
const PORT = process.env.API_PORT ?? 4000

// ── Middleware ────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

// ── Routes ───────────────────────────────────────────────────
app.use('/api/todos',           todosRouter)
app.use('/api/memos',           memosRouter)
app.use('/api/bookmarks',       bookmarksRouter)
app.use('/api/stocks',          stocksRouter)
app.use('/api/cryptos',         cryptosRouter)
app.use('/api/budget_expenses', budgetRouter)
app.use('/api/rss_feeds',       rssRouter)
app.use('/api/widget_settings', widgetSettingsRouter)

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message ?? 'Internal server error' })
})

app.listen(PORT, () => console.log(`API server running on port ${PORT}`))
