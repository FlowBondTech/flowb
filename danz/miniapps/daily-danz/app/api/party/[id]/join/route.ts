import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getUserByFid, getOrCreateUserByFid } from '@/lib/supabase'

interface JoinRequest {
  fid: number
  userData?: {
    username?: string
    displayName?: string
    pfpUrl?: string
  }
}

/**
 * POST /api/party/[id]/join
 *
 * Join a party by ID or join code
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partyIdOrCode } = await params
    const body: JoinRequest = await request.json()
    const { fid, userData } = body

    if (!fid) {
      return NextResponse.json({ error: 'FID required' }, { status: 400 })
    }

    // Get or create user
    const user = await getOrCreateUserByFid(fid, userData)
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to get or create user' },
        { status: 500 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Check if user is already in a party
    const { data: existingMembership } = await supabase
      .from('party_members')
      .select('id, party_id')
      .eq('user_id', user.privy_id)
      .single()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already in a party. Leave first to join another.' },
        { status: 400 }
      )
    }

    // Find party by ID or join code
    let party

    // Try as UUID first
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(partyIdOrCode)) {
      const { data } = await supabase
        .from('parties')
        .select('*, party_members(id)')
        .eq('id', partyIdOrCode)
        .eq('status', 'active')
        .single()
      party = data
    } else {
      // Try as join code
      const { data } = await supabase
        .from('parties')
        .select('*, party_members(id)')
        .eq('join_code', partyIdOrCode.toUpperCase())
        .eq('status', 'active')
        .single()
      party = data
    }

    if (!party) {
      return NextResponse.json(
        { error: 'Party not found' },
        { status: 404 }
      )
    }

    // Check if party is full
    const memberCount = party.party_members?.length || 0
    if (memberCount >= party.max_members) {
      return NextResponse.json(
        { error: 'Party is full' },
        { status: 400 }
      )
    }

    // Check if party is public or user has invite
    if (!party.is_public) {
      const { data: invite } = await supabase
        .from('party_invites')
        .select('id')
        .eq('party_id', party.id)
        .eq('invited_fid', fid)
        .eq('status', 'pending')
        .single()

      if (!invite) {
        return NextResponse.json(
          { error: 'This party is private. You need an invite to join.' },
          { status: 403 }
        )
      }

      // Mark invite as accepted
      await supabase
        .from('party_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invite.id)
    }

    // Add member to party
    const { data: membership, error: memberError } = await supabase
      .from('party_members')
      .insert({
        party_id: party.id,
        user_id: user.privy_id,
        fid,
        role: 'member',
        current_streak: user.current_streak || 0,
      })
      .select()
      .single()

    if (memberError) {
      console.error('Join party error:', memberError)
      return NextResponse.json(
        { error: 'Failed to join party' },
        { status: 500 }
      )
    }

    // Fetch full party data
    const { data: fullParty } = await supabase
      .from('parties')
      .select(`
        *,
        party_members (
          id, user_id, fid, role, current_streak,
          total_contributions, is_active_today, joined_at
        )
      `)
      .eq('id', party.id)
      .single()

    return NextResponse.json({
      success: true,
      party: fullParty,
      membership,
    })
  } catch (error) {
    console.error('Join party error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
