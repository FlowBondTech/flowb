/**
 * Email Templates Index
 *
 * Exports all email templates for the DANZ platform.
 */

// Base template and utilities
export {
  baseTemplate,
  colors,
  ctaButton,
  emailConfig,
  infoBox,
  successBox,
  warningBox,
} from './base.js'
// Gig application templates
export {
  gigApplicationApprovedSubject,
  gigApplicationApprovedTemplate,
} from './gig-application-approved.js'
export {
  gigApplicationReceivedSubject,
  gigApplicationReceivedTemplate,
} from './gig-application-received.js'
export {
  gigApplicationRejectedSubject,
  gigApplicationRejectedTemplate,
} from './gig-application-rejected.js'
export { gigCancelledSubject, gigCancelledTemplate } from './gig-cancelled.js'
export { gigCompletedSubject, gigCompletedTemplate } from './gig-completed.js'
// Digest templates
export {
  gigOpportunityDigestSubject,
  gigOpportunityDigestTemplate,
} from './gig-opportunity-digest.js'
export { gigRatingReceivedSubject, gigRatingReceivedTemplate } from './gig-rating-received.js'
// Gig lifecycle templates
export { gigReminderSubject, gigReminderTemplate } from './gig-reminder.js'
// Gig role templates
export { gigRoleApprovedSubject, gigRoleApprovedTemplate } from './gig-role-approved.js'
export { gigRoleRejectedSubject, gigRoleRejectedTemplate } from './gig-role-rejected.js'
