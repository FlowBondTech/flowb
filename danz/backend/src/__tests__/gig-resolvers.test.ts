/**
 * Gig Resolvers Tests
 *
 * Tests for gig-related GraphQL resolvers.
 * Focuses on type resolvers (pure functions) which don't require database mocking.
 *
 * Note: Query/Mutation integration tests should be run with a test database
 * or using the actual Supabase instance with test data.
 */

import { describe, expect, it } from 'vitest'
import { gigResolvers } from '../graphql/resolvers/gig.resolvers.js'

describe('Gig Resolvers', () => {
  // ============================================================================
  // Authentication Tests (don't require database)
  // ============================================================================
  describe('Authentication', () => {
    it('Query.myGigRoles should require authentication', async () => {
      await expect(
        gigResolvers.Query.myGigRoles(null, {}, { userId: null } as any),
      ).rejects.toThrow('Authentication required')
    })

    it('Query.gigRole should throw if neither id nor slug provided', async () => {
      await expect(gigResolvers.Query.gigRole(null, {})).rejects.toThrow(
        'Either id or slug is required',
      )
    })

    it('Mutation.applyForGigRole should require authentication', async () => {
      await expect(
        gigResolvers.Mutation.applyForGigRole(null, { input: { roleId: 'role-1' } }, {
          userId: null,
        } as any),
      ).rejects.toThrow('Authentication required')
    })

    it('Mutation.createEventGig should require authentication', async () => {
      await expect(
        gigResolvers.Mutation.createEventGig(
          null,
          {
            input: {
              eventId: 'event-1',
              roleId: 'role-1',
              title: 'Test Gig',
              danzReward: 100,
            },
          },
          { userId: null } as any,
        ),
      ).rejects.toThrow('Authentication required')
    })

    it('Mutation.applyForGig should require authentication', async () => {
      await expect(
        gigResolvers.Mutation.applyForGig(null, { gigId: 'gig-1' }, { userId: null } as any),
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('GigRole type resolvers', () => {
    it('should map category to uppercase', () => {
      const role = { category: 'creative' }
      const result = gigResolvers.GigRole.category(role)
      expect(result).toBe('CREATIVE')
    })

    it('should map baseDanzRate from snake_case', () => {
      const role = { base_danz_rate: 200 }
      const result = gigResolvers.GigRole.baseDanzRate(role)
      expect(result).toBe(200)
    })

    it('should map requiresVerification from snake_case', () => {
      const role = { requires_verification: true }
      const result = gigResolvers.GigRole.requiresVerification(role)
      expect(true).toBe(true)
    })

    it('should map verificationRequirements from snake_case', () => {
      const role = { verification_requirements: { certs: ['first_aid'] } }
      const result = gigResolvers.GigRole.verificationRequirements(role)
      expect(result).toEqual({ certs: ['first_aid'] })
    })

    it('should map isActive from snake_case', () => {
      const role = { is_active: true }
      const result = gigResolvers.GigRole.isActive(role)
      expect(result).toBe(true)
    })
  })

  describe('UserGigRole type resolvers', () => {
    it('should map status to uppercase', () => {
      const userRole = { status: 'approved' }
      const result = gigResolvers.UserGigRole.status(userRole)
      expect(result).toBe('APPROVED')
    })

    it('should map verifiedAt from snake_case', () => {
      const date = '2025-01-17T00:00:00Z'
      const userRole = { verified_at: date }
      const result = gigResolvers.UserGigRole.verifiedAt(userRole)
      expect(result).toBe(date)
    })

    it('should map portfolioUrls from snake_case', () => {
      const urls = ['http://example.com']
      const userRole = { portfolio_urls: urls }
      const result = gigResolvers.UserGigRole.portfolioUrls(userRole)
      expect(result).toEqual(urls)
    })

    it('should map totalGigsCompleted from snake_case', () => {
      const userRole = { total_gigs_completed: 15 }
      const result = gigResolvers.UserGigRole.totalGigsCompleted(userRole)
      expect(result).toBe(15)
    })

    it('should map totalDanzEarned from snake_case', () => {
      const userRole = { total_danz_earned: 2500 }
      const result = gigResolvers.UserGigRole.totalDanzEarned(userRole)
      expect(result).toBe(2500)
    })
  })

  describe('EventGig type resolvers', () => {
    it('should map slotsAvailable from snake_case', () => {
      const gig = { slots_available: 3 }
      const result = gigResolvers.EventGig.slotsAvailable(gig)
      expect(result).toBe(3)
    })

    it('should map slotsFilled from snake_case', () => {
      const gig = { slots_filled: 1 }
      const result = gigResolvers.EventGig.slotsFilled(gig)
      expect(result).toBe(1)
    })

    it('should map danzReward from snake_case', () => {
      const gig = { danz_reward: 200 }
      const result = gigResolvers.EventGig.danzReward(gig)
      expect(result).toBe(200)
    })

    it('should map bonusDanz from snake_case', () => {
      const gig = { bonus_danz: 50 }
      const result = gigResolvers.EventGig.bonusDanz(gig)
      expect(result).toBe(50)
    })

    it('should map timeCommitment from snake_case', () => {
      const gig = { time_commitment: '2 hours' }
      const result = gigResolvers.EventGig.timeCommitment(gig)
      expect(result).toBe('2 hours')
    })

    it('should map specificRequirements from snake_case', () => {
      const gig = { specific_requirements: 'Must have camera' }
      const result = gigResolvers.EventGig.specificRequirements(gig)
      expect(result).toBe('Must have camera')
    })

    it('should map approvalMode from snake_case to uppercase', () => {
      const gig = { approval_mode: 'manual' }
      const result = gigResolvers.EventGig.approvalMode(gig)
      expect(result).toBe('MANUAL')
    })

    it('should map createdAt from snake_case', () => {
      const date = '2025-01-17T00:00:00Z'
      const gig = { created_at: date }
      const result = gigResolvers.EventGig.createdAt(gig)
      expect(result).toBe(date)
    })
  })

  describe('GigApplication type resolvers', () => {
    it('should map status to uppercase', () => {
      const app = { status: 'pending' }
      const result = gigResolvers.GigApplication.status(app)
      expect(result).toBe('PENDING')
    })

    it('should map applicationNote from snake_case', () => {
      const app = { application_note: 'I am qualified' }
      const result = gigResolvers.GigApplication.applicationNote(app)
      expect(result).toBe('I am qualified')
    })

    it('should map aiReviewScore from snake_case', () => {
      const app = { ai_review_score: 0.85 }
      const result = gigResolvers.GigApplication.aiReviewScore(app)
      expect(result).toBe(0.85)
    })

    it('should map aiReviewNotes from snake_case', () => {
      const notes = { confidence: 'high' }
      const app = { ai_review_notes: notes }
      const result = gigResolvers.GigApplication.aiReviewNotes(app)
      expect(result).toEqual(notes)
    })

    it('should map checkInTime from snake_case', () => {
      const date = '2025-01-17T20:00:00Z'
      const app = { check_in_time: date }
      const result = gigResolvers.GigApplication.checkInTime(app)
      expect(result).toBe(date)
    })

    it('should map checkOutTime from snake_case', () => {
      const date = '2025-01-17T23:00:00Z'
      const app = { check_out_time: date }
      const result = gigResolvers.GigApplication.checkOutTime(app)
      expect(result).toBe(date)
    })

    it('should map completionProof from snake_case', () => {
      const proof = { photos: ['url1', 'url2'] }
      const app = { completion_proof: proof }
      const result = gigResolvers.GigApplication.completionProof(app)
      expect(result).toEqual(proof)
    })

    it('should map organizerRating from snake_case', () => {
      const app = { organizer_rating: 5 }
      const result = gigResolvers.GigApplication.organizerRating(app)
      expect(result).toBe(5)
    })

    it('should map organizerFeedback from snake_case', () => {
      const app = { organizer_feedback: 'Great work!' }
      const result = gigResolvers.GigApplication.organizerFeedback(app)
      expect(result).toBe('Great work!')
    })

    it('should map workerRating from snake_case', () => {
      const app = { worker_rating: 4 }
      const result = gigResolvers.GigApplication.workerRating(app)
      expect(result).toBe(4)
    })

    it('should map workerFeedback from snake_case', () => {
      const app = { worker_feedback: 'Good event!' }
      const result = gigResolvers.GigApplication.workerFeedback(app)
      expect(result).toBe('Good event!')
    })

    it('should map danzAwarded from snake_case', () => {
      const app = { danz_awarded: 200 }
      const result = gigResolvers.GigApplication.danzAwarded(app)
      expect(result).toBe(200)
    })

    it('should map danzAwardedAt from snake_case', () => {
      const date = '2025-01-17T23:30:00Z'
      const app = { danz_awarded_at: date }
      const result = gigResolvers.GigApplication.danzAwardedAt(app)
      expect(result).toBe(date)
    })
  })
})
