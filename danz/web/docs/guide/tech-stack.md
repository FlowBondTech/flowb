# Technology Stack

Comprehensive overview of all technologies used in the DANZ platform.

## Backend Stack

### Runtime & Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | JavaScript runtime |
| **Express** | 5.x | HTTP server framework |
| **Apollo Server** | 4.x | GraphQL server |
| **TypeScript** | 5.x | Type-safe JavaScript |

### Database & Storage

| Technology | Purpose | Details |
|------------|---------|---------|
| **Supabase** | Database hosting | PostgreSQL managed service |
| **PostgreSQL** | Relational database | Via Supabase |
| **AWS S3** | File storage | Avatars, event images, media |

### Authentication & Payments

| Technology | Purpose |
|------------|---------|
| **Privy** | Web3 authentication (social + wallet) |
| **Stripe** | Subscription billing & payments |

### Development Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager |
| **Biome** | Linting & formatting |
| **Nodemon** | Hot reload in development |
| **tsx** | TypeScript execution |

## Frontend Stack (danz-web)

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.x | React framework with App Router |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type safety |

### Styling & Animation

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.4.x | Utility-first CSS |
| **Motion** | 12.x | Animation library (Framer Motion successor) |
| **react-icons** | 5.x | Icon components |

### Data & State

| Technology | Purpose |
|------------|---------|
| **Apollo Client** | GraphQL client |
| **GraphQL Codegen** | Type generation |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Bun** | Package manager & runtime |
| **Biome** | Linting & formatting |

## Frontend Stack (danz-miniapp)

### Miniapp-Specific

| Technology | Version | Purpose |
|------------|---------|---------|
| **Farcaster Frame SDK** | 0.0.26 | Miniapp integration |
| **OnchainKit** | 0.36.x | Coinbase components |

### Web3 Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| **Wagmi** | 2.x | React hooks for Ethereum |
| **Viem** | 2.x | TypeScript Ethereum client |
| **TanStack Query** | 5.x | Data fetching & caching |

## Architecture Decisions

### Why GraphQL?

::: tip Benefits
- **Single endpoint**: All data from `/graphql`
- **Type safety**: Schema-first with codegen
- **Efficient**: Clients request only needed fields
- **Documentation**: Self-documenting schema
:::

### Why Privy for Auth?

::: tip Benefits
- **Flexible**: Email, social, and wallet login
- **Web3-ready**: Native wallet connection
- **Simple**: Easy integration with React
- **Secure**: JWT-based authentication
:::

### Why Supabase?

::: tip Benefits
- **Managed PostgreSQL**: No server management
- **Row Level Security**: Built-in RLS policies
- **Real-time**: WebSocket subscriptions (future)
- **Storage**: S3-compatible file storage
:::

### Why Next.js 15?

::: tip Benefits
- **App Router**: Modern routing with layouts
- **Server Components**: Better performance
- **React 19**: Latest React features
- **Turbopack**: Fast development builds
:::

### Why Bun for Frontend?

::: tip Benefits
- **Speed**: 10-100x faster than npm
- **Built-in**: TypeScript, bundling, testing
- **Compatible**: Works with npm packages
:::

## Code Quality Tools

### Biome

Used across all projects for:
- Linting (replaces ESLint)
- Formatting (replaces Prettier)
- Single tool, faster performance

```json
// biome.json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  }
}
```

### GraphQL Codegen

Generates TypeScript types from GraphQL schema:

```typescript
// Generated hooks
import { useGetMyProfileQuery } from '@/generated/graphql'

const { data, loading } = useGetMyProfileQuery()
// data is fully typed!
```

## Package Managers

::: warning Important
- **Backend**: Use `pnpm`
- **Frontend**: Use `bun` (NEVER npm/yarn)
:::

| Project | Package Manager | Lock File |
|---------|-----------------|-----------|
| danz-backend-experimental | pnpm | pnpm-lock.yaml |
| danz-web | bun | bun.lock |
| danz-miniapp | bun | bun.lock |

## Version Requirements

```bash
# Check your versions
node --version    # Should be 20+
bun --version     # Latest
pnpm --version    # Latest
```

## Dependency Philosophy

### Minimize External Dependencies
- Prefer standard library when possible
- Evaluate bundle size impact
- Check maintenance status

### Security First
- Regular dependency updates
- `npm audit` / `bun audit`
- Monitor for vulnerabilities

## Next Steps

- [Local Setup](/guide/local-setup) - Configure your environment
- [Architecture](/architecture/overview) - System design details
- [API Reference](/api/graphql) - GraphQL documentation
