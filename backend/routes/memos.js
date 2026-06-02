import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/memos
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (e) { next(e) }
})

// POST /api/memos
router.post('/', async (req, res, next) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' })

    const { data, error } = await supabase
      .from('memos')
      .insert({ content: content.trim() })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) { next(e) }
})

// PATCH /api/memos/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' })

    const { data, error } = await supabase
      .from('memos')
      .update({ content: content.trim() })
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (e) { next(e) }
})

// DELETE /api/memos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('memos').delete().eq('id', req.params.id)
    if (error) throw error
    res.status(204).end()
  } catch (e) { next(e) }
})

export default router
