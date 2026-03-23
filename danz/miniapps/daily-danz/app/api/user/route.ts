import { NextRequest, NextResponse } from 'next/server'
import {
  getOrCreateUserByFid,
  getUserStats,
  getUserByFid,
  type DbUser,
} from '@/lib/supabase'

interface UserResponse {
  user: DbUser
  stats: {
    totalXp: number
    currentStreak: number
    longestStreak: number
    level: number
    totalCheckins: number
  } | null
}

/**
 * GET /api/user?fid=123
 *
 * Gets user profile and stats by FID.
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
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const stats = await getUserStats(user.privy_id)

    return NextResponse.json({
      user,
      stats,
    } as UserResponse)
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user
 *
 * Creates or updates a user by FID.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fid, userData } = body

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

    const stats = await getUserStats(user.privy_id)

    return NextResponse.json({
      user,
      stats,
    } as UserResponse)
  } catch (error) {
    console.error('Create/update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
