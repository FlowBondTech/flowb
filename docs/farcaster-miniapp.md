---
title: Farcaster Mini App
---

# Farcaster Mini App

The Farcaster mini app (`miniapp/farcaster/`) is a Next.js static export deployed to `flowb-farcaster.netlify.app`. It runs inside Warpcast and Base using the `@farcaster/miniapp-sdk`.

## SDK Helpers

All Farcaster SDK interactions live in `miniapp/farcaster/src/lib/farcaster.ts`.

### Initialization

| Function | Description |
|----------|-------------|
| `initFarcaster()` | Init SDK, detect client (Warpcast/Base), return `{ fid, username, added }` |
| `isInMiniApp()` | Detect mini app context (SDK check + iframe/UA fallbacks) |
| `getClientType()` | Returns `"warpcast"` \| `"base"` \| `"unknown"` |

### Authentication

| Function | Description |
|----------|-------------|
| `quickAuth()` | Get a JWT via Quick Auth (verified server-side, no external API calls) |
| `promptAddMiniApp()` | Prompt user to favorite the mini app and enable notifications |

### Cast Interactions

| Function | Params | Description |
|----------|--------|-------------|
| `composeCast(text, embeds?)` | text: string, embeds: string[] | Open native composer with text and optional embed URLs |
| `replyCast(parentHash, text?)` | parentHash: string | Open composer as a reply to a cast. Falls back to `viewCast` |
| `quoteCast(castUrl, text?)` | castUrl: string | Open composer with the cast URL embedded (quote-cast) |
| `viewCast(hash, authorUsername?)` | hash: string | Open a cast in the native client (for liking, viewing thread) |
| `viewProfile(fid)` | fid: number | Open a user profile in the native client |

### Utilities

| Function | Description |
|----------|-------------|
| `openUrl(url)` | Open URL via SDK, falls back to `window.open` |
| `getCastUrl(username, hash)` | Build cast permalink for current client (Warpcast or Base) |
| `getProfileUrl(username)` | Build profile URL for current client |
| `shareToX(text, url?)` | Open Twitter/X compose intent |
| `copyToClipboard(text)` | Copy text to clipboard |

## Client Detection

The SDK auto-detects whether the app is running in Warpcast or Base:

1. SDK context `clientFid` (Warpcast = 9152)
2. User agent sniffing (`warpcast` / `base`)
3. Referrer URL (`warpcast.com` / `base.org`)

URLs are built accordingly:
- **Warpcast**: `warpcast.com/{username}/{hash}`
- **Base**: `farcaster.xyz/{username}/{hash}`

## Feed Component

`EthDenverFeed.tsx` renders the EthDenver Farcaster feed with per-cast action buttons:

- **Reply** - opens native composer via `replyCast()`
- **Recast** - opens composer with embedded cast URL via `quoteCast()`
- **Like** - opens cast in native client via `viewCast()` (SDK doesn't expose a like action)
- **Author tap** - opens profile via `viewProfile()`

## Deployment

```bash
cd miniapp/farcaster
npm run build
npx netlify-cli deploy --prod --dir=out --no-build --site 67ccf00b-6b89-4980-930f-00e8ccc1fc39
```

---

*Auto-generated on 2026-02-19*
