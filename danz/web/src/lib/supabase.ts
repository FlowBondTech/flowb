// Supabase client + REST API utilities
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eoajujwpdkfuicnoxetk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg'

// Supabase SDK client singleton (for auth + realtime)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface SupabaseQueryOptions {
  select?: string
  filter?: Record<string, string>
  order?: string
  limit?: number
}

async function supabaseQuery<T>(table: string, options: SupabaseQueryOptions = {}): Promise<T[]> {
  const { select = '*', filter = {}, order, limit } = options

  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`

  // Add filters
  for (const [key, value] of Object.entries(filter)) {
    url += `&${key}=${encodeURIComponent(value)}`
  }

  // Add ordering
  if (order) {
    url += `&order=${encodeURIComponent(order)}`
  }

  // Add limit
  if (limit) {
    url += `&limit=${limit}`
  }

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Supabase query failed')
  }

  return response.json()
}

// Types for referral data
export interface ReferredUser {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  created_at: string
  xp: number
  level: number
  total_sessions: number
  total_dance_time: number
}

export interface ReferrerStats {
  username: string
  display_name: string
  referral_count: number
  referral_points_earned: number
  current_points_balance: number
  total_points_earned: number
}

/**
 * Get users who were referred by a specific username
 */
export async function getReferredUsers(referrerUsername: string): Promise<ReferredUser[]> {
  return supabaseQuery<ReferredUser>('users', {
    select:
      'id,username,display_name,avatar_url,created_at,xp,level,total_sessions,total_dance_time',
    filter: {
      invited_by: `eq.${referrerUsername}`,
    },
    order: 'created_at.desc',
    limit: 50,
  })
}

/**
 * Get referral stats for a user by their username
 */
export async function getReferrerStats(username: string): Promise<ReferrerStats | null> {
  const results = await supabaseQuery<ReferrerStats>('users', {
    select:
      'username,display_name,referral_count,referral_points_earned,current_points_balance,total_points_earned',
    filter: {
      username: `eq.${username}`,
    },
    limit: 1,
  })

  return results[0] || null
}

/**
 * Count total users referred by a username
 */
export async function countReferredUsers(referrerUsername: string): Promise<number> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/users?invited_by=eq.${encodeURIComponent(referrerUsername)}&select=username`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'count=exact',
      },
    },
  )

  const count = response.headers.get('content-range')
  if (count) {
    const match = count.match(/\/(\d+)$/)
    return match ? Number.parseInt(match[1], 10) : 0
  }

  return 0
}

/**
 * Get all users with their referral info (for admin)
 */
export async function getAllUsersWithReferrals(): Promise<
  Array<{
    username: string
    display_name: string
    invited_by: string | null
    referral_count: number
    referral_points_earned: number
    created_at: string
  }>
> {
  return supabaseQuery('users', {
    select: 'username,display_name,invited_by,referral_count,referral_points_earned,created_at',
    order: 'created_at.desc',
    limit: 100,
  })
}

/**
 * Get top referrers leaderboard
 */
export async function getTopReferrers(limit = 10): Promise<ReferrerStats[]> {
  return supabaseQuery<ReferrerStats>('users', {
    select:
      'username,display_name,referral_count,referral_points_earned,current_points_balance,total_points_earned',
    filter: {
      referral_count: 'gt.0',
    },
    order: 'referral_count.desc',
    limit,
  })
}
