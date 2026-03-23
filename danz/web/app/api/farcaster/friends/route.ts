import {
  type FarcasterFriend,
  getFollowing,
  isNeynarConfigured,
  searchUsers,
} from '@/src/lib/neynar'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/farcaster/friends?fid=123&limit=25&search=username
 *
 * Gets Farcaster users the current user follows (friends).
 * Use search param to filter/search for specific users.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isNeynarConfigured) {
      return NextResponse.json({ error: 'Neynar not configured', friends: [] }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const fidParam = searchParams.get('fid')
    const limitParam = searchParams.get('limit')
    const searchQuery = searchParams.get('search')

    // If search query, use search instead of following
    if (searchQuery && searchQuery.length >= 2) {
      const limit = limitParam ? Math.min(Number.parseInt(limitParam, 10), 25) : 10
      const users = await searchUsers(searchQuery, limit)

      const friends: FarcasterFriend[] = users.map(user => ({
        fid: user.fid,
        username: user.username,
        displayName: user.display_name || user.username,
        pfpUrl: user.pfp_url || null,
        followerCount: user.follower_count || 0,
      }))

      return NextResponse.json({ friends, source: 'search' })
    }

    // Get following list
    if (!fidParam) {
      return NextResponse.json({ error: 'FID required', friends: [] }, { status: 400 })
    }

    const fid = Number.parseInt(fidParam, 10)
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid FID', friends: [] }, { status: 400 })
    }

    const limit = limitParam ? Math.min(Number.parseInt(limitParam, 10), 100) : 25
    const users = await getFollowing(fid, limit)

    const friends: FarcasterFriend[] = users.map(user => ({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfpUrl: user.pfp_url || null,
      followerCount: user.follower_count || 0,
    }))

    return NextResponse.json({ friends, source: 'following' })
  } catch (error) {
    console.error('Get Farcaster friends error:', error)
    return NextResponse.json({ error: 'Internal server error', friends: [] }, { status: 500 })
  }
}
