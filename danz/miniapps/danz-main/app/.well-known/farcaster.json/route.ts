import { NextResponse } from 'next/server'

// Farcaster Mini App Manifest
// Reference: https://miniapps.farcaster.xyz/docs/specification
const manifest = {
  // Account association - proves domain ownership
  // This will need to be signed by your Farcaster account
  accountAssociation: {
    header: 'eyJmaWQiOjAsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIn0',
    payload: 'eyJkb21haW4iOiJtaW5pYXBwLmRhbnouYXBwIn0',
    signature: 'PLACEHOLDER_SIGNATURE_REPLACE_WITH_ACTUAL',
  },

  miniapp: {
    // Required metadata
    version: '1',
    name: 'DANZ',
    iconUrl: 'https://miniapp.danz.app/assets/icon-1024.png',
    homeUrl: 'https://miniapp.danz.app',

    // Splash screen (200x200px required)
    splashImageUrl: 'https://miniapp.danz.app/assets/splash-200.png',
    splashBackgroundColor: '#0A0A0F',

    // App description (max 170 chars)
    subtitle: 'Move. Connect. Earn.',
    description: 'The dance-to-earn platform. Track your moves, earn DANZ tokens, discover events, and connect with the global dance community.',

    // Hero image for featuring (1200x630px)
    heroImageUrl: 'https://miniapp.danz.app/assets/hero-1200x630.png',

    // Optional screenshots (1284x2778px portrait, max 3)
    screenshotUrls: [
      'https://miniapp.danz.app/assets/screenshot-1.png',
      'https://miniapp.danz.app/assets/screenshot-2.png',
      'https://miniapp.danz.app/assets/screenshot-3.png',
    ],

    // Categorization
    primaryCategory: 'fitness',
    tags: ['dance', 'fitness', 'earn', 'crypto', 'social'],

    // Web embed (shown in cast)
    webhookUrl: 'https://miniapp.danz.app/api/webhook',
  },

  frame: {
    version: 'next',
    imageUrl: 'https://miniapp.danz.app/assets/frame-og.png',
    imageAspectRatio: '3:2',
    splashImageUrl: 'https://miniapp.danz.app/assets/splash-200.png',
    splashBackgroundColor: '#0A0A0F',
    button: {
      title: 'Start Dancing',
      action: {
        type: 'launch_frame',
        name: 'DANZ',
        url: 'https://miniapp.danz.app',
        splashImageUrl: 'https://miniapp.danz.app/assets/splash-200.png',
        splashBackgroundColor: '#0A0A0F',
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
