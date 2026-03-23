import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function testReferralStats() {
  console.log('Testing Referral Stats\n')
  console.log('=' .repeat(80))

  // Test a few users who might have referrals
  const testUsers = ['koh', 'sdf', 'Me', 'steph', 'russ01']

  for (const username of testUsers) {
    console.log(`\nChecking stats for user: ${username}`)
    console.log('-'.repeat(40))

    // Get users invited by this username
    const { data: invitedUsers, count: totalSignups } = await supabase
      .from('users')
      .select('username, display_name, total_sessions, created_at', { count: 'exact' })
      .eq('invited_by', username)

    // Get click tracking for this username
    const { count: totalClicks } = await supabase
      .from('referral_click_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code', username)

    if ((totalSignups || 0) > 0) {
      console.log(`✅ Found ${totalSignups} users invited by ${username}:`)

      invitedUsers?.forEach(user => {
        const hasSession = user.total_sessions && user.total_sessions > 0
        console.log(`   - ${user.username || 'No username'} (${user.display_name || 'No name'})`)
        console.log(`     Sessions: ${user.total_sessions || 0} ${hasSession ? '✅ Completed' : '⏳ Pending'}`)
        console.log(`     Joined: ${new Date(user.created_at).toLocaleDateString()}`)
      })

      // Calculate stats
      const completedCount = invitedUsers?.filter(u => u.total_sessions && u.total_sessions > 0).length || 0
      const pendingCount = (totalSignups || 0) - completedCount
      const pointsEarned = completedCount * 20
      const conversionRate = totalClicks && totalClicks > 0
        ? Math.round(((totalSignups || 0) / totalClicks) * 100)
        : 0

      console.log(`\n  📊 Stats Summary:`)
      console.log(`     Clicks: ${totalClicks || 0}`)
      console.log(`     Signups: ${totalSignups}`)
      console.log(`     Completed: ${completedCount}`)
      console.log(`     Pending: ${pendingCount}`)
      console.log(`     Points Earned: ${pointsEarned}`)
      console.log(`     Conversion Rate: ${conversionRate}%`)
    } else {
      console.log(`  No users invited by ${username}`)
      console.log(`  Clicks tracked: ${totalClicks || 0}`)
    }
  }

  // Overall summary
  console.log('\n' + '='.repeat(80))
  console.log('Overall Referral System Summary:')
  console.log('-'.repeat(40))

  const { count: totalUsersWithReferrers } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .not('invited_by', 'is', null)

  const { count: totalClicks } = await supabase
    .from('referral_click_tracking')
    .select('*', { count: 'exact' })

  const { data: topReferrers } = await supabase
    .from('users')
    .select('invited_by')
    .not('invited_by', 'is', null)

  // Count referrals by referrer
  const referralCounts = new Map<string, number>()
  topReferrers?.forEach(user => {
    if (user.invited_by) {
      referralCounts.set(user.invited_by, (referralCounts.get(user.invited_by) || 0) + 1)
    }
  })

  const sortedReferrers = Array.from(referralCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  console.log(`Total users with referrers: ${totalUsersWithReferrers || 0}`)
  console.log(`Total clicks tracked: ${totalClicks || 0}`)

  if (sortedReferrers.length > 0) {
    console.log(`\nTop Referrers:`)
    sortedReferrers.forEach(([username, count], index) => {
      console.log(`  ${index + 1}. ${username}: ${count} referrals`)
    })
  }
}

// Run the test
testReferralStats()
  .then(() => {
    console.log('\n✨ Test complete!')
    console.log('\n📱 Now check the referral dashboard at:')
    console.log('   http://localhost:3000/dashboard/referrals')
    console.log('\n👤 Admin dashboard at:')
    console.log('   http://localhost:3000/dashboard/admin/users')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Test error:', err)
    process.exit(1)
  })