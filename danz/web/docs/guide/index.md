# Developer Guide

Welcome to the DANZ Platform Developer Guide. This comprehensive documentation will help you build, integrate, and deploy applications within the DANZ dance-to-earn ecosystem.

## Quick Start

<div class="guide-cards">

### New to DANZ?
Start with the fundamentals to understand the platform architecture and get your development environment set up.

- [Getting Started](/guide/getting-started) - Platform introduction
- [Project Overview](/guide/overview) - Architecture overview
- [Tech Stack](/guide/tech-stack) - Technologies we use

### Ready to Build?
Set up your local environment and learn our development conventions.

- [Local Setup](/guide/local-setup) - Environment configuration
- [Code Conventions](/guide/conventions) - Coding standards
- [Workflows](/guide/workflows) - Development workflows

</div>

---

## Core Systems

Understanding the core systems that power the DANZ platform.

| System | Description | Documentation |
|--------|-------------|---------------|
| **Point System** | XP, tokens, and reward calculations | [Point System](/guide/point-system) |
| **Dance Sessions** | Real-time dance tracking and scoring | [API Reference](/api/graphql) |
| **Achievements** | Badges, levels, and gamification | [Achievements API](/api/achievements) |

---

## Integration Guides

Connect external devices and applications with the DANZ platform.

### Wearable Integration
Connect smartwatches and fitness trackers to earn XP from dance movements.

- [Wearable Integration Guide](/guide/wearable-integration) - Complete integration walkthrough
- Supports Apple Watch, Fitbit, Garmin, and more
- Motion data → XP conversion using our scoring algorithm

### Mobile Apps
Build mobile applications that connect to the DANZ ecosystem.

- [Mobile Onboarding](/guide/mobile-onboarding) - Complete setup guide
- Repository access and setup
- TestFlight and Play Store deployment

---

## Platform Components

### Mobile App (danz-app)
React Native Expo app for iOS and Android.

```bash
# Quick start
git clone git@github.com:FlowBondTech/danz-app.git
cd danz-app && npm install
npm start
```

[Full Mobile Onboarding Guide →](/guide/mobile-onboarding)

### Telegram Miniapp (danz-miniapp)
Lightweight Telegram integration for quick dance sessions.

```bash
git clone git@github.com:FlowBondTech/danz-miniapp.git
cd danz-miniapp && npm install
npm run dev
```

[Miniapp API Reference →](/api/miniapp)

### Backend (danz-backend)
GraphQL API server powering all DANZ applications.

```bash
git clone git@github.com:FlowBondTech/danz-backend.git
cd danz-backend && npm install
npm run dev
```

[API Documentation →](/api/graphql)

---

## Learning Paths

### Path 1: Frontend Developer
1. [Getting Started](/guide/getting-started)
2. [Local Setup](/guide/local-setup)
3. [danz-web Documentation](/frontend/danz-web)
4. [danz-app Documentation](/frontend/danz-miniapp)

### Path 2: Backend Developer
1. [Getting Started](/guide/getting-started)
2. [Architecture Overview](/architecture/overview)
3. [GraphQL API](/api/graphql)
4. [Database Schema](/database/schema)

### Path 3: Integration Developer
1. [Getting Started](/guide/getting-started)
2. [Point System](/guide/point-system)
3. [Wearable Integration](/guide/wearable-integration)
4. [API Authentication](/api/authentication)

### Path 4: Mobile Developer
1. [Mobile Onboarding](/guide/mobile-onboarding)
2. [danz-app Documentation](/frontend/danz-miniapp)
3. [Mobile Deployment](/deployment/mobile-testing-deployment)

---

## Need Help?

- **GitHub**: [github.com/FlowBondTech](https://github.com/FlowBondTech)
- **Discord**: [discord.gg/danz](https://discord.gg/danz)
- **Twitter**: [@danzxyz](https://twitter.com/danzxyz)

