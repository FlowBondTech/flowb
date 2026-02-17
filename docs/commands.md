---
title: Telegram Bot Commands
description: Complete reference for all commands available in the FlowB Telegram bot.
---

# FlowB Telegram Bot Commands

Complete reference for all commands available in the FlowB Telegram bot (@Flow_b_bot).

---

## Core Commands

### /start

Begin or return to the main menu. Shows your points balance, streak, and the main action buttons.

If you are not yet verified, shows a connect prompt with a link to verify your account.

**Deep links**: The `/start` command also handles invite deep links:

- `?start=f_CODE` -- Accept a friend's flow invite
- `?start=g_CODE` -- Join a crew via invite code
- `?start=gi_CODE` -- Join a crew via personal tracked invite
- `?start=ref_CODE` -- Track a referral signup
- `?start=points` -- Jump directly to your points view

**Example**:
```
/start
```

---

### /events

Browse EthDenver events in a swipeable card format. Each card shows the event title, date, time, venue, and category.

**With arguments**: Search for specific events using natural language.

**Examples**:
```
/events
/events defi workshops
/events salsa in Denver
/events free events tonight
```

**Inline keyboard**:
- Left/Right arrows to navigate cards
- "Going" / "Maybe" to RSVP
- "Who's going" to see flow attendance
- Category filter button
- Date filter button
- Share button
- Save button
- Link to event page

---

### /search [query]

Search for events by keyword. Works like `/events` with arguments but is more explicit about search intent.

**Examples**:
```
/search yoga
/search workshops this weekend
/search dance events tonight
```

---

### /crew

Manage your crews. Without arguments, shows your crew list and the crew menu.

**Subcommands**:

| Subcommand | Usage | Description |
|------------|-------|-------------|
| (none) | `/crew` | Show crew list and menu buttons |
| create | `/crew create Crew Name` | Create a new crew |
| list | `/crew list` | List all your crews |
| members | `/crew members GROUP_ID` | Show members of a crew |
| invite | `/crew invite GROUP_ID` | Get a personal tracked invite link |
| leave | `/crew leave GROUP_ID` | Leave a crew |

**Examples**:
```
/crew
/crew create Wolf Pack
/crew create Salsa Wolves
/crew members abc12345
/crew invite abc12345
/crew leave abc12345
```

**Inline keyboard** (from crew menu):
- "Create Crew" -- Prompts for crew name
- "My Crews" -- Lists your crews with detail buttons
- "Browse Crews" -- Discover public crews
- Per-crew buttons: Members, Invite, Settings, Leave

**Crew settings** (via inline buttons):
- Toggle public/private visibility
- Set join mode: Open / Approval / Closed
- Promote/demote members (creator only)

---

### /flow

Your personal flow -- friends and crews overview. Shows a menu with options for managing your social connections.

**Example**:
```
/flow
```

**Inline keyboard**:
- "Share Link" -- Your personal invite link
- "My Flow" -- List friends and crews
- "Who's Going" -- Flow members' event plans
- "My Schedule" -- Your upcoming RSVPs
- "Crews" -- Crew management

---

### /share

Share your personal flow invite link. Anyone who taps the link becomes your friend on FlowB and you can see each other's event plans.

**Example**:
```
/share
```

**Inline keyboard**:
- "Copy Link" -- Sends the raw link for easy copying
- "Share" -- Opens Telegram's share dialog

---

### /going

View your schedule or RSVP to the event you are currently viewing.

Without arguments: shows your upcoming RSVP'd events (same as `/schedule`).

When viewing an event card: RSVPs to that event.

**Example**:
```
/going
```

---

### /whosgoing

See which friends and crew members are going to upcoming events. Shows a grouped view by event with names of people who are going or marked as maybe.

**Example**:
```
/whosgoing
```

---

### /schedule

Your upcoming RSVP'd events. Shows event names, dates, times, and venues for everything you have marked as "going" or "maybe".

**Example**:
```
/schedule
```

---

### /points

View your points balance, current streak, longest streak, milestone level, and progress to the next level.

**Example**:
```
/points
```

---

### /referral

Get your personal referral link. Share it to earn +3 points per click and +10 points per signup.

**Example**:
```
/referral
```

---

### /help

Show help text with available commands and what FlowB can do.

**Example**:
```
/help
```

---

### /register

Works in both DMs and group chats. If you are already connected, confirms your status. If not, shows a button to verify your account.

**Example**:
```
/register
```

---

## Additional Commands

### /app

Open the FlowB Telegram mini app for a richer visual experience (when configured).

### /checkin

Check in at a current event. Shows today's events with check-in buttons, then prompts you to select a dance move or upload a proof photo.

### /wallet [address]

Link your Base network wallet address for on-chain rewards.

### /rewards

View your rewards status and claim available rewards (requires linked wallet).

### /menu

Show the main menu with all action buttons.

---

## Natural Language

The bot understands natural language in DMs and when mentioned in groups. You do not need to use slash commands.

**Event queries**:
- "events in Denver"
- "what's happening tonight"
- "defi workshops this weekend"

**Flow queries**:
- "my flow" or "friends" or "crew"
- "who's going"
- "my schedule"
- "share" or "invite"

**Farcaster queries**:
- "fc" or "farcaster" -- Farcaster menu
- "fc trending" -- Trending casts
- "fc profile dwr" -- Look up a Farcaster profile

**Group behavior**: In groups, the bot only responds when mentioned by name (@Flow_b_bot) or when "flowb" appears in the message. Points are still tracked for all group messages and replies.

---

## Inline Keyboard Flows

### Event Browsing Flow

```
/events
  -> [Card 1 of N]
     -> [< Prev] [1/N] [Next >]
     -> [Going] [Maybe] [Who's Going]
     -> [Category] [Date] [Share] [Save]
     -> [Open Link]

  -> Tap [Category]
     -> [All] [Social] [Workshop] [Panel] ...
     -> Select one -> Returns to filtered cards

  -> Tap [Going]
     -> "You're going! [Event Name]"
     -> Shows flow attendance badge
     -> Notifies friends and crew in background
```

### Crew Creation Flow

```
/crew create Wolf Pack
  -> "Wolf Pack created!"
  -> Share link: flowb.me/g/abc123
```

### Crew Join (Approval Mode) Flow

```
User taps flowb.me/g/abc123
  -> "Your request to join Wolf Pack has been submitted."

Admin receives DM:
  -> "@username wants to join Wolf Pack"
  -> [Approve] [Deny]

  -> Tap [Approve]
     -> Admin sees: "Approved - @username has been added"
     -> User receives: "You're in! Your request was approved."
```

### Friend Invite Flow

```
/share
  -> "Share this link with friends:"
  -> flowb.me/f/xyz789
  -> [Copy Link] [Share]

Friend taps link:
  -> "You're in the flow!"
  -> Both users now see each other's event plans
```
