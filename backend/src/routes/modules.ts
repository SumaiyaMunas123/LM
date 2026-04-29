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
    const gradeId = req.query.gradeId as string | undefined

    let query = supabase
      .from('modules')
      .select('id, grade_id, title, code, description, icon, display_order')
      .order('display_order', { ascending: true })

    if (gradeId) {
      query = query.eq('grade_id', gradeId)
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

export default router
