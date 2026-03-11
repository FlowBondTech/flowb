# x402 Protocol Research: Complete Analysis for EthDenver Pitch

**Date**: 2026-02-20
**Purpose**: Technical research for FlowB EthDenver integration pitch
**Status**: Comprehensive findings compiled

---

## 1. WHAT IS x402 AND HOW IT WORKS

### Overview

x402 is an open payment protocol developed by Coinbase that revives the long-dormant HTTP 402 "Payment Required" status code to enable instant, automatic stablecoin payments directly over HTTP. It was released by Coinbase in May 2025, co-founded as a foundation with Cloudflare in September 2025, and upgraded to V2 in January 2026 after processing over 100 million payments.

**Key stats as of Feb 2026:**
- 100M+ payments processed
- $26.19M+ total volume through facilitators
- 75M+ transactions worth $24M for paid APIs and AI agents (as of Dec 2025)
- Ecosystem of 150+ projects, 20+ facilitators

### The Core Idea

Instead of API keys, subscriptions, OAuth tokens, or invoicing -- a server simply returns HTTP 402 with machine-readable payment terms. The client pays (in USDC or other stablecoins on-chain) and retries. No accounts. No sessions. No signup.

### The 5-Step Payment Flow

```
1. CLIENT REQUEST     -> GET /api/weather (no auth needed)
2. SERVER CHALLENGE   -> 402 Payment Required + PAYMENT-REQUIRED header
                         (contains: price, asset, network, recipient address)
3. CLIENT PAYS        -> Signs a stablecoin transaction (not yet submitted)
4. CLIENT RETRIES     -> GET /api/weather + PAYMENT-SIGNATURE header
                         (contains: signed but unsubmitted transaction)
5. SERVER SETTLES     -> Verifies via facilitator -> submits tx on-chain -> 200 OK
                         (returns: PAYMENT-RESPONSE header with settlement proof)
```

### Detailed Architecture (12 steps internally)

```
Client <-> Resource Server <-> Facilitator <-> Blockchain

1.  Client requests resource
2.  Server responds 402 + payment details (PAYMENT-REQUIRED header)
3.  Client selects payment option and creates signed payload
4.  Client sends request with PAYMENT-SIGNATURE header
5.  Server verifies payload locally or via facilitator /verify endpoint
6.  Facilitator validates based on scheme/network
7.  Server proceeds if verification succeeds
8.  Server settles payment via facilitator /settle endpoint
9.  Facilitator submits transaction to blockchain
10. Facilitator awaits confirmation
11. Facilitator returns execution response
12. Server returns 200 OK with PAYMENT-RESPONSE header
```

### Three Actors

| Actor | Role | What They Do |
|-------|------|-------------|
| **Client** | Buyer/agent | Holds a wallet, signs transactions, attaches payment headers |
| **Resource Server** | Seller/API | Defines prices per route, validates payments via facilitator |
| **Facilitator** | Settlement layer | Verifies signatures, submits on-chain transactions, abstracts blockchain complexity |

### Why This Matters

- **No accounts**: No signup, no API keys, no OAuth
- **No subscriptions**: Pay-per-request, pay-per-use
- **Machine-readable**: AI agents can autonomously discover prices and pay
- **Protocol-level**: Works with any HTTP client/server -- not a specific vendor
- **Stablecoin-native**: USDC on Base/Solana -- no volatile crypto exposure
- **Sub-cent payments**: Transactions as low as $0.001 are economically viable

---

## 2. AGENT-TO-AGENT PAYMENTS

### The A2A + x402 Integration

Google launched the Agent-to-Agent (A2A) protocol in 2025 -- a universal language for AI services to communicate and coordinate. The critical missing piece: **payment**. x402 fills that gap.

In collaboration with Coinbase, Ethereum Foundation, MetaMask, and others, Google extended A2A with the **A2A x402 extension** -- a production-ready solution for agent-based crypto payments.

**Key announcement**: x402 is the first (and currently only) stablecoin facilitator for Google's Agent Payments Protocol (AP2).

### How Agent Payments Work

```
Agent A (needs data) -> Agent B (has data, charges $0.01/request)

1. Agent A: GET /api/market-data
2. Agent B: 402 Payment Required
   {
     scheme: "exact",
     price: "$0.01",
     network: "eip155:8453",  // Base mainnet
     asset: "USDC",
     payTo: "0x..."
   }
3. Agent A: (has embedded wallet, signs USDC transfer)
4. Agent A: GET /api/market-data + PAYMENT-SIGNATURE: <signed-tx>
5. Agent B: (verifies via facilitator, settles on-chain)
6. Agent B: 200 OK + { marketData: ... }
```

### Why Agents Love x402

- **No psychological friction**: Agents don't hesitate over $0.01 decisions
- **Programmable**: Agents can set budgets, compare prices, choose providers
- **Autonomous**: No human approval needed for micro-amounts
- **Discovery**: Agents can discover pricing by making initial requests
- **Multi-agent swarms**: Agents can pay each other in chains (A pays B pays C)

### Google AP2 Integration Details

- AP2 provides the communication protocol (how agents talk)
- x402 provides the payment protocol (how agents pay)
- Combined: agents can negotiate, execute, and settle autonomously
- GitHub: `google-agentic-commerce/a2a-x402`
- npm: `a2a-x402` (TypeScript port by Nader Dabit)

### Cloudflare Deferred Payment Scheme

For agents that make many requests, Cloudflare proposed a **deferred payment** model:
- Agent signs cryptographic commitment (not an on-chain tx)
- Server validates signature locally (no blockchain call)
- Payments accumulate and settle in batches (daily, weekly)
- Settlement can be stablecoin OR traditional fiat
- Designed for high-frequency workloads (LLM inference, multi-call agents)

---

## 3. USE CASES FOR FLOWB: SKILL PURCHASES, EVENT BOOSTING, MICROPAYMENTS

### Direct FlowB Integration Opportunities

#### A. Event Boost / Featured Events ($0.10 - $1.00 per boost)

```typescript
// Server: charge event organizers to boost their event visibility
app.use(paymentMiddleware({
  "POST /api/v1/events/:id/boost": {
    accepts: {
      scheme: "exact",
      price: "$0.50",
      network: "eip155:8453", // Base mainnet
      payTo: FLOWB_TREASURY_ADDRESS
    },
    description: "Boost event to top of feed for 24 hours"
  }
}));
```

**How it works**: Event organizers pay $0.50 in USDC to pin their event at the top of the FlowB feed. No account needed -- just a wallet. Perfect for side event organizers at EthDenver who want visibility.

#### B. Premium Event Data Access ($0.001 - $0.01 per query)

```typescript
// Charge AI agents or third-party apps for FlowB's event data
app.use(paymentMiddleware({
  "GET /api/v1/events/premium": {
    accepts: {
      scheme: "exact",
      price: "$0.005",
      network: "eip155:8453",
      payTo: FLOWB_TREASURY_ADDRESS
    },
    description: "Premium event data with social signals and attendance"
  }
}));
```

**How it works**: FlowB's aggregated event data (from Luma, Eventbrite, etc.) with social proof signals becomes a paid API. Other apps and AI agents pay per-query. FlowB becomes a data provider, not just a consumer.

#### C. Crew Unlock / Premium Crew Features ($0.25 - $2.00)

```
- Super Crew (50+ members): $1.00 unlock
- Crew Analytics (who's most active): $0.25/view
- Cross-platform crew sync: $0.50 setup
- Priority notifications: $0.10/day
```

#### D. Skill/Badge Marketplace ($0.05 - $0.50 per skill)

```typescript
// Users pay to unlock special badges or skills
app.use(paymentMiddleware({
  "POST /api/v1/skills/:id/purchase": {
    accepts: {
      scheme: "exact",
      price: "$0.10",
      network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", // Solana mainnet
      payTo: FLOWB_TREASURY_SOL_ADDRESS
    },
    description: "Purchase event organizer skill badge"
  }
}));
```

#### E. Tip/Support Event Organizers ($0.01+)

```
- Tip an event organizer: any amount via x402
- Support a venue: micropayment goes directly to venue wallet
- Fund a crew activity: pool payments into a crew wallet
```

#### F. Pay-Per-Notification (Revenue Share)

```
- Sponsored notifications: brands pay $0.05/notification to reach crews
- Event reminders from organizers: $0.02/push to RSVP'd users
- All via x402 -- organizer just hits the endpoint with payment
```

### Revenue Model Summary

| Feature | Price | Network | Volume Estimate |
|---------|-------|---------|----------------|
| Event Boost | $0.50 | Base | 100 boosts/day = $50/day |
| Premium API | $0.005 | Base | 10K queries/day = $50/day |
| Crew Unlock | $1.00 | Base/Solana | 50 unlocks/day = $50/day |
| Skill Badge | $0.10 | Solana | 200 purchases/day = $20/day |
| Tips | $0.25 avg | Both | 100 tips/day = $25/day |
| Sponsored Push | $0.05 | Base | 1K pushes/day = $50/day |
| **TOTAL** | | | **~$245/day at EthDenver scale** |

---

## 4. SDKs, LIBRARIES, AND REFERENCE IMPLEMENTATIONS

### Official Coinbase Packages (npm `@x402/*` org)

```bash
# Core protocol
npm install @x402/core          # Core types, client, server, facilitator components

# Network-specific
npm install @x402/evm           # EVM (Base, Ethereum, Optimism) support
npm install @x402/svm           # Solana support

# HTTP Client wrappers (auto-handle 402 flow)
npm install @x402/fetch         # Fetch API wrapper
npm install @x402/axios         # Axios interceptor

# Server middleware
npm install @x402/express       # Express.js middleware
npm install @x402/hono          # Hono middleware
npm install @x402/next          # Next.js middleware

# UI
npm install @x402/paywall       # Modular paywall component (React)

# Extensions
npm install @x402/extensions    # Protocol extensions (discovery, etc.)
```

### Language Support

| Language | Package | Status |
|----------|---------|--------|
| TypeScript/JS | `@x402/core`, `@x402/evm`, `@x402/svm`, etc. | Official, production |
| Python | `pip install x402` | Official |
| Go | `go get github.com/coinbase/x402/go` | Official |
| Rust | `x402-kit` (community) | Community |
| Java | `mogami-java-server-sdk` | Community |
| Ruby | QuickNode gem | Community |

### Community Packages (notable)

```bash
# Solana-specific
npm install x402-solana                    # v2 Solana implementation
npm install @payai/x402-solana-react       # React paywall for Solana

# MCP Integration (for AI agents)
npm install @civic/x402-mcp               # x402 + Model Context Protocol

# Google A2A
npm install a2a-x402                       # Agent-to-Agent payments

# Third-party SDKs
npm install @x402sdk/sdk                   # Developer toolkit
```

### GitHub Repository Structure

```
github.com/coinbase/x402/
  /specs              # Protocol specification (the standard itself)
  /typescript         # Reference SDK and tooling
    /@x402/core       # Core types and interfaces
    /@x402/evm        # EVM network support
    /@x402/svm        # Solana network support
    /@x402/express    # Express middleware
    /@x402/hono       # Hono middleware
    /@x402/next       # Next.js integration
    /@x402/fetch      # Fetch client wrapper
    /@x402/axios      # Axios interceptor
    /@x402/paywall    # UI paywall component
  /python             # Python implementation
  /go                 # Go implementation
  /contracts/evm      # Smart contracts
  /examples           # Integration examples
    /typescript/servers/express  # Express server example
    /typescript/clients          # Client examples
```

### Facilitators Available

| Facilitator | Networks | Notes |
|-------------|----------|-------|
| **CDP (Coinbase)** | Base, Solana | Official, free tier 1K tx/month, then $0.001/tx |
| **Corbits** | Multi-network, multi-token | Production grade |
| **PayAI** | Multi-network | Independent |
| **Mogami** | Free, developer-focused | Good for testing |
| **OpenFacilitator** | Open-source | Self-hostable |
| **Dexter** | Solana, Base | Integrated marketplace |
| **thirdweb** | TypeScript SDK + facilitator | Popular |
| **AutoIncentive** | Base, Solana | Free |
| **WorldFun/AWE** | Base | Fee-free EIP-3009 |

---

## 5. CHAIN INTEGRATION: SOLANA AND BASE/ETHEREUM

### Base (EVM) Integration

Base is the **primary** chain for x402, given Coinbase built both.

**Network identifier**: `eip155:8453` (mainnet), `eip155:84532` (Base Sepolia testnet)

**Server Example (Express + Base)**:

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = express();

const facilitatorUrl = "https://x402.org/facilitator"; // or CDP facilitator
const payToAddress = "0xYourUSDCAddress";

app.use(
  paymentMiddleware(
    {
      "GET /weather": {
        accepts: {
          scheme: "exact",
          price: "$0.001",
          network: "eip155:84532",    // Base Sepolia
          payTo: payToAddress
        },
        description: "Weather data",
        mimeType: "application/json"
      }
    },
    new x402ResourceServer(
      new HTTPFacilitatorClient({ url: facilitatorUrl })
    ).register("eip155:84532", new ExactEvmScheme())
  )
);

app.get("/weather", (req, res) => {
  // Payment already verified by middleware
  const payment = (req as any).x402Payment; // payment details
  res.json({ weather: "sunny", temperature: 70 });
});

app.listen(3000);
```

**Client Example (Base)**:

```typescript
import { wrapFetch } from "@x402/fetch";
import { createWalletClient } from "viem";

// Wrap native fetch to auto-handle 402 payments
const x402Fetch = wrapFetch(fetch, walletClient);

// Just use fetch normally -- 402 handling is automatic
const response = await x402Fetch("https://api.example.com/weather");
const data = await response.json();
// Payment of $0.001 USDC was automatically handled
```

### Solana Integration

**Network identifier**: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (mainnet)

**USDC Addresses**:
- Mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

**Server Example (Solana)**:

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const solanaNetwork = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

app.use(
  paymentMiddleware(
    {
      "POST /api/boost": {
        accepts: {
          scheme: "exact",
          price: "$0.50",
          network: solanaNetwork,
          payTo: "YourSolanaUSDCTokenAccount"
        },
        description: "Boost event visibility for 24 hours"
      }
    },
    new x402ResourceServer(
      new HTTPFacilitatorClient({ url: facilitatorUrl })
    ).register(solanaNetwork, new ExactSvmScheme())
  )
);
```

**Solana-specific advantages**:
- Sub-second finality (vs ~2s on Base)
- Lower fees (~$0.00025 per tx vs ~$0.001 on Base)
- SPL Token standard for USDC transfers
- Kora integration for gasless signing (user pays no gas)

### Multi-Chain Support (Both Networks)

```typescript
// Register BOTH networks on the same server
const resourceServer = new x402ResourceServer(
  new HTTPFacilitatorClient({ url: facilitatorUrl })
)
  .register("eip155:8453", new ExactEvmScheme())
  .register("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", new ExactSvmScheme());

// Route can accept payment from EITHER chain
app.use(paymentMiddleware({
  "POST /api/boost": {
    accepts: [
      {
        scheme: "exact",
        price: "$0.50",
        network: "eip155:8453",
        payTo: baseAddress
      },
      {
        scheme: "exact",
        price: "$0.50",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        payTo: solanaAddress
      }
    ],
    description: "Boost event"
  }
}, resourceServer));
```

---

## 6. REAL EXAMPLES OF x402 IN PRODUCTION

### Tier 1: Major Companies

| Company | Use Case | Details |
|---------|----------|---------|
| **Cloudflare** | Pay-per-crawl, Agents SDK, MCP servers | Foundation co-founder. Integrating x402 into Workers, Agents SDK. Stack Overflow using their pay-per-crawl model. |
| **Google** | Agent Payments Protocol (AP2) | x402 is the first stablecoin facilitator for A2A commerce |
| **Coinbase** | CDP Facilitator, reference implementation | Built the protocol. Free tier: 1K tx/month |
| **Neynar** | Farcaster social data API | Agents pay per-query for Farcaster data via x402 |

### Tier 2: Production Services

| Project | What They Do | x402 Use |
|---------|-------------|----------|
| **Firecrawl** | Web scraping for LLMs | Pay-per-crawl for LLM-ready web data |
| **Pinata** | IPFS storage | Pay-per-upload/retrieval via x402 |
| **Heurist AI** | AI inference | Pay-per-inference for AI models |
| **Daydreams Systems** | LLM inference router | Major x402 transaction volume |
| **BlockRun.AI** | LLM gateway on Base | Pay-as-you-go model inference |
| **dTelecom STT** | Speech-to-text | Production STT for AI agents |
| **AsterPay** | Market data | 13 pay-per-call endpoints |
| **Gloria AI** | Real-time news | News data for AI agents |
| **Cybercentry** | Security endpoints | AI-powered security analysis |

### Tier 3: Notable Ecosystem Projects

| Project | What They Do |
|---------|-------------|
| **tip.md** | Cryptocurrency tipping via MCP |
| **Snack.money** | Micropayment content platform |
| **Brewit** | AI-powered brewing recipes |
| **aixbt** | AI trading intelligence |
| **Numbers Protocol** | Digital media authentication + licensing |
| **Questflow** | Multi-agent orchestration |
| **OpenClaw** | AI agents buying Linux VMs with USDC |
| **Postera** | Publishing with per-read micropayments |
| **Ubounty** | AI bounty solving with settlement |

### Tier 4: Infrastructure & Tooling

| Project | What They Do |
|---------|-------------|
| **thirdweb** | TypeScript SDK and facilitator API |
| **Primer** | Browser wallet + SDKs for x402 paywalls |
| **MCPay** | Build and monetize MCP servers |
| **Fluora** | MonetizedMCP marketplace |
| **AltLayer** | x402 gateway + facilitator + agent hosting |
| **Nevermined** | AI payment processing infrastructure |
| **Proxy402** | Turn any URL into paid content |
| **PEAC Protocol** | Cryptographic receipt layer |

### Production Metrics

- **Transaction sizes**: $0.001 to $100+ per request
- **Cheapest viable payment**: $0.001 (profitable due to near-zero fees)
- **Common price points**: $0.005 for data queries, $0.01-0.10 for AI inference, $0.25+ for premium content
- **Settlement speed**: Sub-second on Solana, ~2s on Base
- **CDP free tier**: 1,000 transactions/month, then $0.001/transaction

---

## 7. x402 V2 UPGRADE (January 2026)

### What Changed

V2 was released after 100M+ payments in 6 months. Major improvements:

1. **Flexible Payment Models**: Not just exact-amount-per-request anymore
   - Subscriptions
   - Prepaid access
   - Multi-step billing
   - Usage-based (metered)

2. **Dynamic payTo Routing**: Per-request routing to different addresses
   - Marketplace payouts (70% to seller, 30% to platform)
   - Multi-tenant APIs
   - Revenue splits

3. **Wallet-Based Sessions**: Skip payment for repeat access
   - Prove wallet ownership once
   - Access purchased resources without re-paying
   - Sign-In-With-X (SIWx) based on CAIP-122

4. **Modular SDK Rewrite**: Complete bottom-up rewrite
   - Plugin-driven architecture
   - Add new chains/assets as standalone packages
   - Multi-facilitator support (SDK chooses best match)

5. **Standardized Headers**:
   - `PAYMENT-SIGNATURE` (replaces X-PAYMENT)
   - `PAYMENT-REQUIRED` (replaces custom headers)
   - `PAYMENT-RESPONSE` (settlement proof)
   - Payment data in headers, body freed for content

6. **Discovery Extension**: Facilitators can auto-index endpoints
   - Dynamic pricing
   - Metadata sync
   - No manual catalog updates

7. **High-Frequency Optimizations**: Designed for LLM inference, multi-call agents
   - Reduced latency
   - Fewer round-trips
   - Batch settlement support

---

## 8. INTEGRATION PLAN FOR FLOWB

### Recommended Architecture

```
FlowB Fastify Server (flowb.fly.dev)
  |
  +-- @x402/core + @x402/evm + @x402/svm
  |
  +-- Existing routes (free, auth-gated)
  |     GET /api/v1/events
  |     POST /api/v1/flow/crews
  |     etc.
  |
  +-- x402-gated routes (payment-required)
        POST /api/v1/events/:id/boost      ($0.50 USDC)
        GET  /api/v1/events/premium         ($0.005 USDC)
        POST /api/v1/skills/:id/purchase    ($0.10 USDC)
        POST /api/v1/crew/:id/upgrade       ($1.00 USDC)
        POST /api/v1/tips/:userId           (variable USDC)
```

### Implementation Steps (Estimated: 4-6 hours)

```
1. Install packages:
   npm install @x402/core @x402/evm @x402/svm

2. Create x402 middleware for Fastify:
   (Coinbase examples are Express -- need Fastify adapter or use Hono)
   Alternative: npm install @x402/hono (Hono is compatible with Fastify)

3. Set up CDP facilitator account (free tier: 1K tx/month)
   - Register at CDP portal
   - Get facilitator URL

4. Add x402-gated routes alongside existing routes

5. Client-side: wrap fetch in miniapps with @x402/fetch
   - Telegram miniapp: connect wallet via TG wallet
   - Farcaster miniapp: connect wallet via SIWF

6. Test on Base Sepolia with test USDC
```

### Pitch Angle for EthDenver

**"FlowB is the first event coordination app with native x402 micropayments."**

Key talking points:
- Event organizers can boost visibility with a single USDC payment -- no account needed
- AI agents can query FlowB's event data via paid API (agent economy)
- Crew features unlock with micropayments -- revenue from day one
- Multi-chain: works on Base AND Solana (EthDenver audience loves both)
- Built on Coinbase + Cloudflare open standard (not a proprietary payment rail)
- Google A2A compatible -- FlowB agents can participate in the agent economy

---

## 9. KEY LINKS AND REFERENCES

### Official
- Protocol site: https://www.x402.org/
- Whitepaper: https://www.x402.org/x402-whitepaper.pdf
- V2 announcement: https://www.x402.org/writing/x402-v2-launch
- Ecosystem directory: https://www.x402.org/ecosystem
- GitHub: https://github.com/coinbase/x402
- Coinbase docs: https://docs.cdp.coinbase.com/x402/welcome

### Solana-specific
- Solana x402 guide: https://solana.com/developers/guides/getstarted/intro-to-x402
- Solana Kora facilitator guide: https://solana.com/developers/guides/getstarted/build-a-x402-facilitator
- npm x402-solana: https://www.npmjs.com/package/x402-solana

### Google A2A
- A2A x402 extension: https://github.com/google-agentic-commerce/a2a-x402
- Coinbase announcement: https://www.coinbase.com/developer-platform/discover/launches/google_x402
- npm a2a-x402: https://www.npmjs.com/package/a2a-x402

### Cloudflare
- Foundation launch: https://blog.cloudflare.com/x402/
- Agents docs: https://developers.cloudflare.com/agents/x402/

### npm Packages
- @x402/core: https://www.npmjs.com/package/@x402/core
- @x402/express: https://www.npmjs.com/package/@x402/express
- @x402/fetch: https://www.npmjs.com/package/@x402/fetch
- @x402/evm: https://www.npmjs.com/package/@x402/evm
- @x402/svm: https://www.npmjs.com/package/@x402/svm
- @x402/paywall: https://www.npmjs.com/package/@x402/paywall
