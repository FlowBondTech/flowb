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
| `/events` | Browse EthDenver events in swipeable card format |
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
| `/wheremycrew` | — |
| `/onbooths` | — |
| `/sponsor` | — |
| `/topsponsor` | — |
| `/help` | Show available commands and help text |
| `/register` | Verify your account or check status |

## Deep Links

These are triggered via `https://t.me/Flow_b_bot?start={prefix}_{code}` or through `flowb.me/{prefix}/{code}` short links.

| Prefix | URL Pattern | Purpose |
|--------|-------------|----------|
| `f_` | `flowb.me/f/{code}` | Personal flow invite — connects two users as friends |
| `g_` | `flowb.me/g/{code}` | Crew join — joins a crew via its public code |
| `gi_` | `flowb.me/gi/{code}` | Tracked crew invite — joins via personal invite link with attribution |
| `checkin_` | `flowb.me/checkin/{code}` | — |
| `ref_` | `flowb.me/ref/{code}` | Referral — tracks referral signup |

## Callback Actions

Inline keyboard callbacks used throughout the bot:

**approve**: `approve`

**back**: `back`

**browse**: `browse`

**claim**: `claim`

**copy-link**: `copy-link`

**crew-create**: `crew-create`

**crew-invite**: `crew-invite`

**crew-leave**: `crew-leave`

**crew-list**: `crew-list`

**crew-members**: `crew-members`

**demote**: `demote`

**deny**: `deny`

**fcat**: `fcat`

**fdate**: `fdate`

**going**: `going`

**history**: `history`

**join-mode**: `join-mode`

**join-request**: `join-request`

**list**: `list`

**maybe**: `maybe`

**menu**: `menu`

**next**: `next`

**noop**: `noop`

**prev**: `prev`

**profile**: `profile`

**promote**: `promote`

**save**: `save`

**schedule**: `schedule`

**setcat**: `setcat`

**setdate**: `setdate`

**settings**: `settings`

**share**: `share`

**toggle-public**: `toggle-public`

**trending**: `trending`

**whos**: `whos`

**whos-going**: `whos-going`

---

*Auto-generated from `src/telegram/bot.ts` on 2026-02-18 02:58:57 UTC*
