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
