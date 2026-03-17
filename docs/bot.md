---
title: Telegram Bot
---

# Telegram Bot Commands

The FlowB Telegram bot (`@Flow_b_bot`) provides the primary user interface for discovering events, managing crews, and earning points.

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Begin or return to the main menu. Handles deep link invites. |
| `/menu` | Show the main menu with all action buttons |
| `/app` | Open the FlowB Telegram mini app |
| `/events` | Browse events in swipeable card format |
| `/search` | Search events by keyword |
| `/mylist` | View your saved events |
| `/checkin` | Check in at a current event |
| `/moves` | View available dance move challenges |
| `/points` | View your points, streak, and milestone level |
| `/referral` | Get your personal referral link |
| `/wallet` | Link your Base wallet for on-chain rewards |
| `/rewards` | View and claim available rewards |
| `/challenges` | View active challenges |
| `/flow` | Manage your flow — friends and crews overview |
| `/share` | Share your personal flow invite link |
| `/crew` | Manage crews — create, list, invite, settings |
| `/going` | RSVP to an event or view your schedule |
| `/whosgoing` | See which friends and crew are going to events |
| `/schedule` | View your upcoming RSVP'd events |
| `/wheremycrew` | See real-time check-in locations of your crew members |
| `/onbooths` | Admin: create QR check-in booth. Usage: `/onbooths Name \| floor \| zone` |
| `/sponsor` | View your USDC sponsorships or get the sponsor wallet address |
| `/topsponsor` | View public leaderboard of top-sponsored booths by USDC amount |
| `/leaderboard` | View global crew + individual leaderboards (top 10 each) |
| `/meet` | Create a meeting from natural language. Usage: `/meet Coffee with Sarah tomorrow` |
| `/meetings` | View your upcoming and recent meetings |
| `/lead` | Add or manage leads. Usage: `/lead add Sarah CEO at StartupX` |
| `/leads` | View your leads list with pipeline stages |
| `/pipeline` | View your deal pipeline as a funnel |
| `/biz` | Business dashboard — quick actions, links to kanban and biz dashboard |
| `/earnings` | View referral commissions, pending payouts, and earning history |
| `/todo` | View and manage project todos. Usage: `/todo add Fix login bug` |
| `/help` | Show available commands and help text |
| `/register` | Verify your account or check status |
| `/whatsup` | Social feed — what's happening now (check-ins, trending events, hot venues) |
| `/afterparty` | Find after-party events and late-night plans |
| `/whoshere` | See who from your flow is currently checked in nearby |
| `/whatsnew` | View recent changelog / what's new (aliases: `/changelog`, `/updates`) |
| `/addmyevent` | Submit a community event (aliases: `/addevent`, `/submitevent`) |
| `/suggestfeature` | Submit a feature suggestion (alias: `/addfeature`) |
| `/automations` | View your trigger-action automations and their run stats |
| `/reportbug` | Report a bug — describe the issue and it gets sent to the team |
| `/egator` | Admin: event scanner stats, scan control, city management |
| `/admin` | Admin: system management commands |

## Deep Links

These are triggered via `https://t.me/Flow_b_bot?start={prefix}_{code}` or through `flowb.me/{prefix}/{code}` short links.

| Prefix | URL Pattern | Purpose |
|--------|-------------|----------|
| `f_` | `flowb.me/f/{code}` | Personal flow invite — connects two users as friends |
| `g_` | `flowb.me/g/{code}` | Crew join — joins a crew via its public code |
| `gi_` | `flowb.me/gi/{code}` | Tracked crew invite — joins via personal invite link with attribution |
| `m_` | `flowb.me/m/{code}` | Meeting — opens meeting detail and RSVP |
| `checkin_` | `flowb.me/checkin/{code}` | Check-in — triggers check-in at a location |
| `ref_` | `flowb.me/ref/{code}` | Referral — tracks referral signup |
| `crew_` | `flowb.me/crew/{code}` | Crew join (alternate) |
| `points` | `?start=points` | Jump directly to points view |

## Callback Actions

Inline keyboard callbacks used throughout the bot:

**Navigation**: `back`, `menu`, `next`, `prev`, `noop`

**Events**: `browse`, `fcat`, `fdate`, `setcat`, `setdate`, `going`, `maybe`, `rsvp`, `save`, `share`, `trending`, `whos`, `whos-going`, `schedule`, `view`, `luma`

**Crews**: `crew`, `crew-create`, `crew-invite`, `crew-leave`, `crew-list`, `crew-members`, `join-mode`, `join-request`, `toggle-public`, `promote`, `demote`, `approve`, `deny`

**Meetings**: `meet`, `complete`, `history`

**Business**: `pipeline`, `stage`, `lead`, `advance`

**General**: `a`, `d`, `t`, `add`, `cancel`, `claim`, `copy-link`, `del`, `edit`, `list`, `new`, `profile`, `settings`, `submit`

---

*Updated from `src/telegram/bot.ts` on 2026-03-17*
