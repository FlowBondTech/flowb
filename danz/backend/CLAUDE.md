# DANZ Backend - Claude Code Instructions

> Last updated: 2025-12-24

## Project Overview
DANZ Backend is a GraphQL API server built with Apollo Server and Express, providing the backend services for the DANZ platform.

## Tech Stack
- **Runtime**: Node.js with Bun package manager
- **Framework**: Express + Apollo Server 4
- **Language**: TypeScript
- **API**: GraphQL
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Privy (Web3 auth)
- **Code Quality**: Biome

## Project Structure
```
danz-backend/
├── src/
│   ├── server.ts          # Main server entry point
│   ├── app.ts            # Express app setup
│   ├── config/           # Configuration files
│   │   ├── env.ts        # Environment variables
│   │   ├── privy.ts      # Privy auth config
│   │   └── supabase.ts   # Supabase client
│   ├── graphql/          # GraphQL implementation
│   │   ├── schema/       # Type definitions
│   │   │   ├── index.ts  # Combined schema
│   │   │   ├── user.ts   # User types
│   │   │   ├── event.ts  # Event types
│   │   │   └── upload.ts # Upload types
│   │   └── resolvers/    # Resolver functions
│   │       ├── index.ts  # Combined resolvers
│   │       ├── user.ts   # User resolvers
│   │       ├── event.ts  # Event resolvers
│   │       └── upload.ts # Upload resolvers
│   ├── utils/            # Utility functions
│   │   └── logger.ts     # Logging utility
│   └── types/            # TypeScript types
├── migrations/           # Database migrations
├── database-schema.sql   # Complete DB schema
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── biome.json
└── nodemon.json
```

## Key Libraries
### Core
- `express`: v5 - Web framework
- `@apollo/server`: v4 - GraphQL server
- `graphql`: GraphQL implementation
- `typescript`: Type safety

### Database & Storage
- `@supabase/supabase-js`: Database client
- `aws-sdk`: S3 file storage

### Authentication & Security
- `@privy-io/server-auth`: Privy authentication
- `helmet`: Security headers
- `cors`: CORS handling
- `compression`: Response compression

### Development
- `nodemon`: Hot reloading
- `@biomejs/biome`: Code quality
- `dotenv`: Environment variables
- `morgan`: HTTP logging

## GraphQL Schema

### Important: Schema Management
When making schema changes:
1. **Update Backend Schema**: Modify files in `src/graphql/schema/`
2. **Update Frontend Clients**:
   - Copy relevant schema changes to `danz-app/src/graphql/`
   - Copy relevant schema changes to `danz-web/src/graphql/`
3. **Run Codegen in Frontends**:
   ```bash
   # In danz-app
   cd ../danz-app && npm run codegen

   # In danz-web
   cd ../danz-web && bun run codegen
   ```

### Schema Organization
- User types: `src/graphql/schema/user.ts`
- Event types: `src/graphql/schema/event.ts`
- Upload types: `src/graphql/schema/upload.ts`
- Combined schema: `src/graphql/schema/index.ts`

### Resolver Pattern
```typescript
// src/graphql/resolvers/user.ts
export const userResolvers = {
  Query: {
    me: async (_, __, context) => {
      // Implementation
    }
  },
  Mutation: {
    updateProfile: async (_, { input }, context) => {
      // Implementation
    }
  }
}
```

## Database Schema

### Key Tables
- `users` - User profiles (privy_id as primary key)
- `events` - Dance events
- `event_registrations` - Event participants
- `feed_posts` - Social feed
- `achievements` - User achievements
- `dance_bonds` - Established user connections
- `bond_requests` - Pending bond requests between users
- `user_privacy_settings` - User privacy preferences
- `user_suggestions` - Suggested connections based on similarity
- `notifications` - Push notifications

### Migration Management
All migrations in `migrations/` directory:
```sql
-- migrations/XXX_description.sql
-- Migration: Brief description
-- Date: YYYY-MM-DD
-- Description: Detailed explanation

ALTER TABLE public.users ...
```

## Development Commands
```bash
# Install dependencies
pnpm install

# Development
pnpm run dev            # Start with nodemon
pnpm run start          # Production start

# Database
# Run migrations manually in Supabase SQL editor

# Code quality
pnpm run lint           # Run Biome linter
pnpm run format         # Format code
pnpm run check          # Check and fix issues

# Build
pnpm run build          # TypeScript build
```

## Authentication Flow
1. Client sends Privy JWT in Authorization header
2. Middleware verifies token with Privy
3. User context available in resolvers:
   ```typescript
   context.user = {
     privyId: string,
     email?: string,
     wallet?: string
   }
   ```

## Environment Variables
Required in `.env`:
```bash
PORT=8080
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket

# Discord Webhooks (optional - for platform notifications)
DISCORD_WEBHOOK_URL=your_default_webhook_url
DISCORD_WEBHOOK_ALERTS=your_alerts_channel_webhook
DISCORD_WEBHOOK_EVENTS=your_events_channel_webhook
DISCORD_WEBHOOK_USERS=your_users_channel_webhook
DISCORD_WEBHOOK_PAYMENTS=your_payments_channel_webhook
```

## API Patterns

### GraphQL Context
```typescript
interface Context {
  user?: {
    privyId: string
    email?: string
    wallet?: string
  }
}
```

### Error Handling
```typescript
throw new GraphQLError('Error message', {
  extensions: {
    code: 'UNAUTHENTICATED',
  },
})
```

### Database Queries
```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('privy_id', privyId)
  .single()
```

## Important Conventions

### GraphQL Best Practices
1. Keep resolvers thin - business logic in services
2. Use DataLoader for N+1 query prevention
3. Implement proper error handling
4. Add field-level authorization where needed
5. Use transactions for related operations

### Security
- Always validate input data
- Use parameterized queries
- Implement rate limiting
- Sanitize file uploads
- Never log sensitive data

### Performance
- Use database indexes
- Implement caching where appropriate
- Optimize GraphQL queries
- Use pagination for lists
- Implement field selection

## Git Push Rules
**IMPORTANT**: Always push to BOTH remotes to keep repos in sync:
```bash
git push origin main && git push flowbond main
```
- `origin` → cryptokoh/danz-backend-experimental
- `flowbond` → FlowBondTech/danz-backend

## DO NOT
- Expose internal errors to clients
- Log sensitive information
- Use raw SQL without parameterization
- Skip input validation
- Ignore TypeScript errors
- Leave console.log in production
- Push to only one remote (always push to both origin AND flowbond)