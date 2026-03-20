import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import { discord } from '../../services/discord.js'
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
    .select('role, is_admin')
    .eq('privy_id', userId)
    .single()

  if (!user?.is_admin && user?.role !== 'admin') {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return userId
}

// Cooldown period in days between username changes (after first change)
const USERNAME_CHANGE_COOLDOWN_DAYS = 30

export const usernameChangeResolvers = {
  Query: {
    myUsernameChangeEligibility: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get current user
      const { data: user } = await supabase
        .from('users')
        .select('username')
        .eq('privy_id', userId)
        .single()

      // Get pending request if any
      const { data: pendingRequest } = await supabase
        .from('username_change_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single()

      // Get change history count
      const { count: changeCount } = await supabase
        .from('username_change_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['approved', 'auto_approved'])

      // Get last successful change
      const { data: lastChange } = await supabase
        .from('username_change_requests')
        .select('reviewed_at')
        .eq('user_id', userId)
        .in('status', ['approved', 'auto_approved'])
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .single()

      const totalChanges = changeCount || 0
      const isFirstChange = totalChanges === 0

      // Check cooldown
      let cooldownEndsAt: string | null = null
      let canRequest = true
      let message: string | undefined

      if (pendingRequest) {
        canRequest = false
        message = 'You already have a pending username change request'
      } else if (lastChange?.reviewed_at) {
        const lastChangeDate = new Date(lastChange.reviewed_at)
        const cooldownEnd = new Date(lastChangeDate)
        cooldownEnd.setDate(cooldownEnd.getDate() + USERNAME_CHANGE_COOLDOWN_DAYS)

        if (new Date() < cooldownEnd) {
          canRequest = false
          cooldownEndsAt = cooldownEnd.toISOString()
          message = `You can request a username change after ${cooldownEnd.toLocaleDateString()}`
        }
      }

      return {
        can_request: canRequest,
        is_first_change: isFirstChange,
        will_auto_approve: isFirstChange, // First change is auto-approved
        pending_request: pendingRequest,
        change_count: totalChanges,
        last_change_at: lastChange?.reviewed_at || null,
        cooldown_ends_at: cooldownEndsAt,
        message: canRequest
          ? isFirstChange
            ? 'First username change will be approved automatically'
            : 'Your request will be reviewed by an admin'
          : message,
      }
    },

    myUsernameChangeHistory: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('username_change_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch username change history', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data || []
    },

    pendingUsernameChangeRequests: async (_: any, { pagination }: any, context: GraphQLContext) => {
      await requireAdmin(context)

      const limit = pagination?.limit || 20
      const offset = pagination?.offset || 0

      const { data, error, count } = await supabase
        .from('username_change_requests')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch pending requests', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        requests: data || [],
        totalCount: count || 0,
        pageInfo: {
          hasNextPage: count ? offset + limit < count : false,
          hasPreviousPage: offset > 0,
          startCursor: data?.length ? Buffer.from(`${offset}`).toString('base64') : null,
          endCursor: data?.length
            ? Buffer.from(`${offset + data.length - 1}`).toString('base64')
            : null,
        },
      }
    },

    allUsernameChangeRequests: async (
      _: any,
      { status, pagination }: { status?: string; pagination?: any },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      const limit = pagination?.limit || 20
      const offset = pagination?.offset || 0

      let query = supabase
        .from('username_change_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch requests', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        requests: data || [],
        totalCount: count || 0,
        pageInfo: {
          hasNextPage: count ? offset + limit < count : false,
          hasPreviousPage: offset > 0,
          startCursor: data?.length ? Buffer.from(`${offset}`).toString('base64') : null,
          endCursor: data?.length
            ? Buffer.from(`${offset + data.length - 1}`).toString('base64')
            : null,
        },
      }
    },
  },

  Mutation: {
    requestUsernameChange: async (
      _: any,
      { input }: { input: { new_username: string; reason?: string } },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      const { new_username, reason } = input

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
      if (!usernameRegex.test(new_username)) {
        throw new GraphQLError(
          'Username must be 3-20 characters and contain only letters, numbers, and underscores',
          { extensions: { code: 'BAD_REQUEST' } },
        )
      }

      // Check if username is available
      const { data: existingUser } = await supabase
        .from('users')
        .select('privy_id')
        .eq('username', new_username)
        .single()

      if (existingUser && existingUser.privy_id !== userId) {
        throw new GraphQLError('Username is already taken', {
          extensions: { code: 'CONFLICT' },
        })
      }

      // Get current user
      const { data: currentUser } = await supabase
        .from('users')
        .select('username')
        .eq('privy_id', userId)
        .single()

      if (!currentUser) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check for pending request
      const { data: pendingRequest } = await supabase
        .from('username_change_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single()

      if (pendingRequest) {
        throw new GraphQLError('You already have a pending username change request', {
          extensions: { code: 'CONFLICT' },
        })
      }

      // Count previous successful changes
      const { count: changeCount } = await supabase
        .from('username_change_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['approved', 'auto_approved'])

      const isFirstChange = (changeCount || 0) === 0

      // Check cooldown for non-first changes
      if (!isFirstChange) {
        const { data: lastChange } = await supabase
          .from('username_change_requests')
          .select('reviewed_at')
          .eq('user_id', userId)
          .in('status', ['approved', 'auto_approved'])
          .order('reviewed_at', { ascending: false })
          .limit(1)
          .single()

        if (lastChange?.reviewed_at) {
          const lastChangeDate = new Date(lastChange.reviewed_at)
          const cooldownEnd = new Date(lastChangeDate)
          cooldownEnd.setDate(cooldownEnd.getDate() + USERNAME_CHANGE_COOLDOWN_DAYS)

          if (new Date() < cooldownEnd) {
            throw new GraphQLError(
              `You must wait until ${cooldownEnd.toLocaleDateString()} to request another username change`,
              { extensions: { code: 'TOO_MANY_REQUESTS' } },
            )
          }
        }
      }

      const now = new Date().toISOString()

      // Create the request
      const requestData: any = {
        user_id: userId,
        current_username: currentUser.username || '',
        requested_username: new_username,
        reason,
        status: isFirstChange ? 'auto_approved' : 'pending',
        created_at: now,
        updated_at: now,
      }

      // If auto-approved, set review fields
      if (isFirstChange) {
        requestData.reviewed_at = now
        requestData.admin_note = 'Auto-approved: First username change'
      }

      const { data: request, error: requestError } = await supabase
        .from('username_change_requests')
        .insert([requestData])
        .select()
        .single()

      if (requestError) {
        throw new GraphQLError('Failed to create username change request', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: requestError },
        })
      }

      // If auto-approved, update the username immediately
      if (isFirstChange) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: new_username,
            updated_at: now,
          })
          .eq('privy_id', userId)

        if (updateError) {
          // Rollback the request
          await supabase.from('username_change_requests').delete().eq('id', request.id)

          throw new GraphQLError('Failed to update username', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          })
        }

        // Update referral code to match new username
        const { data: existingCode } = await supabase
          .from('referral_codes')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (existingCode) {
          await supabase.from('referral_codes').update({ code: new_username }).eq('user_id', userId)
        } else {
          await supabase.from('referral_codes').insert([
            {
              user_id: userId,
              code: new_username,
            },
          ])
        }
      } else {
        // Discord notification for pending request
        discord
          .sendAlert({
            title: 'Username Change Request',
            message: `New username change request from **${currentUser.username || 'New User'}**\nCurrent: ${currentUser.username || 'None'}\nRequested: ${new_username}\nReason: ${reason || 'Not provided'}`,
            severity: 'low',
            source: 'Username Change System',
          })
          .catch((err: Error) =>
            console.error('[Discord] Username change notification failed:', err),
          )
      }

      return {
        success: true,
        message: isFirstChange
          ? 'Username changed successfully!'
          : 'Your request has been submitted and is pending admin review',
        request,
        auto_approved: isFirstChange,
      }
    },

    cancelUsernameChangeRequest: async (
      _: any,
      { request_id }: { request_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Verify the request belongs to this user and is pending
      const { data: request, error: fetchError } = await supabase
        .from('username_change_requests')
        .select('*')
        .eq('id', request_id)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single()

      if (fetchError || !request) {
        throw new GraphQLError('Request not found or cannot be cancelled', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const { error: deleteError } = await supabase
        .from('username_change_requests')
        .delete()
        .eq('id', request_id)

      if (deleteError) {
        throw new GraphQLError('Failed to cancel request', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        success: true,
        message: 'Username change request cancelled',
      }
    },

    reviewUsernameChangeRequest: async (
      _: any,
      { input }: { input: { request_id: string; approved: boolean; admin_note?: string } },
      context: GraphQLContext,
    ) => {
      const adminId = await requireAdmin(context)
      const { request_id, approved, admin_note } = input

      // Get the request
      const { data: request, error: fetchError } = await supabase
        .from('username_change_requests')
        .select('*')
        .eq('id', request_id)
        .eq('status', 'pending')
        .single()

      if (fetchError || !request) {
        throw new GraphQLError('Request not found or already processed', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check if the requested username is still available
      if (approved) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('privy_id')
          .eq('username', request.requested_username)
          .single()

        if (existingUser && existingUser.privy_id !== request.user_id) {
          throw new GraphQLError('Requested username is no longer available', {
            extensions: { code: 'CONFLICT' },
          })
        }
      }

      const now = new Date().toISOString()

      // Update the request
      const { data: updatedRequest, error: updateError } = await supabase
        .from('username_change_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          admin_note,
          reviewed_by: adminId,
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', request_id)
        .select()
        .single()

      if (updateError) {
        throw new GraphQLError('Failed to update request', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // If approved, update the username
      if (approved) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            username: request.requested_username,
            updated_at: now,
          })
          .eq('privy_id', request.user_id)

        if (userUpdateError) {
          // Rollback the request status
          await supabase
            .from('username_change_requests')
            .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
            .eq('id', request_id)

          throw new GraphQLError('Failed to update user username', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          })
        }

        // Update referral code
        const { data: existingCode } = await supabase
          .from('referral_codes')
          .select('id')
          .eq('user_id', request.user_id)
          .single()

        if (existingCode) {
          await supabase
            .from('referral_codes')
            .update({ code: request.requested_username })
            .eq('user_id', request.user_id)
        }
      }

      // Discord notification
      discord
        .sendAlert({
          title: approved ? 'Username Change Approved' : 'Username Change Rejected',
          message: `Username change for **${request.current_username}**\nCurrent: ${request.current_username || 'None'}\nRequested: ${request.requested_username}\nDecision: ${approved ? 'Approved' : 'Rejected'}${admin_note ? `\nAdmin Note: ${admin_note}` : ''}`,
          severity: approved ? 'low' : 'medium',
          source: 'Username Change System',
        })
        .catch((err: Error) => console.error('[Discord] Username review notification failed:', err))

      // TODO: Send in-app notification to user about the decision

      return updatedRequest
    },
  },

  UsernameChangeRequest: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()

      return data
    },

    reviewer: async (parent: any) => {
      if (!parent.reviewed_by) return null

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.reviewed_by)
        .single()

      return data
    },
  },
}
