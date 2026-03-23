# Event Managers System Design

## Overview
A system that allows event creators to designate other users as co-managers for their events, enabling collaborative event management with role-based permissions.

## Database Schema

### `event_managers` Table
```sql
CREATE TABLE IF NOT EXISTS public.event_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Manager Role & Permissions
  role VARCHAR(50) NOT NULL DEFAULT 'manager', -- 'creator', 'manager', 'moderator'

  -- Granular Permissions
  can_edit_details BOOLEAN DEFAULT TRUE, -- Edit event title, description, location, etc.
  can_manage_registrations BOOLEAN DEFAULT TRUE, -- Approve/decline registrations, check-in users
  can_send_broadcasts BOOLEAN DEFAULT TRUE, -- Send notifications to participants
  can_manage_posts BOOLEAN DEFAULT FALSE, -- Delete inappropriate posts related to event
  can_invite_managers BOOLEAN DEFAULT FALSE, -- Invite other managers
  can_delete_event BOOLEAN DEFAULT FALSE, -- Only creator should have this

  -- Invitation Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'pending', 'active', 'declined', 'removed'
  invited_by VARCHAR(255) REFERENCES public.users(privy_id),
  invited_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX idx_event_managers_event ON public.event_managers(event_id);
CREATE INDEX idx_event_managers_user ON public.event_managers(user_id);
CREATE INDEX idx_event_managers_status ON public.event_managers(status);
```

### Update `events` Table
```sql
-- Add creator_id to explicitly track event creator
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS creator_id VARCHAR(255) REFERENCES public.users(privy_id);

-- Migrate existing data: organizer_id becomes creator_id
UPDATE public.events SET creator_id = organizer_id WHERE creator_id IS NULL;

-- Add index
CREATE INDEX idx_events_creator ON public.events(creator_id);
```

## GraphQL Schema

### Types
```graphql
type EventManager {
  id: ID!
  event: Event!
  user: User!

  role: EventManagerRole!

  # Permissions
  canEditDetails: Boolean!
  canManageRegistrations: Boolean!
  canSendBroadcasts: Boolean!
  canManagePosts: Boolean!
  canInviteManagers: Boolean!
  canDeleteEvent: Boolean!

  # Invitation
  status: EventManagerStatus!
  invitedBy: User
  invitedAt: DateTime
  acceptedAt: DateTime

  createdAt: DateTime!
  updatedAt: DateTime!
}

enum EventManagerRole {
  CREATOR
  MANAGER
  MODERATOR
}

enum EventManagerStatus {
  PENDING
  ACTIVE
  DECLINED
  REMOVED
}

type EventManagerPermissions {
  canEditDetails: Boolean!
  canManageRegistrations: Boolean!
  canSendBroadcasts: Boolean!
  canManagePosts: Boolean!
  canInviteManagers: Boolean!
  canDeleteEvent: Boolean!
  canManageManagers: Boolean! # Combined permission for creator
}
```

### Update Event Type
```graphql
type Event {
  # ... existing fields ...

  # Event Management
  creatorId: String!
  creator: User!
  managers: [EventManager!]!

  # Current user's permissions for this event
  myPermissions: EventManagerPermissions
}
```

### Queries
```graphql
extend type Query {
  # Get managers for an event (creators and managers only)
  eventManagers(eventId: ID!): [EventManager!]!

  # Get events I'm managing
  myManagedEvents(limit: Int, offset: Int): [Event!]!

  # Get events I created
  myCreatedEvents(limit: Int, offset: Int): [Event!]!
}
```

### Mutations
```graphql
extend type Mutation {
  # Invite user to be event manager
  inviteEventManager(input: InviteEventManagerInput!): EventManager!

  # Update manager permissions (creator only)
  updateEventManagerPermissions(managerId: ID!, permissions: EventManagerPermissionsInput!): EventManager!

  # Remove event manager (creator only)
  removeEventManager(managerId: ID!): MutationResponse!

  # Accept manager invitation
  acceptManagerInvitation(managerId: ID!): EventManager!

  # Decline manager invitation
  declineManagerInvitation(managerId: ID!): MutationResponse!

  # Leave as manager (cannot leave if you're the creator)
  leaveEventManager(eventId: ID!): MutationResponse!
}

input InviteEventManagerInput {
  eventId: ID!
  userId: String! # privy_id of user to invite
  role: EventManagerRole = MANAGER

  # Optional custom permissions (defaults to role-based)
  canEditDetails: Boolean
  canManageRegistrations: Boolean
  canSendBroadcasts: Boolean
  canManagePosts: Boolean
  canInviteManagers: Boolean
}

input EventManagerPermissionsInput {
  canEditDetails: Boolean
  canManageRegistrations: Boolean
  canSendBroadcasts: Boolean
  canManagePosts: Boolean
  canInviteManagers: Boolean
}
```

## Manager Roles & Default Permissions

### Creator (Auto-assigned to event creator)
- **All Permissions**: TRUE
- **Cannot be removed**: Creator cannot leave or be removed
- **Special abilities**:
  - Delete event
  - Transfer ownership
  - Manage all managers

### Manager (Main co-manager role)
- `canEditDetails`: TRUE
- `canManageRegistrations`: TRUE
- `canSendBroadcasts`: TRUE
- `canManagePosts`: FALSE
- `canInviteManagers`: FALSE
- `canDeleteEvent`: FALSE

### Moderator (Limited permissions)
- `canEditDetails`: FALSE
- `canManageRegistrations`: TRUE
- `canSendBroadcasts`: FALSE
- `canManagePosts`: TRUE
- `canInviteManagers`: FALSE
- `canDeleteEvent`: FALSE

## Permission Checks

### Backend Resolver Middleware
```typescript
// Check if user has permission to perform action on event
async function checkEventPermission(
  userId: string,
  eventId: string,
  requiredPermission: keyof EventManagerPermissions
): Promise<boolean> {
  // Get user's manager record for this event
  const manager = await supabase
    .from('event_managers')
    .select('*, events!inner(*)')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!manager.data) {
    // Not a manager
    return false
  }

  // Creator has all permissions
  if (manager.data.role === 'creator') {
    return true
  }

  // Check specific permission
  return manager.data[requiredPermission] === true
}
```

### Usage in Resolvers
```typescript
// Example: updateEvent resolver
updateEvent: async (_, { id, input }, context) => {
  const hasPermission = await checkEventPermission(
    context.user.privyId,
    id,
    'can_edit_details'
  )

  if (!hasPermission) {
    throw new GraphQLError('You do not have permission to edit this event')
  }

  // Proceed with update...
}
```

## UI Components

### Event Creation Flow
1. **Create Event Screen**: Add "Invite Co-Managers" step (optional)
   - Search for users by username
   - Select role (Manager/Moderator)
   - Customize permissions
   - Send invitations

2. **Event Created**: Show "Managers" section in event details
   - List all managers
   - Show pending invitations
   - Add more managers button

### Event Details Screen (For Managers)
1. **Managers Tab**: New tab showing:
   - List of all managers with roles
   - Pending invitations
   - Permission breakdown
   - Action buttons (Remove, Edit permissions) - creator only

2. **Permission-Based UI**:
   - Edit button: Only visible if `canEditDetails`
   - Check-in button: Only visible if `canManageRegistrations`
   - Broadcast button: Only visible if `canSendBroadcasts`
   - Invite managers button: Only visible if `canInviteManagers` or creator

### Admin Events Screen
1. **Add "Managers" Column**: Show number of managers for each event
2. **Manager Management**: Click to view/edit managers
3. **Bulk Operations**: Invite managers to multiple events

### My Events Tabs
1. **Created by Me**: Events where I'm the creator
2. **Managing**: Events where I'm a manager but not creator
3. Combined view with role badges

### Manager Invitations
1. **Notification**: "You've been invited to manage [Event Name]"
2. **Invitation Screen**:
   - Event details
   - Role and permissions
   - Accept/Decline buttons
3. **In-app notifications**: Show pending invitations

## Mobile Screens

### New Screens
1. **`ManageEventManagersScreen.tsx`**:
   - List of managers
   - Invite new managers
   - Edit permissions
   - Remove managers

2. **`ManagerInvitationScreen.tsx`**:
   - View invitation details
   - Accept/Decline invitation
   - See role and permissions

3. **`SelectEventManagerScreen.tsx`**:
   - Search users
   - Select role
   - Customize permissions
   - Send invitation

### Updated Screens
1. **`CreateEventScreen.tsx`**:
   - Add optional "Invite Managers" step
   - Or "Skip for now" and add later

2. **`EventDetailsScreen.tsx`**:
   - Add "Managers" tab
   - Show manager badges
   - Permission-based action buttons

3. **`OrganizerEventsScreen.tsx`**:
   - Split into "Created by Me" and "Managing" tabs
   - Show role badges on event cards

## Implementation Phases

### Phase 1: Database & Backend (MVP)
1. Create `event_managers` table
2. Update events table with `creator_id`
3. Implement GraphQL schema
4. Implement permission checks
5. Add manager-related resolvers

### Phase 2: Admin Panel (Web)
1. Manager management in event details
2. Invite managers UI
3. Permission editing
4. Manager list view

### Phase 3: Mobile App
1. Manager invitation flow
2. Accept/decline invitations
3. View event managers
4. Invite managers from mobile

### Phase 4: Advanced Features
1. Manager activity logs
2. Manager analytics (who checks in most users, etc.)
3. Manager templates (save permission sets)
4. Transfer event ownership

## Migration Notes

### Data Migration
```sql
-- Create event_managers entries for all existing event creators
INSERT INTO public.event_managers (event_id, user_id, role, status, can_edit_details, can_manage_registrations, can_send_broadcasts, can_manage_posts, can_invite_managers, can_delete_event)
SELECT
  id as event_id,
  creator_id as user_id,
  'creator' as role,
  'active' as status,
  true, true, true, true, true, true
FROM public.events
WHERE creator_id IS NOT NULL;
```

### Backwards Compatibility
- Keep `organizer_id` column for now (mark as deprecated)
- Use `creator_id` going forward
- Update all queries to use `creator_id`
- Remove `organizer_id` in future version
