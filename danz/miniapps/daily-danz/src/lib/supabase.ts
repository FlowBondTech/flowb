import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Flag to check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Lazy initialization to avoid build errors
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

// Public client (for client-side, respects RLS)
export const getSupabase = (): SupabaseClient => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!_supabase) {
    _supabase = createClient(supabaseUrl!, supabaseAnonKey!)
  }
  return _supabase
}

// Admin client (for server-side, bypasses RLS)
export const getSupabaseAdmin = (): SupabaseClient => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!_supabaseAdmin) {
    if (supabaseServiceKey) {
      _supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    } else {
      _supabaseAdmin = getSupabase()
    }
  }
  return _supabaseAdmin
}

// Note: Use getSupabase() and getSupabaseAdmin() functions in API routes
// to ensure lazy initialization during runtime, not build time.

// Database types - matches actual production schema
export interface DbUser {
  privy_id: string          // Primary key (TEXT)
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  xp: number                // XP column name in production
  level: number             // Level column name in production
  current_streak: number
  longest_streak: number
  farcaster_fid: number | null  // Farcaster FID for lookup
  created_at: string
  updated_at: string
  last_active_at: string
}

export interface DbCheckin {
  id: string
  user_id: string           // References users(privy_id)
  fid: number
  checked_in_at: string
  did_dance: boolean
  streak_count: number
  xp_earned: number
  streak_bonus: number
  reflection_bonus: number
  reflection_data: {
    feeling?: string
    benefits?: string[]
    note?: string
  } | null
  created_at: string
}

// Helper to get or create user by Farcaster FID
export async function getOrCreateUserByFid(
  fid: number,
  userData?: {
    username?: string
    displayName?: string
    pfpUrl?: string
  }
): Promise<DbUser | null> {
  const supabase = getSupabaseAdmin()

  // First try to find existing user by farcaster_fid
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('farcaster_fid', fid)
    .single()

  if (existingUser) {
    // Update last_active_at
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('privy_id', existingUser.privy_id)

    return existingUser as DbUser
  }

  // Create new user with a Farcaster-based privy_id
  // Format: fc-{fid} to distinguish from Privy DID users
  const farcasterPrivyId = `fc-${fid}`

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      privy_id: farcasterPrivyId,
      username: userData?.username || null,
      display_name: userData?.displayName || null,
      avatar_url: userData?.pfpUrl || null,
      farcaster_fid: fid,
      xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
    })
    .select()
    .single()

  if (userError || !newUser) {
    console.error('Failed to create user:', userError)
    return null
  }

  return newUser as DbUser
}

// Get user by privy_id
export async function getUserByPrivyId(privyId: string): Promise<DbUser | null> {
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('privy_id', privyId)
    .single()

  return data as DbUser | null
}

// Get user's check-in for today
export async function getTodayCheckin(userId: string): Promise<DbCheckin | null> {
  const supabase = getSupabaseAdmin()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('checked_in_at', today.toISOString())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .single()

  return data as DbCheckin | null
}

// Calculate XP for check-in
export function calculateCheckinXp(
  streak: number,
  hasReflection: boolean
): {
  baseXp: number
  streakBonus: number
  reflectionBonus: number
  totalXp: number
} {
  const baseXp = 50
  const streakBonus = Math.min(streak * 5, 50) // Max 50 streak bonus
  const reflectionBonus = hasReflection ? 25 : 0

  return {
    baseXp,
    streakBonus,
    reflectionBonus,
    totalXp: baseXp + streakBonus + reflectionBonus,
  }
}

// Record a check-in
export async function recordCheckin(
  userId: string,
  fid: number,
  didDance: boolean,
  currentStreak: number,
  reflectionData?: {
    feeling?: string
    benefits?: string[]
    note?: string
  }
): Promise<{
  checkin: DbCheckin
  newStreak: number
  xpEarned: number
} | null> {
  const supabase = getSupabaseAdmin()
  const hasReflection = !!(reflectionData?.feeling || reflectionData?.benefits?.length)
  const newStreak = didDance ? currentStreak + 1 : 0
  const xp = calculateCheckinXp(newStreak, hasReflection)

  // Insert check-in record
  const { data: checkin, error: checkinError } = await supabase
    .from('checkins')
    .insert({
      user_id: userId,
      fid,
      did_dance: didDance,
      streak_count: newStreak,
      xp_earned: xp.baseXp,
      streak_bonus: xp.streakBonus,
      reflection_bonus: xp.reflectionBonus,
      reflection_data: reflectionData || null,
    })
    .select()
    .single()

  if (checkinError || !checkin) {
    console.error('Failed to record check-in:', checkinError)
    return null
  }

  // Update user's XP and streak
  // First get current user data
  const { data: userData } = await supabase
    .from('users')
    .select('xp, longest_streak')
    .eq('privy_id', userId)
    .single()

  const currentTotalXp = userData?.xp || 0
  const currentLongestStreak = userData?.longest_streak || 0

  await supabase
    .from('users')
    .update({
      xp: currentTotalXp + xp.totalXp,
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, currentLongestStreak),
      last_active_at: new Date().toISOString(),
    })
    .eq('privy_id', userId)

  return {
    checkin: checkin as DbCheckin,
    newStreak,
    xpEarned: xp.totalXp,
  }
}

// Get user's stats
export async function getUserStats(userId: string): Promise<{
  totalXp: number
  currentStreak: number
  longestStreak: number
  level: number
  totalCheckins: number
} | null> {
  const supabase = getSupabaseAdmin()

  const { data: user } = await supabase
    .from('users')
    .select('xp, current_streak, longest_streak, level')
    .eq('privy_id', userId)
    .single()

  if (!user) return null

  // Count total check-ins
  const { count } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return {
    totalXp: user.xp,
    currentStreak: user.current_streak,
    longestStreak: user.longest_streak,
    level: user.level,
    totalCheckins: count || 0,
  }
}

// Get user by Farcaster FID (without creating)
export async function getUserByFid(fid: number): Promise<DbUser | null> {
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('farcaster_fid', fid)
    .single()

  return data as DbUser | null
}
