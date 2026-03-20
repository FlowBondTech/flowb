import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getUserByFid } from '@/lib/supabase'

/**
 * POST /api/party/[id]/leave
 *
 * Leave a party
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partyId } = await params
    const body = await request.json()
    const { fid } = body

    if (!fid) {
      return NextResponse.json({ error: 'FID required' }, { status: 400 })
    }

    const user = await getUserByFid(fid)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = getSupabaseAdmin()

    // Find membership
    const { data: membership, error: findError } = await supabase
      .from('party_members')
      .select('id, role, party_id')
      .eq('party_id', partyId)
      .eq('user_id', user.privy_id)
      .single()

    if (findError || !membership) {
      return NextResponse.json(
        { error: 'You are not in this party' },
        { status: 404 }
      )
    }

    // Get party info
    const { data: party } = await supabase
      .from('parties')
      .select('*, party_members(id, role)')
      .eq('id', partyId)
      .single()

    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    const memberCount = party.party_members?.length || 0

    // If user is the leader
    if (membership.role === 'leader') {
      if (memberCount === 1) {
        // Last member - disband party
        await supabase
          .from('party_members')
          .delete()
          .eq('id', membership.id)

        await supabase
          .from('parties')
          .update({ status: 'disbanded' })
          .eq('id', partyId)

        return NextResponse.json({
          success: true,
          message: 'Party disbanded (you were the last member)',
          disbanded: true,
        })
      } else {
        // Transfer leadership to co-leader or oldest member
        const { data: newLeader } = await supabase
          .from('party_members')
          .select('id, user_id')
          .eq('party_id', partyId)
          .neq('id', membership.id)
          .order('role', { ascending: true }) // co_leader comes before member
          .order('joined_at', { ascending: true })
          .limit(1)
          .single()

        if (newLeader) {
          await supabase
            .from('party_members')
            .update({ role: 'leader' })
            .eq('id', newLeader.id)
        }
      }
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('party_members')
      .delete()
      .eq('id', membership.id)

    if (deleteError) {
      console.error('Leave party error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to leave party' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'You have left the party',
    })
  } catch (error) {
    console.error('Leave party error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
