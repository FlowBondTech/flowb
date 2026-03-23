# Development Workflows

Common development workflows for the DANZ platform.

## GraphQL Workflow

### Adding a New Query

1. **Define the query** in `src/graphql/queries/`:

```graphql
# src/graphql/queries/events.gql
query GetUpcomingEvents($limit: Int) {
  events(filters: { startDate: $today }, limit: $limit) {
    id
    title
    startDateTime
    locationName
  }
}
```

2. **Run code generation**:

```bash
bun run codegen
```

3. **Use the generated hook**:

```typescript
import { useGetUpcomingEventsQuery } from '@/generated/graphql'

function UpcomingEvents() {
  const { data, loading } = useGetUpcomingEventsQuery({
    variables: { limit: 5 },
  })

  // Use data...
}
```

### Adding a New Mutation

1. **Define in backend schema** (`src/graphql/schema/*.ts`)

2. **Implement resolver** (`src/graphql/resolvers/*.ts`)

3. **Add frontend mutation** (`src/graphql/mutations/*.gql`)

4. **Run codegen in frontend**

5. **Use generated hook**

## Feature Development

### Standard Workflow

```bash
# 1. Create feature branch
git checkout -b feature/event-registration

# 2. Make changes
# ... code ...

# 3. Run linter
bun run lint

# 4. Run codegen if schema changed
bun run codegen

# 5. Test locally
bun run dev

# 6. Commit
git add .
git commit -m "feat(events): add registration flow"

# 7. Push to both remotes
git push origin feature/event-registration
git push cryptokoh feature/event-registration

# 8. Create PR
```

## Database Changes

### Adding a New Table

1. **Write migration SQL**:

```sql
-- migrations/003_add_comments.sql
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
```

2. **Run in Supabase SQL Editor**

3. **Update GraphQL schema**

4. **Update resolvers**

5. **Run codegen in frontends**

### Modifying Existing Table

1. **Write ALTER migration**:

```sql
-- migrations/004_add_user_verified.sql
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
CREATE INDEX idx_users_verified ON users(is_verified) WHERE is_verified = true;
```

2. **Run migration**

3. **Update GraphQL types**

4. **Update affected components**

## Component Development

### Creating a New Component

1. **Create component file**:

```typescript
// src/components/events/EventCard.tsx
interface EventCardProps {
  event: Event
  onRegister?: () => void
}

export function EventCard({ event, onRegister }: EventCardProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="text-lg font-bold">{event.title}</h3>
      <p className="text-gray-600">{event.locationName}</p>
      {onRegister && (
        <button onClick={onRegister} className="btn-primary mt-4">
          Register
        </button>
      )}
    </div>
  )
}
```

2. **Export from index** (if using barrel exports):

```typescript
// src/components/events/index.ts
export { EventCard } from './EventCard'
```

3. **Use in pages**:

```typescript
import { EventCard } from '@/components/events'
```

## Testing Workflow

### Manual Testing Checklist

- [ ] Feature works on desktop
- [ ] Feature works on mobile
- [ ] Loading states display correctly
- [ ] Error states handled
- [ ] Edge cases tested
- [ ] No console errors

### Testing with Different Users

1. **Test as new user** (onboarding flow)
2. **Test as existing user** (main flows)
3. **Test as organizer** (event management)
4. **Test as admin** (admin features)

## Deployment Workflow

### Backend Deployment

```bash
cd danz-backend-experimental

# Ensure clean build
pnpm run build

# Deploy to Fly.io
fly deploy

# Verify deployment
fly status
fly logs
```

### Frontend Deployment

Netlify auto-deploys on push to `main`. For manual:

```bash
cd danz-web

# Build
bun run build

# Deploy
netlify deploy --prod
```

## Debugging

### Backend Debugging

```typescript
// Add logging
import { logger } from '@/utils/logger'

logger.info('Processing event registration', {
  eventId,
  userId: context.user?.privyId,
})
```

### Frontend Debugging

```typescript
// Use React DevTools
// Use Apollo DevTools for GraphQL

// Console logging (remove before commit)
console.log('Debug:', { data, loading, error })
```

### GraphQL Debugging

Access Apollo Studio at `http://localhost:8080/graphql`:

1. Write query in Explorer
2. Check variables
3. Inspect response
4. View errors

## Code Review Checklist

### Before Requesting Review

- [ ] Code follows conventions
- [ ] No TypeScript errors
- [ ] Linter passes
- [ ] Tested locally
- [ ] Commit messages are clear
- [ ] No console.logs

### Reviewer Checklist

- [ ] Logic is correct
- [ ] Edge cases handled
- [ ] Performance considered
- [ ] Security reviewed
- [ ] Code is readable

## Hotfix Workflow

For urgent production fixes:

```bash
# 1. Create hotfix branch from main
git checkout main
git pull
git checkout -b hotfix/fix-auth-crash

# 2. Make minimal fix
# ... code ...

# 3. Test thoroughly

# 4. Commit and push
git commit -m "fix(auth): handle null user in context"
git push origin hotfix/fix-auth-crash
git push cryptokoh hotfix/fix-auth-crash

# 5. Create PR with "HOTFIX" label

# 6. After merge, deploy immediately
```

## Next Steps

- [Architecture](/architecture/overview) - System design
- [API Reference](/api/graphql) - GraphQL documentation
- [Deployment](/deployment/infrastructure) - Deploy guide
