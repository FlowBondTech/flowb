# Notification System Design

## Overview
A comprehensive notification system for DANZ that supports admin broadcasts, event manager announcements, and user-to-user interactions.

## Database Schema

### `notifications` Table
```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Notification Type & Content
  type VARCHAR(50) NOT NULL, -- 'admin_broadcast', 'event_manager_broadcast', 'event_update', 'dance_bond', 'post_like', 'post_comment', 'achievement'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Sender Information
  sender_id VARCHAR(255), -- privy_id of sender (null for system notifications)
  sender_type VARCHAR(50), -- 'admin', 'event_manager', 'user', 'system'

  -- Recipient Information
  recipient_id VARCHAR(255) NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Related Entities
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  achievement_id UUID,
  bond_id UUID REFERENCES public.dance_bonds(id) ON DELETE CASCADE,

  -- Notification State
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Broadcast Information (for admin/manager broadcasts)
  is_broadcast BOOLEAN DEFAULT FALSE,
  broadcast_target VARCHAR(50), -- 'all_users', 'event_participants', 'organizers', 'dancers'

  -- Action/Deep Link
  action_type VARCHAR(50), -- 'open_event', 'open_post', 'open_profile', 'open_achievement'
  action_data JSONB, -- Additional data for the action

  -- Push Notification Status
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration for broadcasts
);

-- Indexes for performance
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_read ON public.notifications(read, recipient_id);
CREATE INDEX idx_notifications_event ON public.notifications(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_notifications_broadcast ON public.notifications(is_broadcast, broadcast_target) WHERE is_broadcast = TRUE;
```

### `notification_preferences` Table
```sql
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Notification Type Preferences
  admin_broadcasts BOOLEAN DEFAULT TRUE,
  event_manager_broadcasts BOOLEAN DEFAULT TRUE,
  event_updates BOOLEAN DEFAULT TRUE,
  dance_bonds BOOLEAN DEFAULT TRUE,
  post_interactions BOOLEAN DEFAULT TRUE,
  achievements BOOLEAN DEFAULT TRUE,

  -- Delivery Method Preferences
  push_notifications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,

  -- Quiet Hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);
```

## GraphQL Schema

### Types
```graphql
type Notification {
  id: ID!
  type: NotificationType!
  title: String!
  message: String!

  sender: User
  senderType: String

  recipientId: String!

  # Related entities
  event: Event
  post: Post
  achievementId: ID
  bond: DanceBond

  # State
  read: Boolean!
  readAt: DateTime

  # Broadcast info
  isBroadcast: Boolean!
  broadcastTarget: String

  # Action
  actionType: String
  actionData: JSONObject

  # Push status
  pushSent: Boolean!
  pushSentAt: DateTime

  createdAt: DateTime!
  expiresAt: DateTime
}

enum NotificationType {
  ADMIN_BROADCAST
  EVENT_MANAGER_BROADCAST
  EVENT_UPDATE
  DANCE_BOND
  POST_LIKE
  POST_COMMENT
  ACHIEVEMENT
}

type NotificationPreferences {
  id: ID!
  userId: String!

  adminBroadcasts: Boolean!
  eventManagerBroadcasts: Boolean!
  eventUpdates: Boolean!
  danceBonds: Boolean!
  postInteractions: Boolean!
  achievements: Boolean!

  pushNotifications: Boolean!
  emailNotifications: Boolean!

  quietHoursEnabled: Boolean!
  quietHoursStart: String
  quietHoursEnd: String

  createdAt: DateTime!
  updatedAt: DateTime!
}

type NotificationConnection {
  notifications: [Notification!]!
  unreadCount: Int!
  hasMore: Boolean!
  cursor: String
}
```

### Queries
```graphql
extend type Query {
  # Get user notifications
  myNotifications(limit: Int = 20, cursor: String, unreadOnly: Boolean): NotificationConnection!

  # Get notification preferences
  myNotificationPreferences: NotificationPreferences!

  # Get unread count
  unreadNotificationCount: Int!
}
```

### Mutations
```graphql
extend type Mutation {
  # Admin: Send broadcast to all users or specific groups
  sendAdminBroadcast(input: BroadcastInput!): BroadcastResult!

  # Event Manager: Send broadcast to event participants
  sendEventBroadcast(eventId: ID!, input: EventBroadcastInput!): BroadcastResult!

  # Mark notification as read
  markNotificationRead(notificationId: ID!): Notification!

  # Mark all notifications as read
  markAllNotificationsRead: MutationResponse!

  # Delete notification
  deleteNotification(notificationId: ID!): MutationResponse!

  # Update notification preferences
  updateNotificationPreferences(input: NotificationPreferencesInput!): NotificationPreferences!
}

input BroadcastInput {
  title: String!
  message: String!
  target: BroadcastTarget! # 'all_users', 'organizers', 'dancers'
  actionType: String # Optional deep link action
  actionData: JSONObject
  expiresAt: DateTime # Optional expiration
}

input EventBroadcastInput {
  title: String!
  message: String!
  target: EventBroadcastTarget! # 'all_participants', 'registered_only', 'checked_in_only'
  actionType: String
  actionData: JSONObject
}

enum BroadcastTarget {
  ALL_USERS
  ORGANIZERS
  DANCERS
}

enum EventBroadcastTarget {
  ALL_PARTICIPANTS
  REGISTERED_ONLY
  CHECKED_IN_ONLY
}

type BroadcastResult {
  success: Boolean!
  message: String!
  notificationsSent: Int!
}

input NotificationPreferencesInput {
  adminBroadcasts: Boolean
  eventManagerBroadcasts: Boolean
  eventUpdates: Boolean
  danceBonds: Boolean
  postInteractions: Boolean
  achievements: Boolean
  pushNotifications: Boolean
  emailNotifications: Boolean
  quietHoursEnabled: Boolean
  quietHoursStart: String
  quietHoursEnd: String
}
```

## Notification Types & Triggers

### Admin Broadcasts
- **Trigger**: Admin manually sends broadcast from admin panel
- **Recipients**: All users, organizers, or dancers (based on target)
- **Example**: "New feature announcement: Freestyle mode is now live!"

### Event Manager Broadcasts
- **Trigger**: Event manager sends announcement to event participants
- **Recipients**: Event registrants (all, registered only, or checked-in only)
- **Example**: "Event location changed to Studio B!"

### Event Updates
- **Trigger**: Event details changed, event published, event canceled
- **Recipients**: Users registered for the event
- **Example**: "The Hip-Hop Workshop has been updated"

### Dance Bonds
- **Trigger**: New dance bond created, dance bond level up
- **Recipients**: Both users in the bond
- **Example**: "You've created a dance bond with @DanceQueen92!"

### Post Interactions
- **Trigger**: Post liked, post commented on
- **Recipients**: Post author
- **Example**: "@FlowMaster liked your post"

### Achievements
- **Trigger**: Achievement unlocked
- **Recipients**: User who earned achievement
- **Example**: "Achievement unlocked: First Dance!"

## Implementation Notes

### Backend Resolvers
1. Create `notificationResolvers.ts` with all mutations and queries
2. Implement broadcast logic with user filtering
3. Add notification creation helpers for each trigger type
4. Integrate with existing resolvers (posts, events, bonds)

### Push Notifications
- Use Expo push notification service
- Store push tokens in users table
- Send push notifications asynchronously (background job)
- Respect user notification preferences and quiet hours

### Real-time Updates (Future)
- Consider GraphQL subscriptions for real-time notifications
- Or implement polling with `myNotifications` query

### Admin Panel
- Add notification broadcast UI in web admin
- Show delivery stats (sent, delivered, read)
- Allow scheduling broadcasts for future delivery

### Event Manager Panel
- Add broadcast button in event details screen
- Show participant count and filtering options
- Preview notification before sending

## UI Components

### Mobile
- `NotificationScreen.tsx` - List of notifications
- `NotificationSettingsScreen.tsx` - Preferences UI (already exists)
- `NotificationBadge` - Unread count badge
- Push notification handlers

### Web
- `AdminBroadcastPanel` - Admin broadcast interface
- `EventBroadcastPanel` - Event manager broadcast interface
- Notification bell with dropdown
