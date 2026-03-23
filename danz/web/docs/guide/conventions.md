# Code Conventions

Coding standards and conventions for the DANZ platform.

## General Principles

1. **Consistency** - Follow existing patterns in the codebase
2. **Readability** - Code should be self-documenting
3. **Simplicity** - Prefer simple solutions over complex ones
4. **Type Safety** - Use TypeScript types everywhere

## TypeScript

### Interfaces Over Types

```typescript
// Preferred
interface User {
  id: string
  name: string
  email: string
}

// Avoid (unless union types needed)
type User = {
  id: string
  name: string
  email: string
}
```

### Explicit Return Types

```typescript
// Good
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Avoid
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

### Null Handling

```typescript
// Use optional chaining
const name = user?.profile?.displayName

// Use nullish coalescing
const username = user.username ?? 'Anonymous'
```

## React Components

### Function Components

```typescript
// Good - Named export with explicit props
interface ProfileCardProps {
  user: User
  onEdit?: () => void
}

export function ProfileCard({ user, onEdit }: ProfileCardProps) {
  return (
    <div className="profile-card">
      <h2>{user.name}</h2>
      {onEdit && <button onClick={onEdit}>Edit</button>}
    </div>
  )
}
```

### Hooks

```typescript
// Custom hook naming
function useUserProfile(userId: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false))
  }, [userId])

  return { user, loading }
}
```

### Component Size

- Keep components under **150 lines**
- Extract sub-components when needed
- One component per file

## GraphQL

### Query Naming

```graphql
# Queries: GetXxx
query GetMyProfile {
  me { ... }
}

query GetEvents($filters: EventFilters) {
  events(filters: $filters) { ... }
}

# Mutations: ActionVerb + Noun
mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) { ... }
}

mutation RegisterForEvent($eventId: ID!) {
  registerForEvent(eventId: $eventId) { ... }
}
```

### Generated Hooks

```typescript
// Always use generated hooks
import {
  useGetMyProfileQuery,
  useUpdateProfileMutation,
} from '@/generated/graphql'

// Not raw Apollo hooks
import { useQuery } from '@apollo/client'
```

## Styling

### Tailwind Classes

```tsx
// Organize by category
<div className={`
  // Layout
  flex flex-col items-center
  // Spacing
  p-4 gap-2
  // Sizing
  w-full max-w-md
  // Colors
  bg-white text-gray-900
  // Effects
  rounded-lg shadow-md
  // Responsive
  sm:flex-row sm:p-6
`}>
```

### Responsive Design

```tsx
// Mobile-first approach
<div className="
  p-4              // Mobile base
  sm:p-6           // Small screens
  md:p-8           // Medium screens
  lg:p-12          // Large screens
">
```

## File Organization

### Import Order

```typescript
// 1. React/Next
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// 2. Third-party libraries
import { motion } from 'motion/react'
import { usePrivy } from '@privy-io/react-auth'

// 3. Internal imports (components)
import { Button } from '@/components/ui/Button'
import { ProfileCard } from '@/components/ProfileCard'

// 4. Internal imports (hooks, utils)
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/utils/date'

// 5. Types
import type { User } from '@/types'

// 6. Styles (if any)
import styles from './Component.module.css'
```

### File Naming

```
components/
├── ProfileCard.tsx       # PascalCase for components
├── ui/
│   ├── Button.tsx
│   └── Input.tsx
hooks/
├── useAuth.ts           # camelCase with use prefix
├── useProfile.ts
utils/
├── formatDate.ts        # camelCase
├── validation.ts
```

## Error Handling

### GraphQL Errors

```typescript
const { data, loading, error } = useGetProfileQuery()

if (error) {
  return <ErrorMessage message={error.message} />
}

if (loading) {
  return <LoadingSpinner />
}
```

### Try-Catch

```typescript
async function handleSubmit(data: FormData) {
  try {
    await updateProfile({ variables: { input: data } })
    toast.success('Profile updated')
  } catch (error) {
    if (error instanceof Error) {
      toast.error(error.message)
    }
  }
}
```

## Comments

### When to Comment

```typescript
// Good - Explain WHY, not WHAT
// Skip validation for admin users to allow bulk operations
if (user.role === 'admin') {
  return true
}

// Avoid - Explains obvious code
// Check if user is admin
if (user.role === 'admin') {
  return true
}
```

### JSDoc for Complex Functions

```typescript
/**
 * Calculates the bond strength between two users
 * based on shared events and interaction history.
 *
 * @param user1Id - First user's ID
 * @param user2Id - Second user's ID
 * @returns Bond strength from 0-100
 */
function calculateBondStrength(user1Id: string, user2Id: string): number {
  // Implementation
}
```

## Git Commits

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Build/tooling

### Examples

```bash
feat(events): add event registration flow
fix(auth): handle expired JWT tokens
docs(api): update GraphQL schema docs
refactor(profile): extract avatar component
```

## Code Quality

### Linting

```bash
# Run Biome linter
bun run lint

# Auto-fix issues
bun run lint:fix
```

### Formatting

```bash
# Format code
bun run format
```

## Next Steps

- [Workflows](/guide/workflows) - Development workflows
- [API Reference](/api/graphql) - GraphQL documentation
