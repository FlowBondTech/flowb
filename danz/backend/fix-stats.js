#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eoajujwpdkfuicnoxetk.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY

async function fixStats() {
  console.log('🔧 Fixing user stats...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Get all users
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('privy_id, username, display_name')

  if (userError) {
    console.log('Error fetching users:', userError.message)
    return
  }

  console.log(`Found ${users.length} users to update\n`)

  for (const user of users) {
    const privyId = user.privy_id

    // Count events created by this user
    const { count: eventsCreated } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('facilitator_id', privyId)

    // Count events attended
    const { count: eventsAttended } = await supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', privyId)
      .eq('status', 'attended')

    // Count upcoming events
    const { data: upcomingEvents } = await supabase
      .from('event_registrations')
      .select('id, events!inner(start_date_time)')
      .eq('user_id', privyId)
      .eq('status', 'registered')
      .gt('events.start_date_time', new Date().toISOString())

    const upcomingCount = upcomingEvents?.length || 0

    // Count achievements
    const { count: achievementsCount } = await supabase
      .from('achievements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', privyId)

    // Count dance bonds
    const { count: bondsCount1 } = await supabase
      .from('dance_bonds')
      .select('id', { count: 'exact', head: true })
      .eq('user1_id', privyId)

    const { count: bondsCount2 } = await supabase
      .from('dance_bonds')
      .select('id', { count: 'exact', head: true })
      .eq('user2_id', privyId)

    const totalBonds = (bondsCount1 || 0) + (bondsCount2 || 0)

    // Update the user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_events_created: eventsCreated || 0,
        total_events_attended: eventsAttended || 0,
        upcoming_events_count: upcomingCount,
        total_achievements: achievementsCount || 0,
        dance_bonds_count: totalBonds,
      })
      .eq('privy_id', privyId)

    if (updateError) {
      console.log(`  ❌ ${user.display_name || user.username}: ${updateError.message}`)
    } else if (eventsCreated > 0 || eventsAttended > 0) {
      console.log(
        `  ✅ ${user.display_name || user.username}: created=${eventsCreated}, attended=${eventsAttended}, upcoming=${upcomingCount}`,
      )
    }
  }

  console.log('\n✨ Stats update complete!\n')

  // Verify
  console.log('📊 Verification:')
  const { data: updatedUsers } = await supabase
    .from('users')
    .select('display_name, username, total_events_created, total_events_attended')
    .gt('total_events_created', 0)
    .order('total_events_created', { ascending: false })

  if (updatedUsers && updatedUsers.length > 0) {
    updatedUsers.forEach(u => {
      console.log(
        `  ${u.display_name || u.username}: ${u.total_events_created} events created, ${u.total_events_attended} attended`,
      )
    })
  } else {
    console.log('  No users with events found')
  }
}

fixStats().catch(console.error)
