# Farcaster Mini Apps Research

> Research compiled 2026-02-14 for FlowB/eGator EthDenver event coordination app

---

## 1. What Are Farcaster Mini Apps (formerly Frames v2)?

Farcaster Mini Apps are **web applications that render inside Farcaster clients** (Warpcast, Base App, etc.). They evolved from Frames v1 (static image + button cards) into full-screen interactive web apps that live inside the social feed.

**Timeline:**
- Nov 2024: Frames v2 preview launched
- Jan-Feb 2025: Frames v2 stable release
- Early 2025: Rebranded from "Frames v2" to "Mini Apps"
- April 2025: Mini Apps launched in Warpcast navigation
- May 2025: Solana wallet support added
- Jan 2026: Neynar acquired Farcaster

**What they enable:**
- Full-screen web apps embedded in social feeds
- Native wallet integration (Ethereum + Solana) -- no wallet dialogs
- Push notifications for re-engagement
- Access to user identity, social graph, and cast context
- Persistent state across sessions
- Onchain transactions within the app

**How they work:**
1. You build a standard web app (HTML/CSS/JS)
2. Add `fc:miniapp` meta tags to shareable pages (embed metadata)
3. Host a manifest at `/.well-known/farcaster.json` (app identity)
4. Initialize the `@farcaster/miniapp-sdk` to access native features
5. Users discover your app via cast embeds, search, or direct links
6. App renders in a modal/webview inside the Farcaster client

**Display dimensions:**
- Mobile: Device-dictated dimensions (vertical orientation)
- Web: 424x695px fixed modal
- Header shows app name and author
- Host-controlled splash screen hidden via `sdk.actions.ready()`

---

## 2. Tech Stack for Building Farcaster Mini Apps

### Core Requirements

| Component | Recommendation | Notes |
|-----------|---------------|-------|
| Runtime | Node.js 22.11.0+ | LTS required, older versions cause install errors |
| Framework | Next.js 14+ (App Router) | Most templates use this; any web framework works |
| Language | TypeScript | Primary ecosystem language |
| SDK | `@farcaster/miniapp-sdk` | Required for native features |
| Wallet | `@farcaster/miniapp-wagmi-connector` | Recommended for Ethereum wallet |
| Styling | Tailwind CSS + shadcn/ui | Common in templates |

### Installation

```bash
# Scaffold a new project
npm create @farcaster/mini-app

# Or manual installation
npm install @farcaster/miniapp-sdk

# For wallet integration
npm install @farcaster/miniapp-wagmi-connector wagmi viem @tanstack/react-query

# For Solana
npm install @farcaster/mini-app-solana
```

### CDN Alternative (no build step)
```html
<script type="module">
  import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk'
</script>
```

### Project Structure (Next.js Template)

```
my-mini-app/
  app/
    page.tsx                              # Splash screen
    .well-known/farcaster.json/route.ts   # Manifest endpoint
    api/
      webhook/route.ts                    # Notification webhooks
  components/
    pages/app.tsx                         # Main app screen
    Home/
      FarcasterActions.tsx                # Cast composition, profile viewing
      WalletActions.tsx                   # Onchain tx, signing
  public/
    images/
      icon.png                           # 1024x1024 app icon
      splash.png                         # 200x200 splash image
      og-image.png                       # 3:2 ratio embed image
  lib/
    providers.tsx                         # Wagmi + QueryClient providers
```

### Key Ecosystem Tools

| Tool | Purpose |
|------|---------|
| `@farcaster/create-mini-app` | Official scaffold CLI |
| `@neynar/create-farcaster-mini-app` | Neynar quickstart CLI |
| `@farcaster/miniapp-node` | Server-side webhook verification |
| Neynar API | Social graph, notifications management, analytics |
| Frog (frog.fm) | Frames v1 framework (less relevant for Mini Apps) |
| frames.js | Frames v1 framework (less relevant for Mini Apps) |
| Base MiniKit | Coinbase Base-specific Mini App tools |

**Note on Frog and frames.js:** These were built for Frames v1 (static image/button cards). Mini Apps are full web apps and do not require these frameworks. Use them only if you also need v1 frame embeds as a lightweight entry point.

---

## 3. Authentication and User Context

### Automatic Context (No Auth Required)

When a Mini App launches, the SDK provides context about the user and environment automatically:

```typescript
import { sdk } from '@farcaster/miniapp-sdk'

// Initialize and hide splash screen
await sdk.actions.ready()

// Access context
const context = sdk.context

// User info (untrusted -- comes from the client)
context.user.fid          // Farcaster ID (number)
context.user.username     // e.g. "vitalik"
context.user.displayName  // e.g. "Vitalik Buterin"
context.user.pfpUrl       // Profile picture URL
context.user.bio          // Optional bio
context.user.location     // Optional location

// Client info
context.client.platformType    // 'web' | 'mobile'
context.client.clientFid       // Client's FID
context.client.added           // Whether user added this app
context.client.safeAreaInsets  // Mobile safe area
context.client.notificationDetails  // { url, token } if notifications enabled
```

### Launch Location Context

The `context.location` tells you how the app was opened:

```typescript
type LaunchLocation =
  | { type: 'cast_embed'; cast: CastContext }      // Embedded in a cast
  | { type: 'cast_share'; cast: CastContext }       // User shared a cast to your app
  | { type: 'notification'; notification: NotificationContext }  // From a notification
  | { type: 'launcher' }                            // Direct launch from app list
  | { type: 'channel'; channel: ChannelContext }     // From a channel
  | { type: 'open_miniapp'; referrerDomain: string } // From another Mini App
```

### Sign In With Farcaster (Verified Auth)

For trusted authentication (the context user data is untrusted), use the signIn action:

```typescript
import { sdk } from '@farcaster/miniapp-sdk'

// Get a signed credential
const credential = await sdk.actions.signIn({
  // Optional: request specific data
  nonce: 'random-nonce-from-server'
})

// Send credential to your backend for verification
// Backend verifies the signature against Farcaster network state
```

This implements FIP-11 (Sign In With Farcaster) and produces a cryptographically verifiable credential.

### Feature Detection

```typescript
const capabilities = await sdk.getCapabilities()
// Check specific features
capabilities.includes('actions.composeCast')
capabilities.includes('wallet.getEthereumProvider')
capabilities.includes('features.haptics')
```

---

## 4. Launching a Mini App from a Cast

### Step 1: Add Embed Meta Tags to Your Page

```html
<meta name="fc:miniapp" content='{
  "version": "1",
  "image": "https://your-app.com/images/embed.png",
  "button": {
    "title": "Open App",
    "action": {
      "type": "launch_miniapp",
      "url": "https://your-app.com/event/123",
      "splashImageUrl": "https://your-app.com/images/splash.png",
      "splashBackgroundColor": "#1a1a2e"
    }
  }
}' />
<!-- Backward compatibility -->
<meta name="fc:frame" content='...' />
```

**Image requirements:**
- Aspect ratio: 3:2
- Minimum: 600x400px, Maximum: 3000x2000px
- Max file size: 10MB
- Formats: PNG (recommended), JPG, GIF, WebP

**Button title:** Max 32 characters

### Step 2: User Shares URL in a Cast

When a user shares `https://your-app.com/event/123` in a cast:
1. Farcaster client fetches the HTML
2. Reads the `fc:miniapp` meta tag
3. Attaches metadata to the cast (cached -- won't update if you change it later)
4. Renders a card with the 3:2 image and button in the feed

### Step 3: User Taps the Button

1. Splash screen shows (your splash image + background color)
2. App loads in a modal/webview
3. App calls `sdk.actions.ready()` to hide splash
4. `context.location` is `{ type: 'cast_embed', cast: { ... } }`

### Programmatic Cast Composition

Your Mini App can prompt users to create casts with embedded links:

```typescript
const result = await sdk.actions.composeCast({
  text: "Check out this event at EthDenver!",
  embeds: ["https://your-app.com/event/123"],
  channelKey: "ethdenver"  // Post to a specific channel
})

if (result?.cast) {
  console.log('Cast created:', result.cast.hash)
}
```

---

## 5. Native Features Available

### Ethereum Wallet

```typescript
import { sdk } from '@farcaster/miniapp-sdk'

// Get the EIP-1193 provider (or use Wagmi)
const provider = sdk.wallet.getEthereumProvider()

// With Wagmi (recommended):
import { useSendTransaction, useAccount } from 'wagmi'
import { parseEther } from 'viem'

function SendTx() {
  const { address } = useAccount()
  const { sendTransaction } = useSendTransaction()

  return (
    <button onClick={() => sendTransaction({
      to: '0x...',
      value: parseEther('0.01')
    })}>
      Send 0.01 ETH
    </button>
  )
}
```

**Batch transactions (EIP-5792):**
```typescript
import { useSendCalls } from 'wagmi'

// Approve + transfer in a single user confirmation
const { sendCalls } = useSendCalls()
sendCalls({
  calls: [
    { to: tokenAddress, data: approveCalldata },
    { to: contractAddress, data: transferCalldata }
  ]
})
```

**Supported Ethereum chains:** Base, Ethereum Mainnet, Optimism, Arbitrum, Polygon, Zora, Unichain

### Solana Wallet

```typescript
// Solana support (moved from experimental to stable)
const solanaProvider = sdk.wallet.getSolanaProvider()
```

Available via `@farcaster/mini-app-solana` package. Supports Wallet Standard.

### Built-in SDK Actions

```typescript
// Cast composition
await sdk.actions.composeCast({ text, embeds, channelKey, parent, close })

// Navigation
await sdk.actions.openUrl('https://ethdenver.com')
await sdk.actions.viewProfile({ fid: 12345 })
await sdk.actions.viewCast({ hash: '0x...' })

// App management
await sdk.actions.addMiniApp()  // Prompt user to add/install your app
await sdk.actions.close()       // Close the mini app

// Authentication
const credential = await sdk.actions.signIn({ nonce: '...' })

// Wallet actions
await sdk.actions.swapToken({ ... })  // Token swap UI
await sdk.actions.sendToken({ ... })  // Token send UI

// Open another mini app
await sdk.actions.openMiniApp({ domain: 'other-app.com' })
```

### Social Graph (via Neynar API)

The SDK does not directly expose social graph queries, but Neynar provides:

- Follower/following lists
- Mutual connections
- User profile enrichment
- Cast search and retrieval
- Channel membership

```typescript
// Server-side: Neynar API
const response = await fetch(
  `https://api.neynar.com/v2/farcaster/following?fid=${userFid}`,
  { headers: { 'api_key': NEYNAR_API_KEY } }
)
```

### Notifications

Mini Apps can send push notifications to users who have added the app:

```typescript
// Send notification (server-side)
await fetch(notificationUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notificationId: 'event-reminder-ethdenver-2026',
    title: 'EthDenver starts in 1 hour!',    // max 32 chars
    body: '3 of your friends are attending the opening ceremony', // max 128 chars
    targetUrl: 'https://your-app.com/event/ethdenver-opening',
    tokens: [userNotificationToken]  // max 100 per request
  })
})
```

### Device Features

```typescript
// Feature detection
context.features?.haptics        // Haptic feedback support
context.features?.cameraAndMicrophoneAccess  // Camera/mic permission status
```

---

## 6. Sharing and Distribution

### Distribution Channels

1. **Cast Embeds**: Share URLs with `fc:miniapp` meta tags in casts -- renders as rich cards
2. **App Store/Discovery**: Published apps appear in Warpcast's app discovery
3. **Direct Links**: `https://farcaster.xyz/miniapps/<app-id>/<app-slug>`
4. **Share Extensions**: Your app can appear in Farcaster's share sheet
5. **Notifications**: Re-engage users with targeted notifications
6. **Cross-App Links**: Other Mini Apps can link to yours via `openMiniApp()`

### Share Extension Configuration

Your app can receive shared casts from users:

```json
// In farcaster.json manifest
{
  "miniapp": {
    "castShareUrl": "https://your-app.com/share"
  }
}
```

When a user shares a cast to your app:
- URL receives `?castHash=0x...&castFid=123&viewerFid=456`
- SDK context has `location.type === 'cast_share'` with full cast data

### Dynamic Embed Images

Serve personalized/dynamic images for embeds:

```typescript
// Next.js API route for dynamic OG images
import { ImageResponse } from 'next/og'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const eventName = searchParams.get('event')

  return new ImageResponse(
    <div style={{ /* 3:2 ratio layout */ }}>
      <h1>{eventName}</h1>
      <p>Tap to RSVP on Farcaster</p>
    </div>,
    { width: 600, height: 400 }
  )
}
```

### Viral Mechanics (Neynar Guide)

Key patterns for virality:
1. **Social Competition**: Show "3 friends are attending" with leaderboards
2. **Share-to-Claim**: Exclusive rewards for sharing (NFT badges, points)
3. **Smart Cast Composition**: Pre-fill casts with friend tags and achievements
4. **Social FOMO Notifications**: "Your friend just RSVP'd to EthDenver Kickoff"
5. **Dynamic Share Pages**: Personalized OG images ("You're attending with 12 friends!")

---

## 7. SDK and Tools Available

### Official Tools

| Package | Purpose |
|---------|---------|
| `@farcaster/miniapp-sdk` | Client-side SDK for all native features |
| `@farcaster/miniapp-wagmi-connector` | Wagmi connector for wallet integration |
| `@farcaster/miniapp-node` | Server-side webhook verification |
| `@farcaster/create-mini-app` | CLI scaffold tool |
| `@farcaster/mini-app-solana` | Solana wallet integration |

### Third-Party Tools

| Tool | Purpose |
|------|---------|
| Neynar API | Social graph, notifications management, user data |
| `@neynar/create-farcaster-mini-app` | Neynar quickstart scaffold |
| Neynar Starter Kit | Pre-built social features template |
| Neynar Mini App Studio | No-code mini app builder |
| Base MiniKit / OnchainKit | Coinbase Base-specific tooling |
| Dynamic SDK | Alternative auth/wallet provider |
| Privy SDK | Alternative auth/wallet provider |
| Blockaid | Transaction security scanning |

### Development Workflow

1. Enable Developer Mode: `https://farcaster.xyz/~/settings/developer-tools`
2. Developer mode provides:
   - Manifest creation/management
   - Mini App preview tool
   - Embed debugging tool
   - Analytics dashboard
3. Use ngrok for HTTPS tunneling during local dev
4. Test in Warpcast desktop for best dev experience

### Manifest Example (`/.well-known/farcaster.json`)

```json
{
  "accountAssociation": {
    "header": "eyJmaWQiOjEyMzQ1...",
    "payload": "eyJkb21haW4iOiJ...",
    "signature": "MHg..."
  },
  "miniapp": {
    "version": "1",
    "name": "eGator Events",
    "homeUrl": "https://egator.app",
    "iconUrl": "https://egator.app/icon.png",
    "splashImageUrl": "https://egator.app/splash.png",
    "splashBackgroundColor": "#1a1a2e",
    "webhookUrl": "https://egator.app/api/webhook",
    "description": "Discover and coordinate EthDenver events with friends",
    "longDescription": "Find events, RSVP with your crew, and coordinate meetups at EthDenver 2026",
    "screenshotUrls": [
      "https://egator.app/screenshots/events.png",
      "https://egator.app/screenshots/friends.png"
    ],
    "categories": ["social", "utility"],
    "tags": ["events", "ethdenver", "coordination"],
    "requiredChains": ["eip155:8453"],
    "castShareUrl": "https://egator.app/share"
  }
}
```

### Account Association

Generated via Warpcast's Mini App Manifest Tool. Cryptographically proves your Farcaster account owns this domain. Cannot use tunnel domains.

---

## 8. Limitations and Gotchas

### Critical Issues

1. **`sdk.actions.ready()` is mandatory**: If you forget to call this, users see an infinite loading/splash screen. Call it after your app is fully loaded.

2. **Manifest caching**: Farcaster clients cache manifests for up to 24 hours. Changes won't appear immediately. Re-sharing a URL triggers a refresh after ~10 minutes.

3. **Embed data is immutable per cast**: Once a URL's metadata is attached to a cast, it stays cached even if you update the meta tags. New casts will pick up the new data.

4. **No localhost for embeds**: The embed debugging tool only works with remote URLs. You need ngrok or similar for local development.

5. **`addMiniApp()` requires production domain**: Cannot use tunnel domains (ngrok, localtunnel). Your domain must match the manifest exactly.

6. **Node.js 22.11.0+ required**: Older versions cause cryptic install errors. Verify with `node --version`.

### Authentication Caveats

7. **Context user data is untrusted**: The `sdk.context.user` data comes from the client and can be spoofed. Use `sdk.actions.signIn()` for verified auth on sensitive operations.

8. **Custom auth is possible but discouraged**: Farcaster's built-in auth provides better UX. Use it unless you have a specific reason not to.

### Platform Constraints

9. **Display size fixed on web**: 424x695px modal -- design for this constraint.

10. **Client support varies**: Not all Farcaster clients support all features. Base App support is partial during beta. Use `sdk.getCapabilities()` to detect available features.

11. **Notifications are in-app only**: No native push notifications to the OS. Notifications appear within the Farcaster client.

12. **Rate limits on notifications**: Warpcast enforces 1 per 30 seconds and 100 per 24 hours per token.

13. **Webhook reliability**: If your server doesn't return 200, the client will retry. But retry count is client-specific and not guaranteed.

### Wallet Gotchas

14. **Transaction security scanning**: New apps may trigger false positives from Blockaid wallet scanning. Register with Blockaid to prevent this.

15. **Batch transactions are sequential, not atomic**: `wallet_sendCalls` executes transactions one after another. If one fails mid-batch, earlier ones are already committed.

16. **Solana support is newer**: Moved from experimental to stable in mid-2025, but the ecosystem is still more mature on the Ethereum side.

### Discovery Issues

17. **App not appearing in search**: Requires a registered manifest, recent user engagement, properly formatted images with correct content-type headers, and a production domain.

18. **Users must have Farcaster accounts**: Full interaction requires an active Farcaster account.

---

## 9. Application to FlowB/eGator EthDenver Event App

### Architecture Fit

The FlowB project already has:
- Neynar integration (`NeynarPluginConfig` with `apiKey` and `agentToken`)
- Farcaster as a supported platform in `ToolInput.platform`
- Event aggregation via eGator plugin (Luma, Eventbrite, Tavily, etc.)
- Points system, social features (friends, crews, event attendance)
- Supabase backend

### Recommended Mini App Feature Set

**Core Features (6-day sprint):**
1. Event discovery feed with EthDenver events from eGator sources
2. RSVP / "Going" / "Maybe" with friend visibility
3. "Who's going" social proof (leveraging Farcaster social graph via Neynar)
4. Share event as cast embed with dynamic OG images
5. Simple wallet connection for onchain RSVPs or POAPs

**Viral Mechanics:**
- composeCast with pre-filled event details + embed URL
- Dynamic embed images showing "X friends are going"
- Notification when friends RSVP to events you're interested in
- Share extension: share any cast to your app for event context

**Technical Integration Points:**
- Neynar API for social graph (already configured in FlowB)
- Supabase for event data, RSVPs, and notification tokens
- `@farcaster/miniapp-sdk` for client-side native features
- `@farcaster/miniapp-wagmi-connector` for wallet (Base chain)
- Next.js frontend deployed to Vercel

### Mini App Architecture

```
flowb-miniapp/                    # New Next.js app
  app/
    page.tsx                      # Entry point, splash -> app
    .well-known/farcaster.json/route.ts
    api/
      webhook/route.ts            # Notification webhook handler
      events/route.ts             # Proxy to eGator/FlowB backend
      og/route.tsx                # Dynamic OG image generation
    events/
      [id]/page.tsx               # Individual event page (shareable embed)
    share/page.tsx                # Share extension handler
  components/
    EventCard.tsx
    FriendAvatars.tsx
    RSVPButton.tsx
    ShareButton.tsx
  lib/
    farcaster.ts                  # SDK initialization
    neynar.ts                     # Social graph queries
    supabase.ts                   # Data layer
```

### Key Integration Code Pattern

```typescript
// lib/farcaster.ts
import { sdk } from '@farcaster/miniapp-sdk'

export async function initMiniApp() {
  await sdk.actions.ready()

  const { user, location, client } = sdk.context

  // Store notification token if available
  if (client.notificationDetails) {
    await saveNotificationToken(
      user.fid,
      client.notificationDetails.token,
      client.notificationDetails.url
    )
  }

  return { user, location, client }
}

export async function shareEvent(event: EventResult) {
  const result = await sdk.actions.composeCast({
    text: `I'm going to "${event.title}" at EthDenver! Who's joining?`,
    embeds: [`https://egator.app/events/${event.id}`],
    channelKey: 'ethdenver'
  })
  return result
}
```

---

## 10. Competitive Landscape

| App | Focus | Gap for FlowB |
|-----|-------|---------------|
| Eventcaster | Farcaster-native events | Limited to Farcaster-only events, no multi-source aggregation |
| Luma | Event hosting | Not Farcaster-native, no social graph integration |
| Partiful | Social event planning | No crypto/wallet features, not in Farcaster |
| events.xyz | Web3 events | General purpose, not EthDenver-specific |

**FlowB differentiation:**
- Multi-source event aggregation (Luma + Eventbrite + Brave + Tavily + Google Places)
- Farcaster social graph for "who's going" features
- Points/gamification system already built
- Crew/group coordination features
- EthDenver-specific curation

---

## Sources

- Farcaster Mini Apps Docs: https://miniapps.farcaster.xyz/
- Getting Started: https://miniapps.farcaster.xyz/docs/getting-started
- Specification: https://miniapps.farcaster.xyz/docs/specification
- SDK Context: https://miniapps.farcaster.xyz/docs/sdk/context
- Wallet Guide: https://miniapps.farcaster.xyz/docs/guides/wallets
- Sharing Guide: https://miniapps.farcaster.xyz/docs/guides/sharing
- Notifications: https://miniapps.farcaster.xyz/docs/guides/notifications
- Publishing: https://miniapps.farcaster.xyz/docs/guides/publishing
- FAQ: https://miniapps.farcaster.xyz/docs/guides/faq
- Share Extensions: https://miniapps.farcaster.xyz/docs/guides/share-extension
- Neynar Virality Guide: https://docs.neynar.com/docs/mini-app-virality-guide
- Neynar Docs: https://neynar.readme.io/
- composeCast API: https://miniapps.farcaster.xyz/docs/sdk/actions/compose-cast
- Solana Wallet: https://miniapps.farcaster.xyz/docs/guides/solana
- Frames v2 Demo Repo: https://github.com/farcasterxyz/frames-v2-demo
- Next.js Template: https://github.com/XerxesCoder/farcaster-miniapp
