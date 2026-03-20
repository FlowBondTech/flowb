import { NextResponse } from 'next/server'

// Farcaster Mini App Manifest for Daily Danz
// Reference: https://miniapps.farcaster.xyz/docs/specification
const manifest = {
  // Account association - proves domain ownership
  // This will need to be signed by your Farcaster account
  accountAssociation: {
    header: 'eyJmaWQiOjAsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIn0',
    payload: 'eyJkb21haW4iOiJkYWlseS5kYW56LmFwcCJ9',
    signature: 'PLACEHOLDER_SIGNATURE_REPLACE_WITH_ACTUAL',
  },

  miniapp: {
    // Required metadata
    version: '1',
    name: 'Daily Danz',
    iconUrl: 'https://daily.danz.app/assets/icon-1024.png',
    homeUrl: 'https://daily.danz.app',

    // Splash screen (200x200px required)
    splashImageUrl: 'https://daily.danz.app/assets/splash-200.png',
    splashBackgroundColor: '#0A0A0F',

    // App description (max 170 chars)
    subtitle: 'Check in. Build streaks. Earn rewards.',
    description: 'Daily dance check-in app. Did you dance today? Build your streak, reflect on your moves, and climb the leaderboard.',

    // Hero image for featuring (1200x630px)
    heroImageUrl: 'https://daily.danz.app/assets/hero-1200x630.png',

    // Optional screenshots (1284x2778px portrait, max 3)
    screenshotUrls: [
      'https://daily.danz.app/assets/screenshot-1.png',
      'https://daily.danz.app/assets/screenshot-2.png',
      'https://daily.danz.app/assets/screenshot-3.png',
    ],

    // Categorization
    primaryCategory: 'fitness',
    tags: ['dance', 'streak', 'daily', 'fitness', 'rewards'],

    // Web embed (shown in cast)
    webhookUrl: 'https://daily.danz.app/api/webhook',
  },

  frame: {
    version: 'next',
    imageUrl: 'https://daily.danz.app/assets/frame-og.png',
    imageAspectRatio: '3:2',
    splashImageUrl: 'https://daily.danz.app/assets/splash-200.png',
    splashBackgroundColor: '#0A0A0F',
    button: {
      title: 'Check In Now',
      action: {
        type: 'launch_frame',
        name: 'Daily Danz',
        url: 'https://daily.danz.app',
        splashImageUrl: 'https://daily.danz.app/assets/splash-200.png',
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
