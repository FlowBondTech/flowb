import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('Testing Supabase connection...')
console.log('URL exists:', !!supabaseUrl)
console.log('Key exists:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in your .env file')
  process.exit(1)
}

console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test the connection
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('danz_users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      console.error('Error code:', error.code)
      console.error('Details:', error.details)
      console.error('Hint:', error.hint)
    } else {
      console.log('✅ Supabase connection successful!')
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

testConnection()