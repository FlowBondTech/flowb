# Authentication

Privy-powered authentication for the DANZ platform.

## Overview

DANZ uses [Privy](https://privy.io) for authentication, supporting:

- **Email login** - Magic links
- **Social login** - Google, Twitter, Discord
- **Wallet login** - MetaMask, Coinbase Wallet, WalletConnect

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Privy   │     │  Backend │     │ Supabase │
│   App    │     │  Server  │     │  Server  │     │    DB    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  1. Login      │                │                │
     │───────────────▶│                │                │
     │                │                │                │
     │  2. Auth Modal │                │                │
     │◀───────────────│                │                │
     │                │                │                │
     │  3. User authenticates (email/social/wallet)    │
     │───────────────▶│                │                │
     │                │                │                │
     │  4. JWT Token  │                │                │
     │◀───────────────│                │                │
     │                │                │                │
     │  5. GraphQL request + Authorization: Bearer JWT │
     │────────────────────────────────▶│                │
     │                │                │                │
     │                │  6. Verify JWT │                │
     │                │◀───────────────│                │
     │                │  7. Claims     │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │                │  8. Get user   │
     │                │                │───────────────▶│
     │                │                │  9. User data  │
     │                │                │◀───────────────│
     │                │                │                │
     │  10. Response with user context │                │
     │◀────────────────────────────────│                │
```

## Client Setup

### Install Privy

```bash
bun add @privy-io/react-auth
```

### Configure Provider

```typescript
// app/providers.tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'twitter'],
        appearance: {
          theme: 'dark',
          accentColor: '#8B5CF6',
          logo: '/logo.svg',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
```

### Using Auth Hooks

```typescript
import { usePrivy } from '@privy-io/react-auth'

function LoginButton() {
  const { login, logout, authenticated, user } = usePrivy()

  if (authenticated) {
    return (
      <div>
        <p>Welcome, {user?.email?.address || user?.wallet?.address}</p>
        <button onClick={logout}>Logout</button>
      </div>
    )
  }

  return <button onClick={login}>Login</button>
}
```

### Get Auth Token

```typescript
import { usePrivy } from '@privy-io/react-auth'

function useAuthToken() {
  const { getAccessToken } = usePrivy()

  const fetchWithAuth = async (url: string, options?: RequestInit) => {
    const token = await getAccessToken()

    return fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }

  return { fetchWithAuth }
}
```

## Backend Verification

### Install Server Auth

```bash
pnpm add @privy-io/server-auth
```

### Verify JWT Middleware

```typescript
// src/middleware/auth.ts
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export interface AuthContext {
  user?: {
    privyId: string
    email?: string
    wallet?: string
  }
}

export async function authenticateRequest(
  authHeader?: string
): Promise<AuthContext> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {}
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const claims = await privy.verifyAuthToken(token)

    return {
      user: {
        privyId: claims.userId,
        email: claims.email,
        wallet: claims.wallet?.address,
      },
    }
  } catch (error) {
    console.error('Auth verification failed:', error)
    return {}
  }
}
```

### Apollo Context Integration

```typescript
// src/server.ts
import { expressMiddleware } from '@as-integrations/express5'
import { authenticateRequest } from './middleware/auth'

app.use(
  '/graphql',
  expressMiddleware(server, {
    context: async ({ req }) => {
      const auth = await authenticateRequest(req.headers.authorization)
      return auth
    },
  })
)
```

## GraphQL Authorization

### Protected Resolvers

```typescript
// src/graphql/resolvers/user.ts
import { GraphQLError } from 'graphql'

export const userResolvers = {
  Query: {
    me: async (_, __, context) => {
      // Require authentication
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', context.user.privyId)
        .single()

      return data
    },
  },

  Mutation: {
    updateProfile: async (_, { input }, context) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // User can only update their own profile
      const { data } = await supabase
        .from('users')
        .update(input)
        .eq('privy_id', context.user.privyId)
        .select()
        .single()

      return data
    },
  },
}
```

### Role-Based Authorization

```typescript
function requireRole(context: AuthContext, roles: string[]) {
  if (!context.user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }

  // Fetch user role from database
  const user = await getUser(context.user.privyId)

  if (!roles.includes(user.role)) {
    throw new GraphQLError('Not authorized', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return user
}

// Usage in resolver
createEvent: async (_, { input }, context) => {
  const user = await requireRole(context, ['organizer', 'admin'])
  // ... create event
}
```

## User Session

### First-Time User Detection

```typescript
// Check if user exists after Privy login
const { data: existingUser } = await supabase
  .from('users')
  .select('privy_id')
  .eq('privy_id', privyId)
  .single()

if (!existingUser) {
  // Redirect to onboarding
  router.push('/register')
} else {
  // Go to dashboard
  router.push('/dashboard')
}
```

### Session Persistence

Privy handles session persistence automatically:

- JWT stored in secure httpOnly cookies
- Automatic token refresh
- Cross-tab session sync

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `UNAUTHENTICATED` | No valid JWT token | Redirect to login |
| `FORBIDDEN` | User lacks permission | Show error message |
| `TOKEN_EXPIRED` | JWT has expired | Refresh token |
| `INVALID_TOKEN` | Malformed JWT | Clear session, re-login |

## Security Best Practices

::: warning Important
- Never expose `PRIVY_APP_SECRET` to the client
- Always verify JWT on every request
- Use HTTPS in production
- Implement rate limiting on auth endpoints
:::

### Environment Variables

```bash
# Client (public)
NEXT_PUBLIC_PRIVY_APP_ID=your-app-id

# Server (secret)
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-secret
```

## Next Steps

- [Users API](/api/users) - User operations
- [Events API](/api/events) - Event operations
- [Security Architecture](/architecture/security) - Security details
