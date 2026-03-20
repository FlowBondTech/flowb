import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function testEventRegistrations() {
  console.log('Testing Event Registrations Data\n')
  console.log('='.repeat(80))

  // 1. Check if event_registrations table has data
  console.log('\n1. Event Registrations Table:')
  console.log('-'.repeat(40))

  const { data: registrations, count: regCount } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10)

  console.log(`Total event registrations: ${regCount || 0}`)

  if (registrations && registrations.length > 0) {
    console.log('\nSample registrations:')
    registrations.forEach(reg => {
      console.log(`\nRegistration ID: ${reg.id}`)
      console.log(`  User ID: ${reg.user_id}`)
      console.log(`  Event ID: ${reg.event_id}`)
      console.log(`  Status: ${reg.status}`)
      console.log(`  Payment: ${reg.payment_status} - $${reg.payment_amount || 0}`)
      console.log(`  User Notes: ${reg.user_notes || 'None'}`)
      console.log(`  Admin Notes: ${reg.admin_notes || 'None'}`)
      console.log(`  Checked In: ${reg.checked_in}`)
      console.log(`  Created: ${new Date(reg.created_at).toLocaleString()}`)
    })
  }

  // 2. Check registrations with full joins
  console.log('\n2. Registrations with User and Event Info:')
  console.log('-'.repeat(40))

  const { data: fullRegistrations, error } = await supabase
    .from('event_registrations')
    .select(`
      *,
      user:users!event_registrations_user_id_fkey(
        privy_id,
        username,
        display_name
      ),
      event:events!event_registrations_event_id_fkey(
        id,
        title,
        start_date_time,
        location_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching with joins:', error)
  } else if (fullRegistrations && fullRegistrations.length > 0) {
    console.log(`Found ${fullRegistrations.length} registrations with full info:`)
    fullRegistrations.forEach(reg => {
      console.log(`\n${reg.user?.display_name || reg.user?.username || 'Unknown User'} registered for ${reg.event?.title || 'Unknown Event'}`)
      console.log(`  Status: ${reg.status} | Payment: ${reg.payment_status}`)
      console.log(`  Event Date: ${reg.event?.start_date_time ? new Date(reg.event.start_date_time).toLocaleString() : 'Unknown'}`)
      console.log(`  Location: ${reg.event?.location_name || 'Unknown'}`)
      if (reg.user_notes) {
        console.log(`  User Notes: "${reg.user_notes}"`)
      }
    })
  } else {
    console.log('No registrations found with joins')
  }

  // 3. Check if there are events
  console.log('\n3. Events Table:')
  console.log('-'.repeat(40))

  const { count: eventCount } = await supabase
    .from('events')
    .select('*', { count: 'exact' })

  console.log(`Total events: ${eventCount || 0}`)

  // 4. Check if there are users
  console.log('\n4. Users Table:')
  console.log('-'.repeat(40))

  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact' })

  console.log(`Total users: ${userCount || 0}`)

  // 5. Summary
  console.log('\n' + '='.repeat(80))
  console.log('Summary:')
  console.log(`✅ Total Users: ${userCount || 0}`)
  console.log(`✅ Total Events: ${eventCount || 0}`)
  console.log(`✅ Total Event Registrations: ${regCount || 0}`)

  if ((regCount || 0) === 0) {
    console.log('\n❌ No event registrations found in the database!')
    console.log('   Users may not have registered for events yet.')
  }
}

// Run the test
testEventRegistrations()
  .then(() => {
    console.log('\n✨ Test complete!')
    console.log('\n📱 Check the admin registrations page at:')
    console.log('   http://localhost:3000/dashboard/admin/registrations')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Test error:', err)
    process.exit(1)
  })