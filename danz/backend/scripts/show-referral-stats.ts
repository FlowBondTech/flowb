import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function showReferralStats() {
  console.log('Referral System Statistics\n')
  console.log('═'.repeat(80))

  // 1. Get all referral codes with their owners
  const { data: referralCodes, error: codeError } = await supabase
    .from('referral_codes')
    .select('code, user_id')

  if (codeError) {
    console.error('Error fetching referral codes:', codeError)
    return
  }

  // 2. Get all users with their referral info
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('privy_id, username, display_name, invited_by, referral_count, referral_points_earned')
    .order('referral_count', { ascending: false })

  if (userError) {
    console.error('Error fetching users:', userError)
    return
  }

  // 3. Get all completed referrals
  const { data: referrals, error: refError } = await supabase
    .from('referrals')
    .select('referral_code, referee_id, status')

  if (refError) {
    console.error('Error fetching referrals:', refError)
    return
  }

  // 4. Get click tracking data
  const { data: clicks, error: clickError } = await supabase
    .from('referral_click_tracking')
    .select('referral_code')

  if (clickError) {
    console.error('Error fetching clicks:', clickError)
    return
  }

  // Calculate stats
  const clicksByCode = new Map<string, number>()
  clicks?.forEach(click => {
    clicksByCode.set(click.referral_code, (clicksByCode.get(click.referral_code) || 0) + 1)
  })

  const referralsByCode = new Map<string, number>()
  referrals?.forEach(ref => {
    referralsByCode.set(ref.referral_code, (referralsByCode.get(ref.referral_code) || 0) + 1)
  })

  // Show top referrers
  console.log('TOP REFERRERS (by invited_by field):')
  console.log('-'.repeat(80))

  const inviteCounts = new Map<string, number>()
  users?.forEach(user => {
    if (user.invited_by) {
      inviteCounts.set(user.invited_by, (inviteCounts.get(user.invited_by) || 0) + 1)
    }
  })

  const sortedInviters = Array.from(inviteCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  if (sortedInviters.length === 0) {
    console.log('No users have been invited yet')
  } else {
    sortedInviters.forEach(([inviter, count], index) => {
      const clicks = clicksByCode.get(inviter) || 0
      const conversions = referralsByCode.get(inviter) || 0
      const conversionRate = clicks > 0 ? ((count / clicks) * 100).toFixed(1) : '0.0'

      console.log(`${index + 1}. ${inviter}:`)
      console.log(`   Users invited: ${count}`)
      console.log(`   Clicks tracked: ${clicks}`)
      console.log(`   Conversion rate: ${conversionRate}%`)
      console.log()
    })
  }

  // Show overall statistics
  console.log('═'.repeat(80))
  console.log('OVERALL STATISTICS:')
  console.log('-'.repeat(80))
  console.log(`Total users: ${users?.length || 0}`)
  console.log(`Users with referral codes: ${referralCodes?.length || 0}`)
  console.log(`Users who were invited: ${users?.filter(u => u.invited_by).length || 0}`)
  console.log(`Total clicks tracked: ${clicks?.length || 0}`)
  console.log(`Total referrals in system: ${referrals?.length || 0}`)

  // Show users without referrers
  console.log('\n' + '═'.repeat(80))
  console.log('USERS WITHOUT REFERRERS:')
  console.log('-'.repeat(80))

  const noReferrer = users?.filter(u => !u.invited_by && u.username) || []
  if (noReferrer.length === 0) {
    console.log('All users have referrers!')
  } else {
    console.log(`${noReferrer.length} users signed up without referral:`)
    noReferrer.slice(0, 20).forEach(user => {
      console.log(`  - ${user.username} (${user.display_name})`)
    })
    if (noReferrer.length > 20) {
      console.log(`  ... and ${noReferrer.length - 20} more`)
    }
  }

  // Show recent referral activity
  console.log('\n' + '═'.repeat(80))
  console.log('RECENT CLICK ACTIVITY (last 10):')
  console.log('-'.repeat(80))

  const { data: recentClicks } = await supabase
    .from('referral_click_tracking')
    .select('referral_code, clicked_at')
    .order('clicked_at', { ascending: false })
    .limit(10)

  if (recentClicks && recentClicks.length > 0) {
    recentClicks.forEach(click => {
      console.log(`  ${new Date(click.clicked_at).toLocaleString()} - Code: ${click.referral_code}`)
    })
  } else {
    console.log('No recent clicks')
  }
}

// Run the script
showReferralStats()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Script failed:', err)
    process.exit(1)
  })