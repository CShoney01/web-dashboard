import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/todos
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (e) { next(e) }
})

// POST /api/todos
router.post('/', async (req, res, next) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' })

    const { data, error } = await supabase
      .from('todos')
      .insert({ text: text.trim() })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) { next(e) }
})

// PATCH /api/todos/:id  — text, done 부분 수정
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const allowed = {}
    if (req.body.text  !== undefined) allowed.text = req.body.text
    if (req.body.done  !== undefined) allowed.done = req.body.done

    const { data, error } = await supabase
      .from('todos')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (e) { next(e) }
})

// DELETE /api/todos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('todos').delete().eq('id', req.params.id)
    if (error) throw error
    res.status(204).end()
  } catch (e) { next(e) }
})

export default router
