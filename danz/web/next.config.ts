import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eoajujwpdkfuicnoxetk.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Rewrite dashboard.danz.now to /dashboard
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: 'dashboard.danz.now',
            },
          ],
          destination: '/dashboard/:path*',
        },
      ],
    }
  },
}

export default nextConfig
