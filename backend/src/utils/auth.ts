import type { Request } from 'express'

export function extractBearerToken(req: Request) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim()
}
