import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function makeStephAdmin() {
  // First check if user exists
  const { data: checkUser, error: checkError } = await supabase
    .from('users')
    .select('privy_id, username, display_name, role')
    .eq('username', 'steph')
    .single()

  if (checkError || !checkUser) {
    console.error('❌ User with username "steph" not found!')
    console.log('Available users with similar names:')

    // Search for similar usernames
    const { data: similarUsers } = await supabase
      .from('users')
      .select('username, display_name, role')
      .or('username.ilike.%steph%,display_name.ilike.%steph%')
      .limit(5)

    if (similarUsers && similarUsers.length > 0) {
      similarUsers.forEach(u => {
        console.log(`  - Username: ${u.username || 'Not set'}, Display: ${u.display_name || 'Not set'}, Role: ${u.role}`)
      })
    }
    return
  }

  console.log(`Found user: ${checkUser.username} (${checkUser.display_name})`)
  console.log(`Current role: ${checkUser.role}`)

  // Update to admin
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('username', 'steph')
    .select('privy_id, username, display_name, role')
    .single()

  if (error) {
    console.error('❌ Error updating user:', error)
  } else {
    console.log('✅ Successfully made "steph" an admin!')
    console.log(`Updated user: ${data.username} (${data.display_name})`)
    console.log(`New role: ${data.role}`)
  }
}

makeStephAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script error:', err)
    process.exit(1)
  })