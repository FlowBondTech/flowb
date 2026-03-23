import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function makeKohAdmin() {
  console.log('Making user "koh" an admin...\n')

  // First check if koh exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('privy_id, username, display_name, role')
    .eq('username', 'koh')
    .single()

  if (userError || !user) {
    console.error('❌ User "koh" not found:', userError)

    // Try to find similar usernames
    const { data: similarUsers } = await supabase
      .from('users')
      .select('username, display_name, role')
      .ilike('username', '%koh%')

    if (similarUsers && similarUsers.length > 0) {
      console.log('\nFound similar usernames:')
      similarUsers.forEach(u => {
        console.log(`  - ${u.username} (${u.display_name}) - Role: ${u.role}`)
      })
    }
    return
  }

  console.log(`Found user: ${user.username} (${user.display_name})`)
  console.log(`Current role: ${user.role}`)

  if (user.role === 'admin') {
    console.log('✅ User is already an admin!')
    return
  }

  // Update to admin
  const { error: updateError } = await supabase
    .from('users')
    .update({
      role: 'admin',
      updated_at: new Date().toISOString()
    })
    .eq('privy_id', user.privy_id)

  if (updateError) {
    console.error('❌ Failed to update role:', updateError)
  } else {
    console.log('✅ Successfully made "koh" an admin!')
  }

  // Verify the update
  const { data: updatedUser } = await supabase
    .from('users')
    .select('username, display_name, role')
    .eq('privy_id', user.privy_id)
    .single()

  if (updatedUser) {
    console.log(`\nVerified: ${updatedUser.username} is now ${updatedUser.role}`)
  }
}

// Run the script
makeKohAdmin()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Script failed:', err)
    process.exit(1)
  })