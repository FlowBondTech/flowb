import { NextRequest, NextResponse } from 'next/server'
import {
  getOrCreateUserByFid,
  getTodayCheckin,
  recordCheckin,
  getUserStats,
  getUserByFid,
} from '@/lib/supabase'

interface CheckinRequest {
  fid: number
  didDance: boolean
  userData?: {
    username?: string
    displayName?: string
    pfpUrl?: string
  }
  reflection?: {
    feeling?: string
    benefits?: string[]
    note?: string
  }
}

/**
 * POST /api/checkin
 *
 * Records a daily check-in for a Farcaster user.
 * Creates the user if they don't exist.
 */
export async function POST(request: NextRequest) {
  try {
    const body: CheckinRequest = await request.json()
    const { fid, didDance, userData, reflection } = body

    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: 'Invalid FID' },
        { status: 400 }
      )
    }

    // Get or create user
    const user = await getOrCreateUserByFid(fid, userData)
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to get or create user' },
        { status: 500 }
      )
    }

    // Check if already checked in today
    const existingCheckin = await getTodayCheckin(user.privy_id)
    if (existingCheckin) {
      // Return existing check-in data
      const stats = await getUserStats(user.privy_id)
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        checkin: existingCheckin,
        stats,
      })
    }

    // Record new check-in
    const result = await recordCheckin(
      user.privy_id,
      fid,
      didDance,
      user.current_streak,
      reflection
    )

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to record check-in' },
        { status: 500 }
      )
    }

    // Get updated stats
    const stats = await getUserStats(user.privy_id)

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      checkin: result.checkin,
      newStreak: result.newStreak,
      xpEarned: result.xpEarned,
      stats,
    })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/checkin?fid=123
 *
 * Gets today's check-in status for a user.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fidParam = searchParams.get('fid')

    if (!fidParam) {
      return NextResponse.json(
        { error: 'FID required' },
        { status: 400 }
      )
    }

    const fid = parseInt(fidParam, 10)
    if (isNaN(fid)) {
      return NextResponse.json(
        { error: 'Invalid FID' },
        { status: 400 }
      )
    }

    // Find user by FID using farcaster_fid column
    const user = await getUserByFid(fid)

    if (!user) {
      // User doesn't exist yet - they haven't checked in
      return NextResponse.json({
        hasCheckedInToday: false,
        checkin: null,
        stats: null,
      })
    }

    // Get today's check-in
    const checkin = await getTodayCheckin(user.privy_id)
    const stats = await getUserStats(user.privy_id)

    return NextResponse.json({
      hasCheckedInToday: !!checkin,
      checkin,
      stats,
    })
  } catch (error) {
    console.error('Get check-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
