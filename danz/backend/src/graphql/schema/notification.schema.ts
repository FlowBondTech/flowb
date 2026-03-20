import { gql } from 'graphql-tag'

export const notificationTypeDefs = gql`
  # ========================================
  # NOTIFICATION TYPES
  # ========================================

  type Notification {
    id: ID!
    type: NotificationType!
    title: String!
    message: String!

    # Sender
    sender_id: String
    sender_type: SenderType
    sender: User

    # Recipient
    recipient_id: String!
    recipient: User

    # Related entities
    event_id: ID
    post_id: ID
    achievement_id: ID
    bond_id: ID
    gig_id: ID
    gig_application_id: ID
    event: Event
    gig: EventGig
    gigApplication: GigApplication

    # State
    read: Boolean!
    read_at: DateTime

    # Broadcast info
    is_broadcast: Boolean!
    broadcast_target: BroadcastTarget

    # Action/Deep Link
    action_type: ActionType
    action_data: JSON

    # Push status
    push_sent: Boolean!
    push_sent_at: DateTime

    # Metadata
    created_at: DateTime!
    expires_at: DateTime
  }

  type NotificationPreferences {
    id: ID!
    user_id: String!

    # Type preferences
    admin_broadcasts: Boolean!
    event_manager_broadcasts: Boolean!
    event_updates: Boolean!
    dance_bonds: Boolean!
    post_interactions: Boolean!
    achievements: Boolean!
    # Gig notification preferences
    gig_role_updates: Boolean!
    gig_application_updates: Boolean!
    gig_opportunities: Boolean!
    gig_reminders: Boolean!

    # Delivery preferences
    push_notifications: Boolean!
    email_notifications: Boolean!

    # Quiet hours
    quiet_hours_enabled: Boolean!
    quiet_hours_start: String
    quiet_hours_end: String

    created_at: DateTime!
    updated_at: DateTime!
  }

  type NotificationConnection {
    notifications: [Notification!]!
    total_count: Int!
    unread_count: Int!
    has_more: Boolean!
  }

  # ========================================
  # ENUMS
  # ========================================

  enum NotificationType {
    admin_broadcast
    event_manager_broadcast
    event_update
    event_reminder
    dance_bond
    post_like
    post_comment
    achievement
    referral
    system
    # Gig-related notification types
    gig_role_approved
    gig_role_rejected
    gig_application_received
    gig_application_approved
    gig_application_rejected
    gig_reminder
    gig_cancelled
    gig_completed
    gig_payment
    gig_rating_received
    gig_opportunity
  }

  enum SenderType {
    admin
    event_manager
    user
    system
  }

  enum BroadcastTarget {
    all_users
    event_participants
    organizers
    dancers
  }

  enum ActionType {
    onboarding
    open_event
    open_post
    open_profile
    open_achievement
    open_settings
    open_bond
    open_notifications
    # Gig-related action types
    open_gig
    open_gig_application
    open_gig_dashboard
    open_gig_manager_dashboard
    open_gig_roles
  }

  # ========================================
  # INPUTS
  # ========================================

  input CreateNotificationInput {
    type: NotificationType!
    title: String!
    message: String!
    recipient_id: String!
    event_id: ID
    post_id: ID
    gig_id: ID
    gig_application_id: ID
    action_type: ActionType
    action_data: JSON
  }

  input SendBroadcastInput {
    title: String!
    message: String!
    broadcast_target: BroadcastTarget!
    event_id: ID
    action_type: ActionType
    action_data: JSON
    expires_at: DateTime
  }

  input SendEventBroadcastInput {
    event_id: ID!
    title: String!
    message: String!
    action_type: ActionType
    action_data: JSON
  }

  input UpdateNotificationPreferencesInput {
    admin_broadcasts: Boolean
    event_manager_broadcasts: Boolean
    event_updates: Boolean
    dance_bonds: Boolean
    post_interactions: Boolean
    achievements: Boolean
    # Gig notification preferences
    gig_role_updates: Boolean
    gig_application_updates: Boolean
    gig_opportunities: Boolean
    gig_reminders: Boolean
    # Delivery preferences
    push_notifications: Boolean
    email_notifications: Boolean
    quiet_hours_enabled: Boolean
    quiet_hours_start: String
    quiet_hours_end: String
  }

  # ========================================
  # QUERIES
  # ========================================

  extend type Query {
    # Get current user's notifications
    myNotifications(
      limit: Int = 20
      offset: Int = 0
      unread_only: Boolean = false
      type: NotificationType
    ): NotificationConnection!

    # Get notification by ID
    notification(id: ID!): Notification

    # Get current user's notification preferences
    myNotificationPreferences: NotificationPreferences!

    # Get unread notification count
    unreadNotificationCount: Int!
  }

  # ========================================
  # MUTATIONS
  # ========================================

  extend type Mutation {
    # Mark notification as read
    markNotificationRead(id: ID!): Notification!

    # Mark all notifications as read
    markAllNotificationsRead: MutationResponse!

    # Delete a notification
    deleteNotification(id: ID!): MutationResponse!

    # Update notification preferences
    updateNotificationPreferences(
      input: UpdateNotificationPreferencesInput!
    ): NotificationPreferences!

    # Admin: Send broadcast to all users or specific group
    sendAdminBroadcast(input: SendBroadcastInput!): MutationResponse!

    # Event Manager: Send broadcast to event participants
    sendEventBroadcast(input: SendEventBroadcastInput!): MutationResponse!

    # System: Create notification (internal use)
    createNotification(input: CreateNotificationInput!): Notification!
  }
`
