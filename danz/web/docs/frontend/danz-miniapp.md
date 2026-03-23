# danz-miniapp

Lightweight Farcaster/Base miniapp for the DANZ platform.

## Overview

| Property | Value |
|----------|-------|
| **Framework** | Next.js 15 (App Router) |
| **Platform** | Farcaster (Warpcast) |
| **Viewport** | 424 × 695px |
| **Web3** | Wagmi v2 + Viem |
| **Package Manager** | Bun |

## Miniapp Specifications

### Farcaster Requirements

| Asset | Dimensions | Format |
|-------|------------|--------|
| Splash Image | 200 × 200px | PNG/JPG |
| Icon | 1024 × 1024px | PNG (no alpha) |
| Hero Image | 1200 × 630px | PNG/JPG |
| Screenshots | 1284 × 2778px | Portrait, max 3 |

### Manifest Location

```
/.well-known/farcaster.json
```

## Project Structure

```
danz-miniapp/
├── app/
│   ├── .well-known/           # Farcaster manifest
│   │   └── farcaster.json/
│   │       └── route.ts       # Dynamic manifest
│   ├── api/                   # API routes
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Main miniapp view
│   ├── providers.tsx          # Client providers
│   └── globals.css            # Global styles
├── src/
│   ├── components/
│   │   ├── ui/               # UI components
│   │   │   ├── SplashScreen.tsx
│   │   │   └── Navigation.tsx
│   │   ├── dance/            # Dance features
│   │   └── wallet/           # Wallet components
│   ├── contexts/              # React contexts
│   ├── generated/             # GraphQL codegen
│   ├── graphql/               # Query definitions
│   ├── hooks/
│   │   └── useFarcasterSDK.ts # SDK hook
│   ├── lib/                   # Utilities
│   ├── providers/
│   │   ├── wagmi.ts          # Wagmi config
│   │   └── apollo.ts         # Apollo config
│   ├── styles/                # Style utilities
│   ├── types/                 # TypeScript types
│   └── utils/                 # Helpers
├── public/
│   └── assets/               # Static assets
├── codegen.ts                 # GraphQL codegen
├── next.config.ts             # Next.js config
└── tailwind.config.ts         # Tailwind config
```

## Development

### Commands

```bash
# Install dependencies
bun install

# Start development server (port 3001)
bun run dev

# Build for production
bun run build

# Generate GraphQL types
bun run codegen

# Analyze bundle size
bun run analyze
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.danz.xyz/graphql
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your-onchainkit-key
```

## Farcaster Integration

### SDK Hook

::: danger Critical
You MUST call `sdk.actions.ready()` to hide the splash screen. Without this, users see infinite loading!
:::

```typescript
// src/hooks/useFarcasterSDK.ts
import { useEffect, useState, useCallback } from 'react'
import sdk from '@farcaster/frame-sdk'

export function useFarcasterSDK() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInFrame, setIsInFrame] = useState(false)
  const [user, setUser] = useState<FrameUser | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const context = await sdk.context
        setUser(context?.user ?? null)
        setIsInFrame(!!context)
      } catch (error) {
        console.error('Failed to load Farcaster SDK:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    init()
  }, [])

  const ready = useCallback(() => {
    sdk.actions.ready()
  }, [])

  const openUrl = useCallback((url: string) => {
    sdk.actions.openUrl(url)
  }, [])

  const close = useCallback(() => {
    sdk.actions.close()
  }, [])

  return {
    isLoaded,
    isInFrame,
    user,
    ready,
    openUrl,
    close,
  }
}
```

### Usage in Components

```typescript
// app/page.tsx
'use client'

import { useEffect } from 'react'
import { useFarcasterSDK } from '@/hooks/useFarcasterSDK'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { MainContent } from '@/components/MainContent'

export default function Home() {
  const { isLoaded, isInFrame, user, ready } = useFarcasterSDK()

  useEffect(() => {
    if (isLoaded) {
      // CRITICAL: Call ready() to hide splash screen
      ready()
    }
  }, [isLoaded, ready])

  if (!isLoaded) {
    return <SplashScreen />
  }

  return <MainContent user={user} isInFrame={isInFrame} />
}
```

### Manifest Route

```typescript
// app/.well-known/farcaster.json/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    accountAssociation: {
      header: '...',
      payload: '...',
      signature: '...',
    },
    frame: {
      version: '1',
      name: 'DANZ',
      iconUrl: 'https://miniapp.danz.xyz/icon.png',
      splashImageUrl: 'https://miniapp.danz.xyz/splash.png',
      splashBackgroundColor: '#8B5CF6',
      homeUrl: 'https://miniapp.danz.xyz',
    },
  }

  return NextResponse.json(manifest)
}
```

## Web3 Integration

### Wagmi Configuration

```typescript
// src/providers/wagmi.ts
import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'DANZ',
    }),
  ],
  transports: {
    [base.id]: http(),
  },
})
```

### Providers Setup

```typescript
// app/providers.tsx
'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApolloProvider } from '@apollo/client'
import { wagmiConfig } from '@/providers/wagmi'
import { apolloClient } from '@/providers/apollo'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          {children}
        </ApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Wallet Connection

```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi'

function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <button onClick={() => disconnect()}>
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    )
  }

  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      Connect Wallet
    </button>
  )
}
```

## Styling for Miniapp

### Viewport Constraints

```css
/* Design for 424px width */
.miniapp-container {
  width: 100%;
  max-width: 424px;
  min-height: 695px;
  margin: 0 auto;
}
```

### Touch-Friendly UI

```tsx
// Minimum 44px touch targets
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon />
</button>
```

### Compact Design

```tsx
// Space-efficient layouts
<div className="space-y-2 p-3">
  <h2 className="text-lg font-bold">Title</h2>
  <p className="text-sm text-gray-600">Description</p>
</div>
```

## Performance

### Bundle Optimization

- Target < 200KB initial bundle
- Use dynamic imports
- Lazy load below-fold content

```typescript
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
})
```

### Analyze Bundle

```bash
ANALYZE=true bun run build
```

## GraphQL

Same setup as danz-web with shared queries:

```typescript
import { useGetMyProfileQuery } from '@/generated/graphql'

function Profile() {
  const { data, loading } = useGetMyProfileQuery()

  if (loading) return <MiniLoader />

  return (
    <div className="p-3">
      <img
        src={data?.me?.avatarUrl}
        className="h-16 w-16 rounded-full"
      />
      <p className="font-bold">{data?.me?.displayName}</p>
    </div>
  )
}
```

## Git Workflow

```bash
git push origin main && git push cryptokoh main
```

## Checklist

### Before Launch
- [ ] Manifest configured correctly
- [ ] `sdk.actions.ready()` called
- [ ] Assets meet size requirements
- [ ] Touch targets ≥ 44px
- [ ] Bundle < 200KB
- [ ] Tested in Warpcast

### Common Issues

| Issue | Solution |
|-------|----------|
| Infinite loading | Call `sdk.actions.ready()` |
| Assets not loading | Check manifest URLs |
| Web3 not working | Verify Wagmi config |

## Next Steps

- [danz-web](/frontend/danz-web) - Main web app
- [API Reference](/api/graphql) - GraphQL docs
- [Deployment](/deployment/infrastructure) - Deploy miniapp
