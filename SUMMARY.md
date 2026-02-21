# FlowB — Your EthDenver Companion

**FlowB** is a privacy-centric event coordination and social platform for EthDenver 2026. It helps attendees discover events, coordinate with friends and crews, and earn rewards — all from one place.

## What It Does

- **Event Discovery**: Aggregates hundreds of events from Luma, Eventbrite, Lemonade, and community sources into a single searchable feed. RSVP, set reminders, and see who from your circle is going.
- **Flow (Friends)**: Connect with people via personal invite links. See each other's event plans instantly.
- **Crews (Squads)**: Create or join groups for your DAO, project team, or squad. Share real-time locations, coordinate meetups, and climb crew leaderboards together.
- **Points & Rewards**: Earn points for RSVPs, invites, streaks, check-ins, and crew meetups. Progress through six milestone levels from Explorer to Legend.

## How It Works

One shared TypeScript backend (Fastify + Supabase/PostgreSQL) powers every interface:

- **Telegram** — Bot + Mini App
- **Farcaster** — Mini App
- **Web** — Static site at flowb.me
- **Mobile** — Native iOS app (Expo React Native)

A modular plugin system (FlowBCore) keeps features decoupled. Core plugins handle event aggregation (eGator), social connections (Flow), gamification (Points), Farcaster integration (Neynar), and check-ins (Danz). New capabilities slot in without touching the core.

## What Makes It Special

1. **Cross-platform by design** — One backend, five interfaces. Switch between Telegram, Farcaster, web, and mobile seamlessly.
2. **Real-time crew coordination** — Live location sharing and crew meetup detection, purpose-built for navigating a massive multi-venue conference.
3. **Privacy-first** — Users control who sees their location and plans through granular visibility settings.
4. **Smart aggregation** — No more juggling five event calendars. One feed, all sources, filterable by category, date, and your social graph.
5. **Gamification that drives utility** — Points reward the exact behaviors (RSVPs, invites, showing up) that make the platform useful for everyone.
