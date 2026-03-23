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

export const wearableResolvers = {
  Query: {
    myWearableDevices: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('wearable_devices')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch wearable devices', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    wearableDevice: async (_: any, { deviceId }: { deviceId: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('wearable_devices')
        .select('*')
        .eq('id', deviceId)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        throw new GraphQLError('Wearable device not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return data
    },

    myWearableHealthData: async (
      _: any,
      args: { deviceId?: string; from?: string; to?: string; limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      const limit = args.limit || 100

      let query = supabase
        .from('wearable_health_data')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(limit)

      if (args.deviceId) {
        query = query.eq('device_id', args.deviceId)
      }
      if (args.from) {
        query = query.gte('recorded_at', args.from)
      }
      if (args.to) {
        query = query.lte('recorded_at', args.to)
      }

      const { data, error } = await query

      if (error) {
        throw new GraphQLError('Failed to fetch health data', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    myWearableMotionData: async (
      _: any,
      args: { deviceId?: string; sessionId?: string; from?: string; to?: string; limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      const limit = args.limit || 100

      let query = supabase
        .from('wearable_motion_data')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(limit)

      if (args.deviceId) {
        query = query.eq('device_id', args.deviceId)
      }
      if (args.sessionId) {
        query = query.eq('dance_session_id', args.sessionId)
      }
      if (args.from) {
        query = query.gte('recorded_at', args.from)
      }
      if (args.to) {
        query = query.lte('recorded_at', args.to)
      }

      const { data, error } = await query

      if (error) {
        throw new GraphQLError('Failed to fetch motion data', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    wearableStats: async (_: any, { deviceId }: { deviceId?: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get health data stats
      let healthQuery = supabase.from('wearable_health_data').select('*').eq('user_id', userId)

      if (deviceId) {
        healthQuery = healthQuery.eq('device_id', deviceId)
      }

      const { data: healthData } = await healthQuery

      // Get motion data stats
      let motionQuery = supabase.from('wearable_motion_data').select('*').eq('user_id', userId)

      if (deviceId) {
        motionQuery = motionQuery.eq('device_id', deviceId)
      }

      const { data: motionData } = await motionQuery

      // Calculate last 7 days activity
      const last7Days: any[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        const dayHealth = (healthData || []).filter(h => h.recorded_at?.startsWith(dateStr))
        const dayMotion = (motionData || []).filter(m => m.recorded_at?.startsWith(dateStr))

        last7Days.push({
          date: dateStr,
          steps: dayHealth.reduce((sum, h) => sum + (h.steps || 0), 0),
          calories: dayHealth.reduce((sum, h) => sum + (h.calories_active || 0), 0),
          active_minutes: dayHealth.reduce((sum, h) => sum + (h.active_minutes || 0), 0),
          heart_rate_avg:
            dayHealth.length > 0
              ? Math.round(
                  dayHealth.reduce((sum, h) => sum + (h.heart_rate || 0), 0) / dayHealth.length,
                )
              : null,
          dance_sessions: new Set(dayMotion.map(m => m.dance_session_id).filter(Boolean)).size,
        })
      }

      const avgHeartRate =
        healthData && healthData.length > 0
          ? healthData.reduce((sum, h) => sum + (h.heart_rate || 0), 0) /
            healthData.filter(h => h.heart_rate).length
          : null

      const avgSteps =
        healthData && healthData.length > 0
          ? healthData.reduce((sum, h) => sum + (h.steps || 0), 0) / healthData.length
          : 0

      return {
        device_id: deviceId || 'all',
        total_syncs: healthData?.length || 0,
        total_health_records: healthData?.length || 0,
        total_motion_records: motionData?.length || 0,
        average_heart_rate: avgHeartRate,
        average_steps_daily: avgSteps,
        total_active_minutes: healthData?.reduce((sum, h) => sum + (h.active_minutes || 0), 0) || 0,
        last_7_days_activity: last7Days,
      }
    },

    latestWearableReading: async (
      _: any,
      { deviceId }: { deviceId?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      let query = supabase
        .from('wearable_health_data')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)

      if (deviceId) {
        query = query.eq('device_id', deviceId)
      }

      const { data, error } = await query

      if (error) {
        throw new GraphQLError('Failed to fetch latest reading', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data?.[0] || null
    },
  },

  Mutation: {
    registerWearableDevice: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // If this is set as primary, unset other primaries
      if (input.is_primary) {
        await supabase.from('wearable_devices').update({ is_primary: false }).eq('user_id', userId)
      }

      const { data, error } = await supabase
        .from('wearable_devices')
        .insert([
          {
            user_id: userId,
            device_type: input.device_type,
            device_name: input.device_name,
            device_model: input.device_model,
            firmware_version: input.firmware_version,
            capabilities: input.capabilities || [],
            is_primary: input.is_primary || false,
            sync_status: 'PENDING',
          },
        ])
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to register wearable device', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    updateWearableDevice: async (
      _: any,
      { deviceId, input }: { deviceId: string; input: any },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('wearable_devices')
        .update({
          device_name: input.device_name,
          device_model: input.device_model,
          firmware_version: input.firmware_version,
          capabilities: input.capabilities,
        })
        .eq('id', deviceId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error || !data) {
        throw new GraphQLError('Failed to update wearable device', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    removeWearableDevice: async (
      _: any,
      { deviceId }: { deviceId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { error } = await supabase
        .from('wearable_devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', userId)

      if (error) {
        throw new GraphQLError('Failed to remove wearable device', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return { success: true, message: 'Device removed successfully', code: 'SUCCESS' }
    },

    setPrimaryWearable: async (
      _: any,
      { deviceId }: { deviceId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Unset all primaries first
      await supabase.from('wearable_devices').update({ is_primary: false }).eq('user_id', userId)

      // Set this one as primary
      const { data, error } = await supabase
        .from('wearable_devices')
        .update({ is_primary: true })
        .eq('id', deviceId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error || !data) {
        throw new GraphQLError('Failed to set primary device', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    syncWearableData: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)
      let syncedRecords = 0
      let failedRecords = 0
      const errors: string[] = []

      // Update device sync status
      await supabase
        .from('wearable_devices')
        .update({ sync_status: 'SYNCING' })
        .eq('id', input.device_id)
        .eq('user_id', userId)

      // Sync health data
      if (input.health_data && input.health_data.length > 0) {
        const healthRecords = input.health_data.map((d: any) => ({
          ...d,
          user_id: userId,
        }))

        const { error } = await supabase.from('wearable_health_data').insert(healthRecords)

        if (error) {
          failedRecords += healthRecords.length
          errors.push(`Health data sync failed: ${error.message}`)
        } else {
          syncedRecords += healthRecords.length
        }
      }

      // Sync motion data
      if (input.motion_data && input.motion_data.length > 0) {
        const motionRecords = input.motion_data.map((d: any) => ({
          ...d,
          user_id: userId,
        }))

        const { error } = await supabase.from('wearable_motion_data').insert(motionRecords)

        if (error) {
          failedRecords += motionRecords.length
          errors.push(`Motion data sync failed: ${error.message}`)
        } else {
          syncedRecords += motionRecords.length
        }
      }

      // Update device sync status
      const now = new Date().toISOString()
      await supabase
        .from('wearable_devices')
        .update({
          sync_status: failedRecords === 0 ? 'COMPLETED' : 'FAILED',
          last_sync_at: now,
        })
        .eq('id', input.device_id)
        .eq('user_id', userId)

      return {
        success: failedRecords === 0,
        synced_records: syncedRecords,
        failed_records: failedRecords,
        last_sync_at: now,
        errors: errors.length > 0 ? errors : null,
      }
    },

    syncHealthData: async (_: any, { data }: { data: any[] }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const records = data.map(d => ({
        ...d,
        user_id: userId,
      }))

      const { error } = await supabase.from('wearable_health_data').insert(records)

      if (error) {
        return {
          success: false,
          synced_records: 0,
          failed_records: records.length,
          errors: [error.message],
        }
      }

      return {
        success: true,
        synced_records: records.length,
        failed_records: 0,
        last_sync_at: new Date().toISOString(),
      }
    },

    syncMotionData: async (_: any, { data }: { data: any[] }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const records = data.map(d => ({
        ...d,
        user_id: userId,
      }))

      const { error } = await supabase.from('wearable_motion_data').insert(records)

      if (error) {
        return {
          success: false,
          synced_records: 0,
          failed_records: records.length,
          errors: [error.message],
        }
      }

      return {
        success: true,
        synced_records: records.length,
        failed_records: 0,
        last_sync_at: new Date().toISOString(),
      }
    },

    requestWearableSync: async (
      _: any,
      { deviceId }: { deviceId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('wearable_devices')
        .update({ sync_status: 'PENDING' })
        .eq('id', deviceId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error || !data) {
        throw new GraphQLError('Failed to request sync', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },
  },

  WearableDevice: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single()
      return data
    },
  },

  WearableHealthData: {
    device: async (parent: any) => {
      const { data } = await supabase
        .from('wearable_devices')
        .select('*')
        .eq('id', parent.device_id)
        .single()
      return data
    },
  },

  WearableMotionData: {
    device: async (parent: any) => {
      const { data } = await supabase
        .from('wearable_devices')
        .select('*')
        .eq('id', parent.device_id)
        .single()
      return data
    },
    dance_session: async (parent: any) => {
      if (!parent.dance_session_id) return null
      const { data } = await supabase
        .from('dance_sessions')
        .select('*')
        .eq('id', parent.dance_session_id)
        .single()
      return data
    },
  },
}
