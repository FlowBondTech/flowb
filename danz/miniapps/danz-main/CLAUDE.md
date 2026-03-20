# DANZ Miniapp - Claude Code Instructions

> Last updated: 2025-11-28

## Project Overview
DANZ Miniapp is a Farcaster/Base miniapp for the DANZ dance-to-earn platform. It's designed to run within Warpcast and Coinbase Wallet as a lightweight, optimized web app.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: Apollo Client (GraphQL) - same backend as main app
- **Web3**: Wagmi v2 + Viem
- **Miniapp SDK**: @farcaster/frame-sdk
- **Package Manager**: Bun (IMPORTANT: Never use npm)
- **Code Quality**: Biome

## Project Structure
```
danz-miniapp/
├── app/                      # Next.js App Router
│   ├── .well-known/         # Farcaster manifest
│   │   └── farcaster.json/  # Route handler for manifest
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Main miniapp page
│   ├── providers.tsx        # Client providers
│   └── globals.css          # Global styles
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # UI components (splash, navigation)
│   │   ├── dance/          # Dance tracking components
│   │   └── wallet/         # Wallet components
│   ├── contexts/           # React contexts
│   ├── generated/          # GraphQL generated types
│   ├── graphql/            # GraphQL definitions (shared with main app)
│   │   ├── fragments/
│   │   ├── mutations/
│   │   └── queries/
│   ├── hooks/              # Custom hooks
│   │   └── useFarcasterSDK.ts  # Farcaster SDK hook
│   ├── lib/                # Utility libraries
│   ├── providers/          # React providers (Wagmi, Apollo)
│   ├── styles/             # Style utilities
│   ├── types/              # TypeScript types
│   └── utils/              # Helper functions
├── public/
│   └── assets/             # Static assets (icons, splash, etc.)
├── codegen.ts              # GraphQL codegen config
├── next.config.ts          # Next.js config
├── tailwind.config.ts      # Tailwind config
└── package.json
```

## Miniapp Specifications

### Farcaster Requirements
- **Web Viewport**: 424 × 695px (vertical modal)
- **Splash Image**: 200 × 200px
- **Icon**: 1024 × 1024px PNG (no alpha)
- **Hero Image**: 1200 × 630px (1.91:1)
- **Screenshots**: 1284 × 2778px (portrait), max 3
- **Manifest**: `/.well-known/farcaster.json`

### CRITICAL: SDK Ready Call
```typescript
// MUST call sdk.actions.ready() to hide splash screen
await sdk.actions.ready()
```
If you don't call ready(), users will see an infinite loading screen!

## Development Commands

### IMPORTANT: Always use Bun
```bash
# ✅ CORRECT
bun install          # Install dependencies
bun run dev          # Start dev server (port 3001)
bun run build        # Build for production
bun run codegen      # Generate GraphQL types
bun run lint         # Run linter
bun run format       # Format code
bun run analyze      # Analyze bundle size

# ❌ WRONG - NEVER USE
npm install         # DO NOT USE
npm run dev        # DO NOT USE
yarn              # DO NOT USE
```

## GraphQL Integration

### Shared with Main App
The miniapp shares GraphQL queries/mutations with the main DANZ app:
- Same backend API
- Same schema types
- Same fragment definitions

### Workflow
1. Update `.gql` files in `src/graphql/`
2. Run `bun run codegen` to regenerate types
3. Import hooks from `@/generated/graphql`

```typescript
import { useGetMyProfileQuery, useGetFreestyleStatsQuery } from '@/generated/graphql'

const { data, loading } = useGetMyProfileQuery()
const { data: stats } = useGetFreestyleStatsQuery()
```

## Important Conventions

### Import Paths
Use @ alias for src directory:
```typescript
import { Component } from '@/components/Component'
import { useFarcasterSDK } from '@/hooks/useFarcasterSDK'
import { useGetMyProfileQuery } from '@/generated/graphql'
```

### Farcaster SDK Usage
Always use the useFarcasterSDK hook:
```typescript
const { isLoaded, isInFrame, user, ready, openUrl, close } = useFarcasterSDK()

// Call ready() after initial load
useEffect(() => {
  if (isLoaded) {
    ready()
  }
}, [isLoaded, ready])
```

### Miniapp-Optimized Design
- Viewport: Design for 424px width
- Touch targets: Min 44px
- Use .miniapp-container class for proper sizing
- Keep components compact

## Performance Optimization

### Bundle Size
- Use dynamic imports for non-critical components
- Analyze with `bun run analyze`
- Target < 200KB initial bundle

### Loading
- Splash screen while SDK initializes
- Progressive content loading
- Lazy load below-fold content

### Caching
- Apollo cache for GraphQL
- Static assets aggressively cached
- Service worker for offline support (TODO)

## Git Push Rules
**IMPORTANT**: Always push to BOTH remotes:
```bash
git push origin main && git push cryptokoh main
```
- `origin` → FlowBondTech/danz-miniapp
- `cryptokoh` → cryptokoh/danz-miniapp

## DO NOT
- Use npm or yarn (use bun only)
- Skip the sdk.actions.ready() call
- Create components > 150 lines
- Skip TypeScript types
- Hardcode URLs or values
- Use console.log in production
- Create .md docs unless requested
- Push to only one remote
