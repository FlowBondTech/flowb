import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Miniapp metadata for Farcaster/Base
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_MINIAPP_URL || 'https://miniapp.danz.app'),
  title: 'DANZ - Move. Connect. Earn.',
  description: 'The dance-to-earn platform. Track your moves, earn DANZ tokens, discover events, and connect with the global dance community.',
  openGraph: {
    title: 'DANZ - Move. Connect. Earn.',
    description: 'The dance-to-earn platform for dancers worldwide.',
    images: [
      {
        url: '/assets/hero-1200x630.png',
        width: 1200,
        height: 630,
        alt: 'DANZ - Dance to Earn',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DANZ - Move. Connect. Earn.',
    description: 'The dance-to-earn platform for dancers worldwide.',
    images: ['/assets/hero-1200x630.png'],
  },
  // Farcaster frame meta tags
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': '/assets/frame-og.png',
    'fc:frame:image:aspect_ratio': '3:2',
    'fc:frame:button:1': 'Start Dancing',
    'fc:frame:button:1:action': 'launch_frame',
    'fc:frame:button:1:target': process.env.NEXT_PUBLIC_MINIAPP_URL || 'https://miniapp.danz.app',
  },
}

// Viewport optimized for miniapp
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0F',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Farcaster Mini App meta tag */}
        <meta name="fc:miniapp" content="true" />
      </head>
      <body className={inter.className}>
        <Providers>
          <main className="miniapp-container min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
