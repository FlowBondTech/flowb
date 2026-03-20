// Test script to verify database setup and connection
// Run with: node test-database.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔄 Testing Supabase connection...')
console.log(`URL: ${supabaseUrl}`)
console.log('-----------------------------------')

async function testDatabase() {
  try {
    // Test 1: Check if danz_users table exists
    console.log('\n📊 Test 1: Checking if danz_users table exists...')
    const { data: tables, error: tableError } = await supabase
      .from('danz_users')
      .select('*')
      .limit(1)
    
    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('❌ Table danz_users does not exist!')
        console.log('   Run the database/sql/setup-database.sql file in Supabase SQL editor')
      } else if (tableError.code === '42501') {
        console.log('⚠️  Table exists but RLS policies may need adjustment')
        console.log('   Error:', tableError.message)
      } else {
        console.log('❌ Error checking table:', tableError.message)
      }
    } else {
      console.log('✅ Table danz_users exists and is accessible')
      console.log(`   Found ${tables?.length || 0} existing users`)
    }

    // Test 2: Check if launch_signups fallback table exists
    console.log('\n📊 Test 2: Checking if launch_signups table exists...')
    const { data: signups, error: signupError } = await supabase
      .from('launch_signups')
      .select('*')
      .limit(1)
    
    if (signupError) {
      if (signupError.code === '42P01') {
        console.log('❌ Table launch_signups does not exist!')
        console.log('   Run the database/sql/setup-database.sql file in Supabase SQL editor')
      } else {
        console.log('⚠️  Error checking table:', signupError.message)
      }
    } else {
      console.log('✅ Table launch_signups exists and is accessible')
      console.log(`   Found ${signups?.length || 0} existing signups`)
    }

    // Test 3: Try to insert a test user
    console.log('\n📊 Test 3: Testing insert capability...')
    const testUser = {
      privy_id: `test_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      name: 'Test User',
      phone: '555-0100',
      auth_method: 'email',
      newsletter_subscribed: true,
      is_beta_tester: true
    }

    const { data: insertData, error: insertError } = await supabase
      .from('danz_users')
      .insert([testUser])
      .select()

    if (insertError) {
      if (insertError.code === '42P01') {
        console.log('❌ Cannot insert - table does not exist')
      } else if (insertError.code === '42501') {
        console.log('❌ Cannot insert - RLS policy issue')
        console.log('   Make sure the insert policy allows public access')
      } else {
        console.log('❌ Insert failed:', insertError.message)
      }
    } else {
      console.log('✅ Successfully inserted test user!')
      console.log(`   User ID: ${insertData[0].id}`)
      console.log(`   Email: ${insertData[0].email}`)
      console.log(`   Referral Code: ${insertData[0].referral_code}`)
      
      // Clean up test user
      const { error: deleteError } = await supabase
        .from('danz_users')
        .delete()
        .eq('id', insertData[0].id)
      
      if (!deleteError) {
        console.log('   (Test user cleaned up)')
      }
    }

    // Test 4: Check RLS policies
    console.log('\n📊 Test 4: Checking RLS policies...')
    const { data: policies, error: policyError } = await supabase
      .rpc('pg_policies', {})
      .eq('tablename', 'danz_users')
    
    if (!policyError && policies) {
      console.log('✅ RLS policies found for danz_users')
    } else {
      console.log('⚠️  Could not verify RLS policies')
    }

    // Summary
    console.log('\n-----------------------------------')
    console.log('📋 SUMMARY:')
    console.log('-----------------------------------')
    
    if (!tableError && !insertError) {
      console.log('✅ Database is properly configured!')
      console.log('   Your app should work correctly.')
    } else {
      console.log('⚠️  Database needs configuration:')
      console.log('   1. Go to Supabase SQL editor')
      console.log('   2. Run the contents of database/sql/setup-database.sql')
      console.log('   3. Try this test again')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the tests
testDatabase()
  .then(() => {
    console.log('\n✨ Test complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })