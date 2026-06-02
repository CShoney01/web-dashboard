import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/bookmarks
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (e) { next(e) }
})

// POST /api/bookmarks
router.post('/', async (req, res, next) => {
  try {
    const { title, url } = req.body
    if (!url?.trim()) return res.status(400).json({ error: 'url is required' })

    // sort_order = 현재 최대값 + 1
    const { count } = await supabase.from('bookmarks').select('*', { count: 'exact', head: true })

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({ title: title?.trim() || url.trim(), url: url.trim(), sort_order: count ?? 0 })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) { next(e) }
})

// PATCH /api/bookmarks/:id  — title, url, sort_order
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = {}
    if (req.body.title      !== undefined) allowed.title      = req.body.title
    if (req.body.url        !== undefined) allowed.url        = req.body.url
    if (req.body.sort_order !== undefined) allowed.sort_order = req.body.sort_order

    const { data, error } = await supabase
      .from('bookmarks')
      .update(allowed)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (e) { next(e) }
})

// DELETE /api/bookmarks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('bookmarks').delete().eq('id', req.params.id)
    if (error) throw error
    res.status(204).end()
  } catch (e) { next(e) }
})

export default router
