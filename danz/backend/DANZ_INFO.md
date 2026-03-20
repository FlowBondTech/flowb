# DANZ Platform Information

## App Domains & URLs

### Primary Domain
- **Production App**: https://danz.now
- **Web Dashboard**: https://danz.now/dashboard

### App Routes

#### Public Routes
- **Homepage**: `/`
- **Referral/Invite**: `/i/{referral_code}` (e.g., https://danz.now/i/koh)

#### Dashboard Routes (Authenticated)
- **Dashboard Home**: `/dashboard`
- **Profile**: `/dashboard/profile`
- **Settings**: `/dashboard/settings`
- **Referrals**: `/dashboard/referrals`
- **Events**: `/dashboard/events`

## API Endpoints

### GraphQL API
- **Development**: http://localhost:4000/graphql
- **Production**: TBD

## Database

### Supabase
- **Project**: eoajujwpdkfuicnoxetk
- **Region**: ap-southeast-1
- **Dashboard**: https://supabase.com/dashboard/project/eoajujwpdkfuicnoxetk

## Key Features

### Referral System
- Each user gets a unique referral code (same as username)
- Share URL format: `https://danz.now/i/{username}`
- Tracking: clicks, sign-ups, completed profiles
- Rewards: Points system for successful referrals

### Event Management
- Role-based permissions (creator, manager, moderator)
- Event registration and check-ins
- Broadcast notifications to participants

### Notification System
- Admin broadcasts
- Event manager broadcasts
- Event updates
- Dance bonds
- Post interactions (likes, comments)
- Achievements

### Social Feed
- Posts with media (images/videos)
- Likes and comments
- Dance bonds (user connections)
- Event-related posts

## User Roles

### Regular Users
- Create and attend events
- Post to social feed
- Connect with other dancers
- Refer new users

### Event Managers
- Edit event details
- Manage registrations
- Send broadcasts to participants
- Moderate event posts

### Event Creators
- All manager permissions
- Invite other managers
- Delete events

### Admins
- Platform-wide broadcasts
- User management
- System configuration

## Mobile App

### Expo Configuration
- **SDK**: 54.0.0-canary
- **Platform**: iOS & Android
- **Auth**: Privy (Web3)

### Deep Links
- **Scheme**: `danz://`
- **Referral**: `danz://i/{referral_code}`

## Development

### Backend
- **Port**: 4000
- **Framework**: Express + Apollo Server 4
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)

### Web Frontend
- **Port**: 3000
- **Framework**: Next.js 15
- **Package Manager**: Bun (NOT npm)
- **Language**: TypeScript

### Mobile Frontend
- **Framework**: React Native (Expo)
- **Package Manager**: npm with --legacy-peer-deps
- **Language**: TypeScript

## Important Notes

- Always use `bun` for web frontend package management
- Use `npm install --legacy-peer-deps` for mobile app
- Referral route is `/i/` not `/r/`
- Domain is `danz.now` not `danz.app`
