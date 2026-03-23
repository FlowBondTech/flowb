import type { NextFunction, Request, Response } from 'express'
import { verifySupabaseToken } from '../config/jwt.js'
import { logger } from '../utils/logger.js'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    email?: string
  }
}

export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')

    const decoded = verifySupabaseToken(token)

    req.user = {
      userId: decoded.sub,
      email: decoded.email,
    }

    next()
  } catch (error) {
    logger.error('Authentication failed', error)
    return res.status(401).json({ error: 'Invalid token' })
  }
}
