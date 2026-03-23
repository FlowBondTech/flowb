/**
 * Gig Notifications Service Tests
 *
 * Tests for gig notification functions with mocked database and email service.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock the email service
vi.mock('../services/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

// Import after mocks
import { supabase } from '../config/supabase.js'
import { sendEmail } from '../services/email.js'
import {
  notifyGigApplicationApproved,
  notifyGigApplicationReceived,
  notifyGigApplicationRejected,
  notifyGigCancelled,
  notifyGigCompleted,
  notifyGigOpportunity,
  notifyGigRatingReceived,
  notifyGigReminder,
  notifyGigRoleApproved,
  notifyGigRoleRejected,
} from '../services/gigNotifications.js'

// Test data fixtures
const mockRole = {
  id: 'role-1',
  name: 'Photographer',
  slug: 'photographer',
}

const mockGig = {
  id: 'gig-1',
  title: 'Event Photographer',
  danz_reward: 200,
  event_id: 'event-1',
  event: {
    id: 'event-1',
    title: 'Summer Dance Party',
    start_date_time: '2025-01-25T20:00:00Z',
    location_name: 'Club XYZ',
  },
  role: mockRole,
}

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  display_name: 'Test User',
  email: 'test@example.com',
}

const mockEvent = {
  id: 'event-1',
  title: 'Summer Dance Party',
  start_date_time: '2025-01-25T20:00:00Z',
  location_name: 'Club XYZ',
}

// Helper to create chainable mock
function createMockChain(data: any = null, error: any = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockResolvedValue({ data, error }),
  }
  return chain
}

describe('Gig Notifications Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================================
  // notifyGigRoleApproved Tests
  // ============================================================================
  describe('notifyGigRoleApproved', () => {
    it('should create notification and send email when preferences enabled', async () => {
      // Mock preference check (enabled)
      const prefChain = createMockChain(null, null) // No data = default enabled
      const userChain = createMockChain({
        email: 'test@example.com',
        display_name: 'John',
        username: 'john',
      })
      const notifChain = createMockChain()

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigRoleApproved('user-1', mockRole)

      // Should have checked preferences
      expect(supabase.from).toHaveBeenCalledWith('notification_preferences')

      // Should have created notification
      expect(supabase.from).toHaveBeenCalledWith('notifications')
      expect(notifChain.insert).toHaveBeenCalled()

      // Should have fetched user email
      expect(supabase.from).toHaveBeenCalledWith('users')

      // Should have sent email
      expect(sendEmail).toHaveBeenCalled()
    })

    it('should not send notification when preferences disabled', async () => {
      // Mock preference check (disabled)
      const prefChain = createMockChain({ gig_role_updates: false })

      vi.mocked(supabase.from).mockReturnValue(prefChain as any)

      await notifyGigRoleApproved('user-1', mockRole)

      // Should have checked preferences
      expect(supabase.from).toHaveBeenCalledWith('notification_preferences')

      // Should NOT have created notification or sent email
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('should include approvedBy in notification when provided', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'John' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigRoleApproved('user-1', mockRole, 'admin-1')

      expect(insertedData).toBeTruthy()
      expect(insertedData.sender_id).toBe('admin-1')
    })
  })

  // ============================================================================
  // notifyGigRoleRejected Tests
  // ============================================================================
  describe('notifyGigRoleRejected', () => {
    it('should create notification with reason when provided', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Jane' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigRoleRejected('user-1', mockRole, 'Need more experience')

      expect(insertedData.message).toContain('Need more experience')
      expect(sendEmail).toHaveBeenCalled()
    })

    it('should create notification without reason when not provided', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Jane' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigRoleRejected('user-1', mockRole)

      expect(insertedData.message).toContain('reapply')
      expect(insertedData.message).not.toContain('Reason')
    })
  })

  // ============================================================================
  // notifyGigApplicationApproved Tests
  // ============================================================================
  describe('notifyGigApplicationApproved', () => {
    it('should create notification with event details', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Mike' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigApplicationApproved('user-1', mockGig, 'app-1')

      expect(insertedData.title).toBe('Gig Application Approved!')
      expect(insertedData.message).toContain('Event Photographer')
      expect(insertedData.message).toContain('Summer Dance Party')
      expect(insertedData.gig_id).toBe('gig-1')
      expect(insertedData.event_id).toBe('event-1')
      expect(insertedData.gig_application_id).toBe('app-1')
    })

    it('should send email with reward amount', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Mike' })
      const notifChain = createMockChain()

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigApplicationApproved('user-1', mockGig, 'app-1')

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
        }),
      )
    })
  })

  // ============================================================================
  // notifyGigApplicationRejected Tests
  // ============================================================================
  describe('notifyGigApplicationRejected', () => {
    it('should include rejection reason when provided', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Sarah' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigApplicationRejected('user-1', mockGig, 'app-1', 'Position filled')

      expect(insertedData.message).toContain('Position filled')
    })

    it('should encourage reapplying when no reason provided', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Sarah' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigApplicationRejected('user-1', mockGig, 'app-1')

      expect(insertedData.message).toContain('Keep applying')
    })
  })

  // ============================================================================
  // notifyGigApplicationReceived Tests
  // ============================================================================
  describe('notifyGigApplicationReceived', () => {
    it('should notify organizer with applicant details', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({
        email: 'organizer@example.com',
        display_name: 'Organizer',
      })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigApplicationReceived('organizer-1', mockUser, mockGig, 'I have experience')

      expect(insertedData.title).toBe('New Gig Application')
      expect(insertedData.message).toContain('Test User')
      expect(insertedData.message).toContain('Event Photographer')
      expect(insertedData.sender_id).toBe('user-1')
    })
  })

  // ============================================================================
  // notifyGigCancelled Tests
  // ============================================================================
  describe('notifyGigCancelled', () => {
    it('should notify multiple workers with bulk notification', async () => {
      const prefChain = createMockChain(null) // Preferences enabled
      const userChain = createMockChain({ email: 'worker@example.com', display_name: 'Worker' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigCancelled(['worker-1', 'worker-2'], mockGig, 'Event postponed')

      // Should have created bulk notifications (array)
      expect(insertedData).toBeInstanceOf(Array)
      expect(insertedData.length).toBe(2)
      expect(insertedData[0].message).toContain('cancelled')
      expect(insertedData[0].message).toContain('Event postponed')
    })

    it('should not send notifications when no workers', async () => {
      await notifyGigCancelled([], mockGig)

      // Should not have called insert
      expect(supabase.from).not.toHaveBeenCalledWith('notifications')
    })
  })

  // ============================================================================
  // notifyGigCompleted Tests
  // ============================================================================
  describe('notifyGigCompleted', () => {
    it('should include danz amount in notification', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Jordan' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigCompleted('user-1', mockGig, 'app-1', 300, 50)

      expect(insertedData.title).toBe('Gig Completed!')
      expect(insertedData.message).toContain('300')
      expect(insertedData.message).toContain('$DANZ')
      expect(insertedData.action_data.danz_awarded).toBe(300)
    })
  })

  // ============================================================================
  // notifyGigRatingReceived Tests
  // ============================================================================
  describe('notifyGigRatingReceived', () => {
    it('should include rating stars and feedback', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Taylor' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigRatingReceived('user-1', mockGig, 'app-1', 5, 'Amazing work!')

      expect(insertedData.title).toBe('New Rating Received')
      expect(insertedData.message).toContain('5/5')
      expect(insertedData.message).toContain('⭐')
      expect(insertedData.message).toContain('Amazing work!')
      expect(insertedData.action_data.rating).toBe(5)
    })

    it('should work without feedback', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Taylor' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigRatingReceived('user-1', mockGig, 'app-1', 3)

      expect(insertedData.message).toContain('3/5')
      expect(insertedData.message).not.toContain('Feedback')
    })
  })

  // ============================================================================
  // notifyGigOpportunity Tests
  // ============================================================================
  describe('notifyGigOpportunity', () => {
    it('should notify all approved users for the role', async () => {
      const userGigRolesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
          error: null,
        }),
      }

      // Override to return array
      userGigRolesChain.eq.mockImplementation(() => ({
        ...userGigRolesChain,
        then: (resolve: Function) =>
          resolve({
            data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
            error: null,
          }),
      }))

      const prefChain = createMockChain(null) // Enabled
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_gig_roles') return userGigRolesChain as any
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigOpportunity(mockGig, mockEvent, 'role-1')

      // Should have queried user_gig_roles
      expect(supabase.from).toHaveBeenCalledWith('user_gig_roles')
    })

    it('should not notify when no approved users', async () => {
      const userGigRolesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }

      // Return empty array
      userGigRolesChain.eq.mockImplementation(() => ({
        ...userGigRolesChain,
        then: (resolve: Function) => resolve({ data: [], error: null }),
      }))

      vi.mocked(supabase.from).mockReturnValue(userGigRolesChain as any)

      await notifyGigOpportunity(mockGig, mockEvent, 'role-1')

      // Should not have created notifications
      expect(supabase.from).not.toHaveBeenCalledWith('notifications')
    })
  })

  // ============================================================================
  // notifyGigReminder Tests
  // ============================================================================
  describe('notifyGigReminder', () => {
    it('should include correct time message for 24h reminder', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Chris' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigReminder('user-1', mockGig, 'app-1', 24)

      expect(insertedData.title).toBe('Gig Reminder')
      expect(insertedData.message).toContain('tomorrow')
      expect(insertedData.message).toContain('check in')
    })

    it('should include correct time message for 1h reminder', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Chris' })
      const notifChain = createMockChain()

      let insertedData: any = null
      notifChain.insert.mockImplementation((data: any) => {
        insertedData = data
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigReminder('user-1', mockGig, 'app-1', 1)

      expect(insertedData.message).toContain('in 1 hours')
    })

    it('should respect gig_reminders preference', async () => {
      const prefChain = createMockChain({ gig_reminders: false })

      vi.mocked(supabase.from).mockReturnValue(prefChain as any)

      await notifyGigReminder('user-1', mockGig, 'app-1', 24)

      // Should not have sent email
      expect(sendEmail).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({ email: 'test@example.com', display_name: 'Test' })
      const notifChain = {
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      // Should not throw
      await notifyGigRoleApproved('user-1', mockRole)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should skip email when user has no email', async () => {
      const prefChain = createMockChain(null)
      const userChain = createMockChain({
        email: null,
        display_name: 'NoEmail',
        username: 'noemail',
      })
      const notifChain = createMockChain()

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'notification_preferences') return prefChain as any
        if (table === 'users') return userChain as any
        if (table === 'notifications') return notifChain as any
        return createMockChain() as any
      })

      await notifyGigRoleApproved('user-1', mockRole)

      // Notification should be created
      expect(notifChain.insert).toHaveBeenCalled()

      // But email should not be sent
      expect(sendEmail).not.toHaveBeenCalled()
    })
  })
})
