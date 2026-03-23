import compression from 'compression'
import cors from 'cors'
import express from 'express'
import { corsOptions } from './config/cors.js'
import { config } from './config/env.js'
import stripeRoutes from './routes/stripe.js'
import { logger } from './utils/logger.js'

logger.info('[App.ts] Initializing Express app...')

const app = express()

logger.info('[App.ts] Express app created')

app.use(cors(corsOptions))
app.use(compression())

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => {
  logger.info('Health check endpoint called')
  res.json({
    status: 'ok',
    environment: config.env,
    timestamp: new Date().toISOString(),
  })
})

// Test endpoint to verify logging
app.get('/test-log', (_req, res) => {
  console.log('Test log message using console.log')
  // Logger tests
  logger.info('=== LOGGER TESTS START ===')
  logger.log('Test log message')
  logger.info('Test info message')
  logger.warn('Test warning message')
  logger.error('Test error message (this is intentional)')
  logger.debug('Test debug message')
  // logger.success('Test success message')

  logger.info('=== LOGGER TESTS END ===')

  res.json({
    message: 'Check your terminal for log output',
    note: 'You should see all logger outputs (log, info, warn, error, debug, success)',
    runtime: 'Node.js',
    timestamp: new Date().toISOString(),
  })
})

// Stripe routes
app.use('/api/stripe', stripeRoutes)

// Note: All API functionality has been migrated to GraphQL
// GraphQL route is setup in server.ts at /graphql

// 404 handler - must be after all other routes
// But skip /graphql since it's added later
app.use((req, res, next) => {
  // Let /graphql requests pass through to be handled by Apollo Server
  if (req.path.startsWith('/graphql')) {
    return next()
  }
  res.status(404).json({ error: 'Route not found' })
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Express Error Handler:', err)

  return res.status(err.status || 500).json({
    error: config.env === 'production' ? 'Internal server error' : err.message,
  })
})

export default app
