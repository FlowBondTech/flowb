// Shims for Node.js modules in React Native
global.Buffer = require('buffer').Buffer
global.process = require('process')
global.process.env.NODE_ENV = __DEV__ ? 'development' : 'production'

// Polyfill for TextEncoder/TextDecoder (needed by jose)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('text-encoding').TextEncoder
  global.TextDecoder = require('text-encoding').TextDecoder
}

// Mock http/https modules for jose
global.http = {}
global.https = {}
global.events = { once: () => Promise.resolve([]) }
