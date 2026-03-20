import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function checkReferrals() {
  console.log('Checking referral data for code: koh\n')
  console.log('═'.repeat(80))

  // 1. Check referral_codes table
  console.log('1. REFERRAL CODES:')
  const { data: referralCode, error: codeError } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('code', 'koh')
    .single()

  if (codeError) {
    console.log('   ❌ No referral code found for "koh"')
    console.log('   Error:', codeError.message)
  } else {
    console.log('   ✅ Referral code exists:')
    console.log('      User ID:', referralCode.user_id)
    console.log('      Code:', referralCode.code)
    console.log('      Created:', new Date(referralCode.created_at).toLocaleString())
  }

  console.log('\n' + '-'.repeat(80))

  // 2. Check referral_click_tracking table
  console.log('2. CLICK TRACKING (last 10 clicks for "koh"):')
  const { data: clicks, error: clickError } = await supabase
    .from('referral_click_tracking')
    .select('*')
    .eq('referral_code', 'koh')
    .order('clicked_at', { ascending: false })
    .limit(10)

  if (clickError) {
    console.log('   Error fetching clicks:', clickError.message)
  } else if (!clicks || clicks.length === 0) {
    console.log('   No clicks tracked for this referral code')
  } else {
    console.log(`   Found ${clicks.length} recent clicks:`)
    clicks.forEach((click, i) => {
      console.log(`\n   Click #${i + 1}:`)
      console.log('      Clicked at:', new Date(click.clicked_at).toLocaleString())
      console.log('      IP:', click.ip_address || 'Not recorded')
      console.log('      User Agent:', click.user_agent?.substring(0, 50) + '...')
      console.log('      Device:', click.device_id)
    })
  }

  console.log('\n' + '-'.repeat(80))

  // 3. Check referrals table (completed referrals)
  console.log('3. COMPLETED REFERRALS (users who signed up with "koh" code):')
  const { data: referrals, error: refError } = await supabase
    .from('referrals')
    .select('*')
    .eq('referral_code', 'koh')
    .order('created_at', { ascending: false })

  if (refError) {
    console.log('   Error fetching referrals:', refError.message)
  } else if (!referrals || referrals.length === 0) {
    console.log('   ❌ No completed referrals yet')
  } else {
    console.log(`   ✅ Found ${referrals.length} referrals:`)

    referrals.forEach((ref, i) => {
      console.log(`\n   Referral #${i + 1}:`)
      console.log('      Status:', ref.status)
      console.log('      Referee User ID:', ref.referee_user_id)
      console.log('      Points Earned:', ref.points_earned || 0)
      console.log('      Created:', new Date(ref.created_at).toLocaleString())
      if (ref.completed_at) {
        console.log('      Completed:', new Date(ref.completed_at).toLocaleString())
      }
    })
  }

  console.log('\n' + '-'.repeat(80))

  // 4. Check users table for invited_by field
  console.log('4. USERS INVITED BY "koh":')
  const { data: invitedUsers, error: userError } = await supabase
    .from('users')
    .select('privy_id, username, display_name, created_at, invited_by')
    .eq('invited_by', 'koh')
    .order('created_at', { ascending: false })
    .limit(10)

  if (userError) {
    console.log('   Error fetching users:', userError.message)
  } else if (!invitedUsers || invitedUsers.length === 0) {
    console.log('   No users with invited_by = "koh" yet')
  } else {
    console.log(`   Found ${invitedUsers.length} users invited by koh:`)
    invitedUsers.forEach((user, i) => {
      console.log(`\n   User #${i + 1}:`)
      console.log('      Username:', user.username || 'Not set')
      console.log('      Display Name:', user.display_name)
      console.log('      Joined:', new Date(user.created_at).toLocaleString())
    })
  }

  console.log('\n' + '-'.repeat(80))

  // 5. Check the user "koh" and their referral stats
  console.log('5. USER "koh" REFERRAL STATS:')
  const { data: kohUser, error: kohError } = await supabase
    .from('users')
    .select('*')
    .eq('username', 'koh')
    .single()

  if (kohError || !kohUser) {
    console.log('   User "koh" not found')
  } else {
    console.log('   User found:')
    console.log('      Display Name:', kohUser.display_name)
    console.log('      Referral Count:', kohUser.referral_count || 0)
    console.log('      Referral Points:', kohUser.referral_points_earned || 0)
    console.log('      Role:', kohUser.role)
  }

  console.log('\n' + '═'.repeat(80))
}

checkReferrals()
  .then(() => {
    console.log('\nDone checking referrals!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })