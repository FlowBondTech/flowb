import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DANZ Mission Board - ETHDenver 2026 Activation System',
  description:
    'Gamified mission board turning ETHDenver into a dance-to-earn playground. Sponsor missions, leaderboard rewards, and FlowBond wearable integration.',
  keywords:
    'ETHDenver, DANZ, mission board, dance to earn, FlowBond, crypto events, sponsor activation, leaderboard',
  openGraph: {
    title: 'DANZ Mission Board - ETHDenver 2026',
    description:
      'Turn ETHDenver into a dance-to-earn playground. Gamified missions, $DANZ token rewards, powered by FlowBond.',
    url: 'https://danz.now/ethdenver',
    siteName: 'DANZ NOW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DANZ Mission Board - ETHDenver 2026',
    description:
      'Turn ETHDenver into a dance-to-earn playground. Gamified missions, $DANZ token rewards, powered by FlowBond.',
  },
}

export default function ETHDenverLayout({ children }: { children: React.ReactNode }) {
  return children
}
