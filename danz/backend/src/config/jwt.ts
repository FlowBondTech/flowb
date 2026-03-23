import jwt from 'jsonwebtoken'
import { config } from './env.js'

interface SupabaseJwtPayload {
  sub: string
  email?: string
  role?: string
  exp: number
  iat: number
}

export function verifySupabaseToken(token: string): SupabaseJwtPayload {
  const decoded = jwt.verify(token, config.supabase.jwtSecret, {
    algorithms: ['HS256'],
  }) as SupabaseJwtPayload

  return decoded
}
