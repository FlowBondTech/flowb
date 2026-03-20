import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function listUsers() {
  try {
    console.log('Fetching all users from database...\n')

    const { data: users, error } = await supabase
      .from('users')
      .select('privy_id, username, display_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    console.log(`Found ${users?.length || 0} users:\n`)
    console.log('═'.repeat(80))

    users?.forEach((user, index) => {
      console.log(`${index + 1}. Username: ${user.username || 'Not set'}`)
      console.log(`   Display: ${user.display_name || 'Not set'}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Privy ID: ${user.privy_id}`)
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`)
      console.log('-'.repeat(40))
    })

    // Count users by role
    const adminCount = users?.filter(u => u.role === 'admin').length || 0
    const userCount = users?.filter(u => u.role === 'user').length || 0

    console.log('\nSummary:')
    console.log(`- Admins: ${adminCount}`)
    console.log(`- Regular Users: ${userCount}`)

  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the script
listUsers()
  .then(() => {
    console.log('\nScript completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })