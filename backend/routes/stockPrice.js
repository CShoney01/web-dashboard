import { Router } from 'express'
import axios from 'axios'

const router = Router()
const API_KEY  = process.env.KRX_API_KEY
const BASE_URL = 'https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo'
const TIMEOUT  = 6000  // KRX API 요청당 최대 6초

function toItems(raw) {
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

function weekdayDate(daysBack = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
}

// GET /api/stock-price?name=삼성전자 — 특정 종목 시세 조회
router.get('/price', async (req, res, next) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: 'KRX_API_KEY not configured' })
    const { name } = req.query
    if (!name) return res.status(400).json({ error: 'name is required' })

    for (let i = 0; i <= 2; i++) {
      const { data } = await axios.get(BASE_URL, {
        timeout: TIMEOUT,
        params: { serviceKey: API_KEY, numOfRows: 5, pageNo: 1, resultType: 'json', itmsNm: name, basDt: weekdayDate(i) },
      })
      console.log(`[KRX price] name=${name} i=${i} resultCode=${data?.response?.header?.resultCode} items=${JSON.stringify(data?.response?.body?.items)}`)
      const match = toItems(data?.response?.body?.items?.item).find(it => it.itmsNm === name)
      if (match) return res.json(match)
    }
    res.status(404).json({ error: '종목 데이터를 찾을 수 없습니다' })
  } catch (e) { next(e) }
})

// 서버 내 캐시 (하루치)
let _cache = null

// GET /api/stock-price/search?query=삼성 — 종목명 검색
router.get('/search', async (req, res, next) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: 'KRX_API_KEY not configured' })
    const { query } = req.query
    if (!query) return res.status(400).json({ error: 'query is required' })

    const today = weekdayDate(0)
    if (!_cache || _cache.date !== today) {
      for (let i = 0; i <= 2; i++) {
        const basDt = weekdayDate(i)
        const { data } = await axios.get(BASE_URL, {
          timeout: TIMEOUT,
          params: { serviceKey: API_KEY, numOfRows: 3000, pageNo: 1, resultType: 'json', basDt },
        })
        const items = toItems(data?.response?.body?.items?.item)
        if (items.length > 0) { _cache = { date: basDt, items }; break }
      }
    }

    const results = (_cache?.items ?? []).filter(it => it.itmsNm?.includes(query.trim()))
    res.json(results)
  } catch (e) { next(e) }
})

export default router
