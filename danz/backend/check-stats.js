#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eoajujwpdkfuicnoxetk.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY

async function checkStats() {
  console.log('🔍 Checking database stats...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Check users with stats
  console.log('👤 User Stats:')
  const { data: users, error: userError } = await supabase
    .from('users')
    .select(
      'privy_id, username, display_name, total_events_created, total_events_attended, upcoming_events_count, total_achievements, dance_bonds_count',
    )
    .not('username', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (userError) {
    console.log('  Error:', userError.message)
  } else {
    users.forEach(u => {
      console.log(`  ${u.display_name || u.username || 'Unknown'}:`)
      console.log(`    - Events created: ${u.total_events_created || 0}`)
      console.log(`    - Events attended: ${u.total_events_attended || 0}`)
      console.log(`    - Upcoming: ${u.upcoming_events_count || 0}`)
      console.log(`    - privy_id: ${u.privy_id?.substring(0, 20)}...`)
    })
  }

  // Check events
  console.log('\n📅 Events:')
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, title, facilitator_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (eventError) {
    console.log('  Error:', eventError.message)
  } else {
    console.log(`  Total recent events: ${events.length}`)
    events.forEach(e => {
      console.log(`  - "${e.title}" by ${e.facilitator_id?.substring(0, 20)}...`)
    })
  }

  // Count events per facilitator
  console.log('\n📊 Events per facilitator:')
  const { data: allEvents } = await supabase.from('events').select('facilitator_id')

  if (allEvents) {
    const counts = {}
    allEvents.forEach(e => {
      counts[e.facilitator_id] = (counts[e.facilitator_id] || 0) + 1
    })

    // Match with usernames
    for (const [facId, count] of Object.entries(counts)) {
      const { data: user } = await supabase
        .from('users')
        .select('username, display_name')
        .eq('privy_id', facId)
        .single()

      console.log(
        `  ${user?.display_name || user?.username || facId.substring(0, 20)}: ${count} events`,
      )
    }
  }

  // Check if triggers exist (indirectly by checking if columns exist)
  console.log('\n🔧 Checking if stats columns exist in users table...')
  const { data: sampleUser } = await supabase
    .from('users')
    .select('total_events_created, total_events_attended, upcoming_events_count')
    .limit(1)
    .single()

  if (sampleUser) {
    console.log('  ✅ Stats columns exist')
    console.log(
      `  Sample values: created=${sampleUser.total_events_created}, attended=${sampleUser.total_events_attended}`,
    )
  } else {
    console.log('  ⚠️ Stats columns may not exist - migration needed')
  }
}

checkStats().catch(console.error)
