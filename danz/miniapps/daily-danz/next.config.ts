import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Monorepo: trace from repo root to include all dependencies
  outputFileTracingRoot: path.join(__dirname, '..'),

  // Optimize images for miniapp
  images: {
    unoptimized: true,
  },

  // Webpack config for frame SDK and wagmi compatibility
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    // Handle MetaMask SDK's react-native dependency
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    }

    return config
  },

  // Headers for frame embed (allows iframe embedding)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.farcaster.xyz https://*.warpcast.com https://*.coinbase.com",
          },
        ],
      },
    ]
  },
}

export default nextConfig
