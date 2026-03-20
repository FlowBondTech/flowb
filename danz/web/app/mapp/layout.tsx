import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

// Miniapp-specific metadata
export const metadata: Metadata = {
  title: 'DANZ | Move. Connect. Earn.',
  description:
    'The dance-to-earn platform. Track your moves, earn tokens, and connect with dancers worldwide.',
  openGraph: {
    title: 'DANZ',
    description: 'Move. Connect. Earn.',
    images: ['/danz-icon-pink.png'],
  },
  // Farcaster frame meta
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://danz.app/danz-icon-pink.png',
    'fc:frame:button:1': 'Start Dancing',
    'fc:frame:button:1:action': 'launch_frame',
    'fc:frame:button:1:target': 'https://danz.app/mapp',
  },
}

// Mobile-optimized viewport for miniapp
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A0A0F',
}

export default function MappLayout({ children }: { children: ReactNode }) {
  return <div className="miniapp-container min-h-screen bg-bg-primary">{children}</div>
}
