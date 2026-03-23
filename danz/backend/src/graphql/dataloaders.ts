import DataLoader from 'dataloader'
import { supabase } from '../config/supabase.js'

/**
 * DataLoaders for batching and caching database queries
 * Prevents N+1 query problems in GraphQL resolvers
 *
 * Each request gets fresh DataLoader instances to ensure
 * request-scoped caching (no stale data across requests)
 */

// Types for loaded entities
interface User {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  skill_level: string | null
  city: string | null
  role: string
  [key: string]: any
}

interface Event {
  id: string
  title: string
  facilitator_id: string
  [key: string]: any
}

interface Achievement {
  id: string
  user_id: string
  [key: string]: any
}

interface EventRegistration {
  id: string
  event_id: string
  user_id: string
  status: string
  [key: string]: any
}

/**
 * Batch load users by id
 * Used by: Event.facilitator, EventRegistration.user, DanceBond.otherUser
 */
async function batchLoadUsers(ids: readonly string[]): Promise<(User | null)[]> {
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('id', [...ids])

  if (error) {
    console.error('[DataLoader] Failed to batch load users:', error)
    return ids.map(() => null)
  }

  // Create a map for O(1) lookup
  const userMap = new Map<string, User>()
  for (const user of data || []) {
    userMap.set(user.id, user)
  }

  // Return in the same order as requested ids
  return ids.map(id => userMap.get(id) || null)
}

/**
 * Batch load events by id
 * Used by: EventRegistration.event
 */
async function batchLoadEvents(ids: readonly string[]): Promise<(Event | null)[]> {
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('id', [...ids])

  if (error) {
    console.error('[DataLoader] Failed to batch load events:', error)
    return ids.map(() => null)
  }

  // Create a map for O(1) lookup
  const eventMap = new Map<string, Event>()
  for (const event of data || []) {
    eventMap.set(event.id, event)
  }

  // Return in the same order as requested ids
  return ids.map(id => eventMap.get(id) || null)
}

/**
 * Batch load achievements by user_id
 * Used by: User.achievements
 * Note: Returns arrays since one user can have many achievements
 */
async function batchLoadAchievementsByUser(userIds: readonly string[]): Promise<Achievement[][]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .in('user_id', [...userIds])

  if (error) {
    console.error('[DataLoader] Failed to batch load achievements:', error)
    return userIds.map(() => [])
  }

  // Group achievements by user_id
  const achievementsByUser = new Map<string, Achievement[]>()
  for (const achievement of data || []) {
    const existing = achievementsByUser.get(achievement.user_id) || []
    existing.push(achievement)
    achievementsByUser.set(achievement.user_id, existing)
  }

  // Return in the same order as requested userIds
  return userIds.map(userId => achievementsByUser.get(userId) || [])
}

/**
 * Batch load event registrations by event_id
 * Used by: Event.participants
 * Note: Returns arrays since one event can have many registrations
 */
async function batchLoadRegistrationsByEvent(
  eventIds: readonly string[],
): Promise<EventRegistration[][]> {
  if (eventIds.length === 0) return []

  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .in('event_id', [...eventIds])
    .in('status', ['registered', 'attended'])

  if (error) {
    console.error('[DataLoader] Failed to batch load registrations:', error)
    return eventIds.map(() => [])
  }

  // Group registrations by event_id
  const registrationsByEvent = new Map<string, EventRegistration[]>()
  for (const registration of data || []) {
    const existing = registrationsByEvent.get(registration.event_id) || []
    existing.push(registration)
    registrationsByEvent.set(registration.event_id, existing)
  }

  // Return in the same order as requested eventIds
  return eventIds.map(eventId => registrationsByEvent.get(eventId) || [])
}

/**
 * Batch load event registrations by user_id
 * Used for loading all registrations for a specific user
 */
async function batchLoadRegistrationsByUser(
  userIds: readonly string[],
): Promise<EventRegistration[][]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .in('user_id', [...userIds])

  if (error) {
    console.error('[DataLoader] Failed to batch load user registrations:', error)
    return userIds.map(() => [])
  }

  // Group registrations by user_id
  const registrationsByUser = new Map<string, EventRegistration[]>()
  for (const registration of data || []) {
    const existing = registrationsByUser.get(registration.user_id) || []
    existing.push(registration)
    registrationsByUser.set(registration.user_id, existing)
  }

  // Return in the same order as requested userIds
  return userIds.map(userId => registrationsByUser.get(userId) || [])
}

/**
 * DataLoaders interface for type safety
 */
export interface DataLoaders {
  userLoader: DataLoader<string, User | null>
  eventLoader: DataLoader<string, Event | null>
  achievementsByUserLoader: DataLoader<string, Achievement[]>
  registrationsByEventLoader: DataLoader<string, EventRegistration[]>
  registrationsByUserLoader: DataLoader<string, EventRegistration[]>
}

/**
 * Create fresh DataLoader instances for each request
 * This ensures request-scoped caching and prevents stale data
 */
export function createDataLoaders(): DataLoaders {
  return {
    // Load single user by id
    userLoader: new DataLoader<string, User | null>(batchLoadUsers, {
      // Enable caching within the same request
      cache: true,
    }),

    // Load single event by id
    eventLoader: new DataLoader<string, Event | null>(batchLoadEvents, {
      cache: true,
    }),

    // Load all achievements for a user
    achievementsByUserLoader: new DataLoader<string, Achievement[]>(batchLoadAchievementsByUser, {
      cache: true,
    }),

    // Load all registrations for an event
    registrationsByEventLoader: new DataLoader<string, EventRegistration[]>(
      batchLoadRegistrationsByEvent,
      { cache: true },
    ),

    // Load all registrations for a user
    registrationsByUserLoader: new DataLoader<string, EventRegistration[]>(
      batchLoadRegistrationsByUser,
      { cache: true },
    ),
  }
}
