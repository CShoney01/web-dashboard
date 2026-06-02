import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/cryptos
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('cryptos')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (e) { next(e) }
})

// POST /api/cryptos
router.post('/', async (req, res, next) => {
  try {
    const { coin_id, name, symbol } = req.body
    if (!coin_id?.trim() || !name?.trim() || !symbol?.trim())
      return res.status(400).json({ error: 'coin_id, name, symbol are required' })

    const { count } = await supabase.from('cryptos').select('*', { count: 'exact', head: true })
    const { data, error } = await supabase
      .from('cryptos')
      .insert({
        coin_id: coin_id.trim(),
        name:    name.trim(),
        symbol:  symbol.trim().toUpperCase(),
        sort_order: count ?? 0,
      })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) { next(e) }
})

// ─ /reorder는 반드시 /:id 앞에 위치해야 함 ─────────────────────
// PATCH /api/cryptos/reorder
router.patch('/reorder', async (req, res, next) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' })

    const results = await Promise.all(
      ids.map((id, index) =>
        supabase.from('cryptos').update({ sort_order: index }).eq('id', id)
      )
    )
    const failed = results.find(r => r.error)
    if (failed) throw failed.error
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// PATCH /api/cryptos/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = {}
    if (req.body.qty        !== undefined) allowed.qty        = req.body.qty
    if (req.body.avg_price  !== undefined) allowed.avg_price  = req.body.avg_price
    if (req.body.sort_order !== undefined) allowed.sort_order = req.body.sort_order

    const { data, error } = await supabase
      .from('cryptos')
      .update(allowed)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (e) { next(e) }
})

// DELETE /api/cryptos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('cryptos').delete().eq('id', req.params.id)
    if (error) throw error
    res.status(204).end()
  } catch (e) { next(e) }
})

export default router
