import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

const VALID_CATEGORIES = ['식비', '교통', '쇼핑', '의료', '오락', '주거', '기타']

// GET /api/budget_expenses?year=2026&month=6
// year+month 없으면 전체 반환
router.get('/', async (req, res, next) => {
  try {
    const { year, month } = req.query
    let query = supabase
      .from('budget_expenses')
      .select('*')
      .order('date', { ascending: false })

    if (year && month) {
      const y = parseInt(year,  10)
      const m = parseInt(month, 10)
      if (isNaN(y) || isNaN(m) || m < 1 || m > 12)
        return res.status(400).json({ error: 'Invalid year or month' })

      const start = `${y}-${String(m).padStart(2, '0')}-01`
      const end   = new Date(y, m, 0).toISOString().slice(0, 10)  // 말일
      query = query.gte('date', start).lte('date', end)
    }

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (e) { next(e) }
})

// POST /api/budget_expenses
router.post('/', async (req, res, next) => {
  try {
    const { date, category, amount, memo } = req.body

    if (!date)                             return res.status(400).json({ error: 'date is required' })
    if (!VALID_CATEGORIES.includes(category))
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` })
    if (!amount || Number(amount) <= 0)    return res.status(400).json({ error: 'amount must be > 0' })

    const { data, error } = await supabase
      .from('budget_expenses')
      .insert({ date, category, amount: Number(amount), memo: memo ?? null })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) { next(e) }
})

// DELETE /api/budget_expenses/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('budget_expenses').delete().eq('id', req.params.id)
    if (error) throw error
    res.status(204).end()
  } catch (e) { next(e) }
})

export default router
