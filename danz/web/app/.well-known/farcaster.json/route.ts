import { NextResponse } from 'next/server'

// Farcaster Mini App Manifest
// Reference: https://miniapps.farcaster.xyz/docs/specification
const manifest = {
  // Account association - proves domain ownership
  // TODO: Sign this with your Farcaster custody key
  accountAssociation: {
    header:
      'eyJmaWQiOjAsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIn0',
    payload: 'eyJkb21haW4iOiJkYW56LmFwcCJ9',
    signature: 'PLACEHOLDER_SIGNATURE_REPLACE_WITH_ACTUAL',
  },

  miniapp: {
    // Required metadata
    version: '1',
    name: 'DANZ',
    iconUrl: 'https://danz.app/danz-icon-pink.png',
    homeUrl: 'https://danz.app/mapp',

    // Splash screen (200x200px required)
    splashImageUrl: 'https://danz.app/danz-icon-pink.png',
    splashBackgroundColor: '#0A0A0F',

    // App description (max 170 chars)
    subtitle: 'Move. Connect. Earn.',
    description:
      'The dance-to-earn platform. Track your moves, earn DANZ tokens, discover events, and connect with the global dance community.',

    // Hero image for featuring (1200x630px)
    // TODO: Add proper hero image
    // heroImageUrl: 'https://danz.app/assets/hero-1200x630.png',

    // Optional screenshots (1284x2778px portrait, max 3)
    // screenshotUrls: [],

    // Categorization
    primaryCategory: 'fitness',
    tags: ['dance', 'fitness', 'earn', 'crypto', 'social'],

    // Webhook for notifications
    // webhookUrl: 'https://danz.app/api/farcaster/webhook',
  },

  frame: {
    version: 'next',
    imageUrl: 'https://danz.app/danz-icon-pink.png',
    imageAspectRatio: '1:1',
    splashImageUrl: 'https://danz.app/danz-icon-pink.png',
    splashBackgroundColor: '#0A0A0F',
    button: {
      title: 'Start Dancing',
      action: {
        type: 'launch_frame',
        name: 'DANZ',
        url: 'https://danz.app/mapp',
        splashImageUrl: 'https://danz.app/danz-icon-pink.png',
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
