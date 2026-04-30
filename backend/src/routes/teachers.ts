import { Router } from 'express'
import { supabaseAdmin, createUserSupabaseClient } from '../config/supabase'
import { extractBearerToken } from '../utils/auth'
import { ADMIN_EMAILS } from '../config/env'

const router = Router()

// Helper: verify admin access
async function verifyAdmin(token: string | null) {
  if (!token) return { ok: false, user: null, error: 'Missing bearer token' }
  const userClient = createUserSupabaseClient(token)
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr) return { ok: false, user: null, error: 'Unable to verify user' }
  const user = userData?.user
  if (ADMIN_EMAILS.length && (!user || !user.email || !ADMIN_EMAILS.includes(user.email))) {
    return { ok: false, user: null, error: 'Admin access required' }
  }
  return { ok: true, user }
}

// List all teachers
router.get('/', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Missing bearer token' })

    const userClient = createUserSupabaseClient(token)
    const { data, error } = await userClient
      .from('profiles')
      .select('id, full_name, avatar_url, role, phone, created_at')
      .eq('role', 'teacher')
      .order('full_name', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    res.json({ teachers: data })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

// Get single teacher
router.get('/:id', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Missing bearer token' })

    const userClient = createUserSupabaseClient(token)
    const { id } = req.params

    const { data: teacher, error: fetchErr } = await userClient
      .from('profiles')
      .select('id, full_name, avatar_url, role, phone, created_at')
      .eq('id', id)
      .eq('role', 'teacher')
      .single()

    if (fetchErr) return res.status(404).json({ error: 'Teacher not found' })

    // Get assigned modules
    const { data: modules, error: modulesErr } = await userClient
      .from('teacher_modules')
      .select('module_id, modules(id, title, code, grade_id)')
      .eq('teacher_id', id)

    if (modulesErr) return res.status(500).json({ error: modulesErr.message })

    res.json({ teacher, assigned_modules: modules })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

// Create/update teacher profile (admin only)
router.post('/', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    const auth = await verifyAdmin(token)
    if (!auth.ok) return res.status(403).json({ error: auth.error })

    const { id, full_name, avatar_url, phone } = req.body

    if (!id || !full_name) {
      return res.status(400).json({ error: 'id and full_name are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert([
        {
          id,
          full_name,
          avatar_url: avatar_url || null,
          phone: phone || null,
          role: 'teacher',
        },
      ])
      .select()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true, teacher: data?.[0] })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

// Assign teacher to module (admin only)
router.post('/:teacherId/assign/:moduleId', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    const auth = await verifyAdmin(token)
    if (!auth.ok) return res.status(403).json({ error: auth.error })

    const { teacherId, moduleId } = req.params

    const { data, error } = await supabaseAdmin
      .from('teacher_modules')
      .insert([{ teacher_id: teacherId, module_id: moduleId }])
      .select()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is duplicate key error, which is ok
      if (!error.message.includes('duplicate')) return res.status(500).json({ error: error.message })
    }

    res.json({ ok: true, message: 'Teacher assigned to module' })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

// Remove teacher from module (admin only)
router.delete('/:teacherId/assign/:moduleId', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    const auth = await verifyAdmin(token)
    if (!auth.ok) return res.status(403).json({ error: auth.error })

    const { teacherId, moduleId } = req.params

    const { error } = await supabaseAdmin
      .from('teacher_modules')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('module_id', moduleId)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true, message: 'Teacher removed from module' })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

export default router
