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
    const { data, error } = await supabase.from('grades').select('*').order('display_order', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

export default router
