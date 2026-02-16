# FlowB Telegram Auth + Points Integration Plan

## Architecture Overview

```
Telegram User taps /start
       |
       v
Bot gets telegram_id (from ctx.from.id)
       |
       v
[1] Privy API lookup: GET user by telegram_user_id
       |
   +---+---+
   |       |
 FOUND   NOT FOUND
   |       |
   v       v
Auto-verify   [2] Send "Connect" button
(privy_id     (opens DANZ Mini-App)
 cached)           |
   |               v
   v         User logs in via Privy
Points +     Telegram auto-linked
greeting           |
                   v
              [3] Next message: bot re-checks
              Privy -> now FOUND -> verified
```

## Existing Tables (Supabase)

| Table | Columns We Use | Status |
|-------|---------------|--------|
| `users` | privy_id, username, display_name, xp, level | EXISTS |
| `pending_verifications` | code, platform, platform_user_id, danz_privy_id, verified_at | EXISTS |
| `user_wallets` | privy_id, wallet_address, chain | EXISTS |
| `payout_claims` | privy_id, challenge_id, amount_usdc, status | EXISTS |
| `flowb_user_points` | user_id, platform, total_points, current_streak, referral_code | EXISTS |
| `flowb_points_ledger` | user_id, platform, action, points, metadata | EXISTS |

No new tables needed. We just need `telegram_user_id` stored somewhere.
Options:
- (a) Store in `pending_verifications` (already has platform_user_id)
- (b) Privy already stores it - just use their API to map telegram_id -> privy_id
- **Winner: (b)** - Privy is the source of truth for identity linking

## New Env Vars

```
PRIVY_APP_ID=<from DANZ Privy dashboard>
PRIVY_APP_SECRET=<from DANZ Privy dashboard>
FLOWB_TELEGRAM_BOT_TOKEN=<from @BotFather>
```

## Implementation Steps

### Phase 1: Privy Auto-Verify (FlowB side)

#### Step 1.1: Create Privy client utility
**File: `src/services/privy.ts`** (~80 lines)

Zero-dep Privy API client (matches our pattern - raw fetch, no SDK):
- `lookupByTelegramId(telegramUserId: string): Promise<PrivyUser | null>`
  - `GET https://auth.privy.io/api/v2/users/telegram:{telegramUserId}`
  - Basic Auth: `{PRIVY_APP_ID}:{PRIVY_APP_SECRET}`
  - Header: `privy-app-id: {PRIVY_APP_ID}`
  - Returns: `{ id, linked_accounts: [{ type: "telegram", telegram_user_id, ... }] }`
- `lookupByPrivyId(privyId: string): Promise<PrivyUser | null>`
  - `GET https://auth.privy.io/api/v2/users/{privyId}`
  - Returns linked accounts including telegram, wallet, farcaster, etc.
- Interface: `PrivyUser { id: string; linked_accounts: PrivyLinkedAccount[] }`
- Interface: `PrivyLinkedAccount { type: string; telegram_user_id?: string; address?: string; ... }`

#### Step 1.2: Add Privy config to FlowB
**File: `src/core/types.ts`**
- Add `PrivyConfig { appId: string; appSecret: string }` interface
- Add `privy?: PrivyConfig` to FlowBConfig.plugins

**File: `src/config.ts`**
- Load PRIVY_APP_ID and PRIVY_APP_SECRET from env

#### Step 1.3: Auto-verify middleware in Telegram bot
**File: `src/telegram/bot.ts`**

Add to session state:
```typescript
interface TgSession {
  // ...existing fields...
  privyId?: string;      // cached Privy user ID
  danzUsername?: string;  // cached DANZ username
  verified: boolean;      // whether user is verified
}
```

New function: `ensureTelegramVerified(tgId, core)`
1. Check session cache -> if verified, return immediately
2. Call `privy.lookupByTelegramId(String(tgId))`
3. If found -> extract privy_id -> query DANZ `users` table by privy_id -> cache username
4. If not found -> return null (user needs to connect)
5. Cache result in session (avoid repeated API calls)

Wire into bot:
- On /start: run ensureTelegramVerified
  - If verified: "Welcome back @username!" + menu
  - If not: "Connect your DANZ account to unlock everything" + Connect button
- On every command: auto-check verification, pass privy_id to core.execute()

#### Step 1.4: Connect button (Mini-App)
**File: `src/telegram/cards.ts`**

Add:
- `buildConnectKeyboard()` - InlineKeyboard with:
  - `[Connect DANZ Account]` -> login_url pointing to danz.now/connect?from=telegram
  - `[Browse Events]` -> mn:events (works without verification)
  - `[Help]` -> mn:help

The login_url uses Telegram's built-in Login Widget which:
1. Opens danz.now/connect in an in-app browser
2. User logs in with Privy (which now has Telegram enabled)
3. Privy auto-links their Telegram account
4. Next time bot checks -> Privy lookup succeeds -> verified!

### Phase 2: Points Plugin

#### Step 2.1: Create Points plugin
**File: `src/plugins/points/index.ts`** (~200 lines)

```typescript
export class PointsPlugin implements FlowBPlugin {
  id = "points";
  name = "FlowB Points";
  actions = {
    "my-points": { description: "Check your points balance" },
    "my-referral": { description: "Get your referral link" },
    "points-history": { description: "View recent points activity" },
  };
}
```

Uses existing Supabase tables (`flowb_user_points`, `flowb_points_ledger`).

Methods:
- `getBalance(userId, platform)` -> total points, streak, level, referral code
- `awardPoints(userId, platform, action, points, metadata?)` -> insert ledger + update total
- `getReferralCode(userId, platform)` -> generate or return existing 8-char code
- `updateStreak(userId, platform)` -> check last activity, increment or reset streak

Point values per action:
| Action | Points | Daily Cap |
|--------|--------|-----------|
| message_sent | 1 | 50 |
| events_viewed | 2 | 20 |
| event_saved | 3 | 30 |
| search | 2 | 20 |
| challenge_viewed | 1 | 10 |
| verification_complete | 25 | once |
| referral_click | 3 | 30 |
| referral_signup | 10 | 50 |
| daily_login | 5 | once/day |
| streak_3 | 10 | once |
| streak_7 | 25 | once |
| streak_30 | 100 | once |

#### Step 2.2: Wire points into Telegram bot
**File: `src/telegram/bot.ts`**

After every user interaction:
```typescript
// Award points for interaction
await pointsPlugin.awardPoints(userId(tgId), "telegram", "message_sent", 1);
```

After event views: +2, after saves: +3, on verification: +25

Show points in callback query answers:
```
"Saved: ETHDenver Bash (+3 pts)"
```

#### Step 2.3: Register points plugin in FlowBCore
**File: `src/core/flowb.ts`**
- Import and register PointsPlugin (NOT an EventProvider, just FlowBPlugin)
- Points plugin reuses DANZ Supabase credentials

### Phase 3: DANZ Web - Social Verification (Roadmap)

> This is the DANZ.Now web app side, not FlowB bot side.
> Noting here for completeness.

#### 3.1: Privy Social Linking on DANZ.Now
- Enable Telegram login in Privy dashboard [USER DOING NOW]
- Enable other social logins: Farcaster, Discord, Twitter/X, GitHub
- Privy handles the OAuth flows, stores linked_accounts
- DANZ.Now profile page shows verified socials with checkmarks

#### 3.2: Verification Badges
- Query `privy.user.linked_accounts` to show which socials are connected
- Display verified badges: Telegram, Farcaster, Discord, Twitter, Wallet
- Each new social link = bonus points (10 pts per social)

#### 3.3: FlowB Cross-Platform Identity
- When user is verified on Telegram, check if they're also on Farcaster
- Privy becomes the single identity layer across all platforms
- FlowB bot can show: "You're also connected on Farcaster as @username"

## File Summary

### New Files
| File | Lines | Purpose |
|------|-------|---------|
| `src/services/privy.ts` | ~80 | Zero-dep Privy API client |
| `src/plugins/points/index.ts` | ~200 | Points gamification plugin |

### Modified Files
| File | Changes |
|------|---------|
| `src/core/types.ts` | Add PrivyConfig, add privy to FlowBConfig |
| `src/config.ts` | Load PRIVY_APP_ID, PRIVY_APP_SECRET |
| `src/core/flowb.ts` | Register PointsPlugin |
| `src/telegram/bot.ts` | Add ensureTelegramVerified, points integration, connect button |
| `src/telegram/cards.ts` | Add buildConnectKeyboard(), verified greeting |
| `package.json` | No changes (zero-dep Privy client) |

## Verification Checklist

- [ ] Privy Telegram login enabled in DANZ dashboard
- [ ] PRIVY_APP_ID + PRIVY_APP_SECRET set as env vars
- [ ] FLOWB_TELEGRAM_BOT_TOKEN set
- [ ] Bot domain set in @BotFather (/setdomain)
- [ ] /start shows auto-verified greeting (if user has Telegram linked in Privy)
- [ ] /start shows Connect button (if user NOT in Privy)
- [ ] Connect button opens danz.now login, Telegram gets linked
- [ ] After connecting, next /start shows verified greeting
- [ ] Points awarded for every interaction
- [ ] /my-points shows balance
- [ ] Points toast on save button clicks
