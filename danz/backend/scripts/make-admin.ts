import { PrivyClient } from '@privy-io/server-auth'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Privy client
const privyClient = new PrivyClient(
  process.env.PRIVY_CLIENT_ID!,
  process.env.PRIVY_APP_SECRET!
)

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function makeUserAdmin(email: string) {
  try {
    console.log(`Making ${email} an admin...`)

    // Find all Privy users (we'll filter for the email)
    // Note: Privy doesn't have direct getUserByEmail, so we need to check users
    console.log('Searching for user in Privy...')

    // First, let's check if the user exists in our database
    // We might already have their privy_id if they've logged in before
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('privy_id, username, display_name, role')

    if (searchError) {
      console.error('Error searching users:', searchError)
      return
    }

    // Try to find the user by checking Privy for each user
    let targetPrivyId: string | null = null

    for (const user of users || []) {
      try {
        const privyUser = await privyClient.getUserById(user.privy_id)
        if (privyUser.email?.address === email) {
          targetPrivyId = user.privy_id
          console.log(`Found user: ${user.username || user.display_name || 'No name'} (${user.privy_id})`)
          console.log(`Current role: ${user.role}`)
          break
        }
      } catch (err) {
        // User might not exist in Privy anymore, continue
        continue
      }
    }

    if (!targetPrivyId) {
      console.error(`User with email ${email} not found in the database.`)
      console.log('The user needs to sign up/login first before they can be made admin.')
      return
    }

    // Update the user's role to admin
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('privy_id', targetPrivyId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return
    }

    console.log('✅ Successfully updated user role to admin!')
    console.log('Updated user:', {
      privy_id: updatedUser.privy_id,
      username: updatedUser.username,
      display_name: updatedUser.display_name,
      role: updatedUser.role
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the script
const targetEmail = 'stepbystephbtm@gmail.com'
makeUserAdmin(targetEmail)
  .then(() => {
    console.log('Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })