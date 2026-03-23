import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runMigration(filename: string) {
  console.log(`\n📝 Running migration: ${filename}`)

  const filePath = path.join(__dirname, 'migrations', filename)
  const sql = fs.readFileSync(filePath, 'utf8')

  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== '')

    console.log(`   Executing ${statements.length} SQL statements...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement.trim()) continue

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })

        if (error) {
          // Some errors are expected (like "already exists")
          if (
            error.message?.includes('already exists') ||
            error.message?.includes('duplicate key') ||
            error.code === '42P07' // relation already exists
          ) {
            console.log(`   ⚠️  Statement ${i + 1}: Already exists (skipping)`)
          } else {
            console.error(`   ❌ Statement ${i + 1} error:`, error.message || error)
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} completed`)
        }
      } catch (err: any) {
        console.error(`   ⚠️  Statement ${i + 1} exception:`, err.message)
      }
    }

    console.log('✅ Migration completed')
  } catch (err: any) {
    console.error(`❌ Error running migration ${filename}:`, err.message)
    throw err
  }
}

async function main() {
  console.log('🚀 Running database migrations with Supabase service role...\n')

  const migrations = ['005_create_event_managers.sql', '006_create_notifications.sql']

  for (const migration of migrations) {
    await runMigration(migration)
  }

  console.log('\n✅ All migrations completed!\n')
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err)
  process.exit(1)
})
