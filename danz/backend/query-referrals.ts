import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  const userId = 'did:privy:cmei8nagj00dwkz0cojwlqah8'

  console.log('📊 Querying referral data for koh...\n')

  // Get referral code and stats
  const { data: codeData, error: codeError } = await supabase
    .from('referral_codes')
    .select('code, created_at, is_active')
    .eq('user_id', userId)
    .single()

  if (codeError) {
    console.error('Error fetching referral code:', codeError)
    return
  }

  console.log('🔑 Referral Code:', codeData.code)
  console.log('🔗 Share URL:', `https://danz.now/i/${codeData.code}`)
  console.log('📅 Created:', new Date(codeData.created_at).toLocaleString())
  console.log('✅ Active:', codeData.is_active)
  console.log()

  // Get all referrals where koh is the referrer
  const { data: referrals, error: refError } = await supabase
    .from('referrals')
    .select(`
      id,
      status,
      clicked_at,
      signed_up_at,
      completed_at,
      referee_id,
      users:referee_id (
        username,
        display_name
      )
    `)
    .eq('referrer_id', userId)
    .order('clicked_at', { ascending: false })

  if (refError) {
    console.error('Error fetching referrals:', refError)
    return
  }

  // Calculate stats
  const stats = {
    total: referrals?.length || 0,
    clicked: referrals?.filter(r => r.status === 'pending').length || 0,
    signed_up: referrals?.filter(r => r.status === 'signed_up').length || 0,
    completed: referrals?.filter(r => r.status === 'completed').length || 0,
  }

  console.log('📈 Referral Statistics:')
  console.log('  Total Referrals:', stats.total)
  console.log('  Clicked:', stats.clicked)
  console.log('  Signed Up:', stats.signed_up)
  console.log('  Completed:', stats.completed)
  console.log()

  if (referrals && referrals.length > 0) {
    console.log('👥 Referred Users:')
    referrals.forEach((ref: any, index: number) => {
      const user = ref.users
      console.log(
        `\n  ${index + 1}. ${user?.username || 'Unknown'} (${user?.display_name || 'N/A'})`,
      )
      console.log(`     Status: ${ref.status}`)
      console.log(
        `     Clicked: ${ref.clicked_at ? new Date(ref.clicked_at).toLocaleString() : 'N/A'}`,
      )
      console.log(
        `     Signed up: ${ref.signed_up_at ? new Date(ref.signed_up_at).toLocaleString() : 'Not yet'}`,
      )
      console.log(
        `     Completed: ${ref.completed_at ? new Date(ref.completed_at).toLocaleString() : 'Not yet'}`,
      )
    })
  } else {
    console.log('👥 No referrals yet')
  }
}

main().catch(console.error)
