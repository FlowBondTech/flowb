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

const getEventStatus = (event: any) => {
  const now = new Date()
  const startDate = new Date(event.start_date_time)
  const endDate = new Date(event.end_date_time)

  if (event.is_cancelled) return 'cancelled'
  if (now < startDate) return 'upcoming'
  if (now > endDate) return 'past'
  return 'ongoing'
}

// Transform skill level to lowercase to match GraphQL enum
const normalizeSkillLevel = (skillLevel: string | null | undefined) => {
  if (!skillLevel) return null
  return skillLevel.toLowerCase()
}

// Transform user object to normalize enum values
const normalizeUser = (user: any) => {
  if (!user) return null
  return {
    ...user,
    skill_level: normalizeSkillLevel(user.skill_level),
  }
}

export const eventResolvers = {
  Query: {
    events: async (_: any, { filter, pagination, sortBy }: any, context: GraphQLContext) => {
      let query = supabase
        .from('events')
        .select('*, facilitator:users!facilitator_id(*), event_registrations(*)', {
          count: 'exact',
        })

      // Apply basic filters
      if (filter?.category) {
        query = query.eq('category', filter.category)
      }
      if (filter?.skill_level) {
        query = query.eq('skill_level', filter.skill_level)
      }
      if (filter?.city) {
        query = query.ilike('location_city', `%${filter.city}%`)
      }
      if (filter?.dance_style) {
        query = query.contains('dance_styles', [filter.dance_style])
      }
      if (filter?.is_virtual !== undefined) {
        query = query.eq('is_virtual', filter.is_virtual)
      }
      if (filter?.is_featured !== undefined) {
        query = query.eq('is_featured', filter.is_featured)
      }
      if (filter?.facilitator_id) {
        query = query.eq('facilitator_id', filter.facilitator_id)
      }
      if (filter?.minPrice !== undefined) {
        query = query.gte('price_usd', filter.minPrice)
      }
      if (filter?.maxPrice !== undefined) {
        query = query.lte('price_usd', filter.maxPrice)
      }
      if (filter?.startDate) {
        query = query.gte('start_date_time', filter.startDate)
      }
      if (filter?.endDate) {
        query = query.lte('end_date_time', filter.endDate)
      }

      // Apply user-specific filters
      // Handle created_by_me filter (requires authentication)
      if (filter?.created_by_me) {
        if (!context.userId) {
          throw new GraphQLError('Authentication required to use created_by_me filter', {
            extensions: { code: 'UNAUTHENTICATED' },
          })
        }
        query = query.eq('facilitator_id', context.userId)
      }

      // Handle registered_by_me filter (requires authentication)
      if (filter?.registered_by_me) {
        if (!context.userId) {
          throw new GraphQLError('Authentication required to use registered_by_me filter', {
            extensions: { code: 'UNAUTHENTICATED' },
          })
        }
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('user_id', context.userId)
          .in('status', ['registered', 'attended'])

        if (registrations?.length) {
          const eventIds = registrations.map(r => r.event_id)
          query = query.in('id', eventIds)
        } else {
          // No registered events
          return {
            events: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            totalCount: 0,
          }
        }
      }

      // Handle created_by filter (specific user)
      if (filter?.created_by) {
        query = query.eq('facilitator_id', filter.created_by)
      }

      // Handle registered_by filter (specific user)
      if (filter?.registered_by) {
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('user_id', filter.registered_by)
          .in('status', ['registered', 'attended'])

        if (registrations?.length) {
          const eventIds = registrations.map(r => r.event_id)
          query = query.in('id', eventIds)
        } else {
          // No registered events for this user
          return {
            events: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            totalCount: 0,
          }
        }
      }

      // Handle deprecated filters (for backward compatibility)
      if (filter?.user_registered) {
        if (!context.userId) {
          throw new GraphQLError('Authentication required to use user_registered filter', {
            extensions: { code: 'UNAUTHENTICATED' },
          })
        }
        // Same as registered_by_me
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('user_id', context.userId)
          .in('status', ['registered', 'attended'])

        if (registrations?.length) {
          const eventIds = registrations.map(r => r.event_id)
          query = query.in('id', eventIds)
        } else {
          return {
            events: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            totalCount: 0,
          }
        }
      }

      if (filter?.user_created) {
        if (!context.userId) {
          throw new GraphQLError('Authentication required to use user_created filter', {
            extensions: { code: 'UNAUTHENTICATED' },
          })
        }
        // Same as created_by_me
        query = query.eq('facilitator_id', context.userId)
      }

      // Apply recurring event filters
      if (filter?.is_recurring !== undefined) {
        query = query.eq('is_recurring', filter.is_recurring)
      }
      if (filter?.exclude_instances) {
        query = query.is('parent_event_id', null)
      }

      // Apply status filter
      const now = new Date().toISOString()
      if (filter?.status === 'upcoming') {
        // Return all events that haven't ended yet (upcoming + ongoing)
        query = query.gt('end_date_time', now)
      } else if (filter?.status === 'past') {
        query = query.lt('end_date_time', now)
      } else if (filter?.status === 'ongoing') {
        query = query.lte('start_date_time', now).gte('end_date_time', now)
      }

      // Apply location-based filtering
      let eventsData: any[] = []
      let totalCount = 0
      if (filter?.nearLocation) {
        // First get all events that match filters
        const { data, error, count } = await query

        if (error) {
          throw new GraphQLError('Failed to fetch events', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          })
        }

        totalCount = count || 0

        // Calculate distance for each event
        const eventsWithDistance =
          data?.map(event => {
            if (!event.location_latitude || !event.location_longitude) {
              return { ...event, distance: null }
            }

            const distance = calculateDistance(
              filter.nearLocation.latitude,
              filter.nearLocation.longitude,
              event.location_latitude,
              event.location_longitude,
            )

            return { ...event, distance }
          }) || []

        // Filter by radius if provided
        const radius = filter.nearLocation.radius || 50 // Default 50km
        eventsData = eventsWithDistance.filter(
          event => event.distance === null || event.distance <= radius,
        )

        // Sort by distance if no other sort is specified
        if (!sortBy || sortBy === 'distance') {
          eventsData.sort((a, b) => {
            if (a.distance === null) return 1
            if (b.distance === null) return -1
            return a.distance - b.distance
          })
        }
      } else {
        // Apply sorting for non-location queries
        switch (sortBy) {
          case 'date_asc':
            query = query.order('start_date_time', { ascending: true })
            break
          case 'date_desc':
            query = query.order('start_date_time', { ascending: false })
            break
          case 'price_asc':
            query = query.order('price_usd', { ascending: true })
            break
          case 'price_desc':
            query = query.order('price_usd', { ascending: false })
            break
          case 'title_asc':
            query = query.order('title', { ascending: true })
            break
          case 'title_desc':
            query = query.order('title', { ascending: false })
            break
          case 'created_at_desc':
            query = query.order('created_at', { ascending: false })
            break
          default:
            query = query.order('start_date_time', { ascending: true })
        }

        // Apply pagination
        const limit = pagination?.limit || 20
        const offset = pagination?.offset || 0
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) {
          throw new GraphQLError('Failed to fetch events', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          })
        }

        eventsData = data || []
        totalCount = count || 0
      }

      // Apply pagination to location-based results
      const limit = pagination?.limit || 20
      const offset = pagination?.offset || 0
      const paginatedEvents = filter?.nearLocation
        ? eventsData.slice(offset, offset + limit)
        : eventsData

      // Add computed fields
      const eventsWithStatus = paginatedEvents.map(event => ({
        ...event,
        status: getEventStatus(event),
        skill_level: normalizeSkillLevel(event.skill_level),
        facilitator: normalizeUser(event.facilitator),
        is_registered: context.userId
          ? event.event_registrations?.some(
              (reg: any) =>
                reg.user_id === context.userId &&
                (reg.status === 'registered' || reg.status === 'attended'),
            )
          : false,
        user_registration_status: context.userId
          ? event.event_registrations?.find((reg: any) => reg.user_id === context.userId)?.status
          : null,
        registration_count:
          event.event_registrations?.filter(
            (reg: any) => reg.status === 'registered' || reg.status === 'attended',
          ).length || 0,
        current_capacity:
          event.event_registrations?.filter(
            (reg: any) => reg.status === 'registered' || reg.status === 'attended',
          ).length || 0,
      }))

      // For location-based queries, update totalCount after filtering
      if (filter?.nearLocation) {
        totalCount = eventsData.length
      }

      return {
        events: eventsWithStatus,
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          startCursor: paginatedEvents.length ? Buffer.from(`${offset}`).toString('base64') : null,
          endCursor: paginatedEvents.length
            ? Buffer.from(`${offset + paginatedEvents.length - 1}`).toString('base64')
            : null,
        },
        totalCount,
      }
    },

    event: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const { data, error } = await supabase
        .from('events')
        .select(
          '*, facilitator:users!facilitator_id(*), event_registrations(*), participants:event_registrations(*, user:users(*))',
        )
        .eq('id', id)
        .single()

      if (error) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return {
        ...data,
        status: getEventStatus(data),
        skill_level: normalizeSkillLevel(data.skill_level),
        facilitator: normalizeUser(data.facilitator),
        is_registered: context.userId
          ? data.event_registrations?.some(
              (reg: any) =>
                reg.user_id === context.userId &&
                (reg.status === 'registered' || reg.status === 'attended'),
            )
          : false,
        user_registration_status: context.userId
          ? data.event_registrations?.find((reg: any) => reg.user_id === context.userId)?.status
          : null,
        registration_count:
          data.event_registrations?.filter(
            (reg: any) => reg.status === 'registered' || reg.status === 'attended',
          ).length || 0,
        current_capacity:
          data.event_registrations?.filter(
            (reg: any) => reg.status === 'registered' || reg.status === 'attended',
          ).length || 0,
      }
    },

    eventRegistrations: async (_: any, { eventId, status }: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if user is the organizer
      const { data: event } = await supabase
        .from('events')
        .select('facilitator_id')
        .eq('id', eventId)
        .single()

      if (!event || event.facilitator_id !== userId) {
        throw new GraphQLError('Not authorized to view registrations', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      let query = supabase
        .from('event_registrations')
        .select('*, user:users(*), event:events(*)')
        .eq('event_id', eventId)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        throw new GraphQLError('Failed to fetch registrations', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data || []
    },

    // Get event by check-in code for self-check-in flow
    eventByCheckinCode: async (_: any, { code }: { code: string }, context: GraphQLContext) => {
      const normalizedCode = code.toUpperCase().trim()

      const { data: event, error } = await supabase
        .from('events')
        .select('*, facilitator:users!facilitator_id(*), event_registrations(*)')
        .eq('checkin_code', normalizedCode)
        .single()

      if (error || !event) {
        return null
      }

      // Check if event is currently happening or about to start (within 2 hours)
      const now = new Date()
      const startTime = new Date(event.start_date_time)
      const endTime = new Date(event.end_date_time)
      const twoHoursBefore = new Date(startTime.getTime() - 2 * 60 * 60 * 1000)

      if (now < twoHoursBefore) {
        throw new GraphQLError(
          'This event has not started yet. Check-in opens 2 hours before the event.',
          {
            extensions: { code: 'TOO_EARLY' },
          },
        )
      }

      if (now > endTime) {
        throw new GraphQLError('This event has already ended.', {
          extensions: { code: 'EVENT_ENDED' },
        })
      }

      return {
        ...event,
        status: getEventStatus(event),
        skill_level: normalizeSkillLevel(event.skill_level),
        facilitator: normalizeUser(event.facilitator),
        is_registered: context.userId
          ? event.event_registrations?.some(
              (reg: any) =>
                reg.user_id === context.userId &&
                (reg.status === 'registered' || reg.status === 'attended'),
            )
          : false,
        user_registration_status: context.userId
          ? event.event_registrations?.find((reg: any) => reg.user_id === context.userId)?.status
          : null,
        registration_count:
          event.event_registrations?.filter(
            (reg: any) => reg.status === 'registered' || reg.status === 'attended',
          ).length || 0,
      }
    },

    // Public event by slug (no auth required - for public event pages)
    publicEvent: async (_: any, { slug }: { slug: string }, context: GraphQLContext) => {
      const normalizedSlug = slug.toLowerCase().trim()

      const { data: event, error } = await supabase
        .from('events')
        .select('*, facilitator:users!facilitator_id(*), event_registrations(*)')
        .eq('slug', normalizedSlug)
        .eq('is_public', true)
        .single()

      if (error || !event) {
        return null
      }

      return {
        ...event,
        status: getEventStatus(event),
        skill_level: normalizeSkillLevel(event.skill_level),
        facilitator: normalizeUser(event.facilitator),
        is_registered: context.userId
          ? event.event_registrations?.some(
              (reg: any) =>
                reg.user_id === context.userId &&
                (reg.status === 'registered' || reg.status === 'attended'),
            )
          : false,
        user_registration_status: context.userId
          ? event.event_registrations?.find((reg: any) => reg.user_id === context.userId)?.status
          : null,
        registration_count:
          event.event_registrations?.filter(
            (reg: any) => reg.status === 'registered' || reg.status === 'attended',
          ).length || 0,
      }
    },

    // Public events listing (no auth required - for public events discovery page)
    publicEvents: async (_: any, { filter, pagination, sortBy }: any, context: GraphQLContext) => {
      let query = supabase
        .from('events')
        .select('*, facilitator:users!facilitator_id(*), event_registrations(*)', {
          count: 'exact',
        })
        .eq('is_public', true) // Only public events

      // Apply basic filters (same as events query, excluding auth-required filters)
      if (filter?.category) {
        query = query.eq('category', filter.category)
      }
      if (filter?.skill_level) {
        query = query.eq('skill_level', filter.skill_level)
      }
      if (filter?.city) {
        query = query.ilike('location_city', `%${filter.city}%`)
      }
      if (filter?.dance_style) {
        query = query.contains('dance_styles', [filter.dance_style])
      }
      if (filter?.is_virtual !== undefined) {
        query = query.eq('is_virtual', filter.is_virtual)
      }
      if (filter?.is_featured !== undefined) {
        query = query.eq('is_featured', filter.is_featured)
      }
      if (filter?.facilitator_id) {
        query = query.eq('facilitator_id', filter.facilitator_id)
      }
      if (filter?.minPrice !== undefined) {
        query = query.gte('price_usd', filter.minPrice)
      }
      if (filter?.maxPrice !== undefined) {
        query = query.lte('price_usd', filter.maxPrice)
      }
      if (filter?.startDate) {
        query = query.gte('start_date_time', filter.startDate)
      }
      if (filter?.endDate) {
        query = query.lte('end_date_time', filter.endDate)
      }

      // Apply status filter - default to upcoming events
      const now = new Date().toISOString()
      if (filter?.status === 'upcoming' || !filter?.status) {
        // Default: show upcoming and ongoing events
        query = query.gt('end_date_time', now)
      } else if (filter?.status === 'past') {
        query = query.lt('end_date_time', now)
      } else if (filter?.status === 'ongoing') {
        query = query.lte('start_date_time', now).gte('end_date_time', now)
      }

      // Apply sorting
      switch (sortBy) {
        case 'date_asc':
          query = query.order('start_date_time', { ascending: true })
          break
        case 'date_desc':
          query = query.order('start_date_time', { ascending: false })
          break
        case 'price_asc':
          query = query.order('price_usd', { ascending: true })
          break
        case 'price_desc':
          query = query.order('price_usd', { ascending: false })
          break
        case 'title_asc':
          query = query.order('title', { ascending: true })
          break
        case 'title_desc':
          query = query.order('title', { ascending: false })
          break
        case 'created_at_desc':
          query = query.order('created_at', { ascending: false })
          break
        default:
          query = query.order('start_date_time', { ascending: true })
      }

      // Apply pagination
      const limit = pagination?.limit || 20
      const offset = pagination?.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw new GraphQLError('Failed to fetch public events', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      const eventsData = data || []
      const totalCount = count || 0

      // Add computed fields
      const eventsWithStatus = eventsData.map(event => ({
        ...event,
        status: getEventStatus(event),
        skill_level: normalizeSkillLevel(event.skill_level),
        facilitator: normalizeUser(event.facilitator),
        is_registered: context.userId
          ? event.event_registrations?.some(
              (reg: any) =>
                reg.user_id === context.userId &&
                (reg.status === 'registered' || reg.status === 'attended'),
            )
          : false,
        user_registration_status: context.userId
          ? event.event_registrations?.find((reg: any) => reg.user_id === context.userId)?.status
          : null,
        registration_count:
          event.event_registrations?.filter(
            (reg: any) => reg.status === 'registered' || reg.status === 'attended',
          ).length || 0,
        current_capacity:
          event.event_registrations?.filter(
            (reg: any) => reg.status === 'registered' || reg.status === 'attended',
          ).length || 0,
      }))

      return {
        events: eventsWithStatus,
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          startCursor: eventsData.length ? Buffer.from(`${offset}`).toString('base64') : null,
          endCursor: eventsData.length
            ? Buffer.from(`${offset + eventsData.length - 1}`).toString('base64')
            : null,
        },
        totalCount,
      }
    },

    // ============================================================================
    // DEPRECATED: Old Sponsor Queries - replaced by sponsor.resolvers.ts
    // See eventSponsors in sponsor.resolvers.ts for the new implementation
    // using event_sponsorships table instead of event_sponsors
    // ============================================================================

    // Old eventSponsors and eventSponsor resolvers REMOVED
    // Use queries from sponsor.schema.ts and sponsor.resolvers.ts
  },

  Mutation: {
    createEvent: async (_: any, { input }: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if user is approved organizer
      const { data: user } = await supabase
        .from('users')
        .select('role, display_name, username, is_organizer_approved')
        .eq('privy_id', userId)
        .single()

      // Check permissions: admin, manager, or approved organizer
      const canCreateEvent =
        user?.role === 'admin' ||
        user?.role === 'manager' ||
        (user?.role === 'organizer' && user?.is_organizer_approved === true)

      if (!canCreateEvent) {
        if (user?.role === 'organizer' && !user?.is_organizer_approved) {
          throw new GraphQLError('Your organizer account is pending approval', {
            extensions: { code: 'FORBIDDEN' },
          })
        }
        throw new GraphQLError('You do not have permission to create events', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      // Date validation
      const now = new Date()
      const startDate = new Date(input.start_date_time)
      const endDate = new Date(input.end_date_time)

      // Check if start date is in the past (allow 5 minute buffer for form submission)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      if (startDate < fiveMinutesAgo) {
        throw new GraphQLError('Event start date cannot be in the past', {
          extensions: {
            code: 'BAD_USER_INPUT',
            field: 'start_date_time',
            validationType: 'PAST_DATE',
          },
        })
      }

      // Check if end date is after start date
      if (endDate <= startDate) {
        throw new GraphQLError('Event end date must be after the start date', {
          extensions: {
            code: 'BAD_USER_INPUT',
            field: 'end_date_time',
            validationType: 'END_BEFORE_START',
          },
        })
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...input,
          facilitator_id: userId,
        })
        .select('*')
        .single()

      if (error) {
        console.error('[createEvent] Supabase error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        console.error('[createEvent] Input was:', JSON.stringify(input, null, 2))
        throw new GraphQLError(`Failed to create event: ${error.message}`, {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error.details },
        })
      }

      if (!data || !data.id) {
        console.error(
          '[createEvent] No data returned from insert, input was:',
          JSON.stringify(input, null, 2),
        )
        throw new GraphQLError('Event created but no data returned from database', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      console.log('[createEvent] Successfully created event:', { id: data.id, title: data.title })

      // Discord webhook: New event created
      discord
        .notifyEventCreated({
          id: data.id,
          title: data.title,
          category: data.category,
          city: data.city,
          start_date_time: data.start_date_time,
          facilitator_username: user?.username,
          is_virtual: data.is_virtual,
          price_usd: data.price_usd,
        })
        .catch(err => console.error('[Discord] Event created notification failed:', err))

      // Notify all users about the new event (except the creator)
      try {
        const { data: allUsers } = await supabase
          .from('users')
          .select('privy_id')
          .neq('privy_id', userId) // Exclude the event creator

        if (allUsers && allUsers.length > 0) {
          const notifications = allUsers.map(u => ({
            type: 'event_update',
            title: 'New Event Available!',
            message: `${user?.display_name || user?.username || 'An organizer'} created a new event: ${data.title}`,
            sender_id: userId,
            sender_type: 'user',
            recipient_id: u.privy_id,
            event_id: data.id,
            is_broadcast: true,
            broadcast_target: 'all_users',
            action_type: 'open_event',
            action_data: { event_id: data.id },
          }))

          await supabase.from('notifications').insert(notifications)
          console.log(`[createEvent] Notified ${allUsers.length} users about new event: ${data.id}`)
        }
      } catch (notifyErr) {
        // Don't fail event creation if notifications fail
        console.error('[createEvent] Failed to notify users about new event:', notifyErr)
      }

      return {
        ...data,
        status: getEventStatus(data),
        skill_level: normalizeSkillLevel(data.skill_level),
      }
    },

    updateEvent: async (_: any, { id, input }: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check ownership
      const { data: existingEvent } = await supabase
        .from('events')
        .select('facilitator_id')
        .eq('id', id)
        .single()

      if (!existingEvent) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check if user is the owner or admin
      if (existingEvent.facilitator_id !== userId) {
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('privy_id', userId)
          .single()

        if (!user || user.role !== 'admin') {
          throw new GraphQLError('Not authorized to update this event', {
            extensions: { code: 'FORBIDDEN' },
          })
        }
      }

      // Date validation for updates (only if dates are being changed)
      if (input.start_date_time || input.end_date_time) {
        // Get the current event data to compare
        const { data: currentEvent } = await supabase
          .from('events')
          .select('start_date_time, end_date_time')
          .eq('id', id)
          .single()

        const now = new Date()
        const startDate = new Date(input.start_date_time || currentEvent?.start_date_time)
        const endDate = new Date(input.end_date_time || currentEvent?.end_date_time)

        // Check if start date is in the past (allow 5 minute buffer)
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
        if (input.start_date_time && startDate < fiveMinutesAgo) {
          throw new GraphQLError('Event start date cannot be in the past', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'start_date_time',
              validationType: 'PAST_DATE',
            },
          })
        }

        // Check if end date is after start date
        if (endDate <= startDate) {
          throw new GraphQLError('Event end date must be after the start date', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'end_date_time',
              validationType: 'END_BEFORE_START',
            },
          })
        }
      }

      const { data, error } = await supabase
        .from('events')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update event', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        ...data,
        status: getEventStatus(data),
        skill_level: normalizeSkillLevel(data.skill_level),
      }
    },

    deleteEvent: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check ownership
      const { data: existingEvent } = await supabase
        .from('events')
        .select('facilitator_id')
        .eq('id', id)
        .single()

      if (!existingEvent) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check if user is the owner or admin
      if (existingEvent.facilitator_id !== userId) {
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('privy_id', userId)
          .single()

        if (!user || user.role !== 'admin') {
          throw new GraphQLError('Not authorized to delete this event', {
            extensions: { code: 'FORBIDDEN' },
          })
        }
      }

      const { error } = await supabase.from('events').delete().eq('id', id)

      if (error) {
        throw new GraphQLError('Failed to delete event', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        success: true,
        message: 'Event deleted successfully',
      }
    },

    cancelEvent: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check ownership
      const { data: existingEvent } = await supabase
        .from('events')
        .select('facilitator_id, title')
        .eq('id', id)
        .single()

      if (!existingEvent) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check if user is the owner or admin
      if (existingEvent.facilitator_id !== userId) {
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('privy_id', userId)
          .single()

        if (!user || user.role !== 'admin') {
          throw new GraphQLError('Not authorized to cancel this event', {
            extensions: { code: 'FORBIDDEN' },
          })
        }
      }

      const { data, error } = await supabase
        .from('events')
        .update({
          is_cancelled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, facilitator:users!facilitator_id(*)')
        .single()

      if (error) {
        throw new GraphQLError('Failed to cancel event', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // Notify all registered users about cancellation
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', id)
        .in('status', ['registered', 'attended'])

      if (registrations && registrations.length > 0) {
        const notifications = registrations.map(reg => ({
          type: 'event_update',
          title: 'Event Cancelled',
          message: `The event "${existingEvent.title}" has been cancelled by the organizer.`,
          sender_id: userId,
          sender_type: 'user',
          recipient_id: reg.user_id,
          event_id: id,
          action_type: 'open_event',
          action_data: { event_id: id },
        }))

        await supabase.from('notifications').insert(notifications)
      }

      return {
        ...data,
        status: 'cancelled',
        skill_level: normalizeSkillLevel(data.skill_level),
      }
    },

    registerForEvent: async (_: any, { eventId, notes }: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // First, check if user exists in the database (required for foreign key constraint)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('privy_id, username')
        .eq('privy_id', userId)
        .single()

      if (userError || !user) {
        console.error('[registerForEvent] User not found in database:', {
          userId,
          error: userError,
        })
        throw new GraphQLError('Please complete your profile before registering for events', {
          extensions: { code: 'PROFILE_REQUIRED' },
        })
      }

      // Check if already registered
      const { data: existing } = await supabase
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single()

      if (existing) {
        // If already registered or attended, throw error
        if (existing.status === 'registered' || existing.status === 'attended') {
          throw new GraphQLError('Already registered for this event', {
            extensions: { code: 'CONFLICT' },
          })
        }

        // If cancelled, waitlisted, or no-show, update the existing registration
        const { data: updated, error: updateError } = await supabase
          .from('event_registrations')
          .update({
            status: 'registered',
            user_notes: notes,
            registration_date: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) {
          console.error('[registerForEvent] Failed to update registration:', updateError)
          throw new GraphQLError('Failed to update registration', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          })
        }

        return updated
      }

      // Check event capacity before creating new registration
      const { data: event } = await supabase
        .from('events')
        .select('id, title, max_capacity, current_capacity')
        .eq('id', eventId)
        .single()

      if (event?.max_capacity && event.current_capacity >= event.max_capacity) {
        throw new GraphQLError('Event is at full capacity', {
          extensions: { code: 'CONFLICT' },
        })
      }

      // Create new registration if none exists
      const { data, error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: userId,
          status: 'registered',
          user_notes: notes,
        })
        .select()
        .single()

      if (error) {
        console.error('[registerForEvent] Failed to insert registration:', {
          eventId,
          userId,
          error: error.message,
          code: error.code,
          details: error.details,
        })
        throw new GraphQLError('Failed to register for event', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error.message },
        })
      }

      // Discord webhook: Event registration
      discord
        .notifyEventRegistration({
          event_title: event?.title || 'Unknown Event',
          event_id: eventId,
          username: user?.username || 'Anonymous',
          current_capacity: (event?.current_capacity || 0) + 1,
          max_capacity: event?.max_capacity,
        })
        .catch(err => console.error('[Discord] Event registration notification failed:', err))

      // Get event organizer info
      const { data: eventDetails } = await supabase
        .from('events')
        .select('facilitator_id, title')
        .eq('id', eventId)
        .single()

      // Create notification for event organizer
      if (eventDetails && eventDetails.facilitator_id !== userId) {
        await supabase.from('notifications').insert({
          type: 'system',
          title: 'New Event Registration',
          message: `${user?.username || 'Someone'} registered for your event: ${eventDetails.title}`,
          sender_id: userId,
          sender_type: 'user',
          recipient_id: eventDetails.facilitator_id,
          event_id: eventId,
          action_type: 'open_event',
          action_data: { event_id: eventId },
        })
      }

      // Create confirmation notification for registrant
      await supabase.from('notifications').insert({
        type: 'event_reminder',
        title: 'Event Registration Confirmed',
        message: `You're registered for ${event?.title || 'the event'}! We'll remind you before it starts.`,
        sender_type: 'system',
        recipient_id: userId,
        event_id: eventId,
        action_type: 'open_event',
        action_data: { event_id: eventId },
      })

      // Check if event is almost full (80%+) and notify all users
      if (event?.max_capacity) {
        const newCapacity = (event.current_capacity || 0) + 1
        const capacityPercentage = (newCapacity / event.max_capacity) * 100

        // Only notify when crossing the 80% threshold (not every registration after 80%)
        const previousPercentage = ((event.current_capacity || 0) / event.max_capacity) * 100

        if (capacityPercentage >= 80 && previousPercentage < 80) {
          try {
            // Get all users except those already registered
            const { data: registeredUsers } = await supabase
              .from('event_registrations')
              .select('user_id')
              .eq('event_id', eventId)
              .in('status', ['registered', 'attended'])

            const registeredIds = registeredUsers?.map(r => r.user_id) || []

            const { data: allUsers } = await supabase.from('users').select('privy_id')

            const usersToNotify = allUsers?.filter(u => !registeredIds.includes(u.privy_id)) || []

            if (usersToNotify.length > 0) {
              const spotsLeft = event.max_capacity - newCapacity
              const notifications = usersToNotify.map(u => ({
                type: 'event_update',
                title: '🔥 Event Almost Full!',
                message: `"${event.title}" is filling up fast! Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left.`,
                sender_type: 'system',
                recipient_id: u.privy_id,
                event_id: eventId,
                action_type: 'open_event',
                action_data: { event_id: eventId },
                is_broadcast: true,
                broadcast_target: 'all_users',
              }))

              await supabase.from('notifications').insert(notifications)
              console.log(
                `[registerForEvent] Notified ${usersToNotify.length} users about almost-full event: ${eventId}`,
              )
            }
          } catch (notifyErr) {
            console.error('[registerForEvent] Failed to send almost-full notification:', notifyErr)
          }
        }
      }

      return data
    },

    cancelEventRegistration: async (
      _: any,
      { eventId }: { eventId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId)
        .eq('user_id', userId)

      if (error) {
        throw new GraphQLError('Failed to cancel registration', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        success: true,
        message: 'Registration cancelled successfully',
      }
    },

    checkInParticipant: async (
      _: any,
      { eventId, userId: participantId }: any,
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Check if user is the organizer and get event details
      const { data: event } = await supabase
        .from('events')
        .select('facilitator_id, title')
        .eq('id', eventId)
        .single()

      if (!event || event.facilitator_id !== userId) {
        throw new GraphQLError('Not authorized to check in participants', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { data, error } = await supabase
        .from('event_registrations')
        .update({
          checked_in: true,
          check_in_time: new Date().toISOString(),
          status: 'attended',
        })
        .eq('event_id', eventId)
        .eq('user_id', participantId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to check in participant', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // Create notification for participant about attendance
      await supabase.from('notifications').insert({
        type: 'system',
        title: 'Event Attendance Confirmed',
        message: `You attended ${event.title}! Points have been awarded to your account.`,
        sender_type: 'system',
        recipient_id: participantId,
        event_id: eventId,
        action_type: 'open_event',
        action_data: { event_id: eventId },
      })

      return data
    },

    updateRegistrationStatus: async (
      _: any,
      { eventId, userId: participantId, status, adminNotes }: any,
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Check if user is the organizer
      const { data: event } = await supabase
        .from('events')
        .select('facilitator_id')
        .eq('id', eventId)
        .single()

      if (!event) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check if user is the organizer or admin
      if (event.facilitator_id !== userId) {
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('privy_id', userId)
          .single()

        if (!user || user.role !== 'admin') {
          throw new GraphQLError('Not authorized to update registration status', {
            extensions: { code: 'FORBIDDEN' },
          })
        }
      }

      const updateData: any = { status }
      if (adminNotes) {
        updateData.admin_notes = adminNotes
      }

      const { data, error } = await supabase
        .from('event_registrations')
        .update(updateData)
        .eq('event_id', eventId)
        .eq('user_id', participantId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update registration status', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data
    },

    // Self-check-in using event code
    checkInWithCode: async (_: any, { code }: { code: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const normalizedCode = code.toUpperCase().trim()

      // Find event by check-in code
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*, facilitator:users!facilitator_id(*)')
        .eq('checkin_code', normalizedCode)
        .single()

      if (eventError || !event) {
        return {
          success: false,
          message: 'Invalid check-in code. Please verify and try again.',
          event: null,
          registration: null,
        }
      }

      // Check if event is within check-in window (2 hours before to end)
      const now = new Date()
      const startTime = new Date(event.start_date_time)
      const endTime = new Date(event.end_date_time)
      const twoHoursBefore = new Date(startTime.getTime() - 2 * 60 * 60 * 1000)

      if (now < twoHoursBefore) {
        return {
          success: false,
          message: `Check-in opens 2 hours before the event starts at ${startTime.toLocaleTimeString()}.`,
          event: {
            ...event,
            status: getEventStatus(event),
            skill_level: normalizeSkillLevel(event.skill_level),
            facilitator: normalizeUser(event.facilitator),
          },
          registration: null,
        }
      }

      if (now > endTime) {
        return {
          success: false,
          message: 'This event has already ended. Check-in is no longer available.',
          event: {
            ...event,
            status: getEventStatus(event),
            skill_level: normalizeSkillLevel(event.skill_level),
            facilitator: normalizeUser(event.facilitator),
          },
          registration: null,
        }
      }

      // Check if user is registered for this event
      const { data: registration, error: regError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', userId)
        .single()

      if (regError || !registration) {
        // User is not registered - auto-register and check-in
        const { data: newReg, error: createError } = await supabase
          .from('event_registrations')
          .insert({
            event_id: event.id,
            user_id: userId,
            status: 'attended',
            checked_in: true,
            check_in_time: new Date().toISOString(),
            registration_date: new Date().toISOString(),
          })
          .select()
          .single()

        if (createError) {
          return {
            success: false,
            message: 'Failed to register and check in. Please try again.',
            event: null,
            registration: null,
          }
        }

        // Update event current_capacity
        await supabase
          .from('events')
          .update({ current_capacity: (event.current_capacity || 0) + 1 })
          .eq('id', event.id)

        // Create attendance record
        await supabase.from('event_attendance').upsert({
          event_id: event.id,
          user_id: userId,
          registration_id: newReg.id,
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })

        // Create notification
        await supabase.from('notifications').insert({
          type: 'system',
          title: 'Checked In Successfully!',
          message: `You've checked in to ${event.title}. Enjoy the dance!`,
          sender_type: 'system',
          recipient_id: userId,
          event_id: event.id,
          action_type: 'open_event',
          action_data: { event_id: event.id },
        })

        return {
          success: true,
          message: `Welcome! You're now checked in to ${event.title}.`,
          event: {
            ...event,
            status: getEventStatus(event),
            skill_level: normalizeSkillLevel(event.skill_level),
            facilitator: normalizeUser(event.facilitator),
          },
          registration: newReg,
        }
      }

      // User is registered - check if already checked in
      if (registration.checked_in) {
        return {
          success: false,
          message: 'You have already checked in to this event.',
          event: {
            ...event,
            status: getEventStatus(event),
            skill_level: normalizeSkillLevel(event.skill_level),
            facilitator: normalizeUser(event.facilitator),
          },
          registration,
        }
      }

      // Update registration to checked in
      const { data: updatedReg, error: updateError } = await supabase
        .from('event_registrations')
        .update({
          checked_in: true,
          check_in_time: new Date().toISOString(),
          status: 'attended',
        })
        .eq('id', registration.id)
        .select()
        .single()

      if (updateError) {
        return {
          success: false,
          message: 'Failed to check in. Please try again.',
          event: null,
          registration: null,
        }
      }

      // Create/update attendance record
      await supabase.from('event_attendance').upsert({
        event_id: event.id,
        user_id: userId,
        registration_id: registration.id,
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })

      // Create notification
      await supabase.from('notifications').insert({
        type: 'system',
        title: 'Checked In Successfully!',
        message: `You've checked in to ${event.title}. Enjoy the dance!`,
        sender_type: 'system',
        recipient_id: userId,
        event_id: event.id,
        action_type: 'open_event',
        action_data: { event_id: event.id },
      })

      return {
        success: true,
        message: `Welcome! You're now checked in to ${event.title}.`,
        event: {
          ...event,
          status: getEventStatus(event),
          skill_level: normalizeSkillLevel(event.skill_level),
          facilitator: normalizeUser(event.facilitator),
        },
        registration: updatedReg,
      }
    },

    // Regenerate check-in code (for organizers)
    regenerateCheckinCode: async (
      _: any,
      { eventId }: { eventId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Check if user is the organizer or admin
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*, facilitator:users!facilitator_id(*)')
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Verify authorization
      if (event.facilitator_id !== userId) {
        const { data: user } = await supabase
          .from('users')
          .select('role, is_admin')
          .eq('privy_id', userId)
          .single()

        if (!user || (user.role !== 'admin' && !user.is_admin)) {
          throw new GraphQLError('Not authorized to regenerate check-in code', {
            extensions: { code: 'FORBIDDEN' },
          })
        }
      }

      // Generate new code by calling the database function
      const { data: updatedEvent, error: updateError } = await supabase.rpc(
        'regenerate_event_checkin_code',
        {
          event_id: eventId,
        },
      )

      if (updateError) {
        // Fallback: generate code in application
        const newCode = Array.from({ length: 6 }, () => {
          const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
          return chars.charAt(Math.floor(Math.random() * chars.length))
        }).join('')

        const { data: fallbackUpdate, error: fallbackError } = await supabase
          .from('events')
          .update({ checkin_code: newCode })
          .eq('id', eventId)
          .select('*, facilitator:users!facilitator_id(*)')
          .single()

        if (fallbackError) {
          throw new GraphQLError('Failed to regenerate check-in code', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          })
        }

        return {
          ...fallbackUpdate,
          status: getEventStatus(fallbackUpdate),
          skill_level: normalizeSkillLevel(fallbackUpdate.skill_level),
          facilitator: normalizeUser(fallbackUpdate.facilitator),
        }
      }

      // Fetch updated event
      const { data: refreshedEvent } = await supabase
        .from('events')
        .select('*, facilitator:users!facilitator_id(*)')
        .eq('id', eventId)
        .single()

      return {
        ...refreshedEvent,
        status: getEventStatus(refreshedEvent),
        skill_level: normalizeSkillLevel(refreshedEvent.skill_level),
        facilitator: normalizeUser(refreshedEvent.facilitator),
      }
    },

    // ============================================================================
    // DEPRECATED: Old Sponsor Management Mutations - replaced by sponsor.resolvers.ts
    // See sponsor.resolvers.ts for the new implementation using:
    //   - createEventSponsorship (replaces addEventSponsor)
    //   - updateEventSponsorship (replaces updateEventSponsor)
    //   - cancelEventSponsorship (replaces removeEventSponsor)
    //   - reviewSponsorshipApproval (replaces reviewSponsorApplication)
    // ============================================================================

    // Old sponsor mutations REMOVED - use sponsor.resolvers.ts equivalents
  },

  Event: {
    participants: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.participants) {
        // Use DataLoader to batch load registrations for multiple events
        const registrations = await context.loaders.registrationsByEventLoader.load(parent.id)

        // For each registration, load the user via DataLoader
        const participantsWithUsers = await Promise.all(
          registrations.map(async (registration: any) => {
            const user = await context.loaders.userLoader.load(registration.user_id)
            return {
              ...registration,
              user: normalizeUser(user),
            }
          }),
        )

        return participantsWithUsers
      }
      // Normalize user data in existing participants
      return parent.participants.map((participant: any) => ({
        ...participant,
        user: normalizeUser(participant.user),
      }))
    },

    facilitator: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.facilitator && parent.facilitator_id) {
        // Use DataLoader to batch load users
        const user = await context.loaders.userLoader.load(parent.facilitator_id)
        return normalizeUser(user)
      }
      return normalizeUser(parent.facilitator)
    },

    parent_event: async (parent: any) => {
      if (!parent.parent_event_id) return null

      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', parent.parent_event_id)
        .single()

      if (!data) return null
      return {
        ...data,
        status: getEventStatus(data),
        skill_level: normalizeSkillLevel(data.skill_level),
      }
    },

    recurring_instances: async (parent: any) => {
      // Only return instances for parent recurring events
      if (!parent.is_recurring || parent.parent_event_id) return []

      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('parent_event_id', parent.id)
        .order('start_date_time', { ascending: true })

      return (data || []).map((event: any) => ({
        ...event,
        status: getEventStatus(event),
        skill_level: normalizeSkillLevel(event.skill_level),
      }))
    },

    // ============================================================================
    // DEPRECATED: Old sponsor field resolvers - replaced by sponsor.resolvers.ts
    // sponsors and featured_sponsor fields removed from Event type
    // Use eventSponsors query from sponsor.schema.ts instead
    // ============================================================================

    // Updated sponsor_count to use new event_sponsorships table
    sponsor_count: async (parent: any) => {
      if (!parent.allow_sponsors) return 0

      const { count } = await supabase
        .from('event_sponsorships')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', parent.id)
        .eq('status', 'active')

      return count || 0
    },
  },

  EventRegistration: {
    user: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.user && parent.user_id) {
        // Use DataLoader to batch load users
        const user = await context.loaders.userLoader.load(parent.user_id)
        return normalizeUser(user)
      }
      return normalizeUser(parent.user)
    },

    event: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.event && parent.event_id) {
        // Use DataLoader to batch load events
        const event = await context.loaders.eventLoader.load(parent.event_id)
        return event ? { ...event, status: getEventStatus(event) } : null
      }
      return parent.event
    },
  },

  EventSponsor: {
    event: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.event && parent.event_id) {
        const event = await context.loaders.eventLoader.load(parent.event_id)
        return event ? { ...event, status: getEventStatus(event) } : null
      }
      return parent.event
    },

    user: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.user && parent.user_id) {
        const user = await context.loaders.userLoader.load(parent.user_id)
        return normalizeUser(user)
      }
      return normalizeUser(parent.user)
    },
  },
}

// Helper function to calculate distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
