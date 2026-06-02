import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

const VALID_WIDGET_IDS = ['weather', 'exchange', 'news', 'stock', 'crypto', 'calendar', 'rss', 'budget']

// GET /api/widget_settings          — 전체 설정 반환
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('widget_settings')
      .select('*')
      .order('widget_id', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (e) { next(e) }
})

// GET /api/widget_settings/:widget_id
router.get('/:widget_id', async (req, res, next) => {
  try {
    const { widget_id } = req.params
    const { data, error } = await supabase
      .from('widget_settings')
      .select('*')
      .eq('widget_id', widget_id)
      .single()

    // PGRST116 = row not found → 빈 설정 반환
    if (error && error.code !== 'PGRST116') throw error
    res.json(data ?? { widget_id, settings: {} })
  } catch (e) { next(e) }
})

// PUT /api/widget_settings/:widget_id  — UPSERT
// body: { settings: { ... } }
router.put('/:widget_id', async (req, res, next) => {
  try {
    const { widget_id } = req.params
    const { settings }  = req.body

    if (settings === undefined || typeof settings !== 'object')
      return res.status(400).json({ error: 'settings object is required' })

    const { data, error } = await supabase
      .from('widget_settings')
      .upsert({ widget_id, settings }, { onConflict: 'widget_id' })
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (e) { next(e) }
})

// PATCH /api/widget_settings/:widget_id  — settings 일부만 머지
// body: { settings: { city: "Incheon" } }  ← 기존 settings에 병합
router.patch('/:widget_id', async (req, res, next) => {
  try {
    const { widget_id } = req.params
    const patch = req.body.settings

    if (!patch || typeof patch !== 'object')
      return res.status(400).json({ error: 'settings object is required' })

    // 기존 값 조회 후 병합
    const { data: current } = await supabase
      .from('widget_settings')
      .select('settings')
      .eq('widget_id', widget_id)
      .single()

    const merged = { ...(current?.settings ?? {}), ...patch }

    const { data, error } = await supabase
      .from('widget_settings')
      .upsert({ widget_id, settings: merged }, { onConflict: 'widget_id' })
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (e) { next(e) }
})

export default router
