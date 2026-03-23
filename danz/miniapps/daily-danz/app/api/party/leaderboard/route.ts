import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/party/leaderboard
 *
 * Get party leaderboard
 * Query params:
 *   - limit: Number of parties to return (default 10, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = Math.min(parseInt(limitParam || '10', 10), 50)

    const supabase = getSupabaseAdmin()

    // Use the party_leaderboard view
    const { data: leaderboard, error } = await supabase
      .from('party_leaderboard')
      .select('*')
      .limit(limit)

    if (error) {
      console.error('Leaderboard error:', error)
      // Fallback to direct query if view doesn't exist
      const { data: parties } = await supabase
        .from('parties')
        .select(`
          id, name, avatar_emoji, tier, weekly_xp, party_streak,
          party_members(id)
        `)
        .eq('status', 'active')
        .order('weekly_xp', { ascending: false })
        .limit(limit)

      const fallbackLeaderboard = parties?.map((p, i) => ({
        rank: i + 1,
        party: {
          id: p.id,
          name: p.name,
          avatarEmoji: p.avatar_emoji,
          tier: p.tier,
          memberCount: p.party_members?.length || 0,
        },
        weeklyXp: p.weekly_xp,
        partyStreak: p.party_streak,
      }))

      return NextResponse.json({ leaderboard: fallbackLeaderboard })
    }

    // Transform to match frontend types
    const formattedLeaderboard = leaderboard?.map(entry => ({
      rank: entry.rank,
      party: {
        id: entry.id,
        name: entry.name,
        avatarEmoji: entry.avatar_emoji,
        tier: entry.tier,
        memberCount: entry.member_count,
      },
      weeklyXp: entry.weekly_xp,
      partyStreak: entry.party_streak,
    }))

    return NextResponse.json({ leaderboard: formattedLeaderboard })
  } catch (error) {
    console.error('Get leaderboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
