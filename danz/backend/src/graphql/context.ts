import type { Request } from 'express'
import { privyClient } from '../config/privy.js'
import { createDataLoaders, type DataLoaders } from './dataloaders.js'

export interface GraphQLContext {
  userId?: string
  req: Request
  loaders: DataLoaders
}

export async function createContext({ req }: { req: Request }): Promise<GraphQLContext> {
  const token = req.headers.authorization?.replace('Bearer ', '')

  let userId: string | undefined

  if (token) {
    try {
      const verifiedClaims = await privyClient.verifyAuthToken(token)
      userId = verifiedClaims.userId
      console.log('[Auth] Token verified successfully for userId:', userId)
    } catch (error) {
      console.error('[Auth] Token verification failed:', error)
      console.error('[Auth] Token (first 20 chars):', token?.substring(0, 20))
    }
  } else {
    console.log('[Auth] No authorization token provided')
  }

  // Create fresh DataLoaders for each request
  // This ensures request-scoped caching (no stale data across requests)
  const loaders = createDataLoaders()

  return {
    userId,
    req,
    loaders,
  }
}
