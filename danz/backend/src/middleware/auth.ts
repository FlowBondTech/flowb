import type { NextFunction, Request, Response } from 'express'
import { privyClient } from '../config/privy.js'
import { logger } from '../utils/logger.js'

export interface AuthRequest extends Request {
  user?: {
    privyId: string
    email?: string
    wallet?: string
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

    const verifiedClaims = await privyClient.verifyAuthToken(token)

    req.user = {
      privyId: verifiedClaims.userId,
    }

    next()
  } catch (error) {
    logger.error('Authentication failed', error)
    return res.status(401).json({ error: 'Invalid token' })
  }
}
