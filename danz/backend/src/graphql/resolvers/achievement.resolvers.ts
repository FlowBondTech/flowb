import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

// Achievement Categories
type AchievementCategory =
  | 'SESSIONS'
  | 'DURATION'
  | 'STREAK'
  | 'MOVEMENT'
  | 'MILESTONE'
  | 'SOCIAL'
  | 'SPECIAL'
type AchievementRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

// Achievement Definition Interface
interface AchievementDefinition {
  type: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  rarity: AchievementRarity
  xp_reward: number
  danz_reward: number
  target: number
  hidden: boolean
  checkProgress: (stats: UserStats) => number
}

// User stats for achievement checking
interface UserStats {
  total_sessions: number
  total_duration_seconds: number
  total_duration_minutes: number
  current_streak: number
  longest_streak: number
  best_movement_score: number
  average_movement_score: number
  total_points: number
  sessions_today: number
  total_dance_bonds: number
  perfect_sessions: number // 90%+ movement
  marathon_sessions: number // 10 min sessions
}

// All achievement definitions
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ===== SESSION ACHIEVEMENTS =====
  {
    type: 'FIRST_DANCE',
    title: 'First Steps',
    description: 'Complete your first dance session',
    icon: '👟',
    category: 'SESSIONS',
    rarity: 'COMMON',
    xp_reward: 50,
    danz_reward: 5,
    target: 1,
    hidden: false,
    checkProgress: stats => stats.total_sessions,
  },
  {
    type: 'GETTING_STARTED',
    title: 'Getting Started',
    description: 'Complete 5 dance sessions',
    icon: '🎵',
    category: 'SESSIONS',
    rarity: 'COMMON',
    xp_reward: 100,
    danz_reward: 10,
    target: 5,
    hidden: false,
    checkProgress: stats => stats.total_sessions,
  },
  {
    type: 'DEDICATED_DANCER',
    title: 'Dedicated Dancer',
    description: 'Complete 25 dance sessions',
    icon: '💃',
    category: 'SESSIONS',
    rarity: 'UNCOMMON',
    xp_reward: 250,
    danz_reward: 25,
    target: 25,
    hidden: false,
    checkProgress: stats => stats.total_sessions,
  },
  {
    type: 'DANCE_ENTHUSIAST',
    title: 'Dance Enthusiast',
    description: 'Complete 50 dance sessions',
    icon: '🕺',
    category: 'SESSIONS',
    rarity: 'RARE',
    xp_reward: 500,
    danz_reward: 50,
    target: 50,
    hidden: false,
    checkProgress: stats => stats.total_sessions,
  },
  {
    type: 'DANCE_MASTER',
    title: 'Dance Master',
    description: 'Complete 100 dance sessions',
    icon: '👑',
    category: 'SESSIONS',
    rarity: 'EPIC',
    xp_reward: 1000,
    danz_reward: 100,
    target: 100,
    hidden: false,
    checkProgress: stats => stats.total_sessions,
  },
  {
    type: 'DANCE_LEGEND',
    title: 'Dance Legend',
    description: 'Complete 500 dance sessions',
    icon: '🏆',
    category: 'SESSIONS',
    rarity: 'LEGENDARY',
    xp_reward: 5000,
    danz_reward: 500,
    target: 500,
    hidden: false,
    checkProgress: stats => stats.total_sessions,
  },

  // ===== DURATION ACHIEVEMENTS =====
  {
    type: 'WARM_UP',
    title: 'Warm Up',
    description: 'Dance for a total of 10 minutes',
    icon: '⏱️',
    category: 'DURATION',
    rarity: 'COMMON',
    xp_reward: 50,
    danz_reward: 5,
    target: 10,
    hidden: false,
    checkProgress: stats => stats.total_duration_minutes,
  },
  {
    type: 'HOUR_DANCER',
    title: 'Hour Dancer',
    description: 'Dance for a total of 60 minutes',
    icon: '⏰',
    category: 'DURATION',
    rarity: 'UNCOMMON',
    xp_reward: 200,
    danz_reward: 20,
    target: 60,
    hidden: false,
    checkProgress: stats => stats.total_duration_minutes,
  },
  {
    type: 'MARATHON_MOVER',
    title: 'Marathon Mover',
    description: 'Dance for a total of 5 hours',
    icon: '🏃',
    category: 'DURATION',
    rarity: 'RARE',
    xp_reward: 500,
    danz_reward: 50,
    target: 300,
    hidden: false,
    checkProgress: stats => stats.total_duration_minutes,
  },
  {
    type: 'ENDURANCE_DANCER',
    title: 'Endurance Dancer',
    description: 'Dance for a total of 24 hours',
    icon: '🌟',
    category: 'DURATION',
    rarity: 'EPIC',
    xp_reward: 2000,
    danz_reward: 200,
    target: 1440,
    hidden: false,
    checkProgress: stats => stats.total_duration_minutes,
  },
  {
    type: 'UNSTOPPABLE',
    title: 'Unstoppable',
    description: 'Dance for a total of 100 hours',
    icon: '🔥',
    category: 'DURATION',
    rarity: 'LEGENDARY',
    xp_reward: 10000,
    danz_reward: 1000,
    target: 6000,
    hidden: false,
    checkProgress: stats => stats.total_duration_minutes,
  },

  // ===== STREAK ACHIEVEMENTS =====
  {
    type: 'STREAK_STARTER',
    title: 'Streak Starter',
    description: 'Dance 3 days in a row',
    icon: '🔥',
    category: 'STREAK',
    rarity: 'COMMON',
    xp_reward: 75,
    danz_reward: 10,
    target: 3,
    hidden: false,
    checkProgress: stats => stats.longest_streak,
  },
  {
    type: 'WEEK_WARRIOR',
    title: 'Week Warrior',
    description: 'Dance 7 days in a row',
    icon: '📅',
    category: 'STREAK',
    rarity: 'UNCOMMON',
    xp_reward: 200,
    danz_reward: 25,
    target: 7,
    hidden: false,
    checkProgress: stats => stats.longest_streak,
  },
  {
    type: 'TWO_WEEK_STREAK',
    title: 'Fortnight Flow',
    description: 'Dance 14 days in a row',
    icon: '🎯',
    category: 'STREAK',
    rarity: 'RARE',
    xp_reward: 500,
    danz_reward: 50,
    target: 14,
    hidden: false,
    checkProgress: stats => stats.longest_streak,
  },
  {
    type: 'MONTH_MASTER',
    title: 'Month Master',
    description: 'Dance 30 days in a row',
    icon: '🌙',
    category: 'STREAK',
    rarity: 'EPIC',
    xp_reward: 1500,
    danz_reward: 150,
    target: 30,
    hidden: false,
    checkProgress: stats => stats.longest_streak,
  },
  {
    type: 'CENTURY_STREAK',
    title: 'Century Streak',
    description: 'Dance 100 days in a row',
    icon: '💯',
    category: 'STREAK',
    rarity: 'LEGENDARY',
    xp_reward: 10000,
    danz_reward: 1000,
    target: 100,
    hidden: false,
    checkProgress: stats => stats.longest_streak,
  },

  // ===== MOVEMENT QUALITY ACHIEVEMENTS =====
  {
    type: 'SMOOTH_MOVES',
    title: 'Smooth Moves',
    description: 'Score 80% or higher movement quality',
    icon: '✨',
    category: 'MOVEMENT',
    rarity: 'COMMON',
    xp_reward: 100,
    danz_reward: 10,
    target: 80,
    hidden: false,
    checkProgress: stats => stats.best_movement_score,
  },
  {
    type: 'GROOVE_MASTER',
    title: 'Groove Master',
    description: 'Score 90% or higher movement quality',
    icon: '💫',
    category: 'MOVEMENT',
    rarity: 'UNCOMMON',
    xp_reward: 250,
    danz_reward: 25,
    target: 90,
    hidden: false,
    checkProgress: stats => stats.best_movement_score,
  },
  {
    type: 'PERFECT_SESSION',
    title: 'Perfect Session',
    description: 'Score 95% or higher movement quality',
    icon: '💎',
    category: 'MOVEMENT',
    rarity: 'RARE',
    xp_reward: 500,
    danz_reward: 50,
    target: 95,
    hidden: false,
    checkProgress: stats => stats.best_movement_score,
  },
  {
    type: 'PERFECTIONIST',
    title: 'Perfectionist',
    description: 'Complete 10 sessions with 90%+ quality',
    icon: '🎖️',
    category: 'MOVEMENT',
    rarity: 'EPIC',
    xp_reward: 1000,
    danz_reward: 100,
    target: 10,
    hidden: false,
    checkProgress: stats => stats.perfect_sessions,
  },
  {
    type: 'FLAWLESS',
    title: 'Flawless',
    description: 'Complete 50 sessions with 90%+ quality',
    icon: '🏅',
    category: 'MOVEMENT',
    rarity: 'LEGENDARY',
    xp_reward: 5000,
    danz_reward: 500,
    target: 50,
    hidden: false,
    checkProgress: stats => stats.perfect_sessions,
  },

  // ===== MILESTONE ACHIEVEMENTS =====
  {
    type: 'FULL_SONG',
    title: 'Full Song',
    description: 'Complete a full 3-minute session',
    icon: '🎶',
    category: 'MILESTONE',
    rarity: 'COMMON',
    xp_reward: 75,
    danz_reward: 10,
    target: 180,
    hidden: false,
    checkProgress: stats => (stats.total_duration_seconds > 0 ? 180 : 0), // Check in session
  },
  {
    type: 'MARATHON_SESSION',
    title: 'Marathon Session',
    description: 'Complete a full 10-minute session',
    icon: '🏃‍♀️',
    category: 'MILESTONE',
    rarity: 'UNCOMMON',
    xp_reward: 200,
    danz_reward: 25,
    target: 1,
    hidden: false,
    checkProgress: stats => stats.marathon_sessions,
  },
  {
    type: 'POINT_COLLECTOR',
    title: 'Point Collector',
    description: 'Earn 1,000 total points',
    icon: '💰',
    category: 'MILESTONE',
    rarity: 'UNCOMMON',
    xp_reward: 300,
    danz_reward: 30,
    target: 1000,
    hidden: false,
    checkProgress: stats => stats.total_points,
  },
  {
    type: 'POINT_HOARDER',
    title: 'Point Hoarder',
    description: 'Earn 10,000 total points',
    icon: '💎',
    category: 'MILESTONE',
    rarity: 'EPIC',
    xp_reward: 2000,
    danz_reward: 200,
    target: 10000,
    hidden: false,
    checkProgress: stats => stats.total_points,
  },

  // ===== SOCIAL ACHIEVEMENTS =====
  {
    type: 'FIRST_BOND',
    title: 'First Bond',
    description: 'Create your first dance bond',
    icon: '🤝',
    category: 'SOCIAL',
    rarity: 'COMMON',
    xp_reward: 100,
    danz_reward: 15,
    target: 1,
    hidden: false,
    checkProgress: stats => stats.total_dance_bonds,
  },
  {
    type: 'SOCIAL_BUTTERFLY',
    title: 'Social Butterfly',
    description: 'Create 10 dance bonds',
    icon: '🦋',
    category: 'SOCIAL',
    rarity: 'UNCOMMON',
    xp_reward: 300,
    danz_reward: 50,
    target: 10,
    hidden: false,
    checkProgress: stats => stats.total_dance_bonds,
  },
  {
    type: 'COMMUNITY_LEADER',
    title: 'Community Leader',
    description: 'Create 50 dance bonds',
    icon: '👥',
    category: 'SOCIAL',
    rarity: 'EPIC',
    xp_reward: 1500,
    danz_reward: 200,
    target: 50,
    hidden: false,
    checkProgress: stats => stats.total_dance_bonds,
  },

  // ===== SPECIAL / HIDDEN ACHIEVEMENTS =====
  {
    type: 'EARLY_BIRD',
    title: 'Early Bird',
    description: 'Dance before 6 AM',
    icon: '🌅',
    category: 'SPECIAL',
    rarity: 'RARE',
    xp_reward: 250,
    danz_reward: 25,
    target: 1,
    hidden: true,
    checkProgress: () => 0, // Checked differently
  },
  {
    type: 'NIGHT_OWL',
    title: 'Night Owl',
    description: 'Dance after midnight',
    icon: '🦉',
    category: 'SPECIAL',
    rarity: 'RARE',
    xp_reward: 250,
    danz_reward: 25,
    target: 1,
    hidden: true,
    checkProgress: () => 0, // Checked differently
  },
  {
    type: 'WEEKEND_WARRIOR',
    title: 'Weekend Warrior',
    description: 'Complete 5 sessions on a single weekend',
    icon: '🎉',
    category: 'SPECIAL',
    rarity: 'RARE',
    xp_reward: 400,
    danz_reward: 40,
    target: 5,
    hidden: true,
    checkProgress: () => 0, // Checked differently
  },
]

// Helper to get user stats for achievement checking
async function getUserStats(userId: string): Promise<UserStats> {
  // Get freestyle sessions
  const { data: sessions } = await supabase
    .from('freestyle_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', true)

  // Get dance bonds count
  const { count: bondsCount } = await supabase
    .from('dance_bonds')
    .select('*', { count: 'exact', head: true })
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

  const sessionList = sessions || []
  const totalSessions = sessionList.length
  const totalDurationSeconds = sessionList.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
  const totalPoints = sessionList.reduce((sum, s) => sum + (s.points_awarded || 0), 0)
  const bestMovementScore =
    sessionList.length > 0 ? Math.max(...sessionList.map(s => s.movement_score || 0)) : 0
  const avgMovementScore =
    sessionList.length > 0
      ? sessionList.reduce((sum, s) => sum + (s.movement_score || 0), 0) / totalSessions
      : 0

  // Count perfect sessions (90%+ movement)
  const perfectSessions = sessionList.filter(s => s.movement_score >= 90).length

  // Count marathon sessions (10 min = 600 seconds)
  const marathonSessions = sessionList.filter(s => s.duration_seconds >= 600).length

  // Calculate streak
  const sortedSessions = [...sessionList].sort(
    (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime(),
  )

  let currentStreak = 0
  let longestStreak = 0

  if (sortedSessions.length > 0) {
    let tempStreak = 1
    let lastDate = new Date(sortedSessions[0].session_date)
    lastDate.setHours(0, 0, 0, 0)

    for (let i = 1; i < sortedSessions.length; i++) {
      const currentDate = new Date(sortedSessions[i].session_date)
      currentDate.setHours(0, 0, 0, 0)
      const dayDiff = Math.floor(
        (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
      )

      if (dayDiff === 1) {
        tempStreak++
      } else if (dayDiff > 1) {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
      lastDate = currentDate
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    // Current streak
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastSessionDate = new Date(sortedSessions[0].session_date)
    lastSessionDate.setHours(0, 0, 0, 0)
    const daysSince = Math.floor(
      (today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24),
    )
    currentStreak = daysSince <= 1 ? tempStreak : 0
  }

  // Sessions today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sessionsToday = sessionList.filter(s => {
    const sessionDate = new Date(s.session_date)
    sessionDate.setHours(0, 0, 0, 0)
    return sessionDate.getTime() === today.getTime()
  }).length

  return {
    total_sessions: totalSessions,
    total_duration_seconds: totalDurationSeconds,
    total_duration_minutes: Math.floor(totalDurationSeconds / 60),
    current_streak: currentStreak,
    longest_streak: longestStreak,
    best_movement_score: bestMovementScore,
    average_movement_score: avgMovementScore,
    total_points: totalPoints,
    sessions_today: sessionsToday,
    total_dance_bonds: bondsCount || 0,
    perfect_sessions: perfectSessions,
    marathon_sessions: marathonSessions,
  }
}

// Check and unlock achievements
export async function checkAndUnlockAchievements(userId: string): Promise<{
  newly_unlocked: any[]
  total_xp_earned: number
  total_danz_earned: number
}> {
  const stats = await getUserStats(userId)
  const newlyUnlocked: any[] = []
  let totalXp = 0
  let totalDanz = 0

  // Get already unlocked achievements
  const { data: existingAchievements } = await supabase
    .from('achievements')
    .select('achievement_type')
    .eq('user_id', userId)

  const unlockedTypes = new Set((existingAchievements || []).map(a => a.achievement_type))

  // Check each achievement
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedTypes.has(def.type)) continue

    const progress = def.checkProgress(stats)
    if (progress >= def.target) {
      // Unlock this achievement
      const { data: newAchievement, error } = await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          achievement_type: def.type,
          title: def.title,
          description: def.description,
          icon: def.icon,
          xp_reward: def.xp_reward,
          danz_reward: def.danz_reward,
        })
        .select()
        .single()

      if (!error && newAchievement) {
        newlyUnlocked.push({
          ...newAchievement,
          category: def.category,
          rarity: def.rarity,
          is_unlocked: true,
          progress: progress,
          target: def.target,
        })
        totalXp += def.xp_reward
        totalDanz += def.danz_reward

        // Award XP and update achievements count
        // Try RPC first, fallback to direct update
        const { error: rpcError } = await supabase.rpc('add_user_xp', {
          p_user_id: userId,
          p_xp: def.xp_reward,
        })

        if (rpcError) {
          // Fallback: direct update (fetch current values and increment)
          const { data: userData } = await supabase
            .from('users')
            .select('xp, level, total_achievements')
            .eq('privy_id', userId)
            .single()

          if (userData) {
            const newXp = (userData.xp || 0) + def.xp_reward
            const newLevel = Math.max(1, Math.floor(newXp / 1000) + 1)
            const newAchievements = (userData.total_achievements || 0) + 1

            await supabase
              .from('users')
              .update({
                xp: newXp,
                level: newLevel,
                total_achievements: newAchievements,
              })
              .eq('privy_id', userId)
          }
        } else {
          // RPC succeeded, also update achievements count
          await supabase.rpc('increment_user_achievements', { p_user_id: userId })
        }

        // Create notification
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'achievement',
          title: `🎉 Achievement Unlocked: ${def.title}`,
          message: def.description,
          data: {
            achievement_type: def.type,
            icon: def.icon,
            xp_reward: def.xp_reward,
            danz_reward: def.danz_reward,
            rarity: def.rarity,
          },
        })
      }
    }
  }

  return { newly_unlocked: newlyUnlocked, total_xp_earned: totalXp, total_danz_earned: totalDanz }
}

export const achievementResolvers = {
  Query: {
    myAchievements: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const stats = await getUserStats(userId)

      // Get unlocked achievements
      const { data: unlocked } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)

      const unlockedMap = new Map((unlocked || []).map(a => [a.achievement_type, a]))

      // Build progress list for all non-hidden achievements
      return ACHIEVEMENT_DEFINITIONS.filter(def => !def.hidden || unlockedMap.has(def.type))
        .map(def => {
          const existing = unlockedMap.get(def.type)
          const progress = def.checkProgress(stats)
          return {
            achievement_type: def.type,
            title: def.title,
            description: def.description,
            icon: def.icon,
            category: def.category,
            rarity: def.rarity,
            xp_reward: def.xp_reward,
            danz_reward: def.danz_reward,
            current_progress: Math.min(progress, def.target),
            target: def.target,
            percentage: Math.min((progress / def.target) * 100, 100),
            is_unlocked: !!existing,
            unlocked_at: existing?.unlocked_at || null,
          }
        })
        .sort((a, b) => {
          // Sort: unlocked first, then by percentage desc
          if (a.is_unlocked !== b.is_unlocked) return a.is_unlocked ? -1 : 1
          return b.percentage - a.percentage
        })
    },

    myUnlockedAchievements: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch achievements', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      // Enrich with category/rarity
      return (data || []).map(a => {
        const def = ACHIEVEMENT_DEFINITIONS.find(d => d.type === a.achievement_type)
        return {
          ...a,
          category: def?.category || 'MILESTONE',
          rarity: def?.rarity || 'COMMON',
          is_unlocked: true,
          progress: def?.target || 1,
          target: def?.target || 1,
        }
      })
    },

    myAchievementStats: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: unlocked } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })

      const unlockedList = unlocked || []
      const totalAvailable = ACHIEVEMENT_DEFINITIONS.filter(d => !d.hidden).length

      // Calculate totals
      const totalXp = unlockedList.reduce((sum, a) => sum + (a.xp_reward || 0), 0)
      const totalDanz = unlockedList.reduce((sum, a) => sum + (a.danz_reward || 0), 0)

      // Count by category
      const categoryMap = new Map<string, { unlocked: number; total: number }>()
      for (const def of ACHIEVEMENT_DEFINITIONS) {
        if (def.hidden) continue
        const existing = categoryMap.get(def.category) || { unlocked: 0, total: 0 }
        existing.total++
        if (unlockedList.find(a => a.achievement_type === def.type)) {
          existing.unlocked++
        }
        categoryMap.set(def.category, existing)
      }

      // Count by rarity
      const rarityMap = new Map<string, { unlocked: number; total: number }>()
      for (const def of ACHIEVEMENT_DEFINITIONS) {
        if (def.hidden) continue
        const existing = rarityMap.get(def.rarity) || { unlocked: 0, total: 0 }
        existing.total++
        if (unlockedList.find(a => a.achievement_type === def.type)) {
          existing.unlocked++
        }
        rarityMap.set(def.rarity, existing)
      }

      // Recent unlocks (last 5)
      const recentUnlocks = unlockedList.slice(0, 5).map(a => {
        const def = ACHIEVEMENT_DEFINITIONS.find(d => d.type === a.achievement_type)
        return {
          ...a,
          category: def?.category || 'MILESTONE',
          rarity: def?.rarity || 'COMMON',
          is_unlocked: true,
          progress: def?.target || 1,
          target: def?.target || 1,
        }
      })

      return {
        total_unlocked: unlockedList.length,
        total_available: totalAvailable,
        total_xp_earned: totalXp,
        total_danz_earned: totalDanz,
        by_category: Array.from(categoryMap.entries()).map(([category, counts]) => ({
          category,
          ...counts,
        })),
        by_rarity: Array.from(rarityMap.entries()).map(([rarity, counts]) => ({
          rarity,
          ...counts,
        })),
        recent_unlocks: recentUnlocks,
      }
    },

    achievementDefinitions: async () => {
      return ACHIEVEMENT_DEFINITIONS.filter(d => !d.hidden).map(def => ({
        type: def.type,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        rarity: def.rarity,
        xp_reward: def.xp_reward,
        danz_reward: def.danz_reward,
        target: def.target,
        hidden: def.hidden,
      }))
    },

    achievementsByCategory: async (
      _: any,
      { category }: { category: AchievementCategory },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      const stats = await getUserStats(userId)

      const { data: unlocked } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)

      const unlockedMap = new Map((unlocked || []).map(a => [a.achievement_type, a]))

      return ACHIEVEMENT_DEFINITIONS.filter(
        def => def.category === category && (!def.hidden || unlockedMap.has(def.type)),
      ).map(def => {
        const existing = unlockedMap.get(def.type)
        const progress = def.checkProgress(stats)
        return {
          achievement_type: def.type,
          title: def.title,
          description: def.description,
          icon: def.icon,
          category: def.category,
          rarity: def.rarity,
          xp_reward: def.xp_reward,
          danz_reward: def.danz_reward,
          current_progress: Math.min(progress, def.target),
          target: def.target,
          percentage: Math.min((progress / def.target) * 100, 100),
          is_unlocked: !!existing,
          unlocked_at: existing?.unlocked_at || null,
        }
      })
    },

    isAchievementUnlocked: async (
      _: any,
      { achievementType }: { achievementType: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_type', achievementType)
        .single()

      return !!data
    },
  },

  Mutation: {
    checkAchievements: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)
      return await checkAndUnlockAchievements(userId)
    },

    claimAchievementReward: async (
      _: any,
      { achievementType }: { achievementType: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_type', achievementType)
        .single()

      if (error || !data) {
        throw new GraphQLError('Achievement not found or not unlocked', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const def = ACHIEVEMENT_DEFINITIONS.find(d => d.type === achievementType)

      return {
        ...data,
        category: def?.category || 'MILESTONE',
        rarity: def?.rarity || 'COMMON',
        is_unlocked: true,
        progress: def?.target || 1,
        target: def?.target || 1,
      }
    },
  },
}
