import { Router } from 'express'
import axios from 'axios'

const router = Router()
const TIMEOUT = 8000

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

// GET /api/stock-price/search?query=삼성전자 — 종목명 검색
router.get('/search', async (req, res, next) => {
  try {
    const { query } = req.query
    if (!query) return res.status(400).json({ error: 'query is required' })

    const { data } = await axios.get('https://query1.finance.yahoo.com/v1/finance/search', {
      timeout: TIMEOUT,
      headers: YF_HEADERS,
      params: { q: query, lang: 'ko', region: 'KR', quotesCount: 10, newsCount: 0 },
    })

    const results = (data.quotes ?? [])
      .filter(q => q.symbol && (q.symbol.endsWith('.KS') || q.symbol.endsWith('.KQ')))
      .map(q => ({ symbol: q.symbol, name: q.shortname || q.longname || q.symbol, exchange: q.symbol.endsWith('.KS') ? 'KOSPI' : 'KOSDAQ' }))

    res.json(results)
  } catch (e) { next(e) }
})

// GET /api/stock-price/quote?symbol=005930.KS — 시세 조회 (chart API)
router.get('/quote', async (req, res, next) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol is required' })

    const { data } = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      timeout: TIMEOUT,
      headers: YF_HEADERS,
      params: { interval: '1d', range: '1d' },
    })

    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return res.status(404).json({ error: '시세 데이터 없음' })

    const price     = meta.regularMarketPrice
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price
    const change    = price - prevClose
    const changeRate = (change / prevClose) * 100

    res.json({
      symbol:     meta.symbol,
      price,
      change,
      changeRate,
      market:     meta.fullExchangeName,
    })
  } catch (e) { next(e) }
})

export default router
