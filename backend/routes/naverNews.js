import { Router } from 'express'
import axios from 'axios'

const router = Router()
const CLIENT_ID     = process.env.NAVER_CLIENT_ID
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET

router.get('/', async (req, res, next) => {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET)
      return res.status(503).json({ error: 'NAVER credentials not configured' })
    const query = req.query.query || '최신'
    const { data } = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      params: { query, display: 1, sort: 'date' },
      headers: { 'X-Naver-Client-Id': CLIENT_ID, 'X-Naver-Client-Secret': CLIENT_SECRET },
    })
    res.json(data)
  } catch (e) { next(e) }
})

export default router
