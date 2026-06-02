import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID ?? null })
})

export default router
