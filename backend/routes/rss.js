import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/rss_feeds
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rss_feeds')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (e) { next(e) }
})

// POST /api/rss_feeds
router.post('/', async (req, res, next) => {
  try {
    const { url, name } = req.body
    if (!url?.trim()) return res.status(400).json({ error: 'url is required' })

    const { count } = await supabase.from('rss_feeds').select('*', { count: 'exact', head: true })

    const { data, error } = await supabase
      .from('rss_feeds')
      .insert({ url: url.trim(), name: name?.trim() || url.trim(), sort_order: count ?? 0 })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) { next(e) }
})

// PATCH /api/rss_feeds/:id  — name, sort_order 수정
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = {}
    if (req.body.name       !== undefined) allowed.name       = req.body.name
    if (req.body.sort_order !== undefined) allowed.sort_order = req.body.sort_order

    const { data, error } = await supabase
      .from('rss_feeds')
      .update(allowed)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (e) { next(e) }
})

// DELETE /api/rss_feeds/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('rss_feeds').delete().eq('id', req.params.id)
    if (error) throw error
    res.status(204).end()
  } catch (e) { next(e) }
})

export default router
