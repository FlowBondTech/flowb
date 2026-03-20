import { config } from './env.js'

/**
 * CORS Configuration for DANZ API
 * Supports both mobile apps and web clients
 *
 * IMPORTANT: Mobile apps (iOS/Android) will NOT send Origin headers
 * and will NOT have CORS issues. This config is for web clients.
 */

// Helper function to determine if an origin should be allowed
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // CRITICAL: Allow requests with no origin header
    // This covers:
    // - Native mobile apps (iOS/Android)
    // - Postman/API testing tools
    // - Server-to-server requests
    if (!origin) {
      return callback(null, true)
    }

    // Get allowed origins from environment
    const allowedOrigins = config.cors.origins

    // Development origins (always allowed in dev mode)
    const developmentOrigins = [
      'http://localhost:3000', // Next.js default
      'http://localhost:3001', // Alternative web port
      'http://localhost:5173', // Vite default
      'http://localhost:8081', // Expo web
      'http://localhost:19006', // Expo web alternate
      'http://127.0.0.1:3000', // Alternative localhost
      'http://127.0.0.1:5173', // Alternative localhost
    ]

    // Check exact match first (fastest)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    // In development, allow all localhost origins
    if (config.env === 'development' || config.env === 'local') {
      const isLocalOrigin = developmentOrigins.some(devOrigin =>
        origin.startsWith(devOrigin.split(':').slice(0, 2).join(':')),
      )
      if (isLocalOrigin) {
        return callback(null, true)
      }

      // Also allow local network IPs for mobile development
      if (origin.match(/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
        return callback(null, true)
      }
    }

    // Pattern matching for staging/preview deployments
    if (config.env !== 'production') {
      const allowedPatterns = [
        /^https:\/\/.*\.danz\.now$/, // Any subdomain of danz.now
        /^https:\/\/danz-.*\.vercel\.now$/, // Vercel preview deployments
        /^https:\/\/deploy-preview-.*--danz\.netlify\.now$/, // Netlify preview deployments
      ]

      const matchesPattern = allowedPatterns.some(pattern => pattern.test(origin))
      if (matchesPattern) {
        return callback(null, true)
      }
    }

    // Production mode - strict checking
    if (config.env === 'production') {
      // Log rejected origins for monitoring (but don't expose details to client)
      console.warn(`CORS: Rejected origin ${origin}`)
      return callback(new Error('Not allowed by CORS'))
    }

    // Default: reject unknown origins
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: [
    'Content-Length',
    'Content-Range',
    'X-Total-Count', // For pagination
  ],
  maxAge: 86400, // Cache preflight requests for 24 hours
}

// Simple CORS for less strict environments (development)
export const simpleCorsOptions = {
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
