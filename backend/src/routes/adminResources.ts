import { Router } from 'express'
import { randomUUID } from 'crypto'
import multer from 'multer'
import { supabaseAdmin, createUserSupabaseClient } from '../config/supabase'
import { extractBearerToken } from '../utils/auth'
import { STORAGE_BUCKET, ADMIN_EMAILS } from '../config/env'

const router = Router()
const upload = multer()
const ALLOWED_RESOURCE_KINDS = new Set(['tute', 'paper', 'video'])

function normalizeKind(value: unknown) {
  const kind = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return ALLOWED_RESOURCE_KINDS.has(kind) ? kind : 'tute'
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function buildStoragePath(fileName: string) {
  return `resources/${Date.now()}_${randomUUID()}_${sanitizeFileName(fileName)}`
}

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

    const { unit_id, title, kind, display_order, description } = req.body

    const path = buildStoragePath(file.originalname)

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype })

    if (uploadErr) return res.status(500).json({ error: uploadErr.message })

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('resources')
      .insert([
        {
          unit_id: unit_id || null,
          kind: normalizeKind(kind),
          title: title || file.originalname,
          description: description || null,
          storage_path: path,
          mime: file.mimetype,
          size: file.size,
          display_order: display_order ? Number(display_order) : 0,
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

// Start direct upload: create signed upload URL for the client to upload directly to storage
router.post('/upload/initiate', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    const auth = await verifyAdmin(token)
    if (!auth.ok) return res.status(403).json({ error: auth.error })

    const { fileName, mimeType, size, unit_id, title, kind, display_order, description } = req.body || {}

    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'fileName is required' })
    }

    const storagePath = buildStoragePath(fileName)
    const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).createSignedUploadUrl(storagePath)

    if (error) return res.status(500).json({ error: error.message })

    res.json({
      ok: true,
      upload: {
        path: storagePath,
        token: data?.token,
        signedUrl: data?.signedUrl,
      },
      resourceDraft: {
        unit_id: unit_id || null,
        title: title || fileName,
        description: description || null,
        kind: normalizeKind(kind),
        display_order: Number(display_order || 0),
        mime: mimeType || null,
        size: typeof size === 'number' ? size : null,
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

// Complete direct upload: verify uploaded object and insert resource row
router.post('/upload/complete', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    const auth = await verifyAdmin(token)
    if (!auth.ok) return res.status(403).json({ error: auth.error })

    const { path, unit_id, title, description, kind, display_order, mime, size } = req.body || {}
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'path is required' })
    }

    // Verifies object exists in storage before DB insert
    const { error: verifyErr } = await supabaseAdmin.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60)
    if (verifyErr) {
      return res.status(400).json({ error: 'Uploaded object not found in storage' })
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('resources')
      .insert([
        {
          unit_id: unit_id || null,
          kind: normalizeKind(kind),
          title: typeof title === 'string' && title.trim() ? title.trim() : 'Untitled Resource',
          description: typeof description === 'string' ? description : null,
          storage_path: path,
          mime: typeof mime === 'string' ? mime : null,
          size: typeof size === 'number' ? size : null,
          display_order: Number(display_order || 0),
          status: 'uploaded',
          uploaded_by: auth.user?.id || null,
        },
      ])
      .select()
      .single()

    if (insertErr) return res.status(500).json({ error: insertErr.message })
    res.json({ ok: true, resource: inserted })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

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

// List resources (with optional filters)
router.get('/', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    const auth = await verifyAdmin(token)
    if (!auth.ok) return res.status(403).json({ error: auth.error })

    const { unit_id, kind, status } = req.query

    let query = supabaseAdmin.from('resources').select('*')

    if (unit_id) query = query.eq('unit_id', unit_id as string)
    if (kind) query = query.eq('kind', kind as string)
    if (status) query = query.eq('status', status as string)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json({ resources: data })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

// Get single resource
router.get('/:id', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    const auth = await verifyAdmin(token)
    if (!auth.ok) return res.status(403).json({ error: auth.error })

    const { id } = req.params

    const { data, error } = await supabaseAdmin.from('resources').select('*').eq('id', id).single()

    if (error) return res.status(404).json({ error: 'Resource not found' })
    res.json({ resource: data })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

// Update resource metadata
router.put('/:id', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    const auth = await verifyAdmin(token)
    if (!auth.ok) return res.status(403).json({ error: auth.error })

    const { id } = req.params
    const { title, description, kind, display_order, status } = req.body

    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (kind !== undefined) updates.kind = kind
    if (display_order !== undefined) updates.display_order = display_order
    if (status !== undefined) updates.status = status

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data, error } = await supabaseAdmin
      .from('resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true, resource: data })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

// Delete resource
router.delete('/:id', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    const auth = await verifyAdmin(token)
    if (!auth.ok) return res.status(403).json({ error: auth.error })

    const { id } = req.params

    // Fetch resource to get storage_path
    const { data: resource, error: fetchErr } = await supabaseAdmin
      .from('resources')
      .select('storage_path')
      .eq('id', id)
      .single()

    if (fetchErr) return res.status(404).json({ error: 'Resource not found' })

    // Delete from storage if storage_path exists
    if (resource?.storage_path) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([resource.storage_path])
    }

    // Delete from database
    const { error: deleteErr } = await supabaseAdmin.from('resources').delete().eq('id', id)

    if (deleteErr) return res.status(500).json({ error: deleteErr.message })
    res.json({ ok: true, message: 'Resource deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

export default router
