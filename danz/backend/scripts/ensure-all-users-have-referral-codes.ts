import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function ensureAllUsersHaveReferralCodes() {
  console.log('Ensuring all users have referral codes...\n')
  console.log('═'.repeat(80))

  try {
    // 1. Get all users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('privy_id, username, display_name, created_at')
      .not('username', 'is', null) // Only users with usernames can have referral codes
      .order('created_at', { ascending: false })

    if (userError) {
      console.error('Error fetching users:', userError)
      return
    }

    console.log(`Found ${users?.length || 0} users with usernames\n`)

    // 2. Get all existing referral codes
    const { data: existingCodes, error: codeError } = await supabase
      .from('referral_codes')
      .select('user_id, code')

    if (codeError) {
      console.error('Error fetching referral codes:', codeError)
      return
    }

    // Create a map of user_id to referral code
    const userReferralMap = new Map(
      existingCodes?.map(code => [code.user_id, code.code]) || []
    )

    console.log(`Found ${existingCodes?.length || 0} existing referral codes\n`)
    console.log('-'.repeat(80))

    // 3. Find users without referral codes
    const usersWithoutCodes = users?.filter(user => !userReferralMap.has(user.privy_id)) || []

    if (usersWithoutCodes.length === 0) {
      console.log('✅ All users already have referral codes!')
      return
    }

    console.log(`Found ${usersWithoutCodes.length} users WITHOUT referral codes:\n`)

    // 4. Create referral codes for users who don't have them
    let successCount = 0
    let errorCount = 0

    for (const user of usersWithoutCodes) {
      console.log(`Creating referral code for ${user.username} (${user.display_name})...`)

      const { error: insertError } = await supabase
        .from('referral_codes')
        .insert({
          user_id: user.privy_id,
          code: user.username, // Use username as the referral code
        })

      if (insertError) {
        console.error(`  ❌ Failed: ${insertError.message}`)
        errorCount++
      } else {
        console.log(`  ✅ Created referral code: ${user.username}`)
        successCount++
      }
    }

    console.log('\n' + '═'.repeat(80))
    console.log('Summary:')
    console.log(`  Total users: ${users?.length || 0}`)
    console.log(`  Already had codes: ${users!.length - usersWithoutCodes.length}`)
    console.log(`  Created new codes: ${successCount}`)
    if (errorCount > 0) {
      console.log(`  Failed to create: ${errorCount}`)
    }

    // 5. Verify final state
    console.log('\n' + '-'.repeat(80))
    console.log('Verifying final state...\n')

    const { data: finalCodes, error: finalError } = await supabase
      .from('referral_codes')
      .select('code')

    if (finalError) {
      console.error('Error verifying:', finalError)
    } else {
      console.log(`✅ Total referral codes in system: ${finalCodes?.length || 0}`)

      // Show a sample of codes
      if (finalCodes && finalCodes.length > 0) {
        console.log('\nSample referral codes:')
        finalCodes.slice(0, 10).forEach(code => {
          console.log(`  - ${code.code}`)
        })
        if (finalCodes.length > 10) {
          console.log(`  ... and ${finalCodes.length - 10} more`)
        }
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the script
ensureAllUsersHaveReferralCodes()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Script failed:', err)
    process.exit(1)
  })