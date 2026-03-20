import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/party/[id]
 *
 * Get a specific party's details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partyId } = await params

    const supabase = getSupabaseAdmin()

    const { data: party, error } = await supabase
      .from('parties')
      .select(`
        *,
        party_members (
          id, user_id, fid, role, current_streak,
          total_contributions, is_active_today, joined_at, last_checkin_at
        )
      `)
      .eq('id', partyId)
      .single()

    if (error || !party) {
      return NextResponse.json(
        { error: 'Party not found' },
        { status: 404 }
      )
    }

    // Get usernames for members
    const memberFids = party.party_members?.map((m: { fid: number }) => m.fid) || []

    if (memberFids.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('privy_id, username, display_name, avatar_url, farcaster_fid')
        .in('farcaster_fid', memberFids)

      // Merge user data into members
      const membersWithUserData = party.party_members?.map((member: { fid: number; [key: string]: unknown }) => {
        const user = users?.find((u: { farcaster_fid: number | null }) => u.farcaster_fid === member.fid)
        return {
          ...member,
          username: user?.username,
          displayName: user?.display_name,
          avatarUrl: user?.avatar_url,
        }
      })

      party.party_members = membersWithUserData
    }

    return NextResponse.json({ party })
  } catch (error) {
    console.error('Get party error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
