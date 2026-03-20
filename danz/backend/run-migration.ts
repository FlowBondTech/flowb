import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runMigration(migrationFile: string) {
  console.log(`📄 Reading migration file: ${migrationFile}`)

  try {
    const sql = readFileSync(migrationFile, 'utf-8')

    console.log('🚀 Executing migration...')

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql RPC doesn't exist, we'll need to use the REST API directly
      console.log('⚠️  RPC method not available, using direct SQL execution...')

      // Split the SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      console.log(`📝 Found ${statements.length} SQL statements to execute`)

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        console.log(`   Executing statement ${i + 1}/${statements.length}...`)

        // Use Supabase query builder for compatible statements
        // For complex DDL, we need to use PostgreSQL connection
        try {
          // This won't work for all DDL, but it's a start
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ query: statement }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`   ❌ Failed: ${errorText}`)
          } else {
            console.log(`   ✅ Success`)
          }
        } catch (err: any) {
          console.error(`   ❌ Error: ${err.message}`)
        }
      }

      console.log('\n⚠️  Note: Some statements may have failed.')
      console.log('💡 For full DDL support, please run the migration in Supabase SQL Editor:')
      console.log(`   ${migrationFile}`)
      console.log('\nOr use psql with your database connection string.')

      return
    }

    console.log('✅ Migration executed successfully!')
    console.log(data)
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2] || 'migrations/004_social_feed.sql'

runMigration(migrationFile)
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
