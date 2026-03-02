# ZK-Proof Database Design: Low-Level Specification

> **Status**: Proposal
> **Date**: 2026-03-02
> **Prerequisite**: [High-Level Architecture](./zk-proof-database-design.md)
> **Scope**: Table schemas, column types, commitment formats, Merkle tree structures, nullifier mechanics, circuit specs, and migration SQL for privacy-preserving FlowB database

---

## 1. Cryptographic Primitives — Byte-Level Specification

### 1.1 Poseidon Hash

- **Field**: BN254 scalar field (`p = 21888242871839275222246405745257275088548364400416034343698204186575808495617`)
- **Width**: t=3 (2 inputs + 1 capacity element)
- **Rounds**: 8 full + 57 partial (BN254 security parameters)
- **Output**: 32 bytes (single field element)
- **Library**: `circomlibjs` (`poseidon` function)

```typescript
import { buildPoseidon } from "circomlibjs";

const poseidon = await buildPoseidon();

// Identity commitment: H(sk, nonce)
function identityCommitment(sk: bigint, nonce: bigint): Uint8Array {
  return poseidon.F.toObject(poseidon([sk, nonce]));
}

// Nullifier: H(sk, scope, action_id)
function computeNullifier(sk: bigint, scope: bigint, actionId: bigint): Uint8Array {
  const inner = poseidon([sk, scope]);
  return poseidon.F.toObject(poseidon([inner, actionId]));
}
```

### 1.2 Pedersen Commitment

- **Curve**: BN254 (alt_bn128)
- **Generators**: Two independent generators `G` and `H` on BN254
  - `G` = standard generator
  - `H` = hash-to-curve("FlowB_Pedersen_H") — nothing-up-my-sleeve point
- **Format**: Compressed point (33 bytes) or uncompressed (65 bytes)
- **Storage**: 33 bytes as `BYTEA` in PostgreSQL

```typescript
// Pedersen commitment: C = v*G + r*H
interface PedersenCommitment {
  point: Uint8Array;     // 33 bytes compressed
  // User keeps locally:
  // value: bigint
  // blinding: bigint
}

// Homomorphic addition (server-side, no secrets needed):
// C(a+b) = C(a) + C(b)
function addCommitments(ca: Uint8Array, cb: Uint8Array): Uint8Array {
  // EC point addition on BN254
  return ecAdd(decompress(ca), decompress(cb));
}
```

### 1.3 Sparse Merkle Tree (SMT)

- **Depth**: 20 levels (supports 2^20 = ~1M leaves per tree)
- **Hash**: Poseidon (2-to-1)
- **Empty leaf**: `Poseidon(0, 0)` — deterministic empty value
- **Node format**: `Poseidon(left_child, right_child)`
- **Proof size**: 20 * 32 bytes = 640 bytes (sibling path)
- **Storage**: All nodes stored in a flat table keyed by `(tree_id, level, index)`

---

## 2. Database Schema — Core ZK Tables

### 2.1 Identity Commitment Store

Replaces cleartext `user_id` references across the system.

```sql
-- ZK Identity Commitments
-- Each user has exactly one identity commitment derived from their secret key
CREATE TABLE IF NOT EXISTS flowb_zk_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Poseidon(sk, registration_nonce) — 32 bytes
  identity_commitment BYTEA NOT NULL UNIQUE,

  -- Registration nonce (public, used in commitment)
  registration_nonce BYTEA NOT NULL,

  -- When this identity was registered
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Leaf index in the identity Merkle tree
  merkle_leaf_index INTEGER NOT NULL,

  CONSTRAINT chk_commitment_length CHECK (octet_length(identity_commitment) = 32),
  CONSTRAINT chk_nonce_length CHECK (octet_length(registration_nonce) = 32)
);

CREATE UNIQUE INDEX idx_zk_identities_commitment
  ON flowb_zk_identities (identity_commitment);
CREATE INDEX idx_zk_identities_leaf
  ON flowb_zk_identities (merkle_leaf_index);

ALTER TABLE flowb_zk_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_identities_service ON flowb_zk_identities
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_identities IS
  'Identity commitments: Poseidon(sk, nonce). The sk never touches the server.';
```

### 2.2 Merkle Tree Storage

Generic Merkle tree node storage for all trees in the system.

```sql
-- Sparse Merkle Tree node storage
-- Supports multiple named trees (identity, crew, event, etc.)
CREATE TABLE IF NOT EXISTS flowb_zk_merkle_nodes (
  tree_id TEXT NOT NULL,           -- e.g., 'identity', 'crew_<uuid>', 'event_<uuid>'
  level SMALLINT NOT NULL,         -- 0 = leaves, 20 = root
  node_index BIGINT NOT NULL,      -- position at this level
  node_hash BYTEA NOT NULL,        -- Poseidon hash, 32 bytes

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (tree_id, level, node_index),
  CONSTRAINT chk_node_hash_length CHECK (octet_length(node_hash) = 32),
  CONSTRAINT chk_level_range CHECK (level >= 0 AND level <= 20)
);

-- Fast root lookup
CREATE INDEX idx_merkle_root
  ON flowb_zk_merkle_nodes (tree_id, level)
  WHERE level = 20;

-- Merkle tree metadata
CREATE TABLE IF NOT EXISTS flowb_zk_merkle_trees (
  tree_id TEXT PRIMARY KEY,
  tree_type TEXT NOT NULL,          -- 'identity', 'crew', 'event_attendance', 'points_tier'
  current_root BYTEA NOT NULL,      -- cached root hash, 32 bytes
  leaf_count BIGINT NOT NULL DEFAULT 0,
  next_leaf_index BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_root_length CHECK (octet_length(current_root) = 32)
);

ALTER TABLE flowb_zk_merkle_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_zk_merkle_trees ENABLE ROW LEVEL SECURITY;
CREATE POLICY merkle_nodes_service ON flowb_zk_merkle_nodes
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY merkle_trees_service ON flowb_zk_merkle_trees
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_merkle_nodes IS
  'Sparse Merkle Tree storage. All trees (identity, crew, event) share this table, partitioned by tree_id.';
```

### 2.3 Nullifier Registry

Prevents double-actions without linking to identity.

```sql
-- Nullifier registry: stores spent nullifiers to prevent double-actions
CREATE TABLE IF NOT EXISTS flowb_zk_nullifiers (
  nullifier BYTEA PRIMARY KEY,     -- Poseidon(sk, scope, action_id), 32 bytes
  scope TEXT NOT NULL,              -- action category: 'checkin', 'battle', 'referral', 'payout', 'rsvp'
  proof_hash BYTEA NOT NULL,       -- SHA-256 of the submitted proof (audit trail)
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_nullifier_length CHECK (octet_length(nullifier) = 32),
  CONSTRAINT chk_proof_hash_length CHECK (octet_length(proof_hash) = 32)
);

-- Fast existence check (the critical query)
-- Primary key index on nullifier handles this

-- Scope-based queries for analytics
CREATE INDEX idx_nullifiers_scope
  ON flowb_zk_nullifiers (scope, verified_at DESC);

ALTER TABLE flowb_zk_nullifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY nullifiers_service ON flowb_zk_nullifiers
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_nullifiers IS
  'Spent nullifiers. Each nullifier = Poseidon(sk, scope, action_id). Presence means the action was already taken.';
```

### 2.4 Committed Balances (Points)

Replaces `flowb_user_points.total_points` with Pedersen commitments.

```sql
-- ZK point balances: Pedersen commitments instead of cleartext integers
CREATE TABLE IF NOT EXISTS flowb_zk_balances (
  identity_commitment BYTEA NOT NULL REFERENCES flowb_zk_identities(identity_commitment),

  -- Pedersen commitment to current balance: C = balance*G + blinding*H
  -- 33 bytes compressed BN254 point
  balance_commitment BYTEA NOT NULL,

  -- Commitment to the current streak value
  streak_commitment BYTEA NOT NULL,

  -- Milestone tier (public — needed for tier-gated features)
  -- This is the MINIMUM proven tier; actual tier may be higher
  proven_tier SMALLINT NOT NULL DEFAULT 0,

  -- Proof that balance >= tier_threshold for the claimed tier
  -- Stored for auditability; can be re-verified
  tier_proof BYTEA,

  -- Monotonic counter: increments on every balance update
  -- Prevents replay of old balance commitments
  update_nonce BIGINT NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (identity_commitment),
  CONSTRAINT chk_balance_commitment_length CHECK (octet_length(balance_commitment) = 33),
  CONSTRAINT chk_streak_commitment_length CHECK (octet_length(streak_commitment) = 33)
);

ALTER TABLE flowb_zk_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_balances_service ON flowb_zk_balances
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_balances IS
  'Pedersen-committed point balances. Server cannot read the actual balance; only verify proofs about it.';
```

### 2.5 ZK Action Log (Replaces Points Ledger)

Each action is a proof + nullifier rather than a cleartext record.

```sql
-- ZK action log: replaces flowb_points_ledger
-- Each row is a verified proof that an action occurred, without linking to identity
CREATE TABLE IF NOT EXISTS flowb_zk_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which nullifier was consumed (links to nullifier registry)
  nullifier BYTEA NOT NULL REFERENCES flowb_zk_nullifiers(nullifier),

  -- Action type (public metadata — what kind of action)
  action_type TEXT NOT NULL,

  -- Points delta commitment: Pedersen commitment to the points earned
  -- Allows homomorphic aggregation without revealing individual amounts
  delta_commitment BYTEA NOT NULL,

  -- The Groth16/PLONK proof bytes
  proof BYTEA NOT NULL,

  -- Public inputs to the proof (for re-verification)
  public_inputs BYTEA NOT NULL,

  -- Merkle root at time of proof (to pin the proof to a specific state)
  merkle_root_used BYTEA NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_delta_commitment_length CHECK (octet_length(delta_commitment) = 33),
  CONSTRAINT chk_merkle_root_length CHECK (octet_length(merkle_root_used) = 32)
);

CREATE INDEX idx_zk_actions_type ON flowb_zk_actions (action_type, created_at DESC);
CREATE INDEX idx_zk_actions_nullifier ON flowb_zk_actions (nullifier);

ALTER TABLE flowb_zk_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_actions_service ON flowb_zk_actions
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_actions IS
  'Verified action proofs. Each row proves an action happened without revealing who did it.';
```

### 2.6 Encrypted User Data Blobs

For data that users need to recover (trade history, session data, preferences).

```sql
-- Encrypted data blobs: opaque to the server, decryptable only by the user
CREATE TABLE IF NOT EXISTS flowb_zk_encrypted_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User's identity commitment (foreign key)
  identity_commitment BYTEA NOT NULL REFERENCES flowb_zk_identities(identity_commitment),

  -- Blob category for efficient retrieval
  category TEXT NOT NULL,  -- 'trade_history', 'session', 'preferences', 'wallet', 'connections'

  -- AES-256-GCM encrypted payload
  -- Format: base64(iv[12] || ciphertext || tag[16])
  encrypted_data BYTEA NOT NULL,

  -- Version for schema evolution of blob contents
  schema_version SMALLINT NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blobs_identity_category
  ON flowb_zk_encrypted_blobs (identity_commitment, category);

ALTER TABLE flowb_zk_encrypted_blobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY blobs_service ON flowb_zk_encrypted_blobs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_encrypted_blobs IS
  'Client-encrypted data blobs. The server stores and retrieves but cannot read contents.';
```

### 2.7 Social Graph — ZK Connections

Replaces `flowb_connections` and `flowb_group_members`.

```sql
-- ZK connection commitments: replaces cleartext friend edges
-- A connection is a mutual commitment: both parties commit to the relationship
CREATE TABLE IF NOT EXISTS flowb_zk_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Commitment to the connection: Poseidon(sk_a, sk_b, connection_nonce)
  -- Both users independently produce the same commitment (commutative)
  connection_commitment BYTEA NOT NULL UNIQUE,

  -- Both parties' identity commitments (public: reveals that two commitments
  -- are connected, but not which real users they are)
  party_a_commitment BYTEA NOT NULL,
  party_b_commitment BYTEA NOT NULL,

  -- Connection status commitment (encodes accepted/pending/blocked)
  status_commitment BYTEA NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_connection_commitment_length CHECK (octet_length(connection_commitment) = 32),
  CONSTRAINT chk_party_a_length CHECK (octet_length(party_a_commitment) = 32),
  CONSTRAINT chk_party_b_length CHECK (octet_length(party_b_commitment) = 32)
);

CREATE INDEX idx_zk_connections_party_a ON flowb_zk_connections (party_a_commitment);
CREATE INDEX idx_zk_connections_party_b ON flowb_zk_connections (party_b_commitment);

ALTER TABLE flowb_zk_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_connections_service ON flowb_zk_connections
  FOR ALL USING (true) WITH CHECK (true);

-- Crew membership via Merkle tree (no explicit member table)
-- Each crew is a Merkle tree in flowb_zk_merkle_trees with tree_type = 'crew'
-- Membership proved by providing a valid Merkle witness
-- The crew metadata itself is stored as an encrypted blob or public record:

CREATE TABLE IF NOT EXISTS flowb_zk_crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Public crew metadata (crews are public entities)
  name TEXT NOT NULL,
  description TEXT,
  created_by_commitment BYTEA NOT NULL,  -- identity commitment of creator
  crew_merkle_tree_id TEXT NOT NULL REFERENCES flowb_zk_merkle_trees(tree_id),

  -- Public stats (derived from tree leaf count)
  member_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_creator_length CHECK (octet_length(created_by_commitment) = 32)
);

ALTER TABLE flowb_zk_crews ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_crews_service ON flowb_zk_crews
  FOR ALL USING (true) WITH CHECK (true);
```

### 2.8 ZK Wallet References

Replaces `user_wallets` with commitment-based storage.

```sql
-- ZK wallet commitments: wallet addresses stored as commitments
-- The actual address is in an encrypted blob; this table holds the commitment
-- for on-chain verification linkage
CREATE TABLE IF NOT EXISTS flowb_zk_wallets (
  identity_commitment BYTEA NOT NULL REFERENCES flowb_zk_identities(identity_commitment),

  -- Poseidon(wallet_address_bytes, sk) — proves ownership without revealing address
  wallet_commitment BYTEA NOT NULL UNIQUE,

  -- Chain identifier (public)
  chain TEXT NOT NULL DEFAULT 'base',

  -- The encrypted wallet address (AES-256-GCM with user's derived key)
  -- Only the user can decrypt to get the actual address
  encrypted_address BYTEA NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (identity_commitment, chain),
  CONSTRAINT chk_wallet_commitment_length CHECK (octet_length(wallet_commitment) = 32)
);

ALTER TABLE flowb_zk_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_wallets_service ON flowb_zk_wallets
  FOR ALL USING (true) WITH CHECK (true);
```

### 2.9 ZK Battle Pools

Replaces `battle_pools` and `battle_entries` with committed stakes.

```sql
-- ZK battle pools: stakes are Pedersen commitments
CREATE TABLE IF NOT EXISTS flowb_zk_battle_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Public metadata
  title TEXT NOT NULL,
  pool_type TEXT NOT NULL DEFAULT 'winner_take_all'
    CHECK (pool_type IN ('winner_take_all', 'top_3', 'proportional')),
  entry_fee_commitment BYTEA NOT NULL,   -- Pedersen commitment to entry fee
  min_participants INTEGER NOT NULL DEFAULT 2,
  max_participants INTEGER DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'locked', 'resolved', 'paid', 'cancelled')),

  -- Pedersen commitment to total staked (homomorphic sum of entries)
  total_staked_commitment BYTEA NOT NULL,

  -- Creator's identity commitment
  creator_commitment BYTEA NOT NULL,

  -- Entry Merkle tree for this pool
  entry_merkle_tree_id TEXT REFERENCES flowb_zk_merkle_trees(tree_id),

  entry_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  CONSTRAINT chk_entry_fee_length CHECK (octet_length(entry_fee_commitment) = 33),
  CONSTRAINT chk_total_staked_length CHECK (octet_length(total_staked_commitment) = 33),
  CONSTRAINT chk_creator_length CHECK (octet_length(creator_commitment) = 32)
);

-- ZK battle entries: each entry is a committed stake + nullifier
CREATE TABLE IF NOT EXISTS flowb_zk_battle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES flowb_zk_battle_pools(id) ON DELETE CASCADE,

  -- Nullifier prevents double-entry (scope = 'battle', action_id = pool_id)
  entry_nullifier BYTEA NOT NULL UNIQUE REFERENCES flowb_zk_nullifiers(nullifier),

  -- Pedersen commitment to the staked amount
  stake_commitment BYTEA NOT NULL,

  -- Proof that stake_commitment matches the pool's entry_fee_commitment
  stake_proof BYTEA NOT NULL,

  -- Merkle leaf index in the pool's entry tree
  merkle_leaf_index INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_stake_length CHECK (octet_length(stake_commitment) = 33)
);

CREATE INDEX idx_zk_battle_entries_pool ON flowb_zk_battle_entries (pool_id);

ALTER TABLE flowb_zk_battle_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_zk_battle_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_battle_pools_service ON flowb_zk_battle_pools
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY zk_battle_entries_service ON flowb_zk_battle_entries
  FOR ALL USING (true) WITH CHECK (true);
```

### 2.10 ZK Event Attendance

Replaces `flowb_rsvps`.

```sql
-- ZK event RSVPs: attendance proven via Merkle membership, not cleartext
CREATE TABLE IF NOT EXISTS flowb_zk_event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id TEXT NOT NULL,  -- public event identifier (events are public)

  -- Nullifier prevents double-RSVP (scope = 'rsvp', action_id = event_id)
  rsvp_nullifier BYTEA NOT NULL UNIQUE REFERENCES flowb_zk_nullifiers(nullifier),

  -- Leaf in the event's attendance Merkle tree
  attendance_commitment BYTEA NOT NULL,  -- Poseidon(identity_commitment, event_id)
  merkle_leaf_index INTEGER NOT NULL,

  -- Status commitment: encodes going/maybe/cancelled without revealing who
  status_commitment BYTEA NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_attendance_length CHECK (octet_length(attendance_commitment) = 32),
  CONSTRAINT chk_status_length CHECK (octet_length(status_commitment) = 32)
);

CREATE INDEX idx_zk_attendance_event ON flowb_zk_event_attendance (event_id);

ALTER TABLE flowb_zk_event_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_attendance_service ON flowb_zk_event_attendance
  FOR ALL USING (true) WITH CHECK (true);
```

---

## 3. Circuit Specifications

### 3.1 Identity Membership Proof

**Purpose**: Prove "I am a registered FlowB user" without revealing which one.

```
Circuit: IdentityMembership

Private inputs:
  - sk: field              // user's secret key
  - nonce: field           // registration nonce
  - pathElements[20]: field[]  // Merkle siblings
  - pathIndices[20]: int[]     // left/right indicators

Public inputs:
  - merkleRoot: field      // current identity tree root
  - nullifier: field       // Poseidon(sk, scope, actionId)
  - scope: field           // action scope identifier
  - actionId: field        // specific action ID

Constraints:
  1. identityCommitment = Poseidon(sk, nonce)
  2. MerkleProof(identityCommitment, pathElements, pathIndices) == merkleRoot
  3. nullifier == Poseidon(Poseidon(sk, scope), actionId)
```

**Constraint count**: ~8,500 (Poseidon hashes dominate)
**Proof size**: 128 bytes (Groth16) / 384 bytes (PLONK)
**Verification time**: ~5ms (Groth16) / ~8ms (PLONK)

### 3.2 Balance Range Proof

**Purpose**: Prove "my committed balance is at least X" for tier verification.

```
Circuit: BalanceRangeProof

Private inputs:
  - sk: field              // user's secret key
  - nonce: field           // registration nonce
  - balance: field         // actual point balance
  - blinding: field        // Pedersen blinding factor
  - pathElements[20]: field[]
  - pathIndices[20]: int[]

Public inputs:
  - merkleRoot: field      // identity tree root
  - balanceCommitment: field[2]  // Pedersen commitment point (x, y)
  - threshold: field       // minimum balance to prove
  - nullifier: field

Constraints:
  1. identityCommitment = Poseidon(sk, nonce)
  2. MerkleProof(identityCommitment, pathElements, pathIndices) == merkleRoot
  3. PedersenCommit(balance, blinding) == balanceCommitment
  4. balance >= threshold   // range check via bit decomposition
  5. nullifier == Poseidon(Poseidon(sk, "tier_proof"), threshold)
```

**Constraint count**: ~15,000 (range check is expensive)
**Proof size**: 128 bytes (Groth16)

### 3.3 Balance Update Proof

**Purpose**: Prove a balance transition is valid (old_balance + delta = new_balance).

```
Circuit: BalanceUpdate

Private inputs:
  - sk: field
  - nonce: field
  - old_balance: field
  - old_blinding: field
  - delta: field              // points earned (provided by server)
  - new_blinding: field       // fresh blinding factor
  - pathElements[20]: field[]
  - pathIndices[20]: int[]

Public inputs:
  - merkleRoot: field
  - oldCommitment: field[2]   // Pedersen commitment to old balance
  - newCommitment: field[2]   // Pedersen commitment to new balance
  - deltaCommitment: field[2] // Pedersen commitment to delta
  - updateNonce: field        // monotonic counter (prevents replay)
  - nullifier: field

Constraints:
  1. identityCommitment = Poseidon(sk, nonce)
  2. MerkleProof(identityCommitment, ...) == merkleRoot
  3. PedersenCommit(old_balance, old_blinding) == oldCommitment
  4. PedersenCommit(old_balance + delta, new_blinding) == newCommitment
  5. PedersenCommit(delta, new_blinding - old_blinding) == deltaCommitment
  6. old_balance + delta >= 0  // no negative balances
  7. nullifier == Poseidon(Poseidon(sk, "balance_update"), updateNonce)
```

**Constraint count**: ~18,000

### 3.4 Crew Membership Proof

**Purpose**: Prove "I am a member of crew X" without revealing which member.

```
Circuit: CrewMembership

Private inputs:
  - sk: field
  - nonce: field
  - crewPathElements[20]: field[]
  - crewPathIndices[20]: int[]

Public inputs:
  - identityMerkleRoot: field  // global identity root
  - crewMerkleRoot: field      // crew-specific tree root
  - crewId: field
  - nullifier: field

Constraints:
  1. identityCommitment = Poseidon(sk, nonce)
  2. membershipLeaf = Poseidon(identityCommitment, crewId)
  3. MerkleProof(membershipLeaf, crewPathElements, crewPathIndices) == crewMerkleRoot
  4. nullifier == Poseidon(Poseidon(sk, "crew_membership"), crewId)
```

**Constraint count**: ~12,000

### 3.5 Cross-Platform Identity Link Proof

**Purpose**: Prove two identity commitments share the same secret key (for platform linking).

```
Circuit: IdentityLink

Private inputs:
  - sk: field               // shared secret key
  - nonce_a: field           // platform A registration nonce
  - nonce_b: field           // platform B registration nonce

Public inputs:
  - commitment_a: field      // identity commitment on platform A
  - commitment_b: field      // identity commitment on platform B

Constraints:
  1. Poseidon(sk, nonce_a) == commitment_a
  2. Poseidon(sk, nonce_b) == commitment_b
```

**Constraint count**: ~1,500 (simplest circuit)

---

## 4. Server-Side Verification Flow

### 4.1 Proof Verification Pipeline

```typescript
interface ZKProofRequest {
  proof: Uint8Array;          // Groth16/PLONK proof bytes
  publicInputs: bigint[];     // public signals
  nullifier: Uint8Array;      // 32 bytes
  circuitId: string;          // e.g., "identity_membership_v1"
}

async function verifyAndExecute(req: ZKProofRequest): Promise<void> {
  const { proof, publicInputs, nullifier, circuitId } = req;

  // 1. Load verification key for this circuit
  const vkey = await loadVerificationKey(circuitId);

  // 2. Verify the SNARK proof
  const valid = await snarkjs.groth16.verify(vkey, publicInputs, proof);
  if (!valid) throw new Error("Invalid proof");

  // 3. Check Merkle root is recent (within last N roots)
  const merkleRoot = publicInputs[0];
  const rootValid = await isRecentRoot(merkleRoot);
  if (!rootValid) throw new Error("Stale Merkle root");

  // 4. Check nullifier not spent
  const spent = await isNullifierSpent(nullifier);
  if (spent) throw new Error("Action already taken");

  // 5. Record nullifier as spent + execute action (atomic)
  await db.transaction(async (tx) => {
    await tx.insert("flowb_zk_nullifiers", {
      nullifier,
      scope: extractScope(circuitId),
      proof_hash: sha256(proof),
      verified_at: new Date(),
    });

    // Execute the specific action (balance update, RSVP, etc.)
    await executeAction(tx, circuitId, publicInputs);
  });
}
```

### 4.2 Merkle Root Freshness

To prevent proofs from being generated against stale trees (after a membership change), we keep a rolling window of recent roots:

```sql
-- Recent Merkle roots (rolling window for proof freshness)
CREATE TABLE IF NOT EXISTS flowb_zk_root_history (
  tree_id TEXT NOT NULL,
  root BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  block_number BIGINT,  -- on-chain anchor block (Phase 4)

  PRIMARY KEY (tree_id, root),
  CONSTRAINT chk_root_length CHECK (octet_length(root) = 32)
);

CREATE INDEX idx_root_history_recent
  ON flowb_zk_root_history (tree_id, created_at DESC);

ALTER TABLE flowb_zk_root_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY root_history_service ON flowb_zk_root_history
  FOR ALL USING (true) WITH CHECK (true);
```

```typescript
// Accept roots from the last 100 updates (about 1 hour at normal traffic)
const ROOT_HISTORY_DEPTH = 100;

async function isRecentRoot(treeId: string, root: Uint8Array): Promise<boolean> {
  const { data } = await supabase
    .from("flowb_zk_root_history")
    .select("root")
    .eq("tree_id", treeId)
    .order("created_at", { ascending: false })
    .limit(ROOT_HISTORY_DEPTH);

  return data?.some((r) => Buffer.compare(r.root, root) === 0) ?? false;
}
```

---

## 5. Client-Side Key Management

### 5.1 Key Derivation

```typescript
// User secret key derivation from platform authentication
// Uses HKDF to derive a deterministic sk from the platform auth token
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";

interface ZKKeyPair {
  sk: bigint;                      // secret key (BN254 scalar)
  identityCommitment: Uint8Array;  // Poseidon(sk, nonce)
  encryptionKey: Uint8Array;       // AES-256 key for blob encryption
}

function deriveZKKeys(
  platformAuthSecret: Uint8Array,  // e.g., Telegram bot token hash
  userId: string,                  // platform-prefixed user ID
  salt: Uint8Array                 // registration salt (stored server-side)
): ZKKeyPair {
  // Derive 64 bytes: 32 for sk, 32 for encryption key
  const ikm = platformAuthSecret;
  const info = new TextEncoder().encode(`flowb-zk-v1:${userId}`);
  const derived = hkdf(sha256, ikm, salt, info, 64);

  // sk must be in BN254 scalar field
  const skBytes = derived.slice(0, 32);
  const sk = bytesToBigInt(skBytes) % BN254_SCALAR_ORDER;

  const encryptionKey = derived.slice(32, 64);

  const nonce = bytesToBigInt(salt) % BN254_SCALAR_ORDER;
  const identityCommitment = poseidonHash(sk, nonce);

  return { sk, identityCommitment, encryptionKey };
}
```

### 5.2 Key Backup via Privy

```typescript
// Encrypted backup of ZK secret key via Privy's embedded wallet infrastructure
async function backupZKKey(privyId: string, sk: bigint): Promise<void> {
  // Encrypt sk with Privy's key management
  // This allows recovery if the user loses their device
  // Privy's infrastructure ensures only the authenticated user can decrypt
  const encryptedSk = await privy.encryptForUser(privyId, bigIntToBytes(sk));

  await supabase.from("flowb_zk_encrypted_blobs").upsert({
    identity_commitment: await getCommitmentForPrivyId(privyId),
    category: "sk_backup",
    encrypted_data: encryptedSk,
    schema_version: 1,
  });
}
```

### 5.3 Blob Encryption/Decryption

```typescript
// Client-side encryption for user data blobs
import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";

function encryptBlob(encryptionKey: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const iv = randomBytes(12);
  const cipher = gcm(encryptionKey, iv);
  const ciphertext = cipher.encrypt(plaintext);
  // Return iv || ciphertext (tag is appended by GCM)
  const result = new Uint8Array(iv.length + ciphertext.length);
  result.set(iv);
  result.set(ciphertext, iv.length);
  return result;
}

function decryptBlob(encryptionKey: Uint8Array, blob: Uint8Array): Uint8Array {
  const iv = blob.slice(0, 12);
  const ciphertext = blob.slice(12);
  const cipher = gcm(encryptionKey, iv);
  return cipher.decrypt(ciphertext);
}
```

---

## 6. Obfuscation Mapping: Current → ZK

Concrete mapping from every current cleartext column to its ZK equivalent.

### 6.1 `flowb_sessions` → `flowb_zk_identities` + `flowb_zk_encrypted_blobs`

| Current Column | ZK Replacement | Storage |
|---------------|---------------|---------|
| `user_id` (TEXT) | `identity_commitment` (BYTEA 32) | `flowb_zk_identities` |
| `platform` (TEXT) | Encoded in registration nonce derivation | Implicit |
| `verified` (BOOL) | Membership in identity Merkle tree = verified | `flowb_zk_merkle_nodes` |
| `privy_id` (TEXT) | Encrypted blob, category='session' | `flowb_zk_encrypted_blobs` |
| `danz_username` (TEXT) | Encrypted blob, category='session' | `flowb_zk_encrypted_blobs` |
| `wa_profile_name` (TEXT) | Encrypted blob, category='session' | `flowb_zk_encrypted_blobs` |

### 6.2 `flowb_user_points` → `flowb_zk_balances`

| Current Column | ZK Replacement | Storage |
|---------------|---------------|---------|
| `user_id` (TEXT) | `identity_commitment` (BYTEA 32) | `flowb_zk_balances` PK |
| `total_points` (INT) | `balance_commitment` (BYTEA 33) | Pedersen commitment |
| `current_streak` (INT) | `streak_commitment` (BYTEA 33) | Pedersen commitment |
| `longest_streak` (INT) | Encrypted blob | `flowb_zk_encrypted_blobs` |
| `milestone_level` (INT) | `proven_tier` (SMALLINT) | Public minimum tier |
| `referral_code` (TEXT) | Encrypted blob | `flowb_zk_encrypted_blobs` |
| `referred_by` (TEXT) | Nullifier (scope='referral') | `flowb_zk_nullifiers` |

### 6.3 `flowb_points_ledger` → `flowb_zk_actions`

| Current Column | ZK Replacement | Storage |
|---------------|---------------|---------|
| `user_id` (TEXT) | Absent — no identity linkage | N/A |
| `action` (TEXT) | `action_type` (TEXT) | Public |
| `points` (INT) | `delta_commitment` (BYTEA 33) | Pedersen commitment |
| `metadata` (JSONB) | Absent or encrypted blob | Optional |

### 6.4 `flowb_connections` → `flowb_zk_connections`

| Current Column | ZK Replacement | Storage |
|---------------|---------------|---------|
| `user_a` (TEXT) | `party_a_commitment` (BYTEA 32) | Identity commitment |
| `user_b` (TEXT) | `party_b_commitment` (BYTEA 32) | Identity commitment |
| `status` (TEXT) | `status_commitment` (BYTEA 32) | Poseidon hash |

### 6.5 `user_wallets` → `flowb_zk_wallets`

| Current Column | ZK Replacement | Storage |
|---------------|---------------|---------|
| `privy_id` (TEXT) | `identity_commitment` (BYTEA 32) | FK to identities |
| `wallet_address` (TEXT) | `encrypted_address` (BYTEA) | AES-256-GCM blob |
| `chain` (TEXT) | `chain` (TEXT) | Stays public |

### 6.6 `trade_history` → `flowb_zk_encrypted_blobs` + `flowb_zk_actions`

| Current Column | ZK Replacement | Storage |
|---------------|---------------|---------|
| `user_id` (TEXT) | Absent (nullifier only) | `flowb_zk_actions` |
| All trade details | Encrypted blob, category='trade_history' | User-decryptable only |
| `tx_hash` (TEXT) | Encrypted blob (on-chain data is public anyway) | Optional |

### 6.7 `battle_pools` / `battle_entries` → `flowb_zk_battle_pools` / `flowb_zk_battle_entries`

| Current Column | ZK Replacement | Storage |
|---------------|---------------|---------|
| `creator_user_id` (TEXT) | `creator_commitment` (BYTEA 32) | Identity commitment |
| `entry_fee` (NUMERIC) | `entry_fee_commitment` (BYTEA 33) | Pedersen commitment |
| `total_staked` (NUMERIC) | `total_staked_commitment` (BYTEA 33) | Homomorphic sum |
| `user_id` on entries | Entry nullifier | `flowb_zk_nullifiers` |
| `amount_staked` (NUMERIC) | `stake_commitment` (BYTEA 33) | Pedersen commitment |

---

## 7. PostgreSQL Helper Functions

### 7.1 Nullifier Check (Hot Path)

```sql
-- Fast nullifier existence check — the most latency-critical query
CREATE OR REPLACE FUNCTION flowb_zk_check_nullifier(
  p_nullifier BYTEA
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM flowb_zk_nullifiers WHERE nullifier = p_nullifier
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

### 7.2 Atomic Action Execution

```sql
-- Atomically record a nullifier + action in a single transaction
CREATE OR REPLACE FUNCTION flowb_zk_record_action(
  p_nullifier BYTEA,
  p_scope TEXT,
  p_proof_hash BYTEA,
  p_action_type TEXT,
  p_delta_commitment BYTEA,
  p_proof BYTEA,
  p_public_inputs BYTEA,
  p_merkle_root BYTEA
) RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
BEGIN
  -- Insert nullifier (fails if already spent — unique constraint)
  INSERT INTO flowb_zk_nullifiers (nullifier, scope, proof_hash)
  VALUES (p_nullifier, p_scope, p_proof_hash);

  -- Insert action record
  INSERT INTO flowb_zk_actions (
    nullifier, action_type, delta_commitment,
    proof, public_inputs, merkle_root_used
  ) VALUES (
    p_nullifier, p_action_type, p_delta_commitment,
    p_proof, p_public_inputs, p_merkle_root
  ) RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Merkle Tree Update

```sql
-- Insert a leaf and recompute the path to root
-- Called server-side after proof verification; Poseidon hashing done in application layer
CREATE OR REPLACE FUNCTION flowb_zk_insert_leaf(
  p_tree_id TEXT,
  p_leaf_hash BYTEA,
  p_path_hashes BYTEA[],  -- precomputed sibling path (20 elements)
  p_new_root BYTEA
) RETURNS BIGINT AS $$
DECLARE
  v_leaf_index BIGINT;
  v_level INTEGER;
BEGIN
  -- Get next leaf index
  SELECT next_leaf_index INTO v_leaf_index
  FROM flowb_zk_merkle_trees
  WHERE tree_id = p_tree_id
  FOR UPDATE;

  -- Insert the leaf
  INSERT INTO flowb_zk_merkle_nodes (tree_id, level, node_index, node_hash)
  VALUES (p_tree_id, 0, v_leaf_index, p_leaf_hash);

  -- Insert/update internal nodes along the path
  FOR v_level IN 1..20 LOOP
    INSERT INTO flowb_zk_merkle_nodes (tree_id, level, node_index, node_hash)
    VALUES (p_tree_id, v_level, v_leaf_index >> v_level, p_path_hashes[v_level])
    ON CONFLICT (tree_id, level, node_index)
    DO UPDATE SET node_hash = EXCLUDED.node_hash, updated_at = now();
  END LOOP;

  -- Archive old root and update to new
  INSERT INTO flowb_zk_root_history (tree_id, root)
  SELECT p_tree_id, current_root
  FROM flowb_zk_merkle_trees
  WHERE tree_id = p_tree_id;

  UPDATE flowb_zk_merkle_trees
  SET current_root = p_new_root,
      leaf_count = leaf_count + 1,
      next_leaf_index = v_leaf_index + 1,
      updated_at = now()
  WHERE tree_id = p_tree_id;

  RETURN v_leaf_index;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. Phase 1 Shadow Mode — Migration SQL

The first migration adds commitment columns alongside existing cleartext. No breaking changes.

```sql
-- ============================================================================
-- Phase 1: Shadow Mode — Add ZK commitment columns to existing tables
-- Non-breaking: all new columns are nullable
-- ============================================================================

-- 1. Sessions: add identity commitment
ALTER TABLE flowb_sessions
  ADD COLUMN IF NOT EXISTS identity_commitment BYTEA,
  ADD COLUMN IF NOT EXISTS zk_registration_nonce BYTEA;

CREATE INDEX IF NOT EXISTS idx_sessions_identity_commitment
  ON flowb_sessions (identity_commitment)
  WHERE identity_commitment IS NOT NULL;

-- 2. Points: add balance commitment
ALTER TABLE flowb_user_points
  ADD COLUMN IF NOT EXISTS identity_commitment BYTEA,
  ADD COLUMN IF NOT EXISTS balance_commitment BYTEA,
  ADD COLUMN IF NOT EXISTS streak_commitment BYTEA,
  ADD COLUMN IF NOT EXISTS balance_update_nonce BIGINT DEFAULT 0;

-- 3. Connections: add connection commitment
ALTER TABLE flowb_connections
  ADD COLUMN IF NOT EXISTS party_a_commitment BYTEA,
  ADD COLUMN IF NOT EXISTS party_b_commitment BYTEA,
  ADD COLUMN IF NOT EXISTS connection_commitment BYTEA;

-- 4. Deploy core ZK infrastructure tables
-- (Run the CREATE TABLE statements from sections 2.1 through 2.4 above)
-- Specifically: flowb_zk_identities, flowb_zk_merkle_trees,
-- flowb_zk_merkle_nodes, flowb_zk_nullifiers, flowb_zk_root_history

-- 5. Initialize the identity Merkle tree
INSERT INTO flowb_zk_merkle_trees (tree_id, tree_type, current_root, leaf_count, next_leaf_index)
VALUES ('identity', 'identity', E'\\x0000000000000000000000000000000000000000000000000000000000000000', 0, 0)
ON CONFLICT DO NOTHING;

-- 6. Create encrypted blob storage
-- (Run CREATE TABLE from section 2.6 above)
```

---

## 9. Query Patterns — Before and After

### "Get user's point balance"

**Before:**
```sql
SELECT total_points FROM flowb_user_points WHERE user_id = 'telegram_123';
-- Returns: 1250
```

**After:**
```sql
SELECT balance_commitment FROM flowb_zk_balances WHERE identity_commitment = $1;
-- Returns: 33-byte Pedersen commitment (meaningless without user's blinding factor)
-- User decodes locally: PedersenOpen(commitment, blinding) → 1250
```

### "Is user in crew X?"

**Before:**
```sql
SELECT 1 FROM flowb_group_members WHERE group_id = $1 AND user_id = 'telegram_123';
```

**After:**
```
Client submits CrewMembership proof with:
  - public: crewMerkleRoot, crewId, nullifier
  - private: sk, Merkle witness
Server: snarkjs.groth16.verify(vkey, publicInputs, proof) → true/false
No database query needed for the membership check itself.
```

### "Leaderboard — top 10 by points"

**Before:**
```sql
SELECT user_id, total_points FROM flowb_user_points ORDER BY total_points DESC LIMIT 10;
```

**After (opt-in reveal model):**
```sql
-- Users who opt-in to leaderboard publish their balance in cleartext
SELECT ic.identity_commitment, lb.revealed_balance, lb.display_name
FROM flowb_zk_leaderboard_optins lb
JOIN flowb_zk_identities ic ON ic.identity_commitment = lb.identity_commitment
ORDER BY lb.revealed_balance DESC LIMIT 10;
-- Each opt-in includes a range proof that revealed_balance matches the commitment
```

### "Has this user already claimed the daily check-in?"

**Before:**
```sql
SELECT 1 FROM flowb_points_ledger
WHERE user_id = 'telegram_123' AND action = 'daily_checkin'
AND created_at >= CURRENT_DATE;
```

**After:**
```sql
-- Nullifier = Poseidon(sk, 'checkin', today_date_as_field)
SELECT flowb_zk_check_nullifier($nullifier);
-- Returns true if already checked in, false otherwise
-- No user ID involved at all
```

---

## 10. Storage Estimates

| Table | Current Row Size | ZK Row Size | Ratio | Notes |
|-------|-----------------|-------------|-------|-------|
| `flowb_zk_identities` | N/A (new) | ~80 bytes | N/A | 32B commitment + 32B nonce + overhead |
| `flowb_zk_balances` | ~100 bytes (cleartext) | ~120 bytes | 1.2x | 32B FK + 33B balance + 33B streak + metadata |
| `flowb_zk_nullifiers` | N/A (new) | ~80 bytes | N/A | 32B nullifier + 32B proof_hash + metadata |
| `flowb_zk_actions` | ~150 bytes (ledger) | ~400 bytes | 2.7x | Proof bytes dominate (~256B for Groth16) |
| `flowb_zk_merkle_nodes` | N/A (new) | ~60 bytes/node | N/A | ~20 nodes per leaf insertion |
| `flowb_zk_encrypted_blobs` | Variable | Variable | ~1.1x | AES-GCM adds 28 bytes overhead |

**Estimated total storage overhead**: ~3-4x current database size, dominated by proof storage and Merkle tree nodes. At FlowB's current scale (~1K users), this is negligible. At 100K users, budget ~500MB for the ZK tables.

---

## 11. Dependencies

```jsonc
// Addition to package.json
{
  "dependencies": {
    "circomlibjs": "^0.1.7",     // Poseidon hash, Pedersen commitment
    "snarkjs": "^0.7.4",         // Groth16/PLONK prover + verifier
    "@noble/hashes": "^1.4.0",   // HKDF, SHA-256 (already likely in use)
    "@noble/ciphers": "^0.6.0",  // AES-256-GCM for blob encryption
    "@noble/curves": "^1.4.0"    // BN254 curve operations
  },
  "devDependencies": {
    "circom": "^2.1.9"           // Circuit compiler (build-time only)
  }
}
```

Circuit files would live in a new `circuits/` directory:
```
circuits/
├── identity_membership.circom
├── balance_range_proof.circom
├── balance_update.circom
├── crew_membership.circom
├── identity_link.circom
└── build/
    ├── *.wasm          # compiled circuits
    └── *.zkey          # proving/verification keys
```

---

## 12. Summary: What the Database Knows vs. Doesn't Know

| Question | Before (Cleartext) | After (ZK) |
|----------|-------------------|------------|
| Who is user X? | Full platform ID, username, Privy ID | A 32-byte commitment — meaningless without the secret key |
| How many points does user X have? | Exact integer | A 33-byte Pedersen commitment — can verify proofs about it, can't read it |
| Who are user X's friends? | Explicit edge list | Commitment pairs — can verify connection proofs, can't enumerate the graph |
| Which events did user X attend? | Explicit RSVP list | Attendance nullifiers — can verify attendance, can't link to identity |
| What's user X's wallet address? | Cleartext address | Encrypted blob — only the user can decrypt |
| Did user X already check in today? | Query by user_id + date | Query by nullifier — no user_id involved |
| How many users total? | COUNT(*) on any user table | Merkle tree leaf_count — same answer, no PII |
| What's the most popular action? | GROUP BY action on ledger | GROUP BY action_type on zk_actions — same answer, no user linkage |
