# DANZ Web - Claude Code Instructions

> Last updated: 2025-01-28

## Project Overview
DANZ Web is the marketing website and web dashboard for the DANZ platform, built with Next.js 15 and React 19.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **API**: Apollo Client (GraphQL)
- **Authentication**: Supabase Auth (email/password, magic link, wallet)
- **Package Manager**: Bun (IMPORTANT: Never use npm)
- **Code Quality**: Biome

## Project Structure
```
danz-web/
├── app/                   # Next.js App Router
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Homepage
│   ├── providers.tsx     # Client providers
│   ├── register/         # Registration flow
│   │   └── page.tsx
│   ├── dashboard/        # Dashboard pages
│   │   ├── page.tsx      # Dashboard home
│   │   ├── profile/      # Profile page
│   │   └── settings/     # Settings page
│   └── danz/            # Additional pages
│       └── page.tsx
├── src/
│   ├── components/       # React components
│   │   ├── auth/        # Authentication components
│   │   │   ├── OnboardingFlow.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── dashboard/   # Dashboard components
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── ProfileEditForm.tsx
│   │   └── *.tsx        # Landing page components
│   ├── constants/       # Constants
│   ├── contexts/        # React contexts
│   │   └── AuthContext.tsx
│   ├── generated/       # GraphQL generated types
│   ├── graphql/         # GraphQL definitions
│   │   ├── fragments/   # Reusable fragments
│   │   ├── mutations/   # Mutation definitions
│   │   └── queries/     # Query definitions
│   ├── hooks/           # Custom hooks
│   └── providers/       # Providers
├── public/              # Static assets
├── codegen.ts           # GraphQL codegen config
├── next.config.ts       # Next.js config
├── tailwind.config.ts   # Tailwind config
├── tsconfig.json        # TypeScript config
├── biome.json          # Code quality config
└── package.json
```

## Key Libraries
### Core
- `next`: v15 - React framework
- `react`: v19.1.0 - UI library
- `typescript`: Type safety

### Styling & Animation
- `tailwindcss`: v3.4.1 - Utility CSS
- `motion`: v12.23.12 - Animation (replaces framer-motion)
- `react-icons`: v5.5.0 - Icon components

### Data & State
- `@apollo/client`: GraphQL client
- `graphql`: GraphQL implementation
- `@supabase/supabase-js`: Authentication & database client

### Development
- `@biomejs/biome`: Code quality
- `@graphql-codegen/cli`: Code generation
- `bun`: Package manager (REQUIRED)

## GraphQL Integration

### Important: GraphQL Workflow
1. **Schema Changes**: When backend GraphQL schema changes:
   - Update `.gql` files in `src/graphql/`
   - Run `bun run codegen` to regenerate types
   - Update affected components

2. **File Organization**:
   - Queries: `src/graphql/queries/*.gql`
   - Mutations: `src/graphql/mutations/*.gql`
   - Fragments: `src/graphql/fragments/*.gql`
   - Generated: `src/generated/graphql.tsx`

3. **Usage Pattern**:
   ```typescript
   // Import generated hooks
   import { useGetMyProfileQuery, useUpdateProfileMutation } from '@/src/generated/graphql'

   // Use in components
   const { data, loading } = useGetMyProfileQuery()
   const [updateProfile] = useUpdateProfileMutation()
   ```

## Development Commands

### IMPORTANT: Always use Bun
```bash
# ✅ CORRECT
bun install          # Install dependencies
bun run dev         # Start dev server
bun run build       # Build for production
bun run codegen     # Generate GraphQL types
bun run lint        # Run linter
bun run format      # Format code

# ❌ WRONG - NEVER USE
npm install         # DO NOT USE
npm run dev        # DO NOT USE
yarn              # DO NOT USE
```

## Important Conventions

### Import Paths
Use @ alias for src directory:
```typescript
import { Component } from '@/src/components/Component'
import { useAuth } from '@/src/contexts/AuthContext'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
```

### Authentication
Always use AuthContext:
```typescript
import { useAuth } from '@/src/contexts/AuthContext'
const { user, isAuthenticated } = useAuth()
```

### Styling Patterns
```typescript
// Tailwind utilities with responsive design
<div className="p-4 sm:p-6 lg:p-8">
  <h1 className="text-2xl sm:text-3xl font-bold">Title</h1>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Content */}
  </div>
</div>
```

### Mobile Responsiveness
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Mobile-first approach
- Test all breakpoints
- Touch-friendly targets (min 44px)

## Page Structure

### App Router Pages
```typescript
// app/page-name/page.tsx
'use client'  // If using hooks/state

export default function PageName() {
  return <Component />
}
```

### Layouts
```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

## Environment Variables
Required in `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/graphql
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Component Best Practices
1. Keep components under 150 lines
2. Extract reusable components
3. Use TypeScript interfaces for props
4. Implement loading/error states
5. Make components mobile-responsive

## GraphQL Best Practices
1. Define operations in `.gql` files
2. Run codegen after changes
3. Use generated hooks
4. Handle loading/error states
5. Implement optimistic updates

## Git Push Rules
**IMPORTANT**: Always push to BOTH remotes to keep repos in sync:
```bash
git push origin main && git push cryptokoh main
```
- `origin` → FlowBondTech/danz-web
- `cryptokoh` → cryptokoh/danz-web

## DO NOT
- Use npm or yarn (use bun only)
- Install new icon libraries (use react-icons)
- Create large components (>150 lines)
- Skip TypeScript types
- Ignore mobile responsiveness
- Use console.log in production
- Create .md documentation files unless requested
- Push to only one remote (always push to both origin AND cryptokoh)