import { Router } from 'express'
import multer from 'multer'
import { supabaseAdmin, createUserSupabaseClient } from '../config/supabase'
import { extractBearerToken } from '../utils/auth'
import { STORAGE_BUCKET, ADMIN_EMAILS } from '../config/env'

const router = Router()
const upload = multer()

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const token = extractBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Missing bearer token' })

    // simple admin check: if ADMIN_EMAILS set, require user's email to be in the list
    const userClient = createUserSupabaseClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr) return res.status(403).json({ error: 'Unable to verify user' })
    const user = userData?.user
    if (ADMIN_EMAILS.length && (!user || !user.email || !ADMIN_EMAILS.includes(user.email))) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const file = (req as any).file
    if (!file) return res.status(400).json({ error: 'file is required (multipart form-data field "file")' })

    const { unit_id, title, kind, display_order } = req.body

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `resources/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype })

    if (uploadErr) return res.status(500).json({ error: uploadErr.message })

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('resources')
      .insert([
        {
          unit_id: unit_id || null,
          kind: kind || 'file',
          title: title || file.originalname,
          storage_path: path,
          mime: file.mimetype,
          size: file.size,
          display_order: display_order ? Number(display_order) : null,
          status: 'uploaded',
          uploaded_by: user?.id || null,
        },
      ])
      .select()

    if (insertErr) return res.status(500).json({ error: insertErr.message })

    res.json({ ok: true, resource: inserted?.[0] })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

export default router
