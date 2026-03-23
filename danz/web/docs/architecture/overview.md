# Architecture Overview

Comprehensive system architecture for the DANZ platform.

## System Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │           CLIENT LAYER              │
                                    ├─────────────────────────────────────┤
┌─────────────┐  ┌─────────────┐   │  ┌─────────┐  ┌─────────┐          │
│   Browser   │  │  Warpcast   │   │  │danz-web │  │miniapp  │          │
│   (Web)     │  │  (Mobile)   │   │  │Next.js  │  │Next.js  │          │
└──────┬──────┘  └──────┬──────┘   │  │  15     │  │  15     │          │
       │                │          │  └────┬────┘  └────┬────┘          │
       └────────┬───────┘          │       └─────┬──────┘               │
                │                  └─────────────┼───────────────────────┘
                │                                │
                │              GraphQL (HTTPS)   │
                ▼                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                          API LAYER                                     │
├───────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Apollo Server 4                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │  User    │  │  Event   │  │  Feed    │  │  Upload  │        │  │
│  │  │ Resolver │  │ Resolver │  │ Resolver │  │ Resolver │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Express 5 Middleware                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │  Privy   │  │  CORS    │  │ Compress │  │  Morgan  │        │  │
│  │  │  Auth    │  │          │  │          │  │  Logger  │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
                │                                │
                ▼                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                     │
├───────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐                     │
│  │     Supabase        │  │     AWS S3          │                     │
│  │    PostgreSQL       │  │   File Storage      │                     │
│  │                     │  │                     │                     │
│  │  - users            │  │  - avatars          │                     │
│  │  - events           │  │  - event images     │                     │
│  │  - achievements     │  │  - post media       │                     │
│  │  - feed_posts       │  │                     │                     │
│  │  - dance_bonds      │  │                     │                     │
│  │  - notifications    │  │                     │                     │
│  └─────────────────────┘  └─────────────────────┘                     │
└───────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                 │
├───────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Privy   │  │  Stripe  │  │ Farcaster│  │   Base   │              │
│  │   Auth   │  │ Payments │  │   SDK    │  │  Chain   │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
└───────────────────────────────────────────────────────────────────────┘
```

## Component Overview

### Client Layer

| Component | Framework | Purpose |
|-----------|-----------|---------|
| **danz-web** | Next.js 15 | Marketing site + user dashboard |
| **danz-miniapp** | Next.js 15 | Farcaster/Warpcast miniapp |
| **prototypes** | Static HTML | Landing page design variations |

### API Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Apollo Server** | GraphQL | API queries and mutations |
| **Express** | HTTP | Request handling, middleware |
| **Resolvers** | TypeScript | Business logic |

### Data Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Supabase** | PostgreSQL | Primary database |
| **AWS S3** | Object storage | File/media storage |

### External Services

| Service | Purpose |
|---------|---------|
| **Privy** | Authentication |
| **Stripe** | Payments |
| **Farcaster** | Miniapp platform |

## Request Flow

### Authenticated Request

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Privy   │────▶│  Backend │────▶│ Supabase │
│          │     │  Auth    │     │  Server  │     │    DB    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │   1. Login     │                │                │
     │───────────────▶│                │                │
     │                │  2. JWT Token  │                │
     │◀───────────────│                │                │
     │                                 │                │
     │   3. GraphQL + Authorization    │                │
     │────────────────────────────────▶│                │
     │                                 │  4. Query      │
     │                                 │───────────────▶│
     │                                 │  5. Result     │
     │                                 │◀───────────────│
     │   6. Response                   │                │
     │◀────────────────────────────────│                │
```

### Event Registration

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  GraphQL │────▶│  Events  │────▶│  Stripe  │
│          │     │   API    │     │  System  │     │ Payments │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │  Browse Events │                │                │
     │───────────────▶│  getEvents()   │                │
     │                │───────────────▶│                │
     │◀───────────────│◀───────────────│                │
     │                │                │                │
     │  Register      │                │                │
     │───────────────▶│registerForEvent│                │
     │                │───────────────▶│                │
     │                │                │  If Paid Event │
     │                │                │───────────────▶│
     │                │                │  Payment Intent│
     │                │                │◀───────────────│
     │◀───────────────│◀───────────────│                │
```

## Folder Structure

### Backend (`danz-backend-experimental/`)

```
src/
├── server.ts          # Entry point
├── app.ts             # Express configuration
├── config/
│   ├── env.ts         # Environment variables
│   ├── privy.ts       # Privy client
│   └── supabase.ts    # Supabase client
├── graphql/
│   ├── schema/        # Type definitions
│   │   ├── user.ts
│   │   ├── event.ts
│   │   └── upload.ts
│   └── resolvers/     # Resolver functions
│       ├── user.ts
│       ├── event.ts
│       └── upload.ts
├── middleware/
│   └── auth.ts        # Privy JWT verification
├── routes/
│   └── stripe.ts      # Webhook handlers
└── utils/
    └── logger.ts
```

### Web Frontend (`danz-web/`)

```
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   ├── providers.tsx      # Client providers
│   ├── register/          # Registration flow
│   └── dashboard/         # User dashboard
├── src/
│   ├── components/        # React components
│   │   ├── auth/         # Auth components
│   │   └── dashboard/    # Dashboard components
│   ├── contexts/          # React contexts
│   ├── generated/         # GraphQL codegen
│   ├── graphql/           # Query definitions
│   │   ├── fragments/
│   │   ├── mutations/
│   │   └── queries/
│   └── hooks/             # Custom hooks
└── public/                # Static assets
```

### Miniapp (`danz-miniapp/`)

```
├── app/
│   ├── .well-known/       # Farcaster manifest
│   │   └── farcaster.json/
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── src/
│   ├── components/
│   │   ├── ui/           # Splash, navigation
│   │   ├── dance/        # Dance tracking
│   │   └── wallet/       # Wallet components
│   ├── hooks/
│   │   └── useFarcasterSDK.ts
│   └── providers/         # Wagmi, Apollo
└── public/
    └── assets/            # Icons, splash images
```

## Key Design Decisions

### GraphQL Over REST

::: tip Why GraphQL?
- **Efficient Data Fetching**: Clients request only needed fields
- **Strong Typing**: Schema provides type safety
- **Single Endpoint**: Simplifies API management
- **Introspection**: Self-documenting API
:::

### Privy Authentication

::: tip Why Privy?
- **Multi-method Auth**: Email, social, wallet
- **Web3 Ready**: Native wallet integration
- **Simple Integration**: React hooks
- **Secure**: JWT-based, industry standard
:::

### Supabase Database

::: tip Why Supabase?
- **Managed PostgreSQL**: No ops overhead
- **Row Level Security**: Built-in RLS
- **Real-time Ready**: WebSocket subscriptions
- **Generous Free Tier**: Good for development
:::

## Scalability Considerations

### Current Architecture
- **Stateless Backend**: Horizontally scalable
- **Managed Database**: Supabase handles scaling
- **CDN-Ready**: Static assets cacheable
- **Serverless-Compatible**: Next.js supports edge

### Future Improvements
- Redis caching layer
- Database read replicas
- GraphQL query complexity limits
- Rate limiting per user/IP
- Event-driven processing

## Next Steps

- [Data Flow](/architecture/data-flow) - Detailed data flows
- [Security](/architecture/security) - Security architecture
- [Database Schema](/database/schema) - Table definitions
