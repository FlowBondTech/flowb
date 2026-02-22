---
title: Plugins
---

# Plugins

FlowB uses a modular plugin architecture. Each plugin provides actions invokable from the Telegram bot, API, or mini apps. Plugins are loaded by `FlowBCore` at startup.

| Plugin | Class | Actions | Description |
|--------|-------|---------|-------------|
| [Flow](/plugins/flow) | `FlowPlugin` | 25 | Crews, friends, RSVPs, schedules, checkins |
| [Points](/plugins/points) | `PointsPlugin` | 3 | Points, streaks, milestones, leaderboards |
| [Luma Events](/plugins/egator) | `EGatorPlugin` | 5 | Multi-source event discovery |
| [Farcaster](/plugins/neynar) | `NeynarPlugin` | 4 | Farcaster integration via Neynar |
| [DANZ](/plugins/danz) | `DANZPlugin` | 8 | Dance challenges, check-ins, stats |
| [AgentKit](/plugins/agentkit) | `AgentKitPlugin` | 5 | Coinbase onchain wallet actions on Base |

## Plugin Interface

Every plugin implements the `FlowBPlugin` interface:

```typescript
interface FlowBPlugin {
  id: string
  name: string
  description: string
  actions: Record<string, { description: string; requiresAuth?: boolean }>
  configure(config: any): void
  isConfigured(): boolean
  execute(action: string, input: ToolInput, context: FlowBContext): Promise<string>
}
```

Plugins are registered in `src/core/flowb.ts` and can be enabled/disabled via the admin API.
