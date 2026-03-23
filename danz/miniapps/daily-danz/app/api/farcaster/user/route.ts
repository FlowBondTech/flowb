import { NextRequest, NextResponse } from 'next/server'
import { getUserByFid, isNeynarConfigured } from '@/lib/neynar'

/**
 * GET /api/farcaster/user?fid=123
 *
 * Gets Farcaster user info by FID using Neynar.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isNeynarConfigured) {
      return NextResponse.json(
        { error: 'Neynar not configured' },
        { status: 503 }
      )
    }

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

    const user = await getUserByFid(fid)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      bio: user.profile?.bio?.text || null,
      followerCount: user.follower_count,
      followingCount: user.following_count,
    })
  } catch (error) {
    console.error('Get Farcaster user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
