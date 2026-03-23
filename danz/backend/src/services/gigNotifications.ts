/**
 * Gig Notification Service
 *
 * Handles all gig-related notification creation and delivery.
 * Integrates with the existing notification system and email service.
 */

import { supabase } from '../config/supabase.js'
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
  gigRatingReceivedSubject,
  gigRatingReceivedTemplate,
  gigReminderSubject,
  gigReminderTemplate,
  gigRoleApprovedSubject,
  gigRoleApprovedTemplate,
  gigRoleRejectedSubject,
  gigRoleRejectedTemplate,
} from '../templates/emails/index.js'
import { sendEmail } from './email.js'

// ============================================================================
// TYPES
// ============================================================================

interface GigNotificationParams {
  recipientId: string
  senderId?: string
  eventId?: string
  gigId?: string
  applicationId?: string
  title: string
  message: string
  actionType?: string
  actionData?: Record<string, any>
}

interface GigRoleInfo {
  id: string
  name: string
  slug: string
}

interface EventInfo {
  id: string
  title: string
  start_date_time?: string
  location_name?: string
}

interface GigInfo {
  id: string
  title: string
  danz_reward: number
  event_id: string
  event?: EventInfo
  role?: GigRoleInfo
}

interface UserInfo {
  id: string
  username?: string
  display_name?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user's email and display name for email sending
 */
async function getUserEmailInfo(userId: string): Promise<{ email: string | null; name: string }> {
  const { data } = await supabase
    .from('users')
    .select('email, display_name, username')
    .eq('id', userId)
    .single()

  if (!data) return { email: null, name: 'there' }

  return {
    email: data.email || null,
    name: data.display_name || data.username || 'there',
  }
}

/**
 * Format date for email display
 */
function formatEventDate(dateString?: string): string {
  if (!dateString) return 'TBD'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Check if user has notifications enabled for a specific type
 */
async function checkNotificationPreference(
  userId: string,
  preferenceKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  // If no preferences exist, default to enabled
  if (!data) return true

  // Check the specific preference
  const prefs = data as Record<string, unknown>
  return prefs[preferenceKey] !== false
}

/**
 * Create a notification in the database
 */
async function createNotification(type: string, params: GigNotificationParams): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    type,
    title: params.title,
    message: params.message,
    sender_id: params.senderId,
    sender_type: params.senderId ? 'user' : 'system',
    recipient_id: params.recipientId,
    event_id: params.eventId,
    gig_id: params.gigId,
    gig_application_id: params.applicationId,
    action_type: params.actionType,
    action_data: params.actionData,
    is_broadcast: false,
  })

  if (error) {
    console.error(`Failed to create ${type} notification:`, error)
  }
}

/**
 * Create notifications for multiple recipients
 */
async function createBulkNotifications(
  type: string,
  recipientIds: string[],
  params: Omit<GigNotificationParams, 'recipientId'>,
): Promise<void> {
  if (recipientIds.length === 0) return

  const notifications = recipientIds.map(recipientId => ({
    type,
    title: params.title,
    message: params.message,
    sender_id: params.senderId,
    sender_type: params.senderId ? 'user' : 'system',
    recipient_id: recipientId,
    event_id: params.eventId,
    gig_id: params.gigId,
    gig_application_id: params.applicationId,
    action_type: params.actionType,
    action_data: params.actionData,
    is_broadcast: false,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    console.error(`Failed to create bulk ${type} notifications:`, error)
  }
}

// ============================================================================
// GIG ROLE NOTIFICATIONS
// ============================================================================

/**
 * Notify user when their gig role application is approved
 */
export async function notifyGigRoleApproved(
  userId: string,
  role: GigRoleInfo,
  approvedBy?: string,
): Promise<void> {
  const prefEnabled = await checkNotificationPreference(userId, 'gig_role_updates')
  if (!prefEnabled) return

  await createNotification('gig_role_approved', {
    recipientId: userId,
    senderId: approvedBy,
    title: 'Role Application Approved!',
    message: `Congratulations! You've been approved as a ${role.name}. You can now apply for ${role.name} gigs.`,
    actionType: 'open_gig_roles',
    actionData: { role_id: role.id, role_slug: role.slug },
  })

  // Send email
  const { email, name } = await getUserEmailInfo(userId)
  if (email) {
    const emailData = {
      userName: name,
      roleName: role.name,
      approvedBy,
    }
    await sendEmail({
      to: email,
      subject: gigRoleApprovedSubject(emailData),
      html: gigRoleApprovedTemplate(emailData),
    })
  }
}

/**
 * Notify user when their gig role application is rejected
 */
export async function notifyGigRoleRejected(
  userId: string,
  role: GigRoleInfo,
  reason?: string,
): Promise<void> {
  const prefEnabled = await checkNotificationPreference(userId, 'gig_role_updates')
  if (!prefEnabled) return

  const message = reason
    ? `Your ${role.name} role application was not approved. Reason: ${reason}`
    : `Your ${role.name} role application was not approved at this time. You can reapply with additional experience.`

  await createNotification('gig_role_rejected', {
    recipientId: userId,
    title: 'Role Application Update',
    message,
    actionType: 'open_gig_roles',
    actionData: { role_id: role.id, role_slug: role.slug },
  })

  // Send email
  const { email, name } = await getUserEmailInfo(userId)
  if (email) {
    const emailData = {
      userName: name,
      roleName: role.name,
      reason,
    }
    await sendEmail({
      to: email,
      subject: gigRoleRejectedSubject(emailData),
      html: gigRoleRejectedTemplate(emailData),
    })
  }
}

// ============================================================================
// GIG APPLICATION NOTIFICATIONS
// ============================================================================

/**
 * Notify event organizer/gig manager when someone applies for a gig
 */
export async function notifyGigApplicationReceived(
  organizerId: string,
  applicant: UserInfo,
  gig: GigInfo,
  applicationNote?: string,
): Promise<void> {
  const prefEnabled = await checkNotificationPreference(organizerId, 'gig_application_updates')
  if (!prefEnabled) return

  const applicantName = applicant.display_name || applicant.username || 'Someone'

  await createNotification('gig_application_received', {
    recipientId: organizerId,
    senderId: applicant.id,
    eventId: gig.event_id,
    gigId: gig.id,
    title: 'New Gig Application',
    message: `${applicantName} applied for the "${gig.title}" gig.`,
    actionType: 'open_gig_manager_dashboard',
    actionData: { gig_id: gig.id, event_id: gig.event_id },
  })

  // Send email
  const { email, name } = await getUserEmailInfo(organizerId)
  if (email) {
    const emailData = {
      organizerName: name,
      applicantName,
      applicantUsername: applicant.username,
      gigTitle: gig.title,
      roleName: gig.role?.name || 'Worker',
      eventTitle: gig.event?.title || 'Event',
      applicationNote,
    }
    await sendEmail({
      to: email,
      subject: gigApplicationReceivedSubject(emailData),
      html: gigApplicationReceivedTemplate(emailData),
    })
  }
}

/**
 * Notify applicant when their gig application is approved
 */
export async function notifyGigApplicationApproved(
  userId: string,
  gig: GigInfo,
  applicationId: string,
): Promise<void> {
  const prefEnabled = await checkNotificationPreference(userId, 'gig_application_updates')
  if (!prefEnabled) return

  const eventTitle = gig.event?.title || 'the event'

  await createNotification('gig_application_approved', {
    recipientId: userId,
    eventId: gig.event_id,
    gigId: gig.id,
    applicationId,
    title: 'Gig Application Approved!',
    message: `You've been approved for "${gig.title}" at ${eventTitle}! Check the details and get ready.`,
    actionType: 'open_gig_application',
    actionData: { application_id: applicationId, gig_id: gig.id },
  })

  // Send email
  const { email, name } = await getUserEmailInfo(userId)
  if (email) {
    const emailData = {
      userName: name,
      gigTitle: gig.title,
      roleName: gig.role?.name || 'Worker',
      eventTitle,
      eventDate: formatEventDate(gig.event?.start_date_time),
      eventLocation: gig.event?.location_name,
      danzReward: gig.danz_reward,
    }
    await sendEmail({
      to: email,
      subject: gigApplicationApprovedSubject(emailData),
      html: gigApplicationApprovedTemplate(emailData),
    })
  }
}

/**
 * Notify applicant when their gig application is rejected
 */
export async function notifyGigApplicationRejected(
  userId: string,
  gig: GigInfo,
  applicationId: string,
  reason?: string,
): Promise<void> {
  const prefEnabled = await checkNotificationPreference(userId, 'gig_application_updates')
  if (!prefEnabled) return

  const message = reason
    ? `Your application for "${gig.title}" was not selected. Reason: ${reason}`
    : `Your application for "${gig.title}" was not selected this time. Keep applying!`

  await createNotification('gig_application_rejected', {
    recipientId: userId,
    eventId: gig.event_id,
    gigId: gig.id,
    applicationId,
    title: 'Gig Application Update',
    message,
    actionType: 'open_gig_dashboard',
    actionData: { gig_id: gig.id },
  })

  // Send email
  const { email, name } = await getUserEmailInfo(userId)
  if (email) {
    const emailData = {
      userName: name,
      gigTitle: gig.title,
      roleName: gig.role?.name || 'Worker',
      eventTitle: gig.event?.title || 'Event',
      reason,
    }
    await sendEmail({
      to: email,
      subject: gigApplicationRejectedSubject(emailData),
      html: gigApplicationRejectedTemplate(emailData),
    })
  }
}

// ============================================================================
// GIG STATUS NOTIFICATIONS
// ============================================================================

/**
 * Notify worker when a gig they were approved for is cancelled
 */
export async function notifyGigCancelled(
  workerIds: string[],
  gig: GigInfo,
  reason?: string,
): Promise<void> {
  // Filter users who have notifications enabled
  const enabledWorkers: string[] = []
  for (const workerId of workerIds) {
    const prefEnabled = await checkNotificationPreference(workerId, 'gig_application_updates')
    if (prefEnabled) {
      enabledWorkers.push(workerId)
    }
  }

  if (enabledWorkers.length === 0) return

  const eventTitle = gig.event?.title || 'the event'
  const message = reason
    ? `The "${gig.title}" gig at ${eventTitle} has been cancelled. Reason: ${reason}`
    : `The "${gig.title}" gig at ${eventTitle} has been cancelled.`

  await createBulkNotifications('gig_cancelled', enabledWorkers, {
    eventId: gig.event_id,
    gigId: gig.id,
    title: 'Gig Cancelled',
    message,
    actionType: 'open_gig_dashboard',
    actionData: { gig_id: gig.id },
  })

  // Send emails to all workers
  for (const workerId of enabledWorkers) {
    const { email, name } = await getUserEmailInfo(workerId)
    if (email) {
      const emailData = {
        userName: name,
        gigTitle: gig.title,
        roleName: gig.role?.name || 'Worker',
        eventTitle,
        eventDate: formatEventDate(gig.event?.start_date_time),
        reason,
      }
      await sendEmail({
        to: email,
        subject: gigCancelledSubject(emailData),
        html: gigCancelledTemplate(emailData),
      })
    }
  }
}

/**
 * Notify worker when their gig is completed and payment processed
 */
export async function notifyGigCompleted(
  userId: string,
  gig: GigInfo,
  applicationId: string,
  danzAwarded: number,
  bonusDanz?: number,
): Promise<void> {
  const prefEnabled = await checkNotificationPreference(userId, 'gig_application_updates')
  if (!prefEnabled) return

  await createNotification('gig_completed', {
    recipientId: userId,
    eventId: gig.event_id,
    gigId: gig.id,
    applicationId,
    title: 'Gig Completed!',
    message: `Great work! You've completed "${gig.title}" and earned ${danzAwarded} $DANZ.`,
    actionType: 'open_gig_application',
    actionData: { application_id: applicationId, danz_awarded: danzAwarded },
  })

  // Send email
  const { email, name } = await getUserEmailInfo(userId)
  if (email) {
    const emailData = {
      userName: name,
      gigTitle: gig.title,
      roleName: gig.role?.name || 'Worker',
      eventTitle: gig.event?.title || 'Event',
      danzAwarded,
      bonusDanz,
    }
    await sendEmail({
      to: email,
      subject: gigCompletedSubject(emailData),
      html: gigCompletedTemplate(emailData),
    })
  }
}

/**
 * Notify worker when they receive a rating
 */
export async function notifyGigRatingReceived(
  userId: string,
  gig: GigInfo,
  applicationId: string,
  rating: number,
  feedback?: string,
): Promise<void> {
  const prefEnabled = await checkNotificationPreference(userId, 'gig_application_updates')
  if (!prefEnabled) return

  const ratingStars = '⭐'.repeat(Math.round(rating))
  let message = `You received a ${rating}/5 ${ratingStars} rating for "${gig.title}".`
  if (feedback) {
    message += ` Feedback: "${feedback}"`
  }

  await createNotification('gig_rating_received', {
    recipientId: userId,
    eventId: gig.event_id,
    gigId: gig.id,
    applicationId,
    title: 'New Rating Received',
    message,
    actionType: 'open_gig_application',
    actionData: { application_id: applicationId, rating },
  })

  // Send email
  const { email, name } = await getUserEmailInfo(userId)
  if (email) {
    const emailData = {
      userName: name,
      gigTitle: gig.title,
      roleName: gig.role?.name || 'Worker',
      eventTitle: gig.event?.title || 'Event',
      rating,
      feedback,
    }
    await sendEmail({
      to: email,
      subject: gigRatingReceivedSubject(emailData),
      html: gigRatingReceivedTemplate(emailData),
    })
  }
}

// ============================================================================
// GIG OPPORTUNITY NOTIFICATIONS
// ============================================================================

/**
 * Notify users about new gig opportunities matching their roles
 * This is typically called when a new event gig is created
 */
export async function notifyGigOpportunity(
  gig: GigInfo,
  event: EventInfo,
  roleId: string,
): Promise<void> {
  // Find all users with approved role
  const { data: approvedUsers } = await supabase
    .from('user_gig_roles')
    .select('user_id')
    .eq('role_id', roleId)
    .eq('status', 'approved')

  if (!approvedUsers || approvedUsers.length === 0) return

  // Filter users who have gig_opportunities enabled
  const enabledUsers: string[] = []
  for (const user of approvedUsers) {
    const prefEnabled = await checkNotificationPreference(user.user_id, 'gig_opportunities')
    if (prefEnabled) {
      enabledUsers.push(user.user_id)
    }
  }

  if (enabledUsers.length === 0) return

  const roleName = gig.role?.name || 'Worker'
  const location = event.location_name || 'TBD'

  await createBulkNotifications('gig_opportunity', enabledUsers, {
    eventId: event.id,
    gigId: gig.id,
    title: 'New Gig Opportunity!',
    message: `A new ${roleName} gig is available: "${gig.title}" at ${event.title} (${location}). ${gig.danz_reward} $DANZ reward.`,
    actionType: 'open_gig',
    actionData: { gig_id: gig.id, event_id: event.id },
  })
}

// ============================================================================
// GIG REMINDER NOTIFICATIONS
// ============================================================================

/**
 * Notify worker about an upcoming gig they're approved for
 * This would typically be called by a scheduled job
 */
export async function notifyGigReminder(
  userId: string,
  gig: GigInfo,
  applicationId: string,
  hoursUntil: number,
): Promise<void> {
  const prefEnabled = await checkNotificationPreference(userId, 'gig_reminders')
  if (!prefEnabled) return

  const timeMessage = hoursUntil === 24 ? 'tomorrow' : `in ${hoursUntil} hours`
  const eventTitle = gig.event?.title || 'the event'

  await createNotification('gig_reminder', {
    recipientId: userId,
    eventId: gig.event_id,
    gigId: gig.id,
    applicationId,
    title: 'Gig Reminder',
    message: `Reminder: Your "${gig.title}" gig at ${eventTitle} starts ${timeMessage}. Don't forget to check in!`,
    actionType: 'open_gig_application',
    actionData: { application_id: applicationId, gig_id: gig.id },
  })

  // Send email
  const { email, name } = await getUserEmailInfo(userId)
  if (email) {
    const emailData = {
      userName: name,
      gigTitle: gig.title,
      roleName: gig.role?.name || 'Worker',
      eventTitle,
      eventDate: formatEventDate(gig.event?.start_date_time),
      eventLocation: gig.event?.location_name,
      hoursUntil,
    }
    await sendEmail({
      to: email,
      subject: gigReminderSubject(emailData),
      html: gigReminderTemplate(emailData),
    })
  }
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export const gigNotifications = {
  notifyGigRoleApproved,
  notifyGigRoleRejected,
  notifyGigApplicationReceived,
  notifyGigApplicationApproved,
  notifyGigApplicationRejected,
  notifyGigCancelled,
  notifyGigCompleted,
  notifyGigRatingReceived,
  notifyGigOpportunity,
  notifyGigReminder,
}

export default gigNotifications
