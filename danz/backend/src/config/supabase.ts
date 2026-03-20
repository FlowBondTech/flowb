import { createClient } from '@supabase/supabase-js'
import { config } from './env.js'

export const supabase = createClient(config.supabase.url, config.supabase.secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'danz-backend',
    },
  },
})
