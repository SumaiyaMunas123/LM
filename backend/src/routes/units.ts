import { Router } from 'express'
import { createUserSupabaseClient } from '../config/supabase'
import { extractBearerToken } from '../utils/auth'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' })
    }

    const supabase = createUserSupabaseClient(token)
    const moduleId = req.query.moduleId as string | undefined
    if (!moduleId) {
      return res.status(400).json({ error: 'moduleId query param is required' })
    }

    const { data, error } = await supabase
      .from('units')
      .select('id, module_id, title, description, display_order')
      .eq('module_id', moduleId)
      .order('display_order', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

router.get('/:unitId/resources', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' })
    }

    const supabase = createUserSupabaseClient(token)
    const { unitId } = req.params
    const { data, error } = await supabase
      .from('resources')
      .select('id, unit_id, kind, title, description, external_url, display_order, duration_seconds')
      .eq('unit_id', unitId)
      .order('display_order', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

export default router
