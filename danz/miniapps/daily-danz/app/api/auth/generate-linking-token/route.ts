import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

// Environment
const DANZ_WEB_URL = process.env.NEXT_PUBLIC_DANZ_WEB_URL || 'https://danz.app'
const TOKEN_EXPIRY_MINUTES = 10

/**
 * POST /api/auth/generate-linking-token
 *
 * Generates a secure token for cross-app account linking.
 * User initiates link from miniapp → opens web app → completes auth → accounts linked
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetProvider } = body

    if (!targetProvider) {
      return NextResponse.json(
        { error: 'targetProvider is required' },
        { status: 400 }
      )
    }

    // TODO: Get current user from session/Farcaster context
    // For now, generate token for demo purposes
    // In production, this would:
    // 1. Verify the user is authenticated via Farcaster
    // 2. Get their user ID from the database
    // 3. Store the token in the database with expiry

    // Generate secure token
    const token = nanoid(32)
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

    // TODO: Store in database
    // await db.insert(linkingTokens).values({
    //   userId: currentUser.id,
    //   token,
    //   sourceProvider: 'farcaster',
    //   targetProvider,
    //   expiresAt,
    // })

    // Build linking URL for web app
    const linkUrl = new URL('/link-account', DANZ_WEB_URL)
    linkUrl.searchParams.set('token', token)
    linkUrl.searchParams.set('source', 'miniapp')
    linkUrl.searchParams.set('provider', targetProvider)

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      linkUrl: linkUrl.toString(),
    })
  } catch (error) {
    console.error('Failed to generate linking token:', error)
    return NextResponse.json(
      { error: 'Failed to generate linking token' },
      { status: 500 }
    )
  }
}
