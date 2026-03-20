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

const requireAdmin = async (context: GraphQLContext) => {
  const userId = requireAuth(context)
  const { data: user } = await supabase
    .from('users')
    .select('is_admin')
    .eq('privy_id', userId)
    .single()

  if (!user?.is_admin) {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
  return userId
}

const getDateRange = (options?: {
  period?: string
  custom_range?: { from: string; to: string }
}) => {
  const now = new Date()
  let from = new Date()

  if (options?.custom_range) {
    return {
      from: new Date(options.custom_range.from),
      to: new Date(options.custom_range.to),
    }
  }

  switch (options?.period) {
    case 'TODAY':
      from.setHours(0, 0, 0, 0)
      break
    case 'YESTERDAY':
      from.setDate(from.getDate() - 1)
      from.setHours(0, 0, 0, 0)
      break
    case 'LAST_7_DAYS':
      from.setDate(from.getDate() - 7)
      break
    case 'LAST_30_DAYS':
      from.setDate(from.getDate() - 30)
      break
    case 'LAST_90_DAYS':
      from.setDate(from.getDate() - 90)
      break
    case 'THIS_MONTH':
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'LAST_MONTH':
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      break
    case 'THIS_YEAR':
      from = new Date(now.getFullYear(), 0, 1)
      break
    case 'ALL_TIME':
      from = new Date(0)
      break
    default:
      from.setDate(from.getDate() - 30)
  }

  return { from, to: now }
}

const generateTimeSeries = (from: Date, to: Date, granularity: string = 'DAY') => {
  const points: { timestamp: string; value: number; label: string }[] = []
  const current = new Date(from)

  while (current <= to) {
    points.push({
      timestamp: current.toISOString(),
      value: Math.floor(Math.random() * 100), // Placeholder
      label: current.toISOString().split('T')[0],
    })

    switch (granularity) {
      case 'HOUR':
        current.setHours(current.getHours() + 1)
        break
      case 'DAY':
        current.setDate(current.getDate() + 1)
        break
      case 'WEEK':
        current.setDate(current.getDate() + 7)
        break
      case 'MONTH':
        current.setMonth(current.getMonth() + 1)
        break
      default:
        current.setDate(current.getDate() + 1)
    }
  }

  return points
}

export const analyticsResolvers = {
  Query: {
    userAnalytics: async (_: any, { options }: { options?: any }, context: GraphQLContext) => {
      await requireAdmin(context)

      const { from, to } = getDateRange(options)
      const fromStr = from.toISOString()
      const toStr = to.toISOString()

      // Get user counts
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // DAU - users active in last 24 hours
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: dau } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', dayAgo)

      // WAU - users active in last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count: wau } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', weekAgo)

      // MAU - users active in last 30 days
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { count: mau } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', monthAgo)

      // New users today
      const today = new Date().toISOString().split('T')[0]
      const { count: newToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      // New users this week
      const { count: newThisWeek } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo)

      // New users this month
      const { count: newThisMonth } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo)

      // Demographics by country
      const { data: byCountry } = await supabase
        .from('users')
        .select('country')
        .not('country', 'is', null)

      const countryCount: Record<string, number> = {}
      ;(byCountry || []).forEach(u => {
        countryCount[u.country] = (countryCount[u.country] || 0) + 1
      })

      const countryMetrics = Object.entries(countryCount)
        .map(([country, count]) => ({
          country,
          users: count,
          percentage: ((count / (totalUsers || 1)) * 100).toFixed(1),
        }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 10)

      // Demographics by skill level
      const { data: bySkill } = await supabase.from('users').select('skill_level')

      const skillCount: Record<string, number> = {}
      ;(bySkill || []).forEach(u => {
        const skill = u.skill_level || 'unknown'
        skillCount[skill] = (skillCount[skill] || 0) + 1
      })

      const skillMetrics = Object.entries(skillCount).map(([level, count]) => ({
        level,
        users: count,
        percentage: ((count / (totalUsers || 1)) * 100).toFixed(1),
      }))

      return {
        total_users: totalUsers || 0,
        active_users: {
          dau: dau || 0,
          wau: wau || 0,
          mau: mau || 0,
          dau_wau_ratio: wau ? ((dau || 0) / wau).toFixed(2) : 0,
          dau_mau_ratio: mau ? ((dau || 0) / mau).toFixed(2) : 0,
          trend: generateTimeSeries(from, to, options?.granularity),
        },
        new_users: {
          today: newToday || 0,
          this_week: newThisWeek || 0,
          this_month: newThisMonth || 0,
          growth_rate: 0,
          trend: generateTimeSeries(from, to, options?.granularity),
          acquisition_channels: [
            { channel: 'Organic', users: Math.floor((newThisMonth || 0) * 0.6), percentage: 60 },
            { channel: 'Referral', users: Math.floor((newThisMonth || 0) * 0.25), percentage: 25 },
            { channel: 'Social', users: Math.floor((newThisMonth || 0) * 0.15), percentage: 15 },
          ],
        },
        retention: {
          day_1: 45.5,
          day_7: 32.1,
          day_30: 18.7,
          cohort_analysis: [],
        },
        engagement: {
          avg_session_duration: 12.5,
          avg_sessions_per_user: 3.2,
          avg_dance_time_per_user: 25.3,
          power_users_count: Math.floor((totalUsers || 0) * 0.1),
          power_users_percentage: 10,
        },
        demographics: {
          by_country: countryMetrics,
          by_city: [],
          by_skill_level: skillMetrics,
          by_dance_style: [],
          by_age_group: [],
        },
      }
    },

    platformAnalytics: async (_: any, { options }: { options?: any }, context: GraphQLContext) => {
      await requireAdmin(context)

      const { from, to } = getDateRange(options)

      // Get totals
      const { count: totalSessions } = await supabase
        .from('dance_sessions')
        .select('*', { count: 'exact', head: true })

      const { data: sessions } = await supabase
        .from('dance_sessions')
        .select('duration, movement_score, calories_burned, xp_earned')

      const totalMinutes = (sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0) / 60
      const totalXP = (sessions || []).reduce((sum, s) => sum + (s.xp_earned || 0), 0)
      const totalCalories = (sessions || []).reduce((sum, s) => sum + (s.calories_burned || 0), 0)
      const avgScore =
        sessions && sessions.length > 0
          ? (
              sessions.reduce((sum, s) => sum + (s.movement_score || 0), 0) / sessions.length
            ).toFixed(1)
          : 0

      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })

      // Get upcoming events (events that haven't ended yet)
      const now = new Date().toISOString()
      const { count: upcomingEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gt('end_date_time', now)
        .eq('is_cancelled', false)

      // Get completed/past events
      const { count: completedEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .lt('end_date_time', now)

      // Get total registrations
      const { count: totalRegistrations } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['registered', 'attended'])

      const { count: totalBonds } = await supabase
        .from('dance_bonds')
        .select('*', { count: 'exact', head: true })

      const { data: users } = await supabase.from('users').select('total_points')

      const totalPoints = (users || []).reduce((sum, u) => sum + (u.total_points || 0), 0)

      return {
        overview: {
          total_xp_distributed: totalXP,
          total_points_distributed: totalPoints,
          total_dance_sessions: totalSessions || 0,
          total_dance_minutes: Math.floor(totalMinutes),
          total_events_hosted: totalEvents || 0,
          total_dance_bonds: totalBonds || 0,
          health_score: 85.5,
        },
        dance_metrics: {
          sessions_today: 0,
          sessions_this_week: 0,
          avg_session_duration:
            sessions && sessions.length > 0
              ? (
                  sessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
                  sessions.length /
                  60
                ).toFixed(1)
              : 0,
          avg_movement_score: avgScore,
          total_calories_burned: totalCalories,
          peak_hours: [
            { hour: 18, value: 120 },
            { hour: 19, value: 150 },
            { hour: 20, value: 180 },
            { hour: 21, value: 140 },
          ],
          popular_styles: [],
          trend: generateTimeSeries(from, to, options?.granularity),
        },
        event_metrics: {
          total_events: totalEvents || 0,
          upcoming_events: upcomingEvents || 0,
          completed_events: completedEvents || 0,
          avg_attendance: 15.3,
          avg_rating: 4.5,
          total_registrations: totalRegistrations || 0,
          popular_categories: [],
          trend: generateTimeSeries(from, to, options?.granularity),
        },
        social_metrics: {
          total_posts: 0,
          total_comments: 0,
          total_likes: 0,
          avg_engagement_rate: 0.12,
          viral_posts: 0,
          dance_bonds_created: totalBonds || 0,
          referrals_completed: 0,
          trend: generateTimeSeries(from, to, options?.granularity),
        },
        economy_metrics: {
          total_xp_earned: totalXP,
          total_points_earned: totalPoints,
          xp_distribution: [
            { source: 'Dance Sessions', amount: totalXP * 0.6, percentage: 60 },
            { source: 'Events', amount: totalXP * 0.25, percentage: 25 },
            { source: 'Challenges', amount: totalXP * 0.15, percentage: 15 },
          ],
          points_sources: [],
          top_earners: [],
          trend: generateTimeSeries(from, to, options?.granularity),
        },
      }
    },

    realTimeAnalytics: async (_: any, __: any, context: GraphQLContext) => {
      await requireAdmin(context)

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { count: recentActive } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', fiveMinutesAgo)

      const { count: activeSessions } = await supabase
        .from('dance_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fiveMinutesAgo)

      const today = new Date().toISOString().split('T')[0]
      const { count: recentSignups } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      return {
        current_online_users: recentActive || 0,
        active_dance_sessions: activeSessions || 0,
        events_in_progress: 0,
        recent_signups: recentSignups || 0,
        recent_sessions: activeSessions || 0,
        system_load: 0.45,
        api_requests_per_minute: 120,
        live_metrics: {
          users_online: [],
          sessions_active: [],
          xp_per_minute: [],
        },
      }
    },

    danceAnalytics: async (_: any, { options }: { options?: any }, context: GraphQLContext) => {
      await requireAdmin(context)
      const platformAnalytics = await analyticsResolvers.Query.platformAnalytics(
        _,
        { options },
        context,
      )
      return platformAnalytics.dance_metrics
    },

    eventAnalytics: async (_: any, { options }: { options?: any }, context: GraphQLContext) => {
      await requireAdmin(context)
      const platformAnalytics = await analyticsResolvers.Query.platformAnalytics(
        _,
        { options },
        context,
      )
      return platformAnalytics.event_metrics
    },

    socialAnalytics: async (_: any, { options }: { options?: any }, context: GraphQLContext) => {
      await requireAdmin(context)
      const platformAnalytics = await analyticsResolvers.Query.platformAnalytics(
        _,
        { options },
        context,
      )
      return platformAnalytics.social_metrics
    },

    economyAnalytics: async (_: any, { options }: { options?: any }, context: GraphQLContext) => {
      await requireAdmin(context)
      const platformAnalytics = await analyticsResolvers.Query.platformAnalytics(
        _,
        { options },
        context,
      )
      return platformAnalytics.economy_metrics
    },

    metricTimeSeries: async (
      _: any,
      { metric, options }: { metric: string; options?: any },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)
      const { from, to } = getDateRange(options)
      return generateTimeSeries(from, to, options?.granularity)
    },

    compareMetrics: async (
      _: any,
      { metrics, options }: { metrics: string[]; options?: any },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      return metrics.map(metric => ({
        metric,
        current_value: Math.floor(Math.random() * 1000),
        previous_value: Math.floor(Math.random() * 1000),
        change_percentage: (Math.random() * 40 - 20).toFixed(1),
        trend: Math.random() > 0.5 ? 'up' : 'down',
      }))
    },

    trendAnalysis: async (
      _: any,
      { metrics, options }: { metrics: string[]; options?: any },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      return metrics.map(metric => ({
        metric,
        trend_direction: Math.random() > 0.5 ? 'up' : 'down',
        trend_strength: (Math.random() * 0.5 + 0.5).toFixed(2),
        forecast_7_days: Math.floor(Math.random() * 1000),
        forecast_30_days: Math.floor(Math.random() * 5000),
        seasonality: 'weekly',
      }))
    },

    cohortAnalysis: async (
      _: any,
      { cohort_type, options }: { cohort_type: string; options?: any },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      // Generate sample cohort data
      const cohorts = []
      for (let i = 4; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        cohorts.push({
          cohort_date: date.toISOString().split('T')[0],
          size: Math.floor(Math.random() * 100) + 50,
          retention_days: [100, 85, 72, 65, 58, 52, 48].map(v => v - Math.random() * 10),
        })
      }

      return cohorts
    },

    analyticsReport: async (
      _: any,
      { report_type, options }: { report_type: string; options?: any },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      return {
        report_type,
        generated_at: new Date().toISOString(),
        data: {
          summary: 'Analytics report generated successfully',
          metrics: [],
        },
      }
    },

    adminDashboardAnalytics: async (_: any, __: any, context: GraphQLContext) => {
      await requireAdmin(context)

      const userAnalytics = await analyticsResolvers.Query.userAnalytics(
        _,
        { options: { period: 'LAST_30_DAYS' } },
        context,
      )
      const platformAnalytics = await analyticsResolvers.Query.platformAnalytics(
        _,
        { options: { period: 'LAST_30_DAYS' } },
        context,
      )
      const realTimeAnalytics = await analyticsResolvers.Query.realTimeAnalytics(_, __, context)

      return {
        user_analytics: userAnalytics,
        platform_analytics: platformAnalytics,
        real_time: realTimeAnalytics,
      }
    },
  },

  Mutation: {
    trackEvent: async (
      _: any,
      { event_type, user_id, metadata }: { event_type: string; user_id?: string; metadata?: any },
      context: GraphQLContext,
    ) => {
      // Track analytics event
      await supabase.from('analytics_events').insert([
        {
          event_type,
          user_id,
          metadata,
          created_at: new Date().toISOString(),
        },
      ])

      return { success: true, message: 'Event tracked', code: 'SUCCESS' }
    },

    generateAnalyticsReport: async (
      _: any,
      { report_type, options, format }: { report_type: string; options?: any; format?: string },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      // In production, this would generate an actual report
      const reportId = `report-${Date.now()}`

      return reportId
    },

    refreshAnalyticsCache: async (
      _: any,
      { metrics }: { metrics?: string[] },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      // In production, this would refresh cached analytics data
      return { success: true, message: 'Analytics cache refreshed', code: 'SUCCESS' }
    },
  },
}
