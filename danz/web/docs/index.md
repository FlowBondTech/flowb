---
layout: home

hero:
  name: DANZ Platform
  text: Dance-to-Earn Ecosystem
  tagline: Complete technical documentation for the DANZ platform - APIs, database, frontend apps, and more.
  image:
    src: /logo.svg
    alt: DANZ
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/FlowBondTech

features:
  - icon: 🚀
    title: GraphQL API
    details: Apollo Server 4 with Express 5. Complete API reference for users, events, achievements, and social features.
    link: /api/graphql
    linkText: API Docs
  - icon: 🗃️
    title: Database Schema
    details: PostgreSQL database hosted on Supabase. 10+ tables with foreign keys, indexes, and RLS policies.
    link: /database/schema
    linkText: View Schema
  - icon: 🌐
    title: Web Application
    details: Next.js 15 + React 19 marketing site and user dashboard with Privy authentication.
    link: /frontend/danz-web
    linkText: Web Docs
  - icon: 📱
    title: Farcaster Miniapp
    details: Lightweight miniapp for Warpcast with Wagmi v2 Web3 integration and Frame SDK.
    link: /frontend/danz-miniapp
    linkText: Miniapp Docs
  - icon: 🎨
    title: Design Prototypes
    details: 5 landing page design variations from modern gradient to retro synthwave.
    link: /prototypes/overview
    linkText: View Prototypes
  - icon: 🔐
    title: Authentication
    details: Privy-powered Web3 authentication with social logins and wallet connections.
    link: /api/authentication
    linkText: Auth Guide
---

<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const techStack = [
  { name: 'Backend', items: ['Node.js', 'Express 5', 'Apollo Server 4', 'TypeScript', 'Supabase'] },
  { name: 'Frontend', items: ['Next.js 15', 'React 19', 'Tailwind CSS', 'Apollo Client'] },
  { name: 'Web3', items: ['Wagmi v2', 'Viem', 'Privy', 'Farcaster SDK'] },
  { name: 'Services', items: ['Supabase', 'Stripe', 'AWS S3'] },
]
</script>

## Quick Start

```bash
# Backend
cd danz-backend-experimental
pnpm install && pnpm run dev

# Frontend (Web)
cd danz-web
bun install && bun run dev

# Frontend (Miniapp)
cd danz-miniapp
bun install && bun run dev
```

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  danz-web   │  │ danz-miniapp│  │  prototypes │          │
│  │  (Next.js)  │  │ (Farcaster) │  │   (HTML)    │          │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘          │
└─────────┼────────────────┼──────────────────────────────────┘
          │   GraphQL      │
          └───────┬────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Apollo Server + Express                 │    │
│  │   Users │ Events │ Achievements │ Social │ Upload   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Supabase   │  │   AWS S3    │  │   Stripe    │          │
│  │ PostgreSQL  │  │   Storage   │  │  Payments   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Core Tables

| Table | Description | Records |
|-------|-------------|---------|
| `users` | User profiles, subscriptions, stats | - |
| `events` | Dance events with location, pricing | - |
| `event_registrations` | Event signups with payment status | - |
| `achievements` | Unlocked achievements with rewards | - |
| `dance_bonds` | Social connections between dancers | - |
| `feed_posts` | Social feed with media | - |
| `notifications` | Push notifications | - |

## Documentation Sections

### [Guide](/guide/getting-started)
Setup instructions, development workflows, and code conventions.

### [Architecture](/architecture/overview)
System design, data flow diagrams, and security architecture.

### [API Reference](/api/graphql)
Complete GraphQL schema with queries, mutations, and types.

### [Database](/database/schema)
PostgreSQL schema, table relationships, and indexes.

### [Frontend](/frontend/danz-web)
Next.js applications for web and Farcaster miniapp.

### [Prototypes](/prototypes/overview)
Landing page design variations and styling approaches.

### [Deployment](/deployment/infrastructure)
CI/CD pipelines, hosting configuration, and environment variables.
