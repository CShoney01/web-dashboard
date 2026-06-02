import { Router } from 'express'
import axios from 'axios'

const router = Router()
const API_KEY = process.env.COINGECKO_API_KEY

router.get('/', async (req, res, next) => {
  try {
    const headers = API_KEY ? { 'x-cg-demo-api-key': API_KEY } : {}
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      headers,
      params: { ids: 'bitcoin,ethereum', vs_currencies: 'krw', include_24hr_change: 'true' },
    })
    res.json(data)
  } catch (e) { next(e) }
})

export default router
