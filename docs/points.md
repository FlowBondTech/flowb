---
title: Points System
description: Everything about earning points, building streaks, and climbing the FlowB leaderboard at EthDenver.
---

# FlowB Points System

Everything you need to know about earning points, building streaks, and climbing the leaderboard at EthDenver.

---

## How Points Work

Every meaningful action you take in FlowB earns points. Points accumulate toward milestone levels and contribute to your crew's leaderboard ranking. Each action has a daily cap to keep things fair.

---

## Points Table

### Social and Flow Actions

| Action | Points | Daily Cap | Notes |
|--------|--------|-----------|-------|
| Flow invite sent | 2 | 20 | Sharing your personal flow link |
| Flow accepted | 15 | 30 | Someone joins your flow |
| Crew created | 20 | 20 | One-time per crew |
| Crew joined | 10 | 30 | Joining a crew |
| Crew invite sent (member) | 2 | 20 | Regular members sharing crew link |
| Crew invite sent (admin) | 1 | 10 | Admins/creators sharing crew link |
| Crew invite converted | 8 | 40 | Someone joins via your personal invite |
| Crew invite converted (admin) | 3 | 15 | Admin invite conversion |
| Crew request approved | 5 | 25 | Your join request gets approved |
| Friend meetup | 10 | 30 | Meeting up with a flow friend |
| Crew meetup | 15 | 30 | Meeting up with crew members |

### Event Actions

| Action | Points | Daily Cap | Notes |
|--------|--------|-----------|-------|
| Events viewed | 2 | 20 | Browsing event cards |
| Event saved | 3 | 30 | Saving an event to your list |
| Event RSVP | 5 | 25 | Marking going or maybe |
| Search | 2 | 20 | Searching for events |

### Daily and Account Actions

| Action | Points | Daily Cap | Notes |
|--------|--------|-----------|-------|
| Daily login | 5 | 5 | Once per day, awarded on first activity |
| Message sent | 1 | 50 | DM interactions with the bot |
| Social linked | 10 | 50 | Linking a social account |
| Verification complete | 25 | 25 | One-time account verification |
| Referral click | 3 | 30 | Someone clicks your referral link |
| Referral signup | 10 | 50 | Someone signs up via your referral |

### Group and Channel Actions

| Action | Points | Daily Cap | Notes |
|--------|--------|-----------|-------|
| Group joined | 15 | 15 | Joining a Telegram group (one-time) |
| Group message | 1 | 30 | Posting in a group chat |
| Group reply | 2 | 20 | Replying to someone in a group |
| Channel reaction | 1 | 20 | Reacting to a channel post |

### Battle and Trading Actions

| Action | Points | Daily Cap | Notes |
|--------|--------|-----------|-------|
| Trade executed | 10 | 50 | Executing a trade |
| Price checked | 1 | 10 | Checking a price |
| Portfolio viewed | 2 | 10 | Viewing your portfolio |
| Battle created | 15 | 30 | Creating a battle |
| Battle joined | 10 | 50 | Joining a battle |
| Battle won | 50 | 200 | Winning a battle |
| Battle participated | 5 | 25 | Participating in a battle |

### Challenge Actions

| Action | Points | Daily Cap | Notes |
|--------|--------|-----------|-------|
| Challenge viewed | 1 | 10 | Viewing a challenge |

---

## Daily Caps

Every action has a daily cap that limits how many points you can earn from that specific action in a single day. Once you hit the cap, additional instances of that action do not award points until the next day (midnight UTC).

Some actions are also marked as "once" -- these can only award points a single time ever (e.g., verification_complete, daily_login, group_joined, crew_created, and all streak bonuses).

---

## Milestone Levels

As you accumulate points, you progress through milestone levels:

| Level | Title | Points Required | What It Means |
|-------|-------|----------------|---------------|
| 1 | **Explorer** | 0 | Just getting started |
| 2 | **Mover** | 50 | Active participant |
| 3 | **Groover** | 150 | Regular contributor |
| 4 | **Dancer** | 500 | Dedicated community member |
| 5 | **Star** | 1,000 | Top-tier engagement |
| 6 | **Legend** | 2,500 | Elite status |

Your milestone level is displayed on your profile and in the `/points` command response. When you reach a new level, your milestone is automatically updated.

### How to Progress

- **Explorer to Mover** (50 pts): Log in for a few days, browse events, join a crew
- **Mover to Groover** (150 pts): RSVP to events, invite friends, stay active
- **Groover to Dancer** (500 pts): Consistent daily activity, grow your crew, build streaks
- **Dancer to Star** (1,000 pts): Lead a crew, complete challenges, maintain long streaks
- **Star to Legend** (2,500 pts): Maximum engagement across all features over the full event

---

## Streaks

Streaks reward consecutive daily activity. Each day you use FlowB, your streak increments by one. If you miss a day, the streak resets to 1.

### How Streaks Work

1. Your first activity each day triggers the streak check
2. If your last active day was yesterday, the streak increments
3. If your last active day was today, nothing changes (already counted)
4. If you missed a day or more, the streak resets to 1
5. Your longest streak is tracked separately and never resets

### Streak Bonuses

Streak bonuses are one-time awards. Once you earn a streak bonus, you cannot earn it again even if your streak resets and reaches the same milestone again.

| Streak Milestone | Bonus Points |
|-----------------|-------------|
| 3 consecutive days | +10 points |
| 7 consecutive days | +25 points |
| 30 consecutive days | +100 points |

### Daily Login Bonus

In addition to streak bonuses, you earn 5 points for daily login. This is awarded once per day on your first interaction.

---

## First-Time Action Bonuses

Certain actions are marked as "once" -- they award points the first time you perform them and never again:

- **Verification complete**: 25 points for verifying your account
- **Daily login**: 5 points (once per day, not once ever)
- **Group joined**: 15 points for joining a Telegram group
- **Crew created**: 20 points for creating your first crew
- **Streak bonuses**: 10/25/100 points for reaching streak milestones

---

## Crew Leaderboard

### How It Works

Each crew has a leaderboard that ranks members by their total points. You can view your crew's leaderboard via the Farcaster mini app or the API.

The leaderboard shows:
- Each member's total points
- Each member's current streak
- Ranking position within the crew

### Tiered Invite Rewards

When you invite someone to your crew using a personal invite link (`flowb.me/gi/{code}`), the points you earn depend on your role:

| Your Role | Points for Sending Invite | Points for Conversion |
|-----------|--------------------------|----------------------|
| Member | 2 | 8 |
| Admin/Creator | 1 | 3 |

This encourages regular members to recruit while preventing admin spam.

---

## Global Crew Ranking

Public crews are ranked globally based on the combined total points of all their members.

**Ranking formula**: Sum of `total_points` for all members in the crew.

The top crews are:
- Displayed in the Farcaster leaderboard casts
- Shown when someone mentions @flowb asking about "leaderboard" or "top crews"
- Visible in the public crew browse feature

---

## Crew Missions

Crew missions are collective goals that encourage coordination:

- **Meetup missions**: Multiple crew members checking in at the same venue earn bonus meetup points (15 pts per crew meetup)
- **Recruitment missions**: Growing your crew through personal invites earns tiered points for both the inviter and the new member
- **RSVP coordination**: When crew members RSVP to the same event, the "who's going" feature helps coordinate and the social proof encourages more attendance

---

## Checking Your Points

### Telegram Bot

Send `/points` to see:
- Your total points
- Current milestone title and level
- Current streak (and longest streak)
- Points needed for the next milestone

### Farcaster Mini App

Open the Points screen to see your balance, streak, level, and visual progress toward the next milestone.

### API

```
GET /api/v1/me/points
Authorization: Bearer <token>

Response:
{
  "points": 245,
  "streak": 5,
  "longestStreak": 12,
  "level": 3
}
```

---

## Tips for Maximizing Points

1. **Log in every day** to build your streak and earn the daily login bonus
2. **Browse events daily** to earn events_viewed points (up to 20/day)
3. **RSVP to events** you plan to attend (5 pts each, up to 25/day)
4. **Share your flow link** with friends at EthDenver (2 pts per share)
5. **Create or join a crew** for one-time bonuses and ongoing meetup points
6. **Use personal invite links** for crew recruitment to earn conversion bonuses
7. **React to channel posts** for easy daily points (1 pt each, up to 20/day)
8. **Keep your streak alive** -- the 30-day bonus alone is worth 100 points
