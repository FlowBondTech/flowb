import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function testAdminData() {
  console.log('Testing Admin Data Setup\n')
  console.log('=' .repeat(80))

  // 1. Check admin users
  console.log('\n1. Admin Users:')
  console.log('-'.repeat(40))

  const { data: admins } = await supabase
    .from('users')
    .select('privy_id, username, display_name, role, created_at')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    console.log(`✅ Found ${admins.length} admin(s):`)
    admins.forEach(admin => {
      console.log(`   ${admin.username} (${admin.display_name || 'No display name'})`)
      console.log(`     ID: ${admin.privy_id}`)
      console.log(`     Created: ${new Date(admin.created_at).toLocaleString()}`)
    })
  } else {
    console.log('❌ No admin users found')
  }

  // 2. Check all users with their referral stats
  console.log('\n2. All Users with Referral Stats:')
  console.log('-'.repeat(40))

  const { data: users } = await supabase
    .from('users')
    .select('privy_id, username, display_name, role, referral_count, referral_points_earned, xp, level, total_sessions, invited_by, is_organizer_approved')
    .order('referral_count', { ascending: false, nullsFirst: false })
    .limit(10)

  if (users && users.length > 0) {
    console.log(`Top ${users.length} users by referrals:`)
    users.forEach(user => {
      console.log(`\n   ${user.username || 'No username'} (${user.display_name || 'No name'})`)
      console.log(`     Role: ${user.role}`)
      console.log(`     Referrals: ${user.referral_count || 0}`)
      console.log(`     Referral Points: ${user.referral_points_earned || 0}`)
      console.log(`     XP: ${user.xp || 0}, Level: ${user.level || 0}`)
      console.log(`     Sessions: ${user.total_sessions || 0}`)
      if (user.invited_by) {
        console.log(`     Invited by: ${user.invited_by}`)
      }
      if (user.is_organizer_approved !== null) {
        console.log(`     Organizer Approved: ${user.is_organizer_approved}`)
      }
    })
  }

  // 3. Check referral tracking data
  console.log('\n3. Referral System Status:')
  console.log('-'.repeat(40))

  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact' })

  const { count: usersWithReferrers } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .not('invited_by', 'is', null)

  const { count: referralCodes } = await supabase
    .from('referral_codes')
    .select('*', { count: 'exact' })

  const { count: referralClicks } = await supabase
    .from('referral_click_tracking')
    .select('*', { count: 'exact' })

  const { count: completedReferrals } = await supabase
    .from('referrals')
    .select('*', { count: 'exact' })

  console.log(`Total Users: ${totalUsers || 0}`)
  console.log(`Users with Referrers: ${usersWithReferrers || 0}`)
  console.log(`Referral Codes Created: ${referralCodes || 0}`)
  console.log(`Referral Clicks Tracked: ${referralClicks || 0}`)
  console.log(`Completed Referrals: ${completedReferrals || 0}`)

  // 4. Check for users needing role management
  console.log('\n4. Users Needing Role Management:')
  console.log('-'.repeat(40))

  const { data: organizerRequests } = await supabase
    .from('users')
    .select('username, display_name, role, is_organizer_approved')
    .eq('role', 'organizer')
    .eq('is_organizer_approved', false)

  if (organizerRequests && organizerRequests.length > 0) {
    console.log(`Found ${organizerRequests.length} pending organizer approval(s):`)
    organizerRequests.forEach(user => {
      console.log(`   - ${user.username} (${user.display_name || 'No name'})`)
    })
  } else {
    console.log('No pending organizer approvals')
  }

  // 5. Summary
  console.log('\n' + '='.repeat(80))
  console.log('Summary:')
  console.log(`✅ Admin users configured: ${admins?.length || 0}`)
  console.log(`✅ Total users in system: ${totalUsers || 0}`)
  console.log(`✅ Referral system tracking: ${usersWithReferrers || 0} referred users`)
  console.log(`✅ Admin dashboard should be accessible to:`)
  if (admins && admins.length > 0) {
    admins.forEach(admin => {
      console.log(`   - ${admin.username}`)
    })
  }
}

// Run the test
testAdminData()
  .then(() => {
    console.log('\n✨ Test complete!')
    console.log('\nTo access the admin dashboard:')
    console.log('1. Log in as one of the admin users listed above')
    console.log('2. Navigate to: http://localhost:3000/dashboard/admin/users')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Test error:', err)
    process.exit(1)
  })