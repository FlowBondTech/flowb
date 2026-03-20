import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import { discord } from '../../services/discord.js'
import type { GraphQLContext } from '../context.js'

// Helper function to require authentication
const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

// Helper function to generate a unique referral code
async function generateUniqueReferralCode(userId: string): Promise<string> {
  // Get username from user table
  const { data: user, error } = await supabase
    .from('users')
    .select('username')
    .eq('privy_id', userId)
    .single()

  if (error) {
    console.error('Error fetching user for referral code:', error)
    throw new GraphQLError('Failed to fetch user data', {
      extensions: { code: 'DATABASE_ERROR', originalError: error },
    })
  }

  if (!user?.username) {
    console.error('User found but no username set:', { userId })
    throw new GraphQLError(
      'Please set your username in your profile before creating a referral code',
      {
        extensions: {
          code: 'USERNAME_REQUIRED',
          message: 'Please complete your profile by setting a username first',
        },
      },
    )
  }

  // Use username as referral code (already unique)
  return user.username
}

// Helper function to generate share URL
function generateShareUrl(referralCode: string): string {
  const baseUrl = process.env.WEB_URL || 'https://danz.now'
  return `${baseUrl}/i/${referralCode}`
}

// Helper function for device fingerprinting
function createDeviceFingerprint(input: {
  ip_address?: string
  user_agent?: string
  device_info?: any
}): any {
  return {
    ip_address: input.ip_address || null,
    user_agent: input.user_agent || null,
    device_info: input.device_info || {},
    timestamp: new Date().toISOString(),
  }
}

// Helper function to check for fraud indicators
async function checkFraudIndicators(
  referralCode: string,
  fingerprint: any,
): Promise<{ isSuspicious: boolean; reason?: string }> {
  // Check 1: IP address rate limiting
  if (fingerprint.ip_address) {
    const { count } = await supabase
      .from('referral_click_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code', referralCode)
      .eq('ip_address', fingerprint.ip_address)
      .gte('clicked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h

    if (count && count > 10) {
      return { isSuspicious: true, reason: 'Excessive clicks from same IP' }
    }
  }

  // Check 2: User agent validation
  if (!fingerprint.user_agent || fingerprint.user_agent.length < 10) {
    return { isSuspicious: true, reason: 'Invalid user agent' }
  }

  return { isSuspicious: false }
}

export const referralResolvers = {
  Query: {
    getReferralByCode: async (_: any, { code }: { code: string }, _context: GraphQLContext) => {
      const { data, error } = await supabase
        .from('referrals')
        .select(
          `
          *,
          referrer:users!referrals_referrer_id_fkey(username, display_name, avatar_url, xp, level)
        `,
        )
        .eq('referral_code', code)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Referral not found
        }
        throw new GraphQLError('Failed to fetch referral', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    myReferralCode: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if user already has a referral code
      const { data: existingCode } = await supabase
        .from('referral_codes')
        .select('id, user_id, code, created_at')
        .eq('user_id', userId)
        .single()

      if (existingCode) {
        // Map database column 'code' to GraphQL field 'referral_code'
        return {
          ...existingCode,
          referral_code: existingCode.code,
          share_url: generateShareUrl(existingCode.code),
        }
      }

      // Generate new referral code
      const referralCode = await generateUniqueReferralCode(userId)
      const shareUrl = generateShareUrl(referralCode)

      const { data: newCode, error } = await supabase
        .from('referral_codes')
        .insert([
          {
            user_id: userId,
            code: referralCode, // Fixed: column name is 'code', not 'referral_code'
          },
        ])
        .select('id, user_id, code, created_at')
        .single()

      if (error) {
        throw new GraphQLError('Failed to create referral code', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Map database column 'code' to GraphQL field 'referral_code'
      return {
        ...newCode,
        referral_code: newCode.code,
        share_url: shareUrl,
      }
    },

    myReferralStats: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get user's username (which is their referral code)
      const { data: userData } = await supabase
        .from('users')
        .select('username, referral_count, referral_points_earned')
        .eq('privy_id', userId)
        .single()

      if (!userData || !userData.username) {
        // Return empty stats if no username exists
        return {
          total_clicks: 0,
          total_signups: 0,
          total_completed: 0,
          total_points_earned: 0,
          conversion_rate: 0,
          pending_referrals: 0,
          completed_referrals: 0,
        }
      }

      const username = userData.username

      // Get users who were invited by this user (using invited_by field)
      const { data: invitedUsers, count: totalSignups } = await supabase
        .from('users')
        .select('privy_id, created_at, total_sessions', { count: 'exact' })
        .eq('invited_by', username)

      // Get click tracking data for this user's referral code
      const { count: totalClicks } = await supabase
        .from('referral_click_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('referral_code', username)

      // Calculate stats based on actual data
      const signupsCount = totalSignups || 0
      const clicksCount = totalClicks || 0

      // Count users who have completed at least one session (total_sessions > 0)
      const completedCount =
        invitedUsers?.filter(u => u.total_sessions && u.total_sessions > 0).length || 0
      const pendingCount = signupsCount - completedCount

      // Use referral_points_earned from user data or calculate
      // 20 points per signup + 230 points per completed = 250 total per completed referral
      const pointsEarned =
        userData.referral_points_earned || signupsCount * 20 + completedCount * 230

      // Calculate conversion rate
      const conversionRate = clicksCount > 0 ? Math.round((signupsCount / clicksCount) * 100) : 0

      return {
        total_clicks: clicksCount,
        total_signups: signupsCount,
        total_completed: completedCount,
        total_points_earned: pointsEarned,
        conversion_rate: conversionRate,
        pending_referrals: pendingCount,
        completed_referrals: completedCount,
      }
    },

    myReferrals: async (
      _: any,
      { limit = 20, offset = 0, status }: { limit?: number; offset?: number; status?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      let query = supabase
        .from('referrals')
        .select(
          `
          *,
          referee:users!referrals_referee_id_fkey(username, display_name, avatar_url)
        `,
        )
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase error fetching referrals:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw new GraphQLError('Failed to fetch referrals', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      console.log('[myReferrals] Found referrals:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('[myReferrals] First referral:', JSON.stringify(data[0], null, 2))
      }

      return data || []
    },

    getReferralClickStats: async (_: any, { code }: { code: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Verify the referral code belongs to the user
      const { data: referralCode } = await supabase
        .from('referral_codes')
        .select('user_id')
        .eq('code', code)
        .single()

      if (!referralCode || referralCode.user_id !== userId) {
        throw new GraphQLError('Unauthorized to view click stats', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { data, error } = await supabase
        .from('referral_click_tracking')
        .select('*')
        .eq('referral_code', code)
        .order('clicked_at', { ascending: false })
        .limit(100)

      if (error) {
        throw new GraphQLError('Failed to fetch click stats', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    // Get referral chain for a user (shows who invited them, who invited that person, etc.)
    getReferralChain: async (_: any, { userId }: { userId?: string }, context: GraphQLContext) => {
      const targetUserId = userId || requireAuth(context)

      const chain: Array<{
        user_id: string
        username: string | null
        invited_by: string | null
        depth: number
      }> = []

      let currentUserId = targetUserId
      let depth = 0
      const maxDepth = 10 // Prevent infinite loops

      while (currentUserId && depth < maxDepth) {
        const { data: user } = await supabase
          .from('users')
          .select('privy_id, username, invited_by')
          .eq('privy_id', currentUserId)
          .single()

        if (!user) break

        chain.push({
          user_id: user.privy_id,
          username: user.username,
          invited_by: user.invited_by,
          depth,
        })

        // If no invited_by, we've reached the top of the chain
        if (!user.invited_by) break

        // Find the user who invited this person (by referral code/username)
        const { data: inviter } = await supabase
          .from('users')
          .select('privy_id, username, invited_by')
          .eq('username', user.invited_by)
          .single()

        if (!inviter) break

        currentUserId = inviter.privy_id
        depth++
      }

      return chain
    },

    // Get users invited by a specific user (downline)
    getMyReferrals: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get user's username (their referral code)
      const { data: user } = await supabase
        .from('users')
        .select('username')
        .eq('privy_id', userId)
        .single()

      if (!user?.username) {
        return []
      }

      // Find all users who were invited by this user
      const { data: referrals } = await supabase
        .from('users')
        .select('privy_id, username, display_name, avatar_url, created_at, invited_by')
        .eq('invited_by', user.username)
        .order('created_at', { ascending: false })

      return referrals || []
    },
  },

  Mutation: {
    trackReferralClick: async (
      _: any,
      { input }: { input: any },
    ): Promise<{ success: boolean; message: string }> => {
      const { referral_code, ip_address, user_agent, device_info } = input

      // First, check if the referral code is a valid username
      const { data: user } = await supabase
        .from('users')
        .select('privy_id, username')
        .eq('username', referral_code)
        .single()

      if (!user) {
        throw new GraphQLError('Invalid referral code', {
          extensions: { code: 'INVALID_REFERRAL_CODE' },
        })
      }

      // Check if referral code exists, create if not
      let { data: referralCodeRecord } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('code', referral_code)
        .single()

      if (!referralCodeRecord) {
        // Auto-create referral code for this user
        const { data: newCode, error: createError } = await supabase
          .from('referral_codes')
          .insert([
            {
              user_id: user.privy_id,
              code: referral_code,
            },
          ])
          .select('id')
          .single()

        if (createError) {
          console.error('Failed to auto-create referral code:', createError)
          throw new GraphQLError('Failed to process referral code', {
            extensions: { code: 'DATABASE_ERROR', originalError: createError },
          })
        }

        referralCodeRecord = newCode
      }

      // Create device fingerprint
      const fingerprint = createDeviceFingerprint({ ip_address, user_agent, device_info })

      // Check for fraud indicators
      const fraudCheck = await checkFraudIndicators(referral_code, fingerprint)
      if (fraudCheck.isSuspicious) {
        console.warn(`Suspicious referral click detected: ${fraudCheck.reason}`)
        // Still track it but flag it
      }

      // Track the click
      const { error: trackError } = await supabase.from('referral_click_tracking').insert([
        {
          referral_code,
          ip_address: fingerprint.ip_address,
          user_agent: fingerprint.user_agent,
          device_id: 'web', // Simple static value since device tracking not needed
        },
      ])

      if (trackError) {
        console.error('Database error tracking referral click:', trackError)
        console.error('Attempted insert data:', {
          referral_code,
          ip_address: fingerprint.ip_address,
          user_agent: fingerprint.user_agent,
          device_id: 'web',
        })
        throw new GraphQLError('Failed to track referral click', {
          extensions: { code: 'DATABASE_ERROR', originalError: trackError },
        })
      }

      return {
        success: true,
        message: 'Referral click tracked successfully',
      }
    },

    completeReferral: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const { referral_code, referee_user_id } = input
      const userId = requireAuth(context) // This should be the referee

      // Verify the referee_user_id matches the authenticated user
      if (userId !== referee_user_id) {
        throw new GraphQLError('Unauthorized: User ID mismatch', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      // Get referrer user ID from referral code
      const { data: referralCode } = await supabase
        .from('referral_codes')
        .select('user_id')
        .eq('code', referral_code)
        .single()

      if (!referralCode) {
        throw new GraphQLError('Invalid referral code', {
          extensions: { code: 'INVALID_REFERRAL_CODE' },
        })
      }

      const referrerUserId = referralCode.user_id

      // Check if referral already exists
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referral_code', referral_code)
        .eq('referee_id', referee_user_id)
        .single()

      if (existingReferral) {
        throw new GraphQLError('Referral already completed', {
          extensions: { code: 'DUPLICATE_REFERRAL' },
        })
      }

      // Create referral record with signed_up status
      const { data: referral, error } = await supabase
        .from('referrals')
        .insert([
          {
            referral_code,
            referrer_id: referrerUserId,
            referee_id: referee_user_id,
            status: 'signed_up',
            signed_up_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Referral insert error:', error)
        throw new GraphQLError('Failed to complete referral', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Update the referrer's stats (increment referral_count)
      const { data: referrerData } = await supabase
        .from('users')
        .select('referral_count')
        .eq('privy_id', referrerUserId)
        .single()

      const newCount = (referrerData?.referral_count || 0) + 1

      const { error: statsError } = await supabase
        .from('users')
        .update({
          referral_count: newCount,
        })
        .eq('privy_id', referrerUserId)

      if (statsError) {
        console.error('Failed to update referrer stats:', statsError)
      } else {
        console.log(`Updated referrer ${referrerUserId} stats`)
      }

      // Award 20 points for signup
      const signupPoints = 20

      // Create signup reward record
      const { error: rewardError } = await supabase.from('referral_rewards').insert([
        {
          referral_id: referral.id,
          user_id: referrerUserId,
          points_awarded: signupPoints,
          reward_type: 'signup',
        },
      ])

      if (rewardError) {
        console.error('Failed to create signup reward:', rewardError)
      }

      // Update referrer's points (including current_points_balance and total_points_earned)
      const { data: currentUser } = await supabase
        .from('users')
        .select('xp, referral_points_earned, current_points_balance, total_points_earned')
        .eq('privy_id', referrerUserId)
        .single()

      const newXp = (currentUser?.xp || 0) + signupPoints
      const newReferralPoints = (currentUser?.referral_points_earned || 0) + signupPoints
      const newBalance = (currentUser?.current_points_balance || 0) + signupPoints
      const newTotalEarned = (currentUser?.total_points_earned || 0) + signupPoints

      const { error: pointsError } = await supabase
        .from('users')
        .update({
          xp: newXp,
          referral_points_earned: newReferralPoints,
          current_points_balance: newBalance,
          total_points_earned: newTotalEarned,
        })
        .eq('privy_id', referrerUserId)

      if (pointsError) {
        console.error('Failed to award signup points:', pointsError)
      } else {
        console.log(
          `Awarded ${signupPoints} signup points to referrer ${referrerUserId} (balance: ${newBalance})`,
        )
      }

      // Mark referral as having received signup points
      await supabase.from('referrals').update({ signup_points_awarded: true }).eq('id', referral.id)

      // Update user's invited_by field to track the referral chain
      const { error: updateError } = await supabase
        .from('users')
        .update({ invited_by: referral_code })
        .eq('privy_id', referee_user_id)

      if (updateError) {
        console.error('Failed to update invited_by field:', updateError)
        // Don't throw error, referral record is already created
      } else {
        console.log(`Updated user ${referee_user_id} invited_by to ${referral_code}`)
      }

      // Get usernames for Discord notification
      const { data: referrer } = await supabase
        .from('users')
        .select('username')
        .eq('privy_id', referrerUserId)
        .single()

      const { data: referee } = await supabase
        .from('users')
        .select('username')
        .eq('privy_id', referee_user_id)
        .single()

      // Discord webhook: Referral completed
      discord
        .notifyReferralUsed({
          referrer_username: referrer?.username || 'Unknown',
          referred_username: referee?.username || 'New User',
          referral_code,
        })
        .catch(err => console.error('[Discord] Referral notification failed:', err))

      // Create notification for referrer about signup points
      await supabase.from('notifications').insert({
        type: 'referral',
        title: 'Referral Signup - 20 Points Earned!',
        message: `${referee?.username || 'Someone'} signed up with your referral code! You earned 20 points. They'll earn you 230 more when they complete their first session.`,
        sender_id: referee_user_id,
        sender_type: 'user',
        recipient_id: referrerUserId,
        action_type: 'open_referrals',
        action_data: { referral_id: referral.id, points: signupPoints },
      })

      return referral
    },

    markReferralCompleted: async (_: any, { referralId }: { referralId: string }) => {
      // Get the referral
      const { data: referral, error: fetchError } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single()

      if (fetchError || !referral) {
        throw new GraphQLError('Referral not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      if (referral.status === 'completed') {
        throw new GraphQLError('Referral already completed', {
          extensions: { code: 'ALREADY_COMPLETED' },
        })
      }

      // Update referral to completed and award completion points (230 points)
      // Total is 250: 20 for signup + 230 for completion
      const completionPoints = 230

      const { data: updatedReferral, error: updateError } = await supabase
        .from('referrals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          first_session_completed_at: new Date().toISOString(),
        })
        .eq('id', referralId)
        .select()
        .single()

      if (updateError) {
        throw new GraphQLError('Failed to mark referral as completed', {
          extensions: { code: 'DATABASE_ERROR', originalError: updateError },
        })
      }

      // Create completion reward record
      const { error: rewardError } = await supabase.from('referral_rewards').insert([
        {
          referral_id: referralId,
          user_id: referral.referrer_id,
          points_awarded: completionPoints,
          reward_type: 'completion',
        },
      ])

      if (rewardError) {
        console.error('Failed to create completion reward:', rewardError)
      }

      // Award points to referrer - update all point fields including current_points_balance
      const { data: currentUser } = await supabase
        .from('users')
        .select('xp, referral_points_earned, current_points_balance, total_points_earned')
        .eq('privy_id', referral.referrer_id)
        .single()

      const newXp = (currentUser?.xp || 0) + completionPoints
      const newReferralPoints = (currentUser?.referral_points_earned || 0) + completionPoints
      const newBalance = (currentUser?.current_points_balance || 0) + completionPoints
      const newTotalEarned = (currentUser?.total_points_earned || 0) + completionPoints

      const { error: pointsError } = await supabase
        .from('users')
        .update({
          xp: newXp,
          referral_points_earned: newReferralPoints,
          current_points_balance: newBalance,
          total_points_earned: newTotalEarned,
        })
        .eq('privy_id', referral.referrer_id)

      if (pointsError) {
        console.error('Failed to award completion points to referrer:', pointsError)
        // Don't throw error - referral is still marked as completed
      } else {
        console.log(
          `Awarded ${completionPoints} completion points to referrer ${referral.referrer_id} (balance: ${newBalance})`,
        )
      }

      // Get referee username for notification
      const { data: referee } = await supabase
        .from('users')
        .select('username')
        .eq('privy_id', referral.referee_id)
        .single()

      // Create notification for referrer about completion points
      await supabase.from('notifications').insert({
        type: 'referral',
        title: 'Referral Completed - 230 Points Earned!',
        message: `${referee?.username || 'Your referral'} completed their first session! You earned 230 points (250 total). Keep sharing!`,
        sender_id: referral.referee_id,
        sender_type: 'user',
        recipient_id: referral.referrer_id,
        action_type: 'open_referrals',
        action_data: { referral_id: referralId, points: completionPoints, total_points: 250 },
      })

      return updatedReferral
    },

    generateShareLinks: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get or create referral code
      let { data: referralCodeData } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .single()

      if (!referralCodeData) {
        // Create new referral code
        const code = await generateUniqueReferralCode(userId)
        const shareUrl = generateShareUrl(code)

        const { data: newCode, error } = await supabase
          .from('referral_codes')
          .insert([
            {
              user_id: userId,
              code: code, // Fixed: column name is 'code', not 'referral_code'
              share_url: shareUrl,
            },
          ])
          .select('code')
          .single()

        if (error) {
          throw new GraphQLError('Failed to create referral code', {
            extensions: { code: 'DATABASE_ERROR', originalError: error },
          })
        }

        referralCodeData = newCode
      }

      const code = referralCodeData.code
      const baseUrl = process.env.WEB_URL || 'https://danz.now'
      const shareUrl = `${baseUrl}/i/${code}`

      // Generate share templates
      const smsTemplate = `Hey! Join me on DANZ and earn rewards by dancing. Use my link: ${shareUrl}`

      const whatsappTemplate = encodeURIComponent(
        `🕺 Join me on DANZ! Dance your way to fitness and earn rewards.\n\nUse my referral link: ${shareUrl}`,
      )

      const socialMediaTemplate = `Join me on DANZ and turn your dance sessions into rewards! 💃🕺\n\n${shareUrl}\n\n#DANZ #DanceToEarn #Fitness`

      return {
        referral_code: code,
        short_url: shareUrl,
        sms_template: smsTemplate,
        whatsapp_template: `https://wa.me/?text=${whatsappTemplate}`,
        social_media_template: socialMediaTemplate,
      }
    },

    nudgeReferral: async (
      _: any,
      { referralId, message }: { referralId: string; message?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get the referral
      const { data: referral, error: fetchError } = await supabase
        .from('referrals')
        .select(`
          *,
          referee:users!referrals_referee_id_fkey(privy_id, username, email, display_name)
        `)
        .eq('id', referralId)
        .single()

      if (fetchError || !referral) {
        throw new GraphQLError('Referral not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Verify the user is the referrer
      if (referral.referrer_id !== userId) {
        throw new GraphQLError('You can only nudge your own referrals', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      // Check if referral is already completed
      if (referral.status === 'completed') {
        throw new GraphQLError('Cannot nudge a completed referral', {
          extensions: { code: 'ALREADY_COMPLETED' },
        })
      }

      // Check rate limit: max 3 nudges per referral per day
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: recentNudges } = await supabase
        .from('referral_nudges')
        .select('*', { count: 'exact', head: true })
        .eq('referral_id', referralId)
        .gte('sent_at', oneDayAgo)

      if (recentNudges && recentNudges >= 3) {
        throw new GraphQLError('Maximum 3 nudges per day per referral', {
          extensions: { code: 'RATE_LIMITED' },
        })
      }

      // Get referrer info for personalized message
      const { data: referrer } = await supabase
        .from('users')
        .select('username, display_name')
        .eq('privy_id', userId)
        .single()

      const referrerName = referrer?.display_name || referrer?.username || 'Your friend'
      const refereeName = referral.referee?.display_name || referral.referee?.username || 'there'

      // Default nudge message
      const defaultMessage = `Hey ${refereeName}! ${referrerName} is waiting for you to complete your first DANZ session. Dance today and you'll both earn rewards!`

      // Create nudge record
      const { data: nudge, error: nudgeError } = await supabase
        .from('referral_nudges')
        .insert([
          {
            referral_id: referralId,
            referrer_id: userId,
            referee_id: referral.referee_id,
            nudge_type: 'email',
            nudge_message: message || defaultMessage,
          },
        ])
        .select()
        .single()

      if (nudgeError) {
        console.error('Failed to create nudge:', nudgeError)
        throw new GraphQLError('Failed to send nudge', {
          extensions: { code: 'DATABASE_ERROR', originalError: nudgeError },
        })
      }

      // TODO: Actually send the email (requires email service configuration)
      // For now, we just record the nudge and return success
      console.log(`Nudge created for referral ${referralId}: ${message || defaultMessage}`)

      // Discord notification for nudge
      discord
        .sendAlert({
          title: 'Referral Nudge Sent',
          message: `Referrer: ${referrerName}\nReferee: ${refereeName}\nMessage: ${(message || defaultMessage).substring(0, 100)}...`,
          severity: 'low',
          source: 'Referral System',
        })
        .catch((err: Error) => console.error('[Discord] Nudge notification failed:', err))

      return {
        success: true,
        message: 'Nudge sent successfully',
        nudge_id: nudge.id,
        nudges_remaining_today: 3 - ((recentNudges || 0) + 1),
      }
    },
  },

  ReferralCode: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()

      return data
    },
  },

  Referral: {
    referrer: async (parent: any) => {
      // If referrer data was already fetched via Supabase join, use it
      if (
        parent.referrer &&
        typeof parent.referrer === 'object' &&
        parent.referrer.username !== undefined
      ) {
        return parent.referrer
      }

      if (!parent.referrer_id) return null

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.referrer_id)
        .single()

      return data
    },

    referee: async (parent: any) => {
      // If referee data was already fetched via Supabase join, use it
      if (
        parent.referee &&
        typeof parent.referee === 'object' &&
        parent.referee.username !== undefined
      ) {
        return parent.referee
      }

      if (!parent.referee_id) return null

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.referee_id)
        .single()

      return data
    },

    // Map database field names to GraphQL field names
    referrer_user_id: (parent: any) => parent.referrer_id,
    referee_user_id: (parent: any) => parent.referee_id,
  },
}
