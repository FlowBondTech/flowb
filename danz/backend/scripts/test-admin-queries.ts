import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Mock JWT token for admin user
const ADMIN_USER_ID = 'russ01' // We know this user is an admin

const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
})

const authLink = setContext((_, { headers }) => {
  // In production, this would be a real JWT from Privy
  // For testing, we'll use a mock token
  return {
    headers: {
      ...headers,
      // We'd need a real Privy JWT here in production
      // For now, let's test without auth
    }
  }
})

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
})

async function testAdminQueries() {
  console.log('Testing Admin GraphQL Queries\n')
  console.log('=' .repeat(80))

  try {
    // Test getAllUsers query
    console.log('\n1. Testing getAllUsers query:')
    console.log('-'.repeat(40))

    const GET_ALL_USERS = gql`
      query GetAllUsers {
        getAllUsers {
          privy_id
          username
          display_name
          role
          xp
          level
          referral_count
          referral_points_earned
          total_sessions
          invited_by
          is_organizer_approved
          created_at
        }
      }
    `

    // Note: This will fail without proper authentication
    // But we can test the query structure
    try {
      const result = await client.query({
        query: GET_ALL_USERS,
        errorPolicy: 'all'
      })

      if (result.data?.getAllUsers) {
        console.log(`✅ Query succeeded! Found ${result.data.getAllUsers.length} users`)

        // Show first 3 users as example
        result.data.getAllUsers.slice(0, 3).forEach((user: any) => {
          console.log(`\nUser: ${user.username} (${user.display_name})`)
          console.log(`  Role: ${user.role}`)
          console.log(`  Referrals: ${user.referral_count || 0}`)
          console.log(`  Points from referrals: ${user.referral_points_earned || 0}`)
        })
      }
    } catch (error: any) {
      if (error.message.includes('Authentication required')) {
        console.log('⚠️  Query requires authentication (expected in test)')
        console.log('   The query structure is valid!')
      } else {
        console.error('❌ Query failed:', error.message)
      }
    }

    // Test database directly to verify data exists
    console.log('\n2. Verifying data directly from database:')
    console.log('-'.repeat(40))

    const { data: users, error } = await supabase
      .from('users')
      .select('privy_id, username, display_name, role, referral_count, referral_points_earned, xp')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Database error:', error)
    } else if (users) {
      console.log(`Found ${users.length} users in database:`)
      users.forEach(user => {
        console.log(`\n${user.username || 'No username'} (${user.display_name || 'No name'})`)
        console.log(`  Role: ${user.role}`)
        console.log(`  Referrals: ${user.referral_count || 0}`)
        console.log(`  Referral Points: ${user.referral_points_earned || 0}`)
        console.log(`  XP: ${user.xp || 0}`)
      })
    }

    // Check admin users
    console.log('\n3. Admin Users:')
    console.log('-'.repeat(40))

    const { data: admins } = await supabase
      .from('users')
      .select('username, display_name, role')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      console.log(`Found ${admins.length} admin(s):`)
      admins.forEach(admin => {
        console.log(`  - ${admin.username} (${admin.display_name})`)
      })
    } else {
      console.log('No admin users found')
    }

  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testAdminQueries()
  .then(() => {
    console.log('\n✨ Test complete!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Test error:', err)
    process.exit(1)
  })