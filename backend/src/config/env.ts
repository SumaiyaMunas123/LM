import dotenv from 'dotenv'

dotenv.config()

export function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}

export const PORT = process.env.PORT || 4000
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'resources'
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean)
