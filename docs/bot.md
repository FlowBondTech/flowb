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
| `/leaderboard` | — |
| `/meet` | — |
| `/meetings` | — |
| `/poll` | — |
| `/timezone` | — |
| `/lead` | — |
| `/leads` | — |
| `/pipeline` | — |
| `/biz` | — |
| `/earnings` | — |
| `/help` | Show available commands and help text |
| `/todo` | — |
| `/register` | Verify your account or check status |
| `/whatsup` | — |
| `/afterparty` | — |
| `/whoshere` | — |
| `/earnings` | — |
| `/biz` | — |
| `/automations` | — |
| `/reportbug` | — |
| `/egator` | — |
| `/admin` | — |

## Deep Links

These are triggered via `https://t.me/Flow_b_bot?start={prefix}_{code}` or through `flowb.me/{prefix}/{code}` short links.

| Prefix | URL Pattern | Purpose |
|--------|-------------|----------|
| `f_` | `flowb.me/f/{code}` | Personal flow invite — connects two users as friends |
| `g_` | `flowb.me/g/{code}` | Crew join — joins a crew via its public code |
| `gi_` | `flowb.me/gi/{code}` | Tracked crew invite — joins via personal invite link with attribution |
| `m_` | `flowb.me/m/{code}` | — |
| `checkin_` | `flowb.me/checkin/{code}` | — |
| `ref_` | `flowb.me/ref/{code}` | Referral — tracks referral signup |
| `link_` | `flowb.me/link/{code}` | — |
| `crew_` | `flowb.me/crew/{code}` | — |

## Callback Actions

Inline keyboard callbacks used throughout the bot:

**a**: `a`

**add**: `add`

**advance**: `advance`

**ai**: `ai`

**approve**: `approve`

**assign**: `assign`

**back**: `back`

**browse**: `browse`

**cancel**: `cancel`

**chat**: `chat`

**claim**: `claim`

**close**: `close`

**complete**: `complete`

**copy-link**: `copy-link`

**crew**: `crew`

**crew-create**: `crew-create`

**crew-invite**: `crew-invite`

**crew-leave**: `crew-leave`

**crew-list**: `crew-list`

**crew-members**: `crew-members`

**custom**: `custom`

**d**: `d`

**del**: `del`

**demote**: `demote`

**deny**: `deny`

**edit**: `edit`

**f**: `f`

**fcat**: `fcat`

**fdate**: `fdate`

**going**: `going`

**history**: `history`

**idx**: `idx`

**join-mode**: `join-mode`

**join-request**: `join-request`

**kanban**: `kanban`

**list**: `list`

**luma**: `luma`

**maybe**: `maybe`

**meet**: `meet`

**menu**: `menu`

**new**: `new`

**next**: `next`

**noop**: `noop`

**pipeline**: `pipeline`

**prev**: `prev`

**profile**: `profile`

**promote**: `promote`

**regen**: `regen`

**reply**: `reply`

**rsvp**: `rsvp`

**save**: `save`

**schedule**: `schedule`

**send**: `send`

**set**: `set`

**setcat**: `setcat`

**setdate**: `setdate`

**settings**: `settings`

**share**: `share`

**stage**: `stage`

**submit**: `submit`

**t**: `t`

**toggle-public**: `toggle-public`

**trending**: `trending`

**v**: `v`

**view**: `view`

**vote**: `vote`

**whos**: `whos`

**whos-going**: `whos-going`

---

*Auto-generated from `src/telegram/bot.ts` on 2026-04-22 12:17:44 UTC*
