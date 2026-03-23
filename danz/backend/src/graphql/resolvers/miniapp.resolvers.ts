import crypto from 'crypto'
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

// Verify Telegram init data
const verifyTelegramData = (initData: string, botToken: string): any => {
  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    urlParams.delete('hash')

    // Sort params and create data check string
    const dataCheckString = [...urlParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    // Create HMAC-SHA256
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    if (hmac !== hash) {
      return null
    }

    const user = urlParams.get('user')
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

export const miniappResolvers = {
  Query: {
    miniappHome: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get user data
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Get today's stats
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySessions } = await supabase
        .from('dance_sessions')
        .select('duration, xp_earned, calories_burned')
        .eq('user_id', userId)
        .gte('created_at', today)

      const dailyStats = {
        xp_earned: (todaySessions || []).reduce((sum, s) => sum + (s.xp_earned || 0), 0),
        points_earned: 0,
        dance_minutes: Math.floor(
          (todaySessions || []).reduce((sum, s) => sum + (s.duration || 0), 0) / 60,
        ),
        calories_burned: (todaySessions || []).reduce(
          (sum, s) => sum + (s.calories_burned || 0),
          0,
        ),
        sessions_count: (todaySessions || []).length,
        daily_goal_progress: Math.min(100, ((todaySessions || []).length / 3) * 100),
      }

      // Get active challenges
      const { data: challenges } = await supabase
        .from('user_challenges')
        .select('*, challenge:challenges(*)')
        .eq('user_id', userId)
        .eq('status', 'IN_PROGRESS')
        .limit(3)

      const activeChallenges = (challenges || []).map((uc: any) => ({
        id: uc.challenge_id,
        title: uc.challenge?.title || 'Challenge',
        progress: uc.progress,
        target: uc.challenge?.target_value || 100,
        xp_reward: uc.challenge?.xp_reward || 0,
        expires_in_hours: uc.expires_at
          ? Math.max(
              0,
              Math.floor((new Date(uc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)),
            )
          : null,
        icon: '🎯',
      }))

      // Get recent activities
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      const recentActivities = (activities || []).map(a => ({
        id: a.id,
        type: a.activity_type,
        title: a.title,
        subtitle: a.description,
        icon: '📌',
        timestamp: a.created_at,
        xp_earned: a.xp_earned,
      }))

      // Get leaderboard preview
      const { data: topUsers } = await supabase
        .from('users')
        .select('id, username, avatar_url, xp')
        .order('xp', { ascending: false })
        .limit(3)

      const { data: allUsers } = await supabase
        .from('users')
        .select('id')
        .order('xp', { ascending: false })

      const myRank = (allUsers || []).findIndex(u => u.id === userId) + 1

      const leaderboardPreview = {
        my_rank: myRank || 999,
        my_xp: user.xp || 0,
        top_3: (topUsers || []).map((u, i) => ({
          rank: i + 1,
          username: u.username || 'Anonymous',
          avatar_url: u.avatar_url,
          xp: u.xp || 0,
          is_me: u.id === userId,
        })),
        nearby: [],
      }

      // Get notifications count
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read', false)

      // Streak info
      const streakInfo = {
        current: user.current_streak || 0,
        longest: user.longest_streak || 0,
        streak_maintained_today: (todaySessions || []).length > 0,
        next_milestone: Math.ceil((user.current_streak || 0) / 7) * 7,
        milestone_reward: 100,
      }

      return {
        user,
        daily_stats: dailyStats,
        active_challenges: activeChallenges,
        recent_activities: recentActivities,
        leaderboard_preview: leaderboardPreview,
        notifications_count: notificationsCount || 0,
        streak_info: streakInfo,
      }
    },

    miniappDailyStats: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const today = new Date().toISOString().split('T')[0]

      const { data: sessions } = await supabase
        .from('dance_sessions')
        .select('duration, xp_earned, calories_burned')
        .eq('user_id', userId)
        .gte('created_at', today)

      return {
        xp_earned: (sessions || []).reduce((sum, s) => sum + (s.xp_earned || 0), 0),
        points_earned: 0,
        dance_minutes: Math.floor(
          (sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0) / 60,
        ),
        calories_burned: (sessions || []).reduce((sum, s) => sum + (s.calories_burned || 0), 0),
        sessions_count: (sessions || []).length,
        daily_goal_progress: Math.min(100, ((sessions || []).length / 3) * 100),
      }
    },

    miniappChallenges: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data } = await supabase
        .from('user_challenges')
        .select('*, challenge:challenges(*)')
        .eq('user_id', userId)
        .eq('status', 'IN_PROGRESS')

      return (data || []).map((uc: any) => ({
        id: uc.challenge_id,
        title: uc.challenge?.title || 'Challenge',
        progress: uc.progress,
        target: uc.challenge?.target_value || 100,
        xp_reward: uc.challenge?.xp_reward || 0,
        expires_in_hours: uc.expires_at
          ? Math.max(
              0,
              Math.floor((new Date(uc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)),
            )
          : null,
        icon: '🎯',
      }))
    },

    miniappActivities: async (
      _: any,
      { limit = 20 }: { limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      return (data || []).map(a => ({
        id: a.id,
        type: a.activity_type,
        title: a.title,
        subtitle: a.description,
        icon: '📌',
        timestamp: a.created_at,
        xp_earned: a.xp_earned,
      }))
    },

    miniappLeaderboard: async (
      _: any,
      { type, limit = 10 }: { type: string; limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data } = await supabase
        .from('users')
        .select('id, username, avatar_url, xp')
        .order('xp', { ascending: false })
        .limit(limit)

      return (data || []).map((u, i) => ({
        rank: i + 1,
        username: u.username || 'Anonymous',
        avatar_url: u.avatar_url,
        xp: u.xp || 0,
        is_me: u.id === userId,
      }))
    },

    miniappFriends: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: bonds } = await supabase
        .from('dance_bonds')
        .select('user1_id, user2_id, bond_strength')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

      const friendIds = (bonds || []).map(b => (b.user1_id === userId ? b.user2_id : b.user1_id))

      if (friendIds.length === 0) {
        return []
      }

      const { data: friends } = await supabase.from('users').select('*').in('id', friendIds)

      const bondMap = new Map(
        (bonds || []).map(b => [b.user1_id === userId ? b.user2_id : b.user1_id, b.bond_strength]),
      )

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      return (friends || []).map(f => ({
        user_id: f.id,
        username: f.username || 'Anonymous',
        display_name: f.display_name,
        avatar_url: f.avatar_url,
        level: f.level || 1,
        is_online: f.last_active_at && f.last_active_at >= fiveMinutesAgo,
        last_active: f.last_active_at,
        dance_bond_strength: bondMap.get(f.id) || 0,
      }))
    },

    miniappOnlineFriends: async (_: any, __: any, context: GraphQLContext) => {
      const friends = await miniappResolvers.Query.miniappFriends(_, __, context)
      return friends.filter((f: any) => f.is_online)
    },

    miniappNotifications: async (
      _: any,
      { limit = 20 }: { limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      return (data || []).map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.message,
        icon: n.icon,
        action_url: n.action_url,
        is_read: n.read,
        created_at: n.created_at,
      }))
    },

    miniappUnreadCount: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read', false)

      return count || 0
    },

    miniappSettings: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: user } = await supabase
        .from('users')
        .select('settings')
        .eq('id', userId)
        .single()

      const settings = user?.settings || {}

      return {
        notifications_enabled: settings.notifications_enabled ?? true,
        sound_enabled: settings.sound_enabled ?? true,
        haptic_enabled: settings.haptic_enabled ?? true,
        language: settings.language || 'en',
        theme: settings.theme || 'dark',
        daily_reminder_time: settings.daily_reminder_time,
        share_activity: settings.share_activity ?? true,
      }
    },

    miniappShareContent: async (
      _: any,
      { content_type, content_id }: { content_type: string; content_id?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: user } = await supabase
        .from('users')
        .select('username, referral_code')
        .eq('id', userId)
        .single()

      const baseUrl = 'https://danz.xyz'
      const referralCode = user?.referral_code || ''

      return {
        share_url: `${baseUrl}/share/${content_type}/${content_id || ''}?ref=${referralCode}`,
        share_text: `Join me on DANZ! 💃 The dance-to-earn platform. Use my referral code: ${referralCode}`,
        share_image_url: `${baseUrl}/og/${content_type}/${content_id || 'default'}.png`,
        telegram_deep_link: `https://t.me/danz_bot?start=${referralCode}`,
      }
    },

    miniappReferralLink: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: user } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', userId)
        .single()

      return `https://t.me/danz_bot?start=${user?.referral_code || userId}`
    },

    miniappStreak: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: user } = await supabase
        .from('users')
        .select('current_streak, longest_streak')
        .eq('id', userId)
        .single()

      const today = new Date().toISOString().split('T')[0]
      const { count: todaySessions } = await supabase
        .from('dance_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today)

      const current = user?.current_streak || 0

      return {
        current,
        longest: user?.longest_streak || 0,
        streak_maintained_today: (todaySessions || 0) > 0,
        next_milestone: Math.ceil(current / 7) * 7,
        milestone_reward: 100,
      }
    },

    miniappLevel: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const { data } = await supabase.from('users').select('level').eq('id', userId).single()
      return data?.level || 1
    },

    miniappXP: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const { data } = await supabase.from('users').select('xp').eq('id', userId).single()
      return data?.xp || 0
    },

    miniappPoints: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const { data } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', userId)
        .single()
      return data?.total_points || 0
    },
  },

  Mutation: {
    telegramAuth: async (
      _: any,
      { input }: { input: { init_data: string; referral_code?: string } },
      context: GraphQLContext,
    ) => {
      // In production, verify with actual bot token
      // const telegramUser = verifyTelegramData(input.init_data, process.env.TELEGRAM_BOT_TOKEN)

      // For now, parse the init data directly (development mode)
      const urlParams = new URLSearchParams(input.init_data)
      const userParam = urlParams.get('user')
      const telegramUser = userParam ? JSON.parse(userParam) : null

      if (!telegramUser) {
        throw new GraphQLError('Invalid Telegram auth data', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Check if user exists with this telegram_id
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramUser.id.toString())
        .single()

      let user = existingUser
      let isNewUser = false

      if (!existingUser) {
        // Create new user
        const { data: newUser, error } = await supabase
          .from('users')
          .insert([
            {
              telegram_id: telegramUser.id.toString(),
              username: telegramUser.username || `user_${telegramUser.id}`,
              display_name:
                `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
              avatar_url: telegramUser.photo_url,
              settings: {
                language: telegramUser.language_code || 'en',
              },
              level: 1,
              xp: 0,
              total_points: 0,
              referred_by: input.referral_code,
            },
          ])
          .select()
          .single()

        if (error) {
          throw new GraphQLError('Failed to create user', {
            extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
          })
        }

        user = newUser
        isNewUser = true

        // Process referral if provided
        if (input.referral_code) {
          // Find referrer and credit them
          const { data: referrer } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', input.referral_code)
            .single()

          if (referrer) {
            await supabase.from('referrals').insert([
              {
                referrer_id: referrer.id,
                referred_id: newUser.id,
                status: 'COMPLETED',
              },
            ])
          }
        }
      }

      return {
        success: true,
        user,
        is_new_user: isNewUser,
        telegram_user: {
          telegram_id: telegramUser.id.toString(),
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          photo_url: telegramUser.photo_url,
          language_code: telegramUser.language_code,
          is_premium: telegramUser.is_premium || false,
          danz_user: user,
          is_linked: true,
        },
        message: isNewUser ? 'Welcome to DANZ!' : 'Welcome back!',
      }
    },

    linkTelegramAccount: async (
      _: any,
      { telegram_init_data }: { telegram_init_data: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const urlParams = new URLSearchParams(telegram_init_data)
      const userParam = urlParams.get('user')
      const telegramUser = userParam ? JSON.parse(userParam) : null

      if (!telegramUser) {
        throw new GraphQLError('Invalid Telegram data', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      await supabase
        .from('users')
        .update({ telegram_id: telegramUser.id.toString() })
        .eq('id', userId)

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      return {
        success: true,
        user,
        is_new_user: false,
        telegram_user: {
          telegram_id: telegramUser.id.toString(),
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          photo_url: telegramUser.photo_url,
          language_code: telegramUser.language_code,
          is_premium: telegramUser.is_premium || false,
          danz_user: user,
          is_linked: true,
        },
        message: 'Telegram account linked!',
      }
    },

    unlinkTelegramAccount: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      await supabase.from('users').update({ telegram_id: null }).eq('id', userId)

      return { success: true, message: 'Telegram account unlinked', code: 'SUCCESS' }
    },

    miniappStartQuickSession: async (
      _: any,
      { input }: { input: { mode: string; target_duration?: number; challenge_id?: string } },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const sessionId = `quick-${userId}-${Date.now()}`

      return {
        session_id: sessionId,
        start_time: new Date().toISOString(),
        mode: input.mode,
        target_duration: input.target_duration,
      }
    },

    miniappEndQuickSession: async (
      _: any,
      { session_id, stats }: { session_id: string; stats: any },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Save the session
      await supabase.from('dance_sessions').insert([
        {
          user_id: userId,
          duration: stats.duration || 0,
          xp_earned: stats.xp_earned || 0,
          calories_burned: stats.calories_burned || 0,
          movement_score: stats.movement_score || 0,
          device_type: 'miniapp',
        },
      ])

      return { success: true, message: 'Session saved!', code: 'SUCCESS' }
    },

    miniappClaimDailyReward: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if already claimed today
      const today = new Date().toISOString().split('T')[0]
      const { data: existingClaim } = await supabase
        .from('daily_rewards')
        .select('*')
        .eq('user_id', userId)
        .eq('claimed_date', today)
        .single()

      if (existingClaim) {
        return {
          success: false,
          reward_type: 'XP',
          amount: 0,
          new_balance: 0,
          message: 'Already claimed today!',
        }
      }

      // Give daily reward
      const reward = 50

      await supabase.from('daily_rewards').insert([
        {
          user_id: userId,
          claimed_date: today,
          reward_type: 'XP',
          amount: reward,
        },
      ])

      // Update user XP
      await supabase.rpc('increment_user_stats', {
        p_user_id: userId,
        p_xp: reward,
      })

      const { data: user } = await supabase
        .from('users')
        .select('xp')
        .eq('id', userId)
        .single()

      return {
        success: true,
        reward_type: 'XP',
        amount: reward,
        new_balance: user?.xp || 0,
        message: `+${reward} XP claimed!`,
      }
    },

    miniappClaimChallengeReward: async (
      _: any,
      { challenge_id }: { challenge_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: userChallenge } = await supabase
        .from('user_challenges')
        .select('*, challenge:challenges(*)')
        .eq('user_id', userId)
        .eq('challenge_id', challenge_id)
        .eq('status', 'COMPLETED')
        .single()

      if (!userChallenge) {
        return {
          success: false,
          reward_type: 'XP',
          amount: 0,
          new_balance: 0,
          message: 'Challenge not completed!',
        }
      }

      const reward = (userChallenge as any).challenge?.xp_reward || 0

      await supabase
        .from('user_challenges')
        .update({ status: 'CLAIMED', claimed_at: new Date().toISOString() })
        .eq('id', userChallenge.id)

      await supabase.rpc('increment_user_stats', {
        p_user_id: userId,
        p_xp: reward,
      })

      const { data: user } = await supabase
        .from('users')
        .select('xp')
        .eq('id', userId)
        .single()

      return {
        success: true,
        reward_type: 'XP',
        amount: reward,
        new_balance: user?.xp || 0,
        message: `+${reward} XP from challenge!`,
      }
    },

    miniappInviteFriend: async (
      _: any,
      { telegram_user_id }: { telegram_user_id: string },
      context: GraphQLContext,
    ) => {
      requireAuth(context)
      // Placeholder for Telegram invite logic
      return { success: true, message: 'Invite sent!', code: 'SUCCESS' }
    },

    miniappSendCheer: async (_: any, { user_id }: { user_id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Create a notification for the recipient
      await supabase.from('notifications').insert([
        {
          recipient_id: user_id,
          type: 'system',
          title: 'You got a cheer! 🎉',
          message: 'Someone sent you encouragement!',
          sender_id: userId,
          sender_type: 'user',
        },
      ])

      return { success: true, message: 'Cheer sent!', code: 'SUCCESS' }
    },

    miniappMarkNotificationRead: async (
      _: any,
      { notification_id }: { notification_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notification_id)
        .eq('recipient_id', userId)

      return { success: true, message: 'Marked as read', code: 'SUCCESS' }
    },

    miniappMarkAllNotificationsRead: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', userId)

      return { success: true, message: 'All marked as read', code: 'SUCCESS' }
    },

    miniappRegisterPushToken: async (
      _: any,
      { token }: { token: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      await supabase.from('push_tokens').upsert([{ user_id: userId, token, platform: 'telegram' }])

      return { success: true, message: 'Push token registered', code: 'SUCCESS' }
    },

    miniappUpdateSettings: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: user } = await supabase
        .from('users')
        .select('settings')
        .eq('id', userId)
        .single()

      const currentSettings = user?.settings || {}
      const newSettings = { ...currentSettings, ...input }

      await supabase.from('users').update({ settings: newSettings }).eq('id', userId)

      return {
        notifications_enabled: newSettings.notifications_enabled ?? true,
        sound_enabled: newSettings.sound_enabled ?? true,
        haptic_enabled: newSettings.haptic_enabled ?? true,
        language: newSettings.language || 'en',
        theme: newSettings.theme || 'dark',
        daily_reminder_time: newSettings.daily_reminder_time,
        share_activity: newSettings.share_activity ?? true,
      }
    },

    miniappTrackEvent: async (
      _: any,
      { event, data }: { event: string; data?: any },
      context: GraphQLContext,
    ) => {
      const userId = context.userId

      await supabase.from('analytics_events').insert([
        {
          event_type: `miniapp_${event}`,
          user_id: userId,
          metadata: data,
          platform: 'telegram_miniapp',
        },
      ])

      return { success: true, message: 'Event tracked', code: 'SUCCESS' }
    },
  },
}
