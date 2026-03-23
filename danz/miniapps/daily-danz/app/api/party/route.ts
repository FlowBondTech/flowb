import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getUserByFid } from '@/lib/supabase'

/**
 * GET /api/party
 *
 * List parties - discover public parties or get user's party
 * Query params:
 *   - fid: User's FID to get their party
 *   - discover: true to get public parties to join
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fidParam = searchParams.get('fid')
    const discover = searchParams.get('discover') === 'true'

    const supabase = getSupabaseAdmin()

    if (discover) {
      // Get public parties that are open to join
      const { data: parties, error } = await supabase
        .from('parties')
        .select(`
          *,
          party_members (
            id, user_id, fid, role, current_streak,
            total_contributions, is_active_today, joined_at
          )
        `)
        .eq('status', 'active')
        .eq('is_public', true)
        .order('weekly_xp', { ascending: false })
        .limit(20)

      if (error) throw error

      // Filter parties that aren't full
      const openParties = parties?.filter(p =>
        (p.party_members?.length || 0) < p.max_members
      )

      return NextResponse.json({ parties: openParties })
    }

    // Get user's party
    if (!fidParam) {
      return NextResponse.json({ error: 'FID required' }, { status: 400 })
    }

    const fid = parseInt(fidParam, 10)
    const user = await getUserByFid(fid)

    if (!user) {
      return NextResponse.json({ party: null, membership: null })
    }

    // Find user's party membership
    const { data: membership } = await supabase
      .from('party_members')
      .select(`
        *,
        party:parties (
          *,
          party_members (
            id, user_id, fid, role, current_streak,
            total_contributions, is_active_today, joined_at
          )
        )
      `)
      .eq('user_id', user.privy_id)
      .single()

    return NextResponse.json({
      party: membership?.party || null,
      membership: membership ? {
        id: membership.id,
        role: membership.role,
        current_streak: membership.current_streak,
        total_contributions: membership.total_contributions,
        is_active_today: membership.is_active_today,
        joined_at: membership.joined_at,
      } : null,
    })
  } catch (error) {
    console.error('Get party error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/party
 *
 * Create a new party
 * Requires $2 USDC payment transaction hash
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fid, name, description, emoji, isPublic, txHash } = body

    if (!fid || !name) {
      return NextResponse.json(
        { error: 'FID and name required' },
        { status: 400 }
      )
    }

    // Require payment transaction hash
    if (!txHash) {
      return NextResponse.json(
        { error: 'Payment required. Please pay $2 USDC to create a party.' },
        { status: 402 } // Payment Required
      )
    }

    // Validate txHash format (should be 0x followed by 64 hex characters)
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash' },
        { status: 400 }
      )
    }

    const user = await getUserByFid(fid)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Check in first to create account.' },
        { status: 404 }
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
        { error: 'You are already in a party. Leave first to create a new one.' },
        { status: 400 }
      )
    }

    // Generate join code
    const { data: joinCodeResult } = await supabase
      .rpc('generate_join_code')

    const joinCode = joinCodeResult || Math.random().toString(36).substring(2, 8).toUpperCase()

    // Create the party with payment reference
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .insert({
        name: name.trim().substring(0, 50),
        description: description?.trim().substring(0, 200) || null,
        avatar_emoji: emoji || '🎉',
        is_public: isPublic !== false,
        join_code: joinCode,
        created_by: user.privy_id,
        payment_tx_hash: txHash, // Store payment transaction hash
      })
      .select()
      .single()

    if (partyError) {
      console.error('Create party error:', partyError)
      return NextResponse.json(
        { error: 'Failed to create party' },
        { status: 500 }
      )
    }

    // Add creator as leader
    const { error: memberError } = await supabase
      .from('party_members')
      .insert({
        party_id: party.id,
        user_id: user.privy_id,
        fid,
        role: 'leader',
        current_streak: user.current_streak || 0,
      })

    if (memberError) {
      console.error('Add member error:', memberError)
      // Rollback party creation
      await supabase.from('parties').delete().eq('id', party.id)
      return NextResponse.json(
        { error: 'Failed to add you as party leader' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      party: {
        ...party,
        party_members: [{
          user_id: user.privy_id,
          fid,
          role: 'leader',
          current_streak: user.current_streak || 0,
          total_contributions: 0,
          is_active_today: false,
          joined_at: new Date().toISOString(),
        }],
      },
    })
  } catch (error) {
    console.error('Create party error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
