import { Router } from 'express'
import { supabaseAdmin, createUserSupabaseClient } from '../config/supabase'
import { extractBearerToken } from '../utils/auth'
import { STORAGE_BUCKET } from '../config/env'

const router = Router()

// Get a signed URL for a resource (for playback/download)
// URL expires in 1 hour by default
router.get('/:id/url', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Missing bearer token' })

    const userClient = createUserSupabaseClient(token)
    const { id } = req.params
    const { expiresIn = 3600 } = req.query // expires in seconds, default 1 hour

    // Fetch the resource record
    const { data: resource, error: fetchErr } = await userClient
      .from('resources')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !resource) {
      return res.status(404).json({ error: 'Resource not found' })
    }

    // If external_url is set, return it directly
    if (resource.external_url) {
      return res.json({ url: resource.external_url, type: 'external' })
    }

    // If storage_path is set, generate a signed URL
    if (resource.storage_path) {
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(resource.storage_path, Number(expiresIn))

      if (error) return res.status(500).json({ error: error.message })
      return res.json({ url: data?.signedUrl, type: 'storage', expiresIn })
    }

    res.status(400).json({ error: 'Resource has no download URL' })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

// Get resource metadata (for listing/browsing)
router.get('/:id', async (req, res) => {
  try {
    const token = extractBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Missing bearer token' })

    const userClient = createUserSupabaseClient(token)
    const { id } = req.params

    const { data: resource, error } = await userClient
      .from('resources')
      .select('id, unit_id, kind, title, description, duration_seconds, display_order, created_at')
      .eq('id', id)
      .single()

    if (error) return res.status(404).json({ error: 'Resource not found' })
    res.json({ resource })
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' })
  }
})

export default router
