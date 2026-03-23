import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function makeRussAdmin() {
  // Update russ01 to admin
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('username', 'russ01')  // or use privy_id: 'did:privy:cmi82lzvj00o7jv0e9lqp8y84'
    .select()
    .single()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ Successfully made russ01 an admin!')
    console.log('User:', data)
  }
}

makeRussAdmin()