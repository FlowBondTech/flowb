const createExpoWebpackConfigAsync = require('@expo/webpack-config')
const path = require('node:path')

module.exports = async (env, argv) => {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          '@supabase/supabase-js',
          'expo-blur',
          'expo-haptics',
          'expo-sensors',
          'expo-location',
          'expo-notifications',
          'expo-image-picker',
          'expo-video',
          'expo-keep-awake',
        ],
      },
      // Reduce warnings
      performance: {
        hints: false,
      },
    },
    argv,
  )

  // Suppress warnings
  config.performance = {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  }

  config.stats = 'minimal'

  // Customize the config before returning it
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    'react-native-linear-gradient': 'react-native-web-linear-gradient',
    'expo-linear-gradient': 'react-native-web-linear-gradient',
    'expo-blur': path.resolve(__dirname, 'src/utils/platformUtils.tsx'),
    'expo-haptics': path.resolve(__dirname, 'src/utils/platformUtils.tsx'),
    'expo-sensors': path.resolve(__dirname, 'src/utils/platformUtils.tsx'),
    'expo-location': path.resolve(__dirname, 'src/utils/platformUtils.tsx'),
    'expo-notifications': path.resolve(__dirname, 'src/utils/platformUtils.tsx'),
    'expo-image-picker': path.resolve(__dirname, 'src/utils/platformUtils.tsx'),
    'expo-keep-awake': path.resolve(__dirname, 'src/utils/platformUtils.tsx'),
    // Fix react-native-screens for web (use CommonJS version)
    'react-native-screens': path.resolve(__dirname, 'src/utils/react-native-screens-web.js'),
  }

  // Handle video files for web
  config.module.rules.push({
    test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/,
    use: {
      loader: 'file-loader',
      options: {
        name: '[name].[hash].[ext]',
        outputPath: 'static/media/',
      },
    },
  })

  // Add fallbacks for Node.js modules not available in the browser
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: false,
    stream: false,
    buffer: false,
  }

  // Fix react-native-screens dynamic require
  config.module.rules.push({
    test: /Screens\.js$/,
    include: /node_modules\/@react-navigation/,
    use: {
      loader: 'string-replace-loader',
      options: {
        search: "require\\('react-native-screens'\\)",
        replace: `require('${path.resolve(__dirname, 'src/utils/react-native-screens-web.js').replace(/\\/g, '/')}')`,
        flags: 'g',
      },
    },
  })

  // Add webpack ProvidePlugin to polyfill globals
  const webpack = require('webpack')
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  )

  // Ignore native modules that don't work on web
  config.module.rules.push({
    test: /\.(ios|android)\.(js|jsx|ts|tsx)$/,
    loader: 'ignore-loader',
  })

  // Additional fix for react-native-screens
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /react-native-screens/,
      path.resolve(__dirname, 'src/utils/react-native-screens-web.js'),
    ),
  )

  // Copy static assets
  try {
    const CopyPlugin = require('copy-webpack-plugin')
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          { from: 'assets/icon.png', to: 'icon.png' },
          { from: 'assets/icon.png', to: 'favicon.png' },
          { from: 'assets/DANZ LOGO.png', to: 'DANZ-LOGO.png' },
        ],
      }),
    )
  } catch (_e) {
    console.log('CopyPlugin not available')
  }

  // Suppress specific warnings
  config.ignoreWarnings = [
    /Failed to parse source map/,
    /Module not found: Error: Can't resolve/,
    /export .* was not found in/,
  ]

  return config
}
