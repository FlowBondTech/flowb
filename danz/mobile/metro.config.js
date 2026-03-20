const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Ensure platform-specific extensions are resolved correctly
// This ensures .web.tsx files are used on web platform
config.resolver.sourceExts = ['web.tsx', 'web.ts', 'web.js', ...config.resolver.sourceExts]

// Disable package exports for incompatible libraries (required for Privy)
config.resolver.unstable_enablePackageExports = true
config.resolver.unstable_conditionNames = ['react-native', 'browser', 'require']

// Custom resolution for Privy and crypto modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle @noble/hashes crypto module
  if (moduleName === '@noble/hashes/crypto') {
    return {
      filePath: require.resolve('@noble/hashes/crypto'),
      type: 'sourceFile',
    }
  }

  // Handle isows package (WebSocket library) - force to use native WebSocket
  if (moduleName.startsWith('isows')) {
    return {
      type: 'empty',
    }
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform)
}

// Add extra node modules and polyfills for Privy
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('expo-crypto'),
  zlib: require.resolve('browserify-zlib'),
  util: require.resolve('util'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  stream: require.resolve('stream-browserify'),
  events: require.resolve('events'),
  buffer: require.resolve('buffer'),
  process: require.resolve('process/browser'),
  url: require.resolve('url'),
}

module.exports = config
