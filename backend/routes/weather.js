import { Router } from 'express'
import axios from 'axios'

const router = Router()
const API_KEY = process.env.WEATHER_API_KEY

router.get('/', async (req, res, next) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: 'WEATHER_API_KEY not configured' })
    const city = req.query.city || 'Seoul'
    const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { q: city, appid: API_KEY, units: 'metric', lang: 'kr' },
    })
    res.json(data)
  } catch (e) { next(e) }
})

export default router
