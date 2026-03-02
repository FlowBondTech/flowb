# ZK-Proof Database Design: High-Level Architecture

> **Status**: Proposal
> **Date**: 2026-03-02
> **Scope**: FlowB database redesign with zero-knowledge proof primitives for privacy-preserving data storage and verification

---

## 1. Why ZK Proofs for FlowB

FlowB handles sensitive user data across five dimensions:

| Dimension | Current Tables | Exposed Data |
|-----------|---------------|--------------|
| **Identity** | `pending_verifications`, `flowb_sessions` | Platform IDs, usernames, Privy IDs |
| **Financial** | `user_wallets`, `payout_claims`, `trade_history` | Wallet addresses, trade amounts, tx hashes |
| **Social** | `flowb_connections`, `flowb_groups`, `flowb_group_members` | Friend graphs, crew membership |
| **Behavioral** | `flowb_points_ledger`, `flowb_rsvps`, `flowb_event_reminders` | Activity patterns, location signals |
| **Competitive** | `battle_pools`, `battle_entries` | Staking amounts, win/loss records |

A database breach today would expose the full social graph, financial activity, and behavioral patterns of every user. ZK proofs let us **store commitments instead of cleartext** — the database becomes a verification engine rather than a knowledge store.

### Core Principle

> **The database should be able to answer "is this true?" without knowing "what is true."**

For example:
- "Does this user have enough points to claim a reward?" — without knowing the exact balance
- "Is this user a member of crew X?" — without revealing the full membership list
- "Has this wallet received a payout?" — without exposing wallet addresses to the DB layer

---

## 2. Threat Model

### What We're Protecting Against

| Threat | Current Risk | ZK Mitigation |
|--------|-------------|---------------|
| **Database breach** | Full cleartext exposure of all user data | Commitments and hashes only — no plaintext to steal |
| **Insider/admin abuse** | Service role sees everything via RLS bypass | Even service role only sees commitments |
| **Correlation attacks** | Platform-prefixed user_ids link all activity | Nullifier-based identity separation per context |
| **Subpoena/legal** | Must hand over all user data | Can prove compliance without revealing individual records |
| **Graph analysis** | Social connections stored as explicit edges | Membership proofs via Merkle trees — no explicit edges |

### What We're NOT Protecting Against

- **Client-side compromise** — if a user's device is compromised, ZK doesn't help
- **Traffic analysis** — timing of API calls reveals patterns (orthogonal concern)
- **Proof generation DoS** — computationally expensive; needs rate-limiting at the API layer

---

## 3. Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │           Client Layer               │
                    │  (Telegram, Farcaster, Web, Mobile)  │
                    └──────────────┬──────────────────────┘
                                   │
                         User holds secrets:
                         - secret key (sk)
                         - preimages
                         - membership witnesses
                                   │
                    ┌──────────────▼──────────────────────┐
                    │          FlowB API Layer             │
                    │                                      │
                    │  ┌──────────┐    ┌───────────────┐  │
                    │  │  Proof   │    │   Commitment  │  │
                    │  │ Verifier │    │   Generator   │  │
                    │  └────┬─────┘    └───────┬───────┘  │
                    │       │                  │           │
                    └───────┼──────────────────┼──────────┘
                            │                  │
                    ┌───────▼──────────────────▼──────────┐
                    │        Obfuscated Database           │
                    │                                      │
                    │  ┌──────────────────────────────┐   │
                    │  │   Commitment Store            │   │
                    │  │   (Pedersen / Poseidon hash)  │   │
                    │  ├──────────────────────────────┤   │
                    │  │   Merkle Tree Roots           │   │
                    │  │   (membership, identity)      │   │
                    │  ├──────────────────────────────┤   │
                    │  │   Nullifier Registry          │   │
                    │  │   (double-spend prevention)   │   │
                    │  ├──────────────────────────────┤   │
                    │  │   Encrypted Blobs             │   │
                    │  │   (user-key encrypted data)   │   │
                    │  └──────────────────────────────┘   │
                    │                                      │
                    └──────────────────────────────────────┘
```

### Data Flow

1. **Registration**: User generates a secret key. Client computes `identity_commitment = Poseidon(sk, nonce)` and sends it to the API. The API inserts the commitment into the identity Merkle tree. The plaintext `sk` never leaves the client.

2. **Action (e.g., claim points)**: User constructs a ZK proof: "I know a secret key `sk` such that `Poseidon(sk, nonce)` is a leaf in the identity Merkle tree, AND my committed balance exceeds the threshold." The proof + nullifier are sent to the API. The API verifies the proof, checks the nullifier hasn't been used, and records the action.

3. **Query (e.g., leaderboard)**: Aggregate commitments are stored alongside individual ones. The leaderboard shows committed rankings (or optionally, users can reveal their own scores selectively).

---

## 4. ZK Primitives for FlowB

### 4.1 Commitment Schemes

**Pedersen Commitments** for numeric values (points, balances, stakes):
```
C = g^v · h^r
```
- `v` = value (e.g., point balance)
- `r` = random blinding factor (kept by user)
- Homomorphic: `C(a) + C(b) = C(a+b)` — allows balance updates without decryption

**Poseidon Hashes** for identity and membership:
```
leaf = Poseidon(secret_key, nonce)
```
- SNARK-friendly hash function (much cheaper in-circuit than SHA-256)
- Used as identity commitments and Merkle tree leaves

### 4.2 Merkle Trees

Each "set" in the system becomes a Merkle tree:

| Tree | Leaves | Purpose |
|------|--------|---------|
| **Identity Tree** | `Poseidon(sk, nonce)` per user | Prove "I am a registered user" without revealing which one |
| **Crew Tree** (per crew) | `Poseidon(user_commitment, crew_id)` | Prove "I am in this crew" without revealing full roster |
| **Event Attendance Tree** | `Poseidon(user_commitment, event_id)` | Prove "I attended this event" without linking to identity |
| **Points Tier Tree** | `Poseidon(user_commitment, tier_level)` | Prove "I am at least tier X" without revealing exact points |

The database only stores **the root hash** plus the full tree of commitments (for witness generation). It never stores the preimages.

### 4.3 Nullifiers

Nullifiers prevent double-actions without revealing identity:
```
nullifier = Poseidon(sk, action_scope, action_id)
```

| Action | Nullifier Scope | Prevents |
|--------|----------------|----------|
| Daily check-in | `("checkin", date)` | Claiming daily points twice |
| Battle entry | `("battle", pool_id)` | Entering the same battle twice |
| Referral claim | `("referral", referrer_commitment)` | Double-claiming referral bonus |
| Payout claim | `("payout", claim_id)` | Double-claiming USDC payouts |
| Event RSVP | `("rsvp", event_id)` | RSVPing to the same event twice |

The database stores spent nullifiers in a set. When a new action arrives, it checks `nullifier NOT IN spent_nullifiers`. No user identity is needed.

### 4.4 Encrypted Blobs (Selective Disclosure)

Some data needs to be recoverable by the user (e.g., trade history, session data). This data is:
1. Encrypted client-side with the user's derived key
2. Stored as opaque blobs in the database
3. Decryptable only by the user (or with a recovery key)

The database cannot read these blobs. It only stores and retrieves them keyed by the user's commitment.

---

## 5. What Changes Per Domain

### 5.1 Identity

**Before**: `user_id = "telegram_123456789"` stored in cleartext everywhere.

**After**:
- User generates `sk` on first interaction
- `identity_commitment = Poseidon(sk, registration_nonce)` is the only identifier stored
- Cross-platform linking uses **commitment equivalence proofs**: "I can prove that commitment A (Telegram) and commitment B (Farcaster) share the same `sk`" — without revealing `sk` or either platform ID
- Platform IDs are stored as encrypted blobs, decryptable only by the user

### 5.2 Points & Rewards

**Before**: `total_points = 1250` stored in cleartext, full ledger of every action visible.

**After**:
- Balance stored as a Pedersen commitment: `C(balance) = g^balance · h^r`
- Point additions use homomorphic property: `C(new) = C(old) · g^delta · h^r_delta`
- Tier/milestone proofs: ZK range proof that committed balance > threshold
- Ledger entries replaced by nullified action proofs — you can prove you did an action, but the ledger doesn't link actions to identities

### 5.3 Social Graph

**Before**: Explicit `(user_a, user_b)` edges in `flowb_connections`. Full crew rosters in `flowb_group_members`.

**After**:
- Connections become **mutual commitment pairs**: both users commit to the connection, neither reveals to the DB who they're connected to
- Crew membership via Merkle tree: crew Merkle root is public, individual membership proven via witness path
- "Am I connected to this person?" answered by the users exchanging proofs, not by querying the DB

### 5.4 Financial (Wallets, Trades, Battles)

**Before**: `wallet_address`, `amount_staked`, `tx_hash` all in cleartext.

**After**:
- Wallet addresses stored as commitments; revealed only when an on-chain action is needed (selective disclosure)
- Trade amounts committed; the API verifies balance sufficiency via range proofs
- Battle stakes committed; pool totals computed homomorphically
- Payout nullifiers prevent double-claims without linking to identity

### 5.5 Events & RSVPs

**Before**: Explicit `(user_id, event_id, status)` tuples.

**After**:
- Attendance Merkle tree per event
- RSVP count derived from tree size (public) but individual attendees hidden
- "Who's going?" answered only if attendees opt-in to reveal (selective disclosure)
- Event reminders stored as encrypted blobs keyed by user commitment

---

## 6. Migration Strategy

ZK integration is not a single migration — it's a phased transition.

### Phase 1: Shadow Mode (Non-Breaking)

Add commitment columns alongside existing cleartext columns. Begin populating commitments for all new records. No proofs required yet — this validates the commitment infrastructure.

- Add `identity_commitment BYTEA` to `flowb_sessions`
- Add `balance_commitment BYTEA` to `flowb_user_points`
- Add `membership_commitment BYTEA` to `flowb_group_members`
- Deploy Poseidon hash and Pedersen commitment libraries server-side
- Client SDKs generate and store secret keys

### Phase 2: Dual Mode (Verification)

Both cleartext and commitments exist. Begin requiring proofs for sensitive operations while keeping cleartext for backward compatibility and debugging.

- Points claims require range proofs
- Battle entries require stake commitment proofs
- Payout claims require ownership proofs
- Nullifier table deployed; double-action prevention goes live
- Merkle tree infrastructure deployed for identity and crew membership

### Phase 3: Obfuscation Mode (Cleartext Removal)

Remove cleartext columns. The database operates entirely on commitments, proofs, nullifiers, and encrypted blobs.

- Drop `user_id` cleartext columns; replace with `identity_commitment` references
- Drop `total_points` cleartext; balance is only the Pedersen commitment
- Drop explicit social graph edges; connections are commitment pairs
- Wallet addresses moved to encrypted blobs
- Full audit trail of proofs replaces the points ledger

### Phase 4: On-Chain Anchoring (Optional)

Publish Merkle roots on-chain for tamper-evidence. Anyone can verify the database hasn't been manipulated by checking the on-chain root against the off-chain tree.

- Identity tree root published to Base (L2) periodically
- Points tree root anchored for reward auditing
- Battle pool commitments anchored for stake verification

---

## 7. Trade-Offs and Considerations

### Performance

| Operation | Current | With ZK |
|-----------|---------|---------|
| Point balance lookup | O(1) DB read | O(1) DB read (commitment is still a single value) |
| Point addition | UPDATE balance | UPDATE commitment + verify delta proof |
| Crew membership check | SELECT WHERE user_id = X | Merkle proof verification (O(log n)) |
| Leaderboard | ORDER BY total_points | Requires opt-in reveal or aggregate commitments |
| Proof generation (client) | N/A | 1-5 seconds (Groth16 / PLONK) |

### UX Impact

- **Secret key management**: Users must back up their secret key. Loss means loss of identity. Mitigated by Privy integration (encrypted cloud backup of `sk`).
- **Proof generation latency**: Client-side proving adds 1-5s. Acceptable for actions like "claim reward" or "enter battle." Not acceptable for chat responses — chat remains cleartext.
- **Selective disclosure**: Users can choose to reveal their score, attendance, etc. The default is private.

### What Stays Cleartext

Not everything benefits from ZK obfuscation:

- **Event metadata** (titles, times, venues) — public by nature
- **Bot command routing** — needs to know which user sent a message (handled at transport layer, not DB layer)
- **Aggregate statistics** — total users, total events, etc. (derived from tree sizes and commitment counts)

---

## 8. Technology Choices

| Component | Recommended | Rationale |
|-----------|-------------|-----------|
| **Hash function** | Poseidon | SNARK-friendly; 8x cheaper in-circuit than SHA-256 |
| **Commitment scheme** | Pedersen commitments on BN254 | Homomorphic; widely supported in ZK tooling |
| **Proof system** | Groth16 (initial) → PLONK (later) | Groth16: smallest proofs, fast verification. PLONK: no trusted setup, universal |
| **Circuit language** | Circom + snarkjs | Mature ecosystem; JS-native proving fits Node.js stack |
| **Merkle tree** | Sparse Merkle Tree (SMT) | Efficient updates; supports non-membership proofs |
| **On-chain anchoring** | Base (L2) | Already used for USDC payouts; low gas costs |
| **Key management** | Privy-backed encrypted storage | Already integrated for wallet auth |

---

## 9. Relationship to Existing Crypto

FlowB already uses:
- **HMAC-SHA256** for Telegram auth → stays (transport auth, not data obfuscation)
- **AES-256-GCM** for API key encryption → extends to encrypted blob storage
- **ECDSA/EdDSA** for CDP signing → stays (on-chain tx signing is separate)
- **JWT (HS256)** for session tokens → stays (session auth is separate from data privacy)

ZK proofs are an **additional layer** on top of existing auth. Auth answers "who are you?" — ZK answers "can you prove this claim?" without requiring the "who" to be stored.

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Cleartext PII in database | 0 fields (Phase 3 complete) |
| Proof verification time | < 50ms server-side |
| Client proof generation | < 5s on mobile |
| Nullifier collision rate | 0 (cryptographically negligible) |
| Data recoverable from breach | Commitments + encrypted blobs only — no actionable PII |
| User key backup rate | > 90% (via Privy integration) |

---

## 11. FlowBond Ecosystem Context

### 11.1 The Three-Product Architecture

FlowBond Tech builds **presence infrastructure for the real-world internet**. The ZK database design isn't just for FlowB — it's the shared privacy substrate for the entire ecosystem:

```
┌──────────────────────────────────────────────────────────────┐
│                    FlowBond Tech                              │
│              "Presence Infrastructure"                        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │   FlowB     │  │  DANZ.Now   │  │  Wearable Gen-1      │ │
│  │             │  │             │  │                      │ │
│  │ Event coord │  │ Dance &     │  │ BLE 5.0 bracelet     │ │
│  │ Crews       │  │ wellness    │  │ EDA/PPG/IMU sensors  │ │
│  │ Points      │  │ $DANZ token │  │ On-device ML         │ │
│  │ AI guide    │  │ Organizer   │  │ On-device signing    │ │
│  │ Multi-plat  │  │ dashboard   │  │ 48hr battery         │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘ │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                    │
│              ┌───────────▼────────────┐                      │
│              │  Shared ZK Layer       │                      │
│              │                        │                      │
│              │  Identity commitments  │                      │
│              │  Merkle trees          │                      │
│              │  Nullifier registry    │                      │
│              │  Pedersen balances     │                      │
│              │  Encrypted blobs       │                      │
│              │  Attestation anchors   │                      │
│              └───────────┬────────────┘                      │
│                          │                                    │
│              ┌───────────▼────────────┐                      │
│              │  On-Chain (Base L2)    │                      │
│              │  Merkle roots          │                      │
│              │  Unlock Protocol NFTs  │                      │
│              │  $DANZ token           │                      │
│              │  USDC payouts          │                      │
│              └────────────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

### 11.2 How the Products Share ZK Infrastructure

A single user generates **one secret key** that works across all three products. The ZK layer lets them prove things across product boundaries without any product knowing who they are in another context:

| Cross-Product Proof | What's Proven | What's Hidden |
|-------|--------|--------|
| "I'm a DANZ Legend, give me FlowB crew boost" | Tier >= Legend in DANZ points tree | DANZ identity, exact score, dance history |
| "My wearable confirms I was at this event" | Device attestation anchored in attendance tree | Which device, biometric data, exact location |
| "I've attended 5 FlowB events, give me $DANZ reward" | 5 attendance nullifiers consumed across event trees | Which events, which identity commitment |
| "I'm a premium DANZ subscriber" (Unlock NFT) | Ownership proof of Unlock Lock key | Wallet address, subscription tier details |
| "My crew has 10+ members" | Crew tree leaf_count >= 10 | Who the members are |

### 11.3 The FlowBond Pipeline with ZK

The core pipeline — **Sense → Sign → Attest → Reward → Compose** — maps directly onto ZK primitives:

| Stage | What Happens | ZK Role |
|-------|-------------|---------|
| **Sense** | Wearable/phone detects movement, proximity, biometrics | Raw sensor data stays on device; never enters the DB |
| **Sign** | On-device ML classifies activity; device signs attestation with its private key | Device attestation = a signed commitment to "authentic movement occurred" |
| **Attest** | Attestation anchored in Merkle tree + Ethereum Attestation Service | ZK proof of valid attestation without revealing sensor data or device identity |
| **Reward** | Smart contracts trigger token flows ($DANZ, USDC, partner tokens) | Reward claim requires ZK proof of attestation membership; nullifier prevents double-claim |
| **Compose** | SDK lets any app/DAO/brand plug into proof-of-presence layer | Third parties verify Merkle proofs against published roots — no access to underlying data |

---

## 12. DANZ.Now — ZK for Movement Verification

### 12.1 The Problem with Current Dance Verification

Today, DANZ.Now verifies dance participation through:
1. **Self-reported check-ins** — user taps a button saying they're at an event
2. **Photo proof** — user uploads a photo of themselves doing a dance move
3. **Manual review** — organizers or admins review submissions

This is fundamentally **trust-based**. A user could check in from home, submit someone else's photo, or claim moves they didn't do. The $DANZ token and USDC rewards create a financial incentive to cheat.

### 12.2 ZK-Verified Movement

With the wearable and ZK proofs, verification becomes **cryptographic**:

```
Wearable Device                     FlowB/DANZ Server               Database
┌──────────────┐                    ┌────────────────┐            ┌──────────┐
│ IMU accel    │                    │                │            │          │
│ PPG heart    │──→ On-device ML    │                │            │          │
│ EDA skin     │    classifies:     │                │            │          │
│              │    "dancing" ✓     │                │            │          │
│              │         │          │                │            │          │
│ Device key   │    Signs:          │                │            │          │
│ (Ed25519)    │──→ Attestation     │  Verifies      │            │          │
│              │    {               │  device sig    │            │          │
│              │      type: dance   │  + inserts     │  Stores    │          │
│              │      intensity: H  │──→ commitment ──→ commitment │          │
│              │      duration: 4m  │  in Merkle     │  + nullif  │          │
│              │      device_sig    │  tree           │            │          │
│              │    }               │                │            │          │
└──────────────┘                    └────────────────┘            └──────────┘
```

**What the database stores**: A Poseidon commitment to the attestation and the device's public key commitment. The raw sensor data (heart rate, skin conductance, acceleration vectors) **never leaves the device** and **never touches the database**.

**What can be proven**: "An authentic FlowBond device detected dancing activity of at least 4 minutes at intensity level 'high'" — without revealing which device, which user, or the raw biometric data.

### 12.3 Dance Challenge Verification with ZK

The current dev-themed dance challenges (The Git Push, Merge Conflict, Deploy to Prod, etc.) have specific movement patterns. With the wearable:

| Challenge | Current Verification | ZK Verification |
|-----------|---------------------|-----------------|
| The Git Push | Photo of forward push motion | IMU detects push pattern → device signs "push_motion_detected" → ZK proof of attestation |
| 404 Not Found (freeze 5s) | Photo of freeze pose | IMU detects <0.1g variance for 5s → device signs "freeze_5s" → ZK proof |
| The Fork Bomb | Video of rapid moves | IMU detects >3Hz movement for 10s → device signs "rapid_motion" → ZK proof |
| Merge Conflict (partner sync) | Photo with partner | BLE ranging detects second device <2m + synchronized IMU patterns → both devices sign "synced_movement" → ZK proof of mutual attestation |

The **Merge Conflict** challenge is particularly interesting — it requires **two wearables** to produce synchronized attestations, proving that two people actually danced together without revealing who they are.

### 12.4 $DANZ Token and ZK Rewards

The $DANZ reward rates today are:

| Challenge Type | USDC Reward | $DANZ Equivalent |
|---------------|------------|------------------|
| DAILY | $1.00 | TBD |
| WEEKLY | $5.00 | TBD |
| SPECIAL | $10.00 | TBD |
| EVENT | $2.00 | TBD |
| STREAK | $3.00 | TBD |
| SOCIAL | $1.50 | TBD |

With ZK proofs, reward claims become trustless:

1. User completes a dance challenge (wearable attests)
2. Attestation commitment inserted into the event's attendance Merkle tree
3. User generates a ZK proof: "I have a valid attestation in this event's tree, and I haven't claimed this reward before" (nullifier check)
4. Smart contract on Base verifies the proof and releases $DANZ / USDC
5. No human review needed — the proof IS the verification

This eliminates the current `payout_claims` table with its manual `pending → approved → paid → failed` workflow. The claim is either cryptographically valid or it isn't.

---

## 13. Wearable Gen-1 — Hardware Privacy Architecture

### 13.1 Device Specification (Privacy-Relevant)

| Component | Spec | Privacy Implication |
|-----------|------|-------------------|
| **BLE 5.0** | Bluetooth Low Energy, ranging support | Proximity verification without GPS/location — can prove "I was near another device" without revealing where |
| **EDA sensor** | Electrodermal activity (skin conductance) | Measures engagement/arousal — highly sensitive biometric, MUST stay on-device |
| **PPG sensor** | Photoplethysmography (heart rate) | Health data under HIPAA-adjacent regulations — MUST stay on-device |
| **IMU** | Accelerometer + gyroscope | Movement patterns are unique per person (gait fingerprinting risk) — raw data stays on-device; only classified activity types transmitted |
| **On-device ML** | Movement classification model | Runs locally; no cloud inference; classifies into categories (dancing, walking, still, etc.) |
| **On-device signing** | Ed25519 keypair provisioned at manufacture | Device signs attestations; private key never leaves the secure element |
| **Battery** | 48 hours | No always-on tracking; attestations generated only during active sessions |

### 13.2 What the Device Knows vs. What It Shares

| Data Category | On-Device | Transmitted | Stored in DB |
|--------------|----------|------------|-------------|
| Raw accelerometer vectors | Yes | **Never** | **Never** |
| Raw heart rate BPM | Yes | **Never** | **Never** |
| Raw skin conductance | Yes | **Never** | **Never** |
| ML-classified activity type | Yes | Yes (signed) | As commitment only |
| Activity duration | Yes | Yes (signed) | As commitment only |
| Activity intensity level | Yes | Yes (signed) | As commitment only |
| BLE proximity events | Yes | Yes (signed) | As commitment only |
| Device public key | Yes | Yes | As commitment only |
| Device serial / hardware ID | Yes | **Never** | **Never** |

### 13.3 Device Attestation Format

The wearable produces attestations — structured claims about what it observed, signed by its private key:

```
Attestation {
  version: 1,
  device_commitment: Poseidon(device_pubkey, manufacture_nonce),  // hides device identity
  timestamp_bucket: floor(unix_ts / 300),  // 5-min granularity — prevents timing attacks
  activity_type: enum { dancing, walking, running, still },
  intensity: enum { low, medium, high },
  duration_bucket: enum { 1-2min, 2-5min, 5-15min, 15-30min, 30min+ },
  proximity_peers: count,  // number of nearby devices (not their IDs)
  signature: Ed25519(device_sk, hash(above fields))
}
```

Note the deliberate information reduction:
- **Timestamp** bucketed to 5-minute windows (you can't tell exactly when within a 5-min window)
- **Duration** bucketed to ranges (you can't tell if a session was 7 or 12 minutes within the "5-15min" bucket)
- **Proximity** reduced to a count (you can tell 3 people were nearby, not which 3)
- **Device identity** committed (you can prove you're a valid device without revealing which one)

### 13.4 Device ↔ ZK Database Integration

```
Device                              Phone App                    Server
┌──────────┐     BLE 5.0     ┌─────────────────┐         ┌──────────────┐
│          │ ──attestation──→ │                 │         │              │
│ Wearable │                  │  FlowB/DANZ     │  HTTPS  │   API        │
│ Gen-1    │ ←─challenges──── │  Mobile App     │ ──────→ │   Layer      │
│          │                  │                 │         │              │
│ Secure   │                  │ Holds user sk   │         │ Verifies:    │
│ Element: │                  │ Generates ZK    │         │ - Device sig │
│ device   │                  │ proof combining │         │ - ZK proof   │
│ keypair  │                  │ device attest + │         │ - Nullifier  │
│          │                  │ user identity   │         │              │
└──────────┘                  └─────────────────┘         └──────────────┘
```

The phone app is the bridge: it receives the device attestation over BLE, combines it with the user's secret key to generate a ZK proof that binds "this device saw dancing" to "I am a valid user" without revealing either the device identity or the user identity to the server.

---

## 14. Proof Revocation and Key Rotation

### 14.1 The Problem

Secret key compromise is inevitable at scale. If a user's `sk` is leaked:
- An attacker can generate proofs as that user
- All Merkle tree memberships tied to `Poseidon(sk, nonce)` are compromised
- All Pedersen commitments blinded with that key's derived factors are exposed
- The attacker can claim rewards, enter battles, and impersonate the user

Unlike traditional systems where you just change a password, rotating a ZK identity requires migrating every commitment, every Merkle leaf, and every associated state.

### 14.2 Key Rotation Protocol

```
Phase 1: User proves they control the old key
  → Generates proof: "I know sk_old such that Poseidon(sk_old, nonce_old) = commitment_old"

Phase 2: User generates a new key
  → sk_new, nonce_new → commitment_new = Poseidon(sk_new, nonce_new)

Phase 3: User generates a rotation proof
  → ZK proof: "I know sk_old that maps to commitment_old, AND
               here is commitment_new that I want to replace it with"
  → This proof is bound to a rotation nullifier to prevent replay

Phase 4: Server atomically:
  1. Verifies the rotation proof
  2. Marks commitment_old as "rotated" (not deleted — historical proofs still verify)
  3. Inserts commitment_new into the identity Merkle tree
  4. Migrates balance commitment: user provides new blinding factor
  5. Re-inserts user into all crew Merkle trees with new membership leaves
  6. Archives old nullifiers (they're still valid — they were spent by the old identity)
```

### 14.3 Emergency Revocation

For immediate compromise response (user knows their key is stolen):

1. **Revocation nullifier**: `Poseidon(sk, "REVOKE", emergency_nonce)` — a special nullifier that immediately blacklists the old commitment
2. **Revocation list**: A separate Merkle tree of revoked commitments; all proof verification circuits check non-membership in the revocation tree
3. **Time-locked rotation**: After revocation, a 24-hour cooldown before the new key becomes active — prevents an attacker from revoking the legitimate user's key

### 14.4 Social Recovery

If the user loses their key entirely (device lost, no Privy backup):

- **Guardian system**: User pre-designates 3-of-5 guardians (friends, crew members, or trusted devices)
- Each guardian holds a Shamir share of a **recovery secret** (not the actual sk)
- The recovery secret can authorize a key rotation without knowing the old sk
- Guardians are identified by their own identity commitments — no names or platform IDs

---

## 15. Selective Disclosure Protocol

### 15.1 Why Selective Disclosure

Full privacy is sometimes too much. Users need to reveal specific facts in specific contexts:

| Scenario | What to Reveal | What to Hide |
|----------|---------------|-------------|
| Leaderboard participation | "My score is 1250" | Which identity commitment is mine |
| Crew recruitment | "I'm a Star tier (1000+ pts)" | Exact points, activity history |
| Event organizer verification | "42 people attended my event" | Who they are |
| Sponsor proof | "I visited booth #42" | My identity, what other booths I visited |
| Wearable health sharing | "My avg heart rate during dance was 120-140 BPM" | Raw PPG data, exact timestamps |

### 15.2 Disclosure Mechanisms

**Mechanism 1: Commitment Opening (Full Reveal)**

User publishes the preimage of a commitment, proving they own it:
```
Reveal: "balance = 1250, blinding = r"
Anyone can verify: PedersenCommit(1250, r) == stored_commitment ✓
```
Simple but all-or-nothing. Once revealed, can't un-reveal.

**Mechanism 2: Range Proofs (Partial Reveal)**

User proves their value is within a range without revealing the exact value:
```
ZK Proof: "My committed balance is between 1000 and 1500"
Verifier learns: user is in this range
Verifier doesn't learn: exact value, blinding factor
```
Used for tier verification, minimum-balance checks, and age-range proofs.

**Mechanism 3: Selective Attribute Disclosure**

For structured data (like an attestation with multiple fields), reveal some fields while hiding others:
```
Attestation: { activity: "dancing", intensity: "high", duration: "5-15min", heart_rate: "120-140" }

Selective reveal: activity = "dancing", intensity = "high"
Hidden: duration, heart_rate
ZK Proof: "I have a valid attestation in the tree where activity=dancing AND intensity=high"
```

**Mechanism 4: Designated Verifier Proofs**

Proofs that can only be verified by a specific party — prevents the verifier from forwarding the proof to others:
```
User creates proof: "My score is 1250" designated for Organizer X
Organizer X can verify it
Organizer X cannot prove to anyone else that the user's score is 1250
```
Used for sensitive disclosures where the user doesn't want the information to spread.

### 15.3 Leaderboard with Selective Disclosure

The leaderboard is the most visible selective disclosure challenge. Three approaches:

1. **Opt-in leaderboard**: Users who want to appear on the leaderboard publish a commitment opening. Simple but binary — you're either fully visible or not.

2. **Rank-only leaderboard**: Users submit range proofs proving their rank position. The leaderboard shows "Rank 1: commitment_abc, Rank 2: commitment_def" without revealing scores. Users can privately prove "I'm Rank 1" to anyone they choose.

3. **Bucketed leaderboard**: Users prove membership in score buckets (0-100, 100-500, 500-1000, 1000+). The leaderboard shows bucket counts. More private but less exciting.

Recommended: **Opt-in with pseudonyms**. Users who opt in can set a display name (stored as an encrypted blob, revealed by choice) alongside their score opening. Non-participants remain invisible.

---

## 16. Multi-Device and Multi-Platform Sync

### 16.1 The Problem

A FlowB user interacts from:
- Telegram on their phone
- Farcaster mini app on desktop
- WhatsApp on a second phone
- The web app on a laptop
- A wearable on their wrist

Each platform authenticates differently (Telegram bot token, Farcaster SIWF, WhatsApp phone number, web JWT, BLE device key). The ZK system needs a **single identity commitment** that works across all of them.

### 16.2 Key Derivation Hierarchy

```
Master Secret Key (sk_master)
  │
  ├── Privy Encrypted Backup (recovery)
  │
  ├── Platform-Specific Derivation:
  │   │
  │   ├── sk_telegram  = HKDF(sk_master, "flowb:telegram:v1")
  │   ├── sk_farcaster = HKDF(sk_master, "flowb:farcaster:v1")
  │   ├── sk_whatsapp  = HKDF(sk_master, "flowb:whatsapp:v1")
  │   ├── sk_web       = HKDF(sk_master, "flowb:web:v1")
  │   └── sk_signal    = HKDF(sk_master, "flowb:signal:v1")
  │
  └── Identity Commitment:
      identity_commitment = Poseidon(sk_master, registration_nonce)
      (same commitment regardless of which platform generates it)
```

All platform-specific keys derive from the same master. The identity commitment is always computed from `sk_master`, so a user has **one identity** across all platforms. The platform-specific keys are used for encrypting platform-specific blobs.

### 16.3 First-Platform Registration

The first platform a user interacts with generates `sk_master`:

1. User opens FlowB on Telegram for the first time
2. Client generates `sk_master` (256-bit random)
3. Client computes `identity_commitment = Poseidon(sk_master, nonce)`
4. Client backs up `sk_master` to Privy (encrypted with user's Privy credentials)
5. Server inserts `identity_commitment` into the identity Merkle tree

### 16.4 Cross-Platform Linking

When the same user opens FlowB on Farcaster:

1. User authenticates with Farcaster (SIWF)
2. Client detects no local `sk_master` for this platform
3. Client prompts: "Link to existing FlowB identity?"
4. User authenticates with Privy → retrieves encrypted `sk_master` backup → decrypts
5. Client verifies: `Poseidon(sk_master, nonce) == existing identity_commitment` ✓
6. Client stores `sk_master` locally (encrypted with platform-specific key)
7. No server-side linking needed — the commitment is the same

**ZK proof**: The IdentityLink circuit (Section 3.5 of the low-level doc) lets a user prove two platform commitments share the same `sk_master` without revealing the key to the server. This is used when the server needs to verify the link but shouldn't learn the master key.

### 16.5 Wearable Pairing

The wearable adds a hardware dimension:

1. User pairs the wearable with their phone via BLE
2. Phone sends `device_challenge = random_nonce` to wearable
3. Wearable signs `device_challenge` with its Ed25519 key → sends back `(device_pubkey, sig)`
4. Phone generates a **device binding commitment**: `Poseidon(sk_master, device_pubkey_hash)`
5. This binding is inserted into a device registry Merkle tree
6. Now the user can prove: "The attestation from this device belongs to me" without revealing either the device identity or the user identity

---

## 17. Proof Aggregation and Batching

### 17.1 When Individual Proofs Become Expensive

At FlowB's current scale (~1K users), verifying individual Groth16 proofs is fine — each takes ~5ms. But at scale:

| Scale | Daily Proofs | Verification Cost | Time |
|-------|-------------|-------------------|------|
| 1K users | ~5K | 25 seconds total | Fine |
| 10K users | ~50K | 250 seconds total | Manageable |
| 100K users | ~500K | 2,500 seconds total | Needs batching |
| 1M users | ~5M | 25,000 seconds total | Must aggregate |

### 17.2 Aggregation Strategies

**Strategy 1: SnarkPack (Groth16 Batch Verification)**

Multiple Groth16 proofs sharing the same verification key can be batch-verified in a single pairing check:
- 100 proofs verified in the time of ~3 individual proofs
- Requires all proofs to use the same circuit
- Well-suited for high-volume actions like daily check-ins

**Strategy 2: Recursive Proof Composition (Nova/SuperNova Folding)**

Each new proof "folds" into a running accumulator:
```
Proof_1 → Fold → Accumulator_1
Proof_2 → Fold → Accumulator_2
...
Proof_N → Fold → Accumulator_N → Single Final Verification
```
- Verification cost is O(1) regardless of N
- Each fold is cheap (~5ms)
- Final verification proves "N valid proofs were accumulated"
- Ideal for ongoing attestation streams from wearables

**Strategy 3: Periodic Rollup Proofs**

Every N minutes, a prover node generates a "rollup proof" that attests:
- "All Merkle tree updates in the last N minutes were valid"
- "All nullifiers consumed in the last N minutes were unique"
- "All balance transitions were correct"

This single rollup proof is what gets anchored on-chain (Phase 4), instead of individual proofs.

### 17.3 When to Adopt Each Strategy

| Strategy | Trigger | Complexity | Benefit |
|----------|---------|-----------|---------|
| Individual proofs (current) | < 10K users | Low | Simple, auditable |
| SnarkPack batching | 10K-50K users | Medium | 30x verification speedup |
| Nova folding | 50K+ users OR wearable streams | High | O(1) verification |
| Rollup proofs | On-chain anchoring at scale | High | Minimal on-chain cost |

---

## 18. Compliance Escape Hatch

### 18.1 The Regulatory Reality

Full anonymity sounds appealing but creates legal risk:
- **AML/KYC**: Financial regulators may require user identification for $DANZ / USDC flows
- **Court orders**: Law enforcement may compel deanonymization of specific users
- **Tax reporting**: Users earning rewards may need identifiable records for tax purposes
- **Content moderation**: Abusive users must be removable

A system with **no** deanonymization path is legally untenable. A system where **any single party** can deanonymize is a privacy honeypot. The solution is **threshold decryption** — deanonymization requires N-of-M independent trustees to cooperate.

### 18.2 Threshold Decryption Architecture

```
                         ┌──────────────────────────┐
                         │    Compliance Request     │
                         │    (court order, etc.)    │
                         └────────────┬─────────────┘
                                      │
                         Requires 3-of-5 trustee signatures
                                      │
                    ┌─────────────────┬┼┬─────────────────┐
                    ▼                 ▼ ▼                  ▼
              ┌──────────┐    ┌──────────┐         ┌──────────┐
              │ Trustee 1│    │ Trustee 2│   ...   │ Trustee 5│
              │ (Legal)  │    │ (Board)  │         │ (External│
              │          │    │          │         │  Auditor)│
              └────┬─────┘    └────┬─────┘         └────┬─────┘
                   │               │                     │
                   └───────────────┼─────────────────────┘
                                   │
                         3 shares combined →
                         decrypt identity_mapping
                                   │
                         ┌─────────▼──────────┐
                         │ identity_commitment │──→ platform_user_id
                         └────────────────────┘
```

### 18.3 How It Works

**Setup (one-time)**:
1. Generate a master compliance key `K_compliance`
2. Split `K_compliance` into 5 Shamir shares (threshold = 3)
3. Distribute shares to 5 independent trustees (legal counsel, board member, external auditor, user advocate, technical security officer)
4. Destroy the original `K_compliance` — it only exists as shares

**Per-user registration**:
1. When a user registers, the server creates an `identity_mapping`:
   ```
   mapping = AES-256-GCM(K_compliance, {
     identity_commitment: ...,
     platform: "telegram",
     platform_user_id: "123456789",
     registration_timestamp: ...
   })
   ```
2. The encrypted mapping is stored in a separate, access-controlled table
3. No single party (including FlowBond) can decrypt it without 3 trustees cooperating

**Deanonymization (requires legal justification)**:
1. Legal process (court order) identifies a target commitment or behavior pattern
2. Request submitted to all 5 trustees with legal documentation
3. At least 3 trustees independently verify the legal basis and provide their shares
4. Shares combined → `K_compliance` reconstructed → specific mapping decrypted
5. `K_compliance` immediately destroyed again after use
6. Audit log of all deanonymization events published (without revealing the target)

### 18.4 Transparency Guarantees

- **Canary**: A signed statement published periodically: "As of [date], FlowBond has received [N] deanonymization requests and fulfilled [M]." If the canary stops being published, users know something changed.
- **Audit log**: Every deanonymization event is recorded (with a hash of the court order, the number of trustees who participated, and the timestamp) but NOT the identity that was revealed.
- **Rate limiting**: A maximum of N deanonymizations per quarter, enforced by the trustee protocol. This prevents mass surveillance disguised as individual requests.
- **User notification**: After a configurable delay (e.g., 90 days), the affected user is notified that their identity was revealed under legal process — unless the court order specifically prohibits notification (gag order).

### 18.5 What's NOT Deanonymizable

Even with the compliance escape hatch, some things remain provably hidden:

| Data | Deanonymizable? | Reason |
|------|-----------------|--------|
| Platform user ID | Yes (3-of-5 threshold) | Encrypted with compliance key |
| Point balance | **No** | Pedersen commitment — compliance key doesn't help |
| Social connections | **No** | Mutual commitments — would need BOTH parties deanonymized |
| Dance movement data | **No** | Never leaves the device |
| Biometric data | **No** | Never leaves the device |
| Event attendance list | **No** | Individual attendance, yes (via commitment); full list requires deanonymizing every attendee |

This is the correct trade-off: authorities can identify **who** a specific commitment belongs to, but they cannot retroactively access **what that user did** beyond what the commitment structure reveals.

---

## 19. Unlock Protocol and ZK Proofs — Composability

### 19.1 Two Layers, One Identity

The [Unlock Protocol integration proposal](./unlock-protocol-integration.md) adds onchain NFT credentials (tickets, subscriptions, badges). ZK proofs compose with these:

| Unlock Credential | ZK Enhancement |
|-------------------|---------------|
| Event ticket (ERC-721) | Prove "I hold a ticket to event X" without revealing wallet address |
| DANZ subscription (monthly/yearly) | Prove "I'm a premium subscriber" without revealing which tier or when I subscribed |
| Milestone badge (soulbound) | Prove "I'm a Legend" without revealing which badge NFT is mine |
| Sponsor engagement NFT | Prove "I visited booth X" without linking to my identity |
| Crew membership Lock | Prove "I'm in this gated crew" without revealing my membership key |

### 19.2 NFT Ownership Proofs

Standard NFT ownership verification reveals the wallet address:
```
// Current: reveals wallet_address to the verifier
const hasKey = await lockContract.getHasValidKey(wallet_address);
```

With ZK:
```
// ZK: proves ownership without revealing wallet
ZK Proof: "I know a wallet_address such that:
  1. lockContract.getHasValidKey(wallet_address) == true
  2. wallet_address is committed in my wallet commitment
  3. My identity commitment is in the identity Merkle tree"
```

The verifier learns: "A valid FlowBond user holds this Unlock key."
The verifier does NOT learn: which user, which wallet, or any other keys they hold.

### 19.3 Cross-Protocol Attestations

The composability extends to external protocols:

```
FlowBond Attestation (ZK)     +     Unlock Credential (onchain)
         │                                    │
         └──── Combined Proof ────────────────┘
                    │
    "I attended ETHDenver (FlowBond attestation)
     AND I hold a DANZ Premium subscription (Unlock NFT)
     AND my movement was verified by a wearable (device attestation)"
                    │
    → Qualifies for premium $DANZ reward tier
    → Without revealing who I am
```

This is the **Compose** stage of the FlowBond pipeline: third-party apps, DAOs, and brands can verify complex multi-source claims about a user through a single proof, without accessing any of the underlying data.

---

## 20. Revised Success Metrics

| Metric | Target | Phase |
|--------|--------|-------|
| Cleartext PII in database | 0 fields | Phase 3 |
| Proof verification time (individual) | < 50ms server-side | Phase 2 |
| Proof verification time (batched, 100 proofs) | < 150ms server-side | Phase 4 |
| Client proof generation | < 5s on mobile | Phase 2 |
| Wearable attestation latency | < 2s device-to-commitment | Phase 3 |
| Nullifier collision rate | 0 (cryptographically negligible) | Phase 2 |
| Data recoverable from breach | Commitments + encrypted blobs only | Phase 3 |
| User key backup rate | > 90% (via Privy) | Phase 1 |
| Key rotation success rate | > 99.9% | Phase 3 |
| Compliance deanonymization turnaround | < 72 hours (with valid legal process) | Phase 3 |
| Selective disclosure adoption | > 30% of leaderboard users opt-in | Phase 3 |
| Cross-platform identity linking | > 60% of multi-platform users linked via ZK | Phase 2 |
| Wearable movement verification accuracy | > 95% (false positive rate < 2%) | Phase 3 |
| Dance challenge ZK verification rate | > 80% of challenges verified via device | Phase 4 |
