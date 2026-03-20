# DANZ Dance Party System
## Social Dance-to-Earn on Base via Farcaster

---

## Executive Summary

The Dance Party System transforms solo dancing into a social, viral experience. Users create or join "dance parties" where the collective energy of multiple dancers multiplies everyone's rewards. Integrated with Farcaster for seamless social sharing, parties become viral loops that drive organic growth.

**Key Value Propositions:**
- **For Dancers**: Earn up to 2x more XP by dancing with friends
- **For Hosts**: Additional 10% bonus for organizing parties
- **For DANZ**: Viral growth through Farcaster casts

---

## How It Works

### The Core Loop

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   1. CREATE PARTY                                            │
│      User creates a dance party with a theme                 │
│                         ↓                                    │
│   2. CAST INVITE                                             │
│      Share party link on Farcaster/Warpcast                  │
│                         ↓                                    │
│   3. FRIENDS JOIN                                            │
│      Followers see cast and join the party                   │
│                         ↓                                    │
│   4. DANCE TOGETHER                                          │
│      Everyone dances, earning multiplied XP                  │
│                         ↓                                    │
│   5. SHARE RESULTS                                           │
│      Post rewards to Farcaster → New users discover DANZ     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Bonus Multiplier System

The more people in your party, the more everyone earns:

| Party Size | Multiplier | Solo Equivalent |
|:----------:|:----------:|:---------------:|
| 1 dancer   | 1.0x       | 100%            |
| 2 dancers  | 1.2x       | 120%            |
| 3 dancers  | 1.5x       | 150%            |
| 4 dancers  | 1.8x       | 180%            |
| 5+ dancers | 2.0x       | 200%            |

### Additional Bonuses

| Bonus Type   | Amount | Condition                    |
|:-------------|:------:|:-----------------------------|
| Host Bonus   | +10%   | You created the party        |
| Streak Bonus | +5%/day| Consecutive party days (max 50%) |

---

## Rewards Calculation

### Example: Party Host with 4 Dancers

```
Base XP from dancing:           100 XP
Party Multiplier (1.8x):       + 80 XP
Host Bonus (10%):              + 10 XP
─────────────────────────────────────
Total XP Earned:                190 XP
DANZ Tokens (XP × 0.1):        19.0 DANZ
```

### Example: Party Member with 4 Dancers

```
Base XP from dancing:           100 XP
Party Multiplier (1.8x):       + 80 XP
─────────────────────────────────────
Total XP Earned:                180 XP
DANZ Tokens (XP × 0.1):        18.0 DANZ
```

---

## User Journey

### Flow Diagram

```
┌─────────────┐
│   HOME      │
│  Dashboard  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   BROWSE    │────▶│   CREATE    │
│  Parties    │     │   Party     │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │   WAITING   │◀─── Cast Invite
       │            │    Room     │     on Farcaster
       │            └──────┬──────┘
       │                   │
       ▼                   │
┌─────────────┐            │
│    JOIN     │────────────┘
│   Party     │
└─────────────┘
       │
       ▼
┌─────────────┐
│   ACTIVE    │ ◀─── Live stats, multiplier display
│   Party     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  COMPLETE   │ ◀─── Rewards breakdown, share results
│  + Rewards  │
└─────────────┘
```

---

## Party States

| State     | Description                                      |
|:----------|:-------------------------------------------------|
| `waiting` | Party created, waiting for dancers to join       |
| `active`  | Dance session in progress, tracking moves        |
| `ended`   | Session complete, rewards distributed            |

---

## Farcaster Integration

### Cast Invite Example

When a user taps "Cast Invite on Farcaster," we compose:

```
🎊 Join my dance party on DANZ! We're dancing Hip Hop

Earn 1.5x XP when you dance together!

Join here: https://danz.fun/party/abc123
```

### Viral Mechanics

1. **Discovery**: Followers see party invites in their feed
2. **FOMO**: "Only 2 spots left!" creates urgency
3. **Social Proof**: See friends' party results and rewards
4. **Shareability**: One-tap sharing of party achievements

---

## Technical Architecture

### Data Model

**DanceParty**
```
{
  id:              Unique party identifier
  name:            Party name (e.g., "Friday Night Groove")
  hostId:          Creator's user ID
  host:            Host member object
  members:         Array of party members
  maxMembers:      Maximum capacity (default: 5)
  isPublic:        Visible in browse list
  castHash:        Farcaster cast hash for tracking
  status:          waiting | active | ended
  bonusMultiplier: Current XP multiplier
  danceStyle:      Optional style tag
  startedAt:       Session start timestamp
  endedAt:         Session end timestamp
  totalXp:         Combined party XP earned
}
```

**PartyMember**
```
{
  id:           User ID
  fid:          Farcaster ID (for social features)
  username:     Display username
  displayName:  Full display name
  avatarUrl:    Profile picture
  xpEarned:     Individual XP earned
  moves:        Move count detected
  isHost:       Host flag
  isActive:     Currently dancing
  joinedAt:     Join timestamp
}
```

---

## UI Components

### Navigation
```
┌────────┬────────┬────────┬────────┬────────┐
│  Home  │ Dance  │ Party  │ Wallet │Profile │
│   🏠   │   🎵   │   🎊   │   💎   │   👤   │
└────────┴────────┴────────┴────────┴────────┘
```

### Screen Components

| Screen          | Components                                    |
|:----------------|:----------------------------------------------|
| Browse Parties  | Party cards, create button, bonus info        |
| Create Party    | Name input, style selector, public toggle     |
| Waiting Room    | Member list, multiplier display, cast button  |
| Active Party    | Timer, live stats, member status, end button  |
| Party Complete  | Rewards breakdown, share button               |

---

## Growth Mechanics

### Network Effects
- **More friends = More XP**: Direct incentive to invite
- **Host rewards**: Motivates party creation
- **Leaderboards**: Party XP counts toward rankings

### Viral Loops
```
User creates party
       ↓
Casts invite on Farcaster
       ↓
Followers join → Higher multiplier
       ↓
Everyone shares results
       ↓
New users discover DANZ
       ↓
New users create parties... (cycle repeats)
```

### Urgency & Scarcity
- "2 spots left!" messaging
- Limited party sizes create exclusivity
- Time-limited party sessions

---

## Future Roadmap

### Phase 1: Core Features (Current)
- [x] Party creation and joining
- [x] Bonus multiplier system
- [x] Farcaster cast integration
- [x] Live party stats
- [x] Rewards calculation

### Phase 2: Enhanced Social
- [ ] Party chat during sessions
- [ ] Reactions and emotes
- [ ] Party history and replays
- [ ] Follow favorite party hosts

### Phase 3: Gamification
- [ ] Daily challenges ("Dance with 5 people")
- [ ] Party achievements and badges
- [ ] Streak rewards for consecutive days
- [ ] Seasonal party events

### Phase 4: Token Integration
- [ ] DANZ token staking for premium features
- [ ] NFT rewards for party milestones
- [ ] Token-gated exclusive parties
- [ ] Revenue sharing for top hosts

---

## Metrics & Success Criteria

### Key Performance Indicators

| Metric                    | Target      |
|:--------------------------|:------------|
| Parties created per day   | 100+        |
| Avg party size            | 3+ dancers  |
| Cast conversion rate      | 15%+        |
| Repeat party participation| 40%+        |
| DAU increase from parties | 25%+        |

### Tracking Points
- Party creation events
- Cast invite clicks
- Join from cast attribution
- Multiplier distribution
- XP earned via parties vs solo

---

## Summary

The Dance Party System transforms DANZ from a solo experience into a social platform where dancing together is more rewarding than dancing alone. By integrating deeply with Farcaster, we create natural viral loops that drive organic growth while delivering genuine value to users through increased rewards.

**The formula is simple:**
> Dance together. Earn together. Grow together.

---

*Document Version: 1.0*
*Last Updated: December 2024*
*DANZ - Move. Connect. Earn.*
