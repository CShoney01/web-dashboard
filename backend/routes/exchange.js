import { Router } from 'express'
import axios from 'axios'

const router = Router()
const API_KEY = process.env.EXCHANGE_API_KEY

router.get('/', async (req, res, next) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: 'EXCHANGE_API_KEY not configured' })
    const base = req.query.base || 'USD'
    const { data } = await axios.get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${base}`)
    res.json({ rates: data.conversion_rates, base })
  } catch (e) { next(e) }
})

export default router
