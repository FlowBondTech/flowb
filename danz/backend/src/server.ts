import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import app from './app.js'
import { config, validateConfig } from './config/env.js'
import { setupGraphQL } from './graphql/server.js'
import { logger } from './utils/logger.js'

// Get local network IP address
function getLocalNetworkIp() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return null
}

// Initial startup message
logger.info('🚀 Starting DANZ Backend Server...')
logger.info('[Server.ts] App module loaded successfully')

try {
  validateConfig()
  logger.success('Configuration validated')
} catch (error) {
  logger.error('Configuration error:', error)
  process.exit(1)
}

const PORT = config.port || 8080
const HOST = '0.0.0.0'

// Async function to setup and start server
async function startServer() {
  // Create HTTP server
  const httpServer = createServer(app)

  // Setup GraphQL
  await setupGraphQL(app, httpServer)
  logger.info('GraphQL middleware configured')

  // Start the server
  const server = httpServer.listen(PORT, HOST, () => {
    const localUrl = `http://localhost:${PORT}`
    const networkIp = getLocalNetworkIp()
    const networkUrl = networkIp ? `http://${networkIp}:${PORT}` : null

    logger.success('🚀 Server is running!')
    logger.info('')
    logger.info(`  Local:           ${localUrl}`)
    if (networkUrl) {
      logger.info(`  Network:         ${networkUrl}`)
    }
    logger.info('')
    logger.info(`  GraphQL:         ${localUrl}/graphql`)
    if (networkUrl) {
      logger.info(`  GraphQL Network: ${networkUrl}/graphql`)
    }
    logger.info('')
    logger.info(`Environment: ${config.env}`)
    logger.info(`CORS Origins: ${config.cors.origins.join(', ')}`)
    logger.info(`Runtime: Node.js ${process.version}`)
    logger.info('')
    logger.info('Press Ctrl+C to stop the server')
  })

  // Handle server errors
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`)
    } else {
      logger.error('Server error:', error)
    }
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server')
    server.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server')
    server.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })
  })

  return server
}

// Keep the process alive
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', reason => {
  logger.error('Unhandled Rejection:', reason)
  process.exit(1)
})

// Start the server
const server = await startServer()

export default server
