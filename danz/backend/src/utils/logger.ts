/**
 * Logger utility for Node.js backend
 * Provides consistent logging across the application
 */

import type { NextFunction, Request, Response } from 'express'
import { config } from '../config/env.js'

const isDevelopment = config.env !== 'production'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

class Logger {
  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, -5)
    const formattedArgs =
      args.length > 0
        ? args
            .map(arg => {
              if (typeof arg === 'object') {
                try {
                  return JSON.stringify(arg, null, 2)
                } catch {
                  return String(arg)
                }
              }
              return String(arg)
            })
            .join(' ')
        : ''
    return `[${timestamp}] [${level.padEnd(7)}] ${message}${formattedArgs ? ` ${formattedArgs}` : ''}`
  }

  forceOutput(text: string): void {
    // Use console.log for better compatibility with nodemon and tsx
    console.log(text)
  }

  log(message: string, ...args: any[]) {
    if (isDevelopment) {
      const formatted = this.formatMessage('LOG', message, ...args)
      this.forceOutput(`${colors.gray}${formatted}${colors.reset}`)
    }
  }

  info(message: string, ...args: any[]) {
    const formatted = this.formatMessage('INFO', message, ...args)
    this.forceOutput(`${colors.blue}${formatted}${colors.reset}`)
  }

  warn(message: string, ...args: any[]) {
    const formatted = this.formatMessage('WARN', message, ...args)
    this.forceOutput(`${colors.yellow}${formatted}${colors.reset}`)
  }

  error(message: string, error?: any) {
    const formatted = this.formatMessage('ERROR', message)
    this.forceOutput(`${colors.red}${formatted}${colors.reset}`)
    if (error) {
      // Handle different error types
      if (error.stack) {
        // If it has a stack trace, show it
        this.forceOutput(`${colors.red}Stack trace:${colors.reset}`)
        error.stack.split('\n').forEach((line: string) => {
          this.forceOutput(`  ${colors.red}${line}${colors.reset}`)
        })
      } else if (error instanceof Error) {
        // If it's an Error object without stack
        this.forceOutput(`${colors.red}Error:${colors.reset} ${error.message}`)
        if (error.name && error.name !== 'Error') {
          this.forceOutput(`${colors.red}Type:${colors.reset} ${error.name}`)
        }
      } else if (typeof error === 'object') {
        // If it's an object, stringify it properly
        this.forceOutput(`${colors.red}Error details:${colors.reset}`)
        const errorStr = JSON.stringify(error, null, 2)
        errorStr.split('\n').forEach((line: string) => {
          this.forceOutput(`  ${colors.red}${line}${colors.reset}`)
        })
      } else {
        // For any other type, convert to string
        this.forceOutput(`${colors.red}Error:${colors.reset} ${String(error)}`)
      }
    }
  }

  debug(message: string, ...args: any[]) {
    if (isDevelopment) {
      const formatted = this.formatMessage('DEBUG', message, ...args)
      this.forceOutput(`${colors.magenta}${formatted}${colors.reset}`)
    }
  }

  success(message: string, ...args: any[]) {
    const formatted = this.formatMessage('SUCCESS', message, ...args)
    this.forceOutput(`${colors.green}${formatted}${colors.reset}`)
  }

  // HTTP request logging
  request(method: string, url: string, statusCode?: number) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, -5)
    const status = statusCode ? ` [${statusCode}]` : ''
    const color = statusCode && statusCode >= 400 ? colors.red : colors.green
    const message = `${method.padEnd(7)} ${url}${status}`
    this.forceOutput(`${color}[${timestamp}] [HTTP   ] ${message}${colors.reset}`)
  }
}

export const logger = new Logger()

// Also export a middleware for Express to log requests
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  const { method, url } = req
  const requestId = Math.random().toString(36).substring(2, 9).toUpperCase()

  // Method colors mapping
  const methodColors: Record<string, string> = {
    GET: colors.green,
    POST: colors.yellow,
    PUT: colors.blue,
    DELETE: colors.red,
    PATCH: colors.magenta,
    OPTIONS: colors.gray,
  }
  const methodColor = methodColors[method] || colors.cyan

  // Format request line with better visual hierarchy
  const separator = `${colors.dim}${'─'.repeat(60)}${colors.reset}`

  // Log request header
  console.log(separator)
  console.log(
    `${colors.bright}${methodColor}[REQUEST]${colors.reset} ` +
      `${colors.gray}#${requestId}${colors.reset} ` +
      `${methodColor}${method}${colors.reset} ${colors.bright}${url}${colors.reset}`,
  )

  // Log request details in development
  if (isDevelopment) {
    // Headers (selective)
    const userAgent = req.headers['user-agent']
    const contentType = req.headers['content-type']
    const auth = req.headers['authorization']

    if (userAgent) {
      console.log(
        `${colors.gray}  ├─ User-Agent: ${userAgent.substring(0, 60)}${userAgent.length > 60 ? '...' : ''}${colors.reset}`,
      )
    }
    if (contentType) {
      console.log(`${colors.gray}  ├─ Content-Type: ${contentType}${colors.reset}`)
    }
    if (auth) {
      console.log(`${colors.gray}  ├─ Auth: ${auth.substring(0, 20)}...${colors.reset}`)
    }

    // Query parameters
    if (Object.keys(req.query || {}).length > 0) {
      console.log(`${colors.cyan}  ├─ Query:${colors.reset}`)
      Object.entries(req.query).forEach(([key, value], index, array) => {
        const isLast = index === array.length - 1
        console.log(
          `${colors.gray}  │  ${isLast ? '└' : '├'}─ ${key}: ${colors.yellow}${JSON.stringify(value)}${colors.reset}`,
        )
      })
    }

    // Request body
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`${colors.cyan}  ├─ Body:${colors.reset}`)
      const bodyStr = JSON.stringify(req.body, null, 2)
      const lines = bodyStr.split('\n')
      const maxLines = 10

      if (lines.length <= maxLines) {
        lines.forEach((line, index) => {
          const isLast = index === lines.length - 1
          console.log(`${colors.gray}  │  ${isLast ? '└' : '│'} ${line}${colors.reset}`)
        })
      } else {
        lines.slice(0, maxLines).forEach(line => {
          console.log(`${colors.gray}  │  │ ${line}${colors.reset}`)
        })
        console.log(
          `${colors.yellow}  │  └─ ... (${lines.length - maxLines} more lines)${colors.reset}`,
        )
      }
    }
  }

  // Store response data for logging
  let responseData: any

  // Capture response data
  const originalJson = res.json
  const originalSend = res.send
  const originalEnd = res.end

  res.json = function (data: any) {
    responseData = data
    return originalJson.call(this, data)
  }

  res.send = function (data: any) {
    if (typeof data === 'object') {
      responseData = data
    }
    return originalSend.call(this, data)
  }

  // Override the end function to log response
  res.end = ((...args: any[]) => {
    const duration = Date.now() - start
    const statusCode = res.statusCode

    // Determine status color
    let statusColor = colors.green
    let statusIcon = '✓'
    if (statusCode >= 400 && statusCode < 500) {
      statusColor = colors.yellow
      statusIcon = '⚠'
    } else if (statusCode >= 500) {
      statusColor = colors.red
      statusIcon = '✗'
    } else if (statusCode >= 300 && statusCode < 400) {
      statusColor = colors.cyan
      statusIcon = '→'
    }

    // Log response header
    console.log(
      `${colors.bright}${statusColor}[RESPONSE]${colors.reset} ` +
        `${colors.gray}#${requestId}${colors.reset} ` +
        `${statusColor}${statusIcon} ${statusCode}${colors.reset} ` +
        `${colors.gray}(${duration}ms)${colors.reset}`,
    )

    // Log response body in development
    if (isDevelopment && responseData !== undefined) {
      console.log(`${colors.cyan}  └─ Response:${colors.reset}`)
      const responseStr = JSON.stringify(responseData, null, 2)
      const lines = responseStr.split('\n')
      const maxLines = 8

      if (lines.length <= maxLines) {
        lines.forEach((line, index) => {
          const isLast = index === lines.length - 1
          console.log(`${colors.gray}     ${isLast ? '└' : '│'} ${line}${colors.reset}`)
        })
      } else {
        lines.slice(0, maxLines).forEach(line => {
          console.log(`${colors.gray}     │ ${line}${colors.reset}`)
        })
        console.log(
          `${colors.yellow}     └─ ... (${lines.length - maxLines} more lines)${colors.reset}`,
        )
      }
    }

    console.log(separator)

    // Call the original end function
    return originalEnd.apply(res, args as any)
  }) as any

  next()
}
