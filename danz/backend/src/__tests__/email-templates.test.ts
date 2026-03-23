/**
 * Email Templates Tests
 *
 * Tests for all gig-related email templates.
 */

import { describe, expect, it } from 'vitest'
import {
  gigApplicationApprovedSubject,
  gigApplicationApprovedTemplate,
  gigApplicationReceivedSubject,
  gigApplicationReceivedTemplate,
  gigApplicationRejectedSubject,
  gigApplicationRejectedTemplate,
  gigCancelledSubject,
  gigCancelledTemplate,
  gigCompletedSubject,
  gigCompletedTemplate,
  gigOpportunityDigestSubject,
  gigOpportunityDigestTemplate,
  gigRatingReceivedSubject,
  gigRatingReceivedTemplate,
  gigReminderSubject,
  gigReminderTemplate,
  gigRoleApprovedSubject,
  gigRoleApprovedTemplate,
  gigRoleRejectedSubject,
  gigRoleRejectedTemplate,
} from '../templates/emails/index.js'

describe('Email Templates', () => {
  describe('gigRoleApproved', () => {
    const data = {
      userName: 'John',
      roleName: 'Photographer',
      approvedBy: 'Admin',
    }

    it('should generate valid HTML', () => {
      const html = gigRoleApprovedTemplate(data)
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('John')
      expect(html).toContain('Photographer')
      expect(html).toContain('approved')
    })

    it('should generate correct subject', () => {
      const subject = gigRoleApprovedSubject(data)
      expect(subject).toContain('Photographer')
      expect(subject).toContain('approved')
    })

    it('should include CTA button', () => {
      const html = gigRoleApprovedTemplate(data)
      expect(html).toContain('Browse Available Gigs')
      expect(html).toContain('/dashboard/gigs')
    })
  })

  describe('gigRoleRejected', () => {
    it('should generate HTML with reason', () => {
      const data = {
        userName: 'Jane',
        roleName: 'DJ Assistant',
        reason: 'Need more experience',
      }
      const html = gigRoleRejectedTemplate(data)
      expect(html).toContain('Jane')
      expect(html).toContain('DJ Assistant')
      expect(html).toContain('Need more experience')
    })

    it('should generate HTML without reason', () => {
      const data = {
        userName: 'Jane',
        roleName: 'DJ Assistant',
      }
      const html = gigRoleRejectedTemplate(data)
      expect(html).toContain('Jane')
      expect(html).not.toContain('Feedback:')
    })

    it('should generate correct subject', () => {
      const data = { userName: 'Jane', roleName: 'Security' }
      const subject = gigRoleRejectedSubject(data)
      expect(subject).toContain('Security')
    })
  })

  describe('gigApplicationApproved', () => {
    const data = {
      userName: 'Mike',
      gigTitle: 'Event Photographer',
      roleName: 'Photographer',
      eventTitle: 'Summer Dance Party',
      eventDate: 'Saturday, January 25, 2025',
      eventLocation: 'Club XYZ',
      danzReward: 200,
    }

    it('should generate valid HTML with all details', () => {
      const html = gigApplicationApprovedTemplate(data)
      expect(html).toContain('Mike')
      expect(html).toContain('Event Photographer')
      expect(html).toContain('Summer Dance Party')
      expect(html).toContain('Club XYZ')
      expect(html).toContain('200')
      expect(html).toContain('$DANZ')
    })

    it('should generate celebratory subject', () => {
      const subject = gigApplicationApprovedSubject(data)
      expect(subject).toContain('got the gig')
      expect(subject).toContain('Photographer')
    })

    it('should include check-in reminder', () => {
      const html = gigApplicationApprovedTemplate(data)
      expect(html.toLowerCase()).toContain('check in')
    })
  })

  describe('gigApplicationRejected', () => {
    it('should generate HTML with reason', () => {
      const data = {
        userName: 'Sarah',
        gigTitle: 'Door Staff',
        roleName: 'Door/Check-in',
        eventTitle: 'Night Event',
        reason: 'Position filled',
      }
      const html = gigApplicationRejectedTemplate(data)
      expect(html).toContain('Sarah')
      expect(html).toContain('Position filled')
    })

    it('should encourage finding more gigs', () => {
      const data = {
        userName: 'Sarah',
        gigTitle: 'Door Staff',
        roleName: 'Door/Check-in',
        eventTitle: 'Night Event',
      }
      const html = gigApplicationRejectedTemplate(data)
      expect(html).toContain('Find More Gigs')
    })
  })

  describe('gigApplicationReceived', () => {
    const data = {
      organizerName: 'Event Org',
      applicantName: 'Alex Worker',
      applicantUsername: 'alexw',
      gigTitle: 'Setup Crew',
      roleName: 'Setup Crew',
      eventTitle: 'Big Event',
      applicationNote: 'I have 5 years experience',
    }

    it('should generate HTML for organizer', () => {
      const html = gigApplicationReceivedTemplate(data)
      expect(html).toContain('Event Org')
      expect(html).toContain('Alex Worker')
      expect(html).toContain('@alexw')
      expect(html).toContain('5 years experience')
    })

    it('should include review button', () => {
      const html = gigApplicationReceivedTemplate(data)
      expect(html).toContain('Review Application')
    })

    it('should generate correct subject', () => {
      const subject = gigApplicationReceivedSubject(data)
      expect(subject).toContain('Alex Worker')
      expect(subject).toContain('Setup Crew')
    })
  })

  describe('gigReminder', () => {
    it('should generate 24h reminder', () => {
      const data = {
        userName: 'Chris',
        gigTitle: 'Photo Gig',
        roleName: 'Photographer',
        eventTitle: 'Party',
        eventDate: 'Tomorrow at 8pm',
        hoursUntil: 24,
      }
      const html = gigReminderTemplate(data)
      expect(html).toContain('tomorrow')
      expect(html).toContain('Chris')
    })

    it('should generate 1h reminder', () => {
      const data = {
        userName: 'Chris',
        gigTitle: 'Photo Gig',
        roleName: 'Photographer',
        eventTitle: 'Party',
        eventDate: 'Today at 8pm',
        hoursUntil: 1,
      }
      const html = gigReminderTemplate(data)
      expect(html).toContain('1 hour')
    })

    it('should include checklist', () => {
      const data = {
        userName: 'Chris',
        gigTitle: 'Photo Gig',
        roleName: 'Photographer',
        eventTitle: 'Party',
        eventDate: 'Tomorrow',
        hoursUntil: 24,
      }
      const html = gigReminderTemplate(data)
      expect(html).toContain('Checklist')
      expect(html).toContain('Arrive early')
    })
  })

  describe('gigCancelled', () => {
    it('should generate cancellation notice with reason', () => {
      const data = {
        userName: 'Pat',
        gigTitle: 'Cleanup Crew',
        roleName: 'Cleanup Crew',
        eventTitle: 'Cancelled Event',
        eventDate: 'Jan 30',
        reason: 'Event postponed',
      }
      const html = gigCancelledTemplate(data)
      expect(html).toContain('cancelled')
      expect(html).toContain('Event postponed')
    })

    it('should reassure about ratings', () => {
      const data = {
        userName: 'Pat',
        gigTitle: 'Cleanup Crew',
        roleName: 'Cleanup Crew',
        eventTitle: 'Cancelled Event',
        eventDate: 'Jan 30',
      }
      const html = gigCancelledTemplate(data)
      expect(html).toContain('rating')
    })
  })

  describe('gigCompleted', () => {
    it('should show reward amount', () => {
      const data = {
        userName: 'Jordan',
        gigTitle: 'Host Gig',
        roleName: 'Host/MC',
        eventTitle: 'Big Party',
        danzAwarded: 300,
      }
      const html = gigCompletedTemplate(data)
      expect(html).toContain('+300')
      expect(html).toContain('$DANZ')
    })

    it('should show bonus if present', () => {
      const data = {
        userName: 'Jordan',
        gigTitle: 'Host Gig',
        roleName: 'Host/MC',
        eventTitle: 'Big Party',
        danzAwarded: 300,
        bonusDanz: 50,
      }
      const html = gigCompletedTemplate(data)
      expect(html).toContain('350') // total
      expect(html).toContain('50') // bonus
      expect(html).toContain('bonus')
    })

    it('should generate celebratory subject', () => {
      const data = {
        userName: 'Jordan',
        gigTitle: 'Host Gig',
        roleName: 'Host/MC',
        eventTitle: 'Big Party',
        danzAwarded: 300,
      }
      const subject = gigCompletedSubject(data)
      expect(subject).toContain('300')
      expect(subject).toContain('$DANZ')
    })
  })

  describe('gigRatingReceived', () => {
    it('should show 5-star rating', () => {
      const data = {
        userName: 'Taylor',
        gigTitle: 'Photo Gig',
        roleName: 'Photographer',
        eventTitle: 'Wedding',
        rating: 5,
        feedback: 'Amazing work!',
      }
      const html = gigRatingReceivedTemplate(data)
      expect(html).toContain('★★★★★')
      expect(html).toContain('5/5')
      expect(html).toContain('Amazing work!')
    })

    it('should show 3-star rating differently', () => {
      const data = {
        userName: 'Taylor',
        gigTitle: 'Photo Gig',
        roleName: 'Photographer',
        eventTitle: 'Event',
        rating: 3,
      }
      const html = gigRatingReceivedTemplate(data)
      expect(html).toContain('★★★☆☆')
      expect(html).toContain('3/5')
    })

    it('should adjust subject based on rating', () => {
      const highRating = gigRatingReceivedSubject({
        userName: 'T',
        gigTitle: 'G',
        roleName: 'R',
        eventTitle: 'E',
        rating: 5,
      })
      expect(highRating).toContain('Great')

      const lowRating = gigRatingReceivedSubject({
        userName: 'T',
        gigTitle: 'G',
        roleName: 'R',
        eventTitle: 'E',
        rating: 2,
      })
      expect(lowRating).not.toContain('Great')
    })
  })

  describe('gigOpportunityDigest', () => {
    const data = {
      userName: 'Casey',
      opportunities: [
        {
          id: '1',
          title: 'Photo Gig 1',
          roleName: 'Photographer',
          eventTitle: 'Event 1',
          eventDate: 'Jan 25',
          eventLocation: 'Location 1',
          danzReward: 200,
          slotsAvailable: 2,
        },
        {
          id: '2',
          title: 'Setup Gig',
          roleName: 'Setup Crew',
          eventTitle: 'Event 2',
          eventDate: 'Jan 26',
          danzReward: 50,
          slotsAvailable: 5,
        },
      ],
      totalOpportunities: 2,
      userRoles: ['Photographer', 'Setup Crew'],
    }

    it('should list opportunities', () => {
      const html = gigOpportunityDigestTemplate(data)
      expect(html).toContain('Photo Gig 1')
      expect(html).toContain('Setup Gig')
      expect(html).toContain('200')
      expect(html).toContain('50')
    })

    it('should show slots available', () => {
      const html = gigOpportunityDigestTemplate(data)
      expect(html).toContain('2 slots')
      expect(html).toContain('5 slots')
    })

    it('should include user roles', () => {
      const html = gigOpportunityDigestTemplate(data)
      expect(html).toContain('Photographer')
      expect(html).toContain('Setup Crew')
    })

    it('should generate correct subject', () => {
      const subject = gigOpportunityDigestSubject(data)
      expect(subject).toContain('2')
      expect(subject).toContain('opportunities')
    })

    it('should show "more" message when truncated', () => {
      const manyOpportunities = {
        ...data,
        totalOpportunities: 10,
        opportunities: Array(6).fill(data.opportunities[0]),
      }
      const html = gigOpportunityDigestTemplate(manyOpportunities)
      expect(html).toContain('more opportunities')
    })
  })

  describe('Base Template', () => {
    it('should include DANZ branding', () => {
      const html = gigRoleApprovedTemplate({
        userName: 'Test',
        roleName: 'Test Role',
      })
      expect(html).toContain('DANZ')
      expect(html).toContain('danz.app')
    })

    it('should include unsubscribe/manage link', () => {
      const html = gigRoleApprovedTemplate({
        userName: 'Test',
        roleName: 'Test Role',
      })
      expect(html).toContain('Manage notifications')
      expect(html).toContain('/dashboard/settings')
    })

    it('should have proper HTML structure', () => {
      const html = gigRoleApprovedTemplate({
        userName: 'Test',
        roleName: 'Test Role',
      })
      expect(html).toContain('<html')
      expect(html).toContain('</html>')
      expect(html).toContain('<head>')
      expect(html).toContain('<body>')
    })
  })
})
