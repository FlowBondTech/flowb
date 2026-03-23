# danz-web

The main marketing website and user dashboard for the DANZ platform.

## Overview

| Property | Value |
|----------|-------|
| **Framework** | Next.js 15 (App Router) |
| **React** | 19.x |
| **Styling** | Tailwind CSS |
| **Animation** | Motion (Framer) |
| **API Client** | Apollo Client |
| **Auth** | Privy |
| **Package Manager** | Bun |

## Project Structure

```
danz-web/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Landing page
│   ├── providers.tsx      # Client-side providers
│   ├── register/          # Registration flow
│   │   └── page.tsx
│   ├── dashboard/         # User dashboard
│   │   ├── page.tsx       # Dashboard home
│   │   ├── profile/       # Profile page
│   │   │   └── page.tsx
│   │   └── settings/      # Settings page
│   │       └── page.tsx
│   └── danz/              # Additional pages
│       └── page.tsx
├── src/
│   ├── components/        # React components
│   │   ├── auth/         # Authentication components
│   │   │   ├── OnboardingFlow.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── dashboard/    # Dashboard components
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── ProfileEditForm.tsx
│   │   └── *.tsx         # Landing page components
│   ├── constants/         # App constants
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── generated/         # GraphQL codegen output
│   │   └── graphql.tsx
│   ├── graphql/           # GraphQL definitions
│   │   ├── fragments/     # Shared fragments
│   │   ├── mutations/     # Mutation files
│   │   └── queries/       # Query files
│   ├── hooks/             # Custom React hooks
│   └── providers/         # Provider components
├── public/                # Static assets
├── codegen.ts             # GraphQL codegen config
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript config
├── biome.json             # Code quality config
└── package.json
```

## Development

### Commands

::: warning Always Use Bun
Never use `npm` or `yarn` for this project.
:::

```bash
# Install dependencies
bun install

# Start development server (with Turbopack)
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Generate GraphQL types
bun run codegen

# Lint code
bun run lint

# Format code
bun run format
```

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/graphql
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

## Key Components

### Root Layout

```typescript
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Providers Setup

```typescript
// app/providers.tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { ApolloProvider } from '@apollo/client'
import { AuthProvider } from '@/src/contexts/AuthContext'
import { apolloClient } from '@/src/providers/apollo'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ApolloProvider>
    </PrivyProvider>
  )
}
```

### Auth Context

```typescript
// src/contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useGetMyProfileQuery } from '@/src/generated/graphql'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

## GraphQL Integration

### Query Definition

```graphql
# src/graphql/queries/user.gql
query GetMyProfile {
  me {
    privyId
    username
    displayName
    avatarUrl
    bio
    xp
    level
    subscriptionTier
  }
}
```

### Generated Hook Usage

```typescript
import { useGetMyProfileQuery, useUpdateProfileMutation } from '@/src/generated/graphql'

function ProfilePage() {
  const { data, loading, error } = useGetMyProfileQuery()
  const [updateProfile] = useUpdateProfileMutation()

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  const handleUpdate = async (input: UpdateProfileInput) => {
    await updateProfile({ variables: { input } })
  }

  return <ProfileForm user={data.me} onUpdate={handleUpdate} />
}
```

### Code Generation

```typescript
// codegen.ts
import { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: process.env.NEXT_PUBLIC_API_URL,
  documents: 'src/graphql/**/*.gql',
  generates: {
    'src/generated/graphql.tsx': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
    },
  },
}

export default config
```

## Styling

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8B5CF6',
        secondary: '#EC4899',
      },
    },
  },
  plugins: [],
}

export default config
```

### Styling Patterns

```tsx
// Mobile-first responsive design
<div className="p-4 sm:p-6 lg:p-8">
  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
    Title
  </h1>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Content */}
  </div>
</div>
```

## Animation

Using Motion (formerly Framer Motion):

```tsx
import { motion } from 'motion/react'

function AnimatedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card />
    </motion.div>
  )
}
```

## Conventions

### Import Aliases

```typescript
// Use @ alias for src directory
import { Component } from '@/src/components/Component'
import { useAuth } from '@/src/contexts/AuthContext'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
```

### Component Structure

```typescript
// src/components/dashboard/ProfileCard.tsx
interface ProfileCardProps {
  user: User
  onEdit?: () => void
}

export function ProfileCard({ user, onEdit }: ProfileCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        className="h-24 w-24 rounded-full"
      />
      <h2 className="mt-4 text-xl font-bold">{user.displayName}</h2>
      <p className="text-gray-600">@{user.username}</p>
      {onEdit && (
        <button onClick={onEdit} className="mt-4 btn-primary">
          Edit Profile
        </button>
      )}
    </div>
  )
}
```

### Best Practices

1. **Keep components under 150 lines**
2. **Use TypeScript interfaces for props**
3. **Implement loading/error states**
4. **Make all components mobile-responsive**
5. **Use generated GraphQL hooks**
6. **Run codegen after schema changes**

## Git Workflow

Push to both remotes:

```bash
git push origin main && git push cryptokoh main
```

- `origin` → FlowBondTech/danz-web
- `cryptokoh` → cryptokoh/danz-web

## Next Steps

- [danz-miniapp](/frontend/danz-miniapp) - Farcaster miniapp
- [Auth Components](/frontend/components-auth) - Authentication UI
- [API Reference](/api/graphql) - GraphQL operations
