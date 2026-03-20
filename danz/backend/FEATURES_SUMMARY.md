# DANZ New Features Summary

## Completed Features

### 1. Social Feed Integration ✅
- **Web**: Full social feed with real-time updates
- **Mobile**: Feed screen with GraphQL integration
- **Backend**: Complete GraphQL API for posts, likes, comments

### 2. Profile Validation ✅
- **Fix**: Prevents spaces in social media handles (Instagram, TikTok, Twitter, YouTube)
- **Impact**: Ensures valid social media URLs

### 3. Authentication Flow Fix ✅
- **Fix**: Users now see login screen before onboarding
- **Issue Resolved**: Cached Privy sessions no longer skip login
- **Flow**: Splash → Login → Onboarding → Main App

## Designed Features (Ready for Implementation)

### 4. Notification System 🎯
**See**: `NOTIFICATIONS_DESIGN.md`

**Key Features**:
- Admin broadcasts to all users or specific groups (organizers, dancers)
- Event manager broadcasts to event participants
- Automated notifications for:
  - Event updates
  - Dance bonds
  - Post interactions (likes, comments)
  - Achievements
- User preferences for notification types
- Push notifications via Expo
- Quiet hours support

**Database Tables**:
- `notifications` - Stores all notifications
- `notification_preferences` - User notification settings

**Admin Capabilities**:
- Send broadcasts from admin panel
- Target specific user groups
- Schedule notifications
- View delivery stats

**Event Manager Capabilities**:
- Send announcements to event participants
- Filter by registration status (all, registered, checked-in)

### 5. Event Managers System 🎯
**See**: `EVENT_MANAGERS_DESIGN.md`

**Key Features**:
- Invite users as co-managers for events
- Role-based permissions:
  - **Creator**: Full control (cannot be removed)
  - **Manager**: Edit details, manage registrations, send broadcasts
  - **Moderator**: Limited permissions (registrations, moderation)
- Granular permission control:
  - Edit event details
  - Manage registrations
  - Send broadcasts
  - Manage posts
  - Invite other managers
  - Delete event (creator only)
- Manager invitations with accept/decline flow
- View all events I'm managing
- View all events I created

**Database Tables**:
- `event_managers` - Stores manager assignments and permissions
- Update `events` table with `creator_id` field

**UI Enhancements**:
- "Invite Co-Managers" step in event creation
- "Managers" tab in event details
- Manager badges on event cards
- Permission-based UI (buttons show based on permissions)
- "My Events" split into "Created by Me" and "Managing"

### 6. My Events Features 🎯
**Integrated with Event Managers System**

**Dashboard Tab**:
- "My Events" section showing:
  - Events I created (with creator badge)
  - Events I'm managing (with manager badge)
  - Quick stats (total events, upcoming, participants)

**Events Screen**:
- Add "My Events" filter/tab
- Show role badges (Creator, Manager, Moderator)
- Quick actions based on permissions
- Separate views for created vs. managing

## Implementation Priority

### Phase 1: Event Managers (High Priority)
1. Database schema creation
2. Backend GraphQL API
3. Permission system implementation
4. Admin panel for manager management
5. Mobile UI for invitations and management

### Phase 2: Notifications (High Priority)
1. Database schema creation
2. Backend GraphQL API
3. Admin broadcast panel
4. Event manager broadcast UI
5. Push notification integration
6. User notification preferences UI

### Phase 3: My Events (Medium Priority)
1. Dashboard "My Events" section
2. Events screen filters
3. Role badges and visual indicators

### Phase 4: Polish & Advanced Features
1. Manager activity logs
2. Notification analytics
3. Scheduled broadcasts
4. Email notifications
5. Manager templates

## Testing Plan

### For Expo Go Testing (iOS)
1. **Test Authentication Flow**:
   - Fresh install → Should show login
   - Login → Should show onboarding
   - Complete profile → Should show main app
   - Close and reopen → Should not skip login

2. **Test Social Feed**:
   - View feed posts from backend
   - Pull to refresh
   - Handle empty state
   - Handle errors with retry

3. **Test Profile Validation**:
   - Try entering spaces in social handles
   - Verify spaces are automatically removed
   - Verify URLs are correct

4. **Test Event Creation** (After implementation):
   - Create event as organizer
   - Invite co-managers
   - Accept manager invitation
   - View event with manager badge

5. **Test Notifications** (After implementation):
   - Receive admin broadcast
   - Receive event update
   - Mark as read
   - Test quiet hours
   - Test preferences

## Architecture Notes

### Backend Stack
- Node.js + Apollo Server 4
- PostgreSQL (Supabase)
- GraphQL API
- Service role access for admin operations

### Mobile Stack
- React Native (Expo SDK 53)
- Apollo Client
- Privy authentication
- Expo push notifications

### Web Stack
- Next.js 15 (App Router)
- Apollo Client
- Privy authentication
- Admin panel with advanced features

## Next Steps

1. ✅ Design complete
2. ⏭️ Implement database schemas (migrations)
3. ⏭️ Implement backend GraphQL resolvers
4. ⏭️ Build admin UI for management
5. ⏭️ Build mobile UI for users
6. ⏭️ Test in Expo Go on iOS
7. ⏭️ Deploy to production

## Questions for Discussion

1. Should we implement notifications or event managers first?
2. Do we need email notifications or just push?
3. Should managers be able to invite other managers?
4. What should happen when event creator is deleted?
5. Should we support recurring broadcasts?
