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

---

## 13. Wearable Device Attestation Schema

### 13.1 Device Identity and Registration

Each FlowBond wearable has a factory-provisioned Ed25519 keypair stored in its secure element. The device never reveals its public key directly — instead, a commitment is registered.

```sql
-- Device identity registry
-- Each wearable's public key is committed, not stored in cleartext
CREATE TABLE IF NOT EXISTS flowb_zk_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Poseidon(device_pubkey_x, device_pubkey_y, manufacture_nonce)
  device_commitment BYTEA NOT NULL UNIQUE,

  -- Manufacture batch (public — useful for firmware update targeting)
  batch_id TEXT NOT NULL,

  -- Device is registered in this Merkle tree
  device_tree_id TEXT NOT NULL DEFAULT 'devices'
    REFERENCES flowb_zk_merkle_trees(tree_id),
  merkle_leaf_index INTEGER NOT NULL,

  -- Binding to a user identity (optional — set when device is paired)
  -- This is a commitment to the pairing, not a cleartext link
  -- Poseidon(user_identity_commitment, device_commitment, pairing_nonce)
  pairing_commitment BYTEA,

  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paired_at TIMESTAMPTZ,

  CONSTRAINT chk_device_commitment_length CHECK (octet_length(device_commitment) = 32),
  CONSTRAINT chk_pairing_commitment_length CHECK (
    pairing_commitment IS NULL OR octet_length(pairing_commitment) = 32
  )
);

CREATE INDEX idx_zk_devices_batch ON flowb_zk_devices (batch_id);
CREATE INDEX idx_zk_devices_pairing ON flowb_zk_devices (pairing_commitment)
  WHERE pairing_commitment IS NOT NULL;

ALTER TABLE flowb_zk_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_devices_service ON flowb_zk_devices
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_devices IS
  'Device identity commitments. The actual device public key and serial number never enter the database.';
```

### 13.2 Attestation Storage

Raw attestations from the wearable are stored as commitments. The full attestation data is signed by the device and optionally stored as an encrypted blob by the user.

```sql
-- Device attestations: movement/presence claims signed by wearable hardware
CREATE TABLE IF NOT EXISTS flowb_zk_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Device that produced this attestation (committed, not cleartext)
  device_commitment BYTEA NOT NULL,

  -- Poseidon hash of the attestation payload
  -- H(activity_type, intensity, duration_bucket, timestamp_bucket, peer_count)
  attestation_hash BYTEA NOT NULL,

  -- Ed25519 signature from the device over the attestation payload
  -- This proves a genuine FlowBond device produced the claim
  device_signature BYTEA NOT NULL,

  -- Activity type (public — needed for routing to correct verification circuit)
  activity_type SMALLINT NOT NULL,
  -- 0 = unknown, 1 = dancing, 2 = walking, 3 = running, 4 = still

  -- Timestamp bucket (5-minute granularity, public)
  timestamp_bucket BIGINT NOT NULL,

  -- BLE proximity peer count (public — needed for social proof threshold)
  proximity_peer_count SMALLINT NOT NULL DEFAULT 0,

  -- Merkle leaf index in the attestation tree for this time period
  merkle_leaf_index INTEGER,
  attestation_tree_id TEXT REFERENCES flowb_zk_merkle_trees(tree_id),

  -- Processing status
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_attestation_hash_length CHECK (octet_length(attestation_hash) = 32),
  CONSTRAINT chk_device_sig_length CHECK (octet_length(device_signature) = 64),
  CONSTRAINT chk_activity_type CHECK (activity_type BETWEEN 0 AND 4)
);

CREATE INDEX idx_zk_attestations_device ON flowb_zk_attestations (device_commitment, timestamp_bucket DESC);
CREATE INDEX idx_zk_attestations_activity ON flowb_zk_attestations (activity_type, timestamp_bucket DESC);
CREATE INDEX idx_zk_attestations_unverified ON flowb_zk_attestations (verified)
  WHERE verified = false;

ALTER TABLE flowb_zk_attestations ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_attestations_service ON flowb_zk_attestations
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_attestations IS
  'Wearable device attestations. Intensity, duration, and biometric details are committed — only activity type and timestamp bucket are public.';
```

### 13.3 BLE Proximity Proof Storage

When two wearables detect each other via BLE ranging, both devices produce co-attestations. This enables "Merge Conflict" partner dance challenges and social presence proofs.

```sql
-- BLE proximity co-attestations: two devices confirm mutual proximity
CREATE TABLE IF NOT EXISTS flowb_zk_proximity_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Both devices' commitments
  device_a_commitment BYTEA NOT NULL,
  device_b_commitment BYTEA NOT NULL,

  -- Mutual attestation hash: Poseidon(device_a_commitment, device_b_commitment, timestamp_bucket)
  -- Both devices independently produce the same hash (commutative)
  proximity_hash BYTEA NOT NULL UNIQUE,

  -- Signatures from both devices over the proximity_hash
  device_a_signature BYTEA NOT NULL,
  device_b_signature BYTEA NOT NULL,

  -- Timestamp bucket (5-min granularity)
  timestamp_bucket BIGINT NOT NULL,

  -- Estimated distance bucket (not exact — privacy preserving)
  -- 0 = <1m, 1 = 1-3m, 2 = 3-10m
  distance_bucket SMALLINT NOT NULL DEFAULT 0,

  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_proximity_hash_length CHECK (octet_length(proximity_hash) = 32),
  CONSTRAINT chk_device_a_sig_length CHECK (octet_length(device_a_signature) = 64),
  CONSTRAINT chk_device_b_sig_length CHECK (octet_length(device_b_signature) = 64)
);

CREATE INDEX idx_zk_proximity_timestamp ON flowb_zk_proximity_proofs (timestamp_bucket DESC);

ALTER TABLE flowb_zk_proximity_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_proximity_service ON flowb_zk_proximity_proofs
  FOR ALL USING (true) WITH CHECK (true);
```

### 13.4 Device Attestation Verification (Server-Side)

```typescript
import { ed25519 } from "@noble/curves/ed25519";

interface DeviceAttestation {
  deviceCommitment: Uint8Array;  // 32 bytes
  activityType: number;          // 0-4
  intensity: number;             // 0-3 (low/med/high/extreme)
  durationBucket: number;        // enum index
  timestampBucket: bigint;       // floor(unix_ts / 300)
  peerCount: number;
  signature: Uint8Array;         // 64 bytes Ed25519
}

async function verifyDeviceAttestation(
  attestation: DeviceAttestation,
  devicePubkeyEncrypted: Uint8Array,  // from user's encrypted blob
  userEncryptionKey: Uint8Array       // user decrypts on client, sends pubkey for verification
): Promise<boolean> {
  // 1. Verify the device commitment matches the provided pubkey
  const devicePubkey = attestation.deviceCommitment; // simplified — actual flow decrypts

  // 2. Reconstruct the attestation payload that was signed
  const payload = encodeAttestationPayload(attestation);

  // 3. Verify Ed25519 signature
  const sigValid = ed25519.verify(attestation.signature, payload, devicePubkey);
  if (!sigValid) return false;

  // 4. Verify device is in the device registry Merkle tree
  const deviceInTree = await verifyDeviceMembership(attestation.deviceCommitment);
  if (!deviceInTree) return false;

  // 5. Verify timestamp is recent (within last 24 hours)
  const now = BigInt(Math.floor(Date.now() / 1000 / 300));
  if (now - attestation.timestampBucket > 288n) return false; // 288 * 5min = 24h

  return true;
}

function encodeAttestationPayload(att: DeviceAttestation): Uint8Array {
  // Deterministic encoding: activity_type || intensity || duration || timestamp || peers
  const buf = new ArrayBuffer(20);
  const view = new DataView(buf);
  view.setUint8(0, att.activityType);
  view.setUint8(1, att.intensity);
  view.setUint8(2, att.durationBucket);
  view.setBigUint64(3, att.timestampBucket, false);
  view.setUint16(11, att.peerCount, false);
  return new Uint8Array(buf);
}
```

---

## 14. DANZ Movement Verification Circuits

### 14.1 Dance Attestation Proof

**Purpose**: Prove "a valid FlowBond device detected authentic dancing by me" without revealing the device, the biometric data, or the exact timing.

```
Circuit: DanceAttestation

Private inputs:
  - sk: field                          // user's secret key
  - nonce: field                       // registration nonce
  - device_pubkey_x: field             // device Ed25519 pubkey (x coordinate)
  - device_pubkey_y: field             // device Ed25519 pubkey (y coordinate)
  - device_manufacture_nonce: field
  - attestation_intensity: field       // 0-3
  - attestation_duration: field        // bucket index
  - identityPathElements[20]: field[]
  - identityPathIndices[20]: int[]
  - devicePathElements[20]: field[]
  - devicePathIndices[20]: int[]

Public inputs:
  - identityMerkleRoot: field
  - deviceMerkleRoot: field
  - activityType: field                // 1 = dancing (public)
  - timestampBucket: field             // 5-min bucket (public)
  - minIntensity: field                // required minimum (e.g., "medium")
  - minDuration: field                 // required minimum bucket
  - pairingCommitment: field           // proves this user owns this device
  - nullifier: field

Constraints:
  1.  identityCommitment = Poseidon(sk, nonce)
  2.  MerkleProof(identityCommitment, identityPath...) == identityMerkleRoot
  3.  deviceCommitment = Poseidon(device_pubkey_x, device_pubkey_y, device_manufacture_nonce)
  4.  MerkleProof(deviceCommitment, devicePath...) == deviceMerkleRoot
  5.  pairingCommitment == Poseidon(identityCommitment, deviceCommitment, pairing_nonce)
  6.  activityType == 1   // must be dancing
  7.  attestation_intensity >= minIntensity
  8.  attestation_duration >= minDuration
  9.  nullifier == Poseidon(Poseidon(sk, "dance_attestation"), timestampBucket)
```

**Constraint count**: ~25,000 (two Merkle proofs + Ed25519 verification dominate)
**Proof size**: 128 bytes (Groth16)

### 14.2 Partner Dance Proof (Merge Conflict Challenge)

**Purpose**: Prove "two different users with two different devices danced together in proximity" without revealing either identity.

```
Circuit: PartnerDance

Private inputs:
  - sk_a: field                        // user A's secret key
  - nonce_a: field
  - sk_b: field                        // user B's secret key (B provides to A for joint proof)
  - nonce_b: field                     // ALTERNATIVE: each user proves separately, combined off-circuit
  - device_a_pubkey: field[2]
  - device_b_pubkey: field[2]
  - proximity_distance_bucket: field   // 0 = <1m (required for partner dance)
  - pathElements_a[20]: field[]
  - pathIndices_a[20]: int[]
  - pathElements_b[20]: field[]
  - pathIndices_b[20]: int[]

Public inputs:
  - identityMerkleRoot: field
  - proximityHash: field               // Poseidon(device_a_commitment, device_b_commitment, ts)
  - timestampBucket: field
  - nullifier_a: field
  - nullifier_b: field

Constraints:
  1.  commitment_a = Poseidon(sk_a, nonce_a)
  2.  commitment_b = Poseidon(sk_b, nonce_b)
  3.  commitment_a != commitment_b     // different users
  4.  Both in identity Merkle tree
  5.  device_a_commitment = Poseidon(device_a_pubkey[0], device_a_pubkey[1], ...)
  6.  device_b_commitment = Poseidon(device_b_pubkey[0], device_b_pubkey[1], ...)
  7.  proximityHash == Poseidon(device_a_commitment, device_b_commitment, timestampBucket)
  8.  proximity_distance_bucket == 0   // must be <1m for partner dance
  9.  nullifier_a == Poseidon(Poseidon(sk_a, "partner_dance"), timestampBucket)
  10. nullifier_b == Poseidon(Poseidon(sk_b, "partner_dance"), timestampBucket)
```

**Constraint count**: ~35,000
**Note**: In practice, this circuit is too complex for a single proof with both users' secrets. The recommended approach is a **two-phase proof**: each user proves their side independently, and the server verifies both proofs reference the same `proximityHash`.

### 14.3 Dance Challenge Completion Proof

**Purpose**: Prove "I completed a specific dance challenge (e.g., The Git Push) with sufficient intensity and duration."

```
Circuit: ChallengeCompletion

Private inputs:
  - sk: field
  - nonce: field
  - attestation_intensity: field
  - attestation_duration: field
  - attestation_activity_subtype: field  // specific move classifier output
  - pathElements[20]: field[]
  - pathIndices[20]: int[]

Public inputs:
  - identityMerkleRoot: field
  - challengeId: field                    // e.g., hash("the_git_push")
  - challengeMinIntensity: field          // from challenge definition
  - challengeMinDuration: field           // from challenge definition
  - challengeRequiredSubtype: field       // move pattern classifier ID
  - rewardDeltaCommitment: field[2]       // Pedersen commitment to reward amount
  - nullifier: field

Constraints:
  1.  identityCommitment = Poseidon(sk, nonce)
  2.  MerkleProof(identityCommitment, ...) == identityMerkleRoot
  3.  attestation_intensity >= challengeMinIntensity
  4.  attestation_duration >= challengeMinDuration
  5.  attestation_activity_subtype == challengeRequiredSubtype
  6.  nullifier == Poseidon(Poseidon(sk, "challenge"), challengeId)
```

**Constraint count**: ~12,000
**Nullifier scope**: Per-challenge — prevents completing the same challenge twice (except DAILY/WEEKLY types which include a time component in the nullifier)

### 14.4 DANZ-Specific Database Tables

```sql
-- DANZ challenge definitions with ZK verification parameters
CREATE TABLE IF NOT EXISTS flowb_zk_danz_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Public challenge metadata
  challenge_name TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN (
    'DAILY', 'WEEKLY', 'SPECIAL', 'EVENT', 'MASTERY', 'EXPLORATION', 'STREAK'
  )),
  description TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Extreme')),

  -- ZK verification parameters (public — needed by the proving circuit)
  required_activity_type SMALLINT NOT NULL DEFAULT 1,  -- 1 = dancing
  required_min_intensity SMALLINT NOT NULL DEFAULT 1,  -- 0=low, 1=med, 2=high, 3=extreme
  required_min_duration SMALLINT NOT NULL DEFAULT 1,   -- duration bucket index
  required_activity_subtype SMALLINT,                  -- specific move pattern (null = any)
  requires_proximity_peer BOOLEAN NOT NULL DEFAULT false,  -- partner required?
  min_proximity_peers SMALLINT DEFAULT 0,

  -- Reward parameters (public — encoded in the reward circuit)
  xp_reward INTEGER NOT NULL,
  points_reward INTEGER NOT NULL,
  usdc_reward_cents INTEGER DEFAULT 0,  -- $1.00 = 100

  -- Reward commitment (Pedersen commitment to the reward amount, for verification)
  reward_commitment BYTEA,

  -- Repeatable?
  is_repeatable BOOLEAN NOT NULL DEFAULT false,
  repeat_interval TEXT CHECK (repeat_interval IN ('daily', 'weekly', NULL)),

  -- Challenge-specific nullifier includes time component for repeatable challenges
  -- Non-repeatable: nullifier = Poseidon(sk, "challenge", challenge_id)
  -- Daily: nullifier = Poseidon(sk, "challenge", challenge_id, date)
  -- Weekly: nullifier = Poseidon(sk, "challenge", challenge_id, week_number)

  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,

  CONSTRAINT chk_reward_commitment_length CHECK (
    reward_commitment IS NULL OR octet_length(reward_commitment) = 33
  )
);

-- ZK challenge completions: each completion is a verified proof
CREATE TABLE IF NOT EXISTS flowb_zk_danz_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  challenge_id UUID NOT NULL REFERENCES flowb_zk_danz_challenges(id),

  -- Nullifier prevents double-completion
  completion_nullifier BYTEA NOT NULL UNIQUE REFERENCES flowb_zk_nullifiers(nullifier),

  -- The attestation that was used (links to device attestation)
  attestation_id UUID REFERENCES flowb_zk_attestations(id),

  -- ZK proof that challenge requirements were met
  proof BYTEA NOT NULL,
  public_inputs BYTEA NOT NULL,
  merkle_root_used BYTEA NOT NULL,

  -- Reward delta commitment (Pedersen commitment to XP/points earned)
  reward_delta_commitment BYTEA NOT NULL,

  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_reward_delta_length CHECK (octet_length(reward_delta_commitment) = 33),
  CONSTRAINT chk_merkle_root_length CHECK (octet_length(merkle_root_used) = 32)
);

CREATE INDEX idx_zk_danz_completions_challenge ON flowb_zk_danz_completions (challenge_id, completed_at DESC);

ALTER TABLE flowb_zk_danz_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_zk_danz_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_danz_challenges_service ON flowb_zk_danz_challenges
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY zk_danz_completions_service ON flowb_zk_danz_completions
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_danz_challenges IS
  'DANZ dance challenge definitions with ZK verification parameters. All parameters are public (needed by proving circuits).';
COMMENT ON TABLE flowb_zk_danz_completions IS
  'Verified challenge completions. Each row proves a challenge was completed without revealing who completed it.';
```

---

## 15. Key Rotation and Revocation — Low-Level Protocol

### 15.1 Key Rotation Circuit

```
Circuit: KeyRotation

Private inputs:
  - sk_old: field                    // old secret key being rotated away
  - nonce_old: field                 // old registration nonce
  - sk_new: field                    // new secret key
  - nonce_new: field                 // new registration nonce (freshly random)
  - old_balance: field               // current point balance
  - old_blinding: field              // current Pedersen blinding factor
  - new_blinding: field              // fresh blinding factor for new commitment
  - pathElements[20]: field[]        // Merkle proof for old commitment
  - pathIndices[20]: int[]

Public inputs:
  - identityMerkleRoot: field
  - oldCommitment: field             // Poseidon(sk_old, nonce_old)
  - newCommitment: field             // Poseidon(sk_new, nonce_new)
  - oldBalanceCommitment: field[2]   // Pedersen(old_balance, old_blinding)
  - newBalanceCommitment: field[2]   // Pedersen(old_balance, new_blinding) — SAME balance
  - rotationNullifier: field         // prevents replaying rotation

Constraints:
  1.  Poseidon(sk_old, nonce_old) == oldCommitment
  2.  MerkleProof(oldCommitment, pathElements, pathIndices) == identityMerkleRoot
  3.  Poseidon(sk_new, nonce_new) == newCommitment
  4.  oldCommitment != newCommitment        // must actually rotate
  5.  PedersenCommit(old_balance, old_blinding) == oldBalanceCommitment
  6.  PedersenCommit(old_balance, new_blinding) == newBalanceCommitment
  7.  rotationNullifier == Poseidon(sk_old, "ROTATE", nonce_new)
```

**Constraint count**: ~20,000
**Critical property**: Constraint 6 ensures the balance carries over — the user can't inflate their balance during rotation.

### 15.2 Revocation Tree Schema

```sql
-- Revoked identity commitments — a separate Merkle tree
-- All verification circuits must check non-membership in this tree
CREATE TABLE IF NOT EXISTS flowb_zk_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The revoked identity commitment
  revoked_commitment BYTEA NOT NULL UNIQUE,

  -- The replacement commitment (after rotation)
  replacement_commitment BYTEA,

  -- Revocation proof (KeyRotation or EmergencyRevoke proof)
  revocation_proof BYTEA NOT NULL,
  revocation_nullifier BYTEA NOT NULL UNIQUE,

  -- Reason (for audit — not cryptographically enforced)
  reason TEXT NOT NULL CHECK (reason IN ('rotation', 'compromise', 'admin_revoke')),

  -- Merkle leaf index in the revocation tree
  revocation_tree_id TEXT NOT NULL DEFAULT 'revocations'
    REFERENCES flowb_zk_merkle_trees(tree_id),
  merkle_leaf_index INTEGER NOT NULL,

  -- Cooldown: new commitment not active until this time
  -- Prevents attacker from immediately rotating a stolen key
  cooldown_until TIMESTAMPTZ,

  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_revoked_commitment_length CHECK (octet_length(revoked_commitment) = 32)
);

CREATE INDEX idx_zk_revocations_commitment ON flowb_zk_revocations (revoked_commitment);
CREATE INDEX idx_zk_revocations_replacement ON flowb_zk_revocations (replacement_commitment)
  WHERE replacement_commitment IS NOT NULL;

ALTER TABLE flowb_zk_revocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY zk_revocations_service ON flowb_zk_revocations
  FOR ALL USING (true) WITH CHECK (true);
```

### 15.3 Rotation Execution Flow (Server-Side)

```typescript
async function executeKeyRotation(
  rotationProof: ZKProofRequest,
  oldCommitment: Uint8Array,
  newCommitment: Uint8Array,
  oldBalanceCommitment: Uint8Array,
  newBalanceCommitment: Uint8Array
): Promise<void> {
  // 1. Verify the rotation proof
  const vkey = await loadVerificationKey("key_rotation_v1");
  const valid = await snarkjs.groth16.verify(vkey, rotationProof.publicInputs, rotationProof.proof);
  if (!valid) throw new Error("Invalid rotation proof");

  // 2. Check rotation nullifier not spent (prevents replay)
  const spent = await isNullifierSpent(rotationProof.nullifier);
  if (spent) throw new Error("Rotation already processed");

  // 3. Atomic transaction: revoke old + register new
  await db.transaction(async (tx) => {
    // Record nullifier
    await tx.insert("flowb_zk_nullifiers", {
      nullifier: rotationProof.nullifier,
      scope: "key_rotation",
      proof_hash: sha256(rotationProof.proof),
    });

    // Add old commitment to revocation tree
    const revocationLeaf = await insertIntoMerkleTree(tx, "revocations", oldCommitment);
    await tx.insert("flowb_zk_revocations", {
      revoked_commitment: oldCommitment,
      replacement_commitment: newCommitment,
      revocation_proof: rotationProof.proof,
      revocation_nullifier: rotationProof.nullifier,
      reason: "rotation",
      revocation_tree_id: "revocations",
      merkle_leaf_index: revocationLeaf,
      cooldown_until: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h cooldown
    });

    // Add new commitment to identity tree
    await insertIntoMerkleTree(tx, "identity", newCommitment);

    // Migrate balance commitment
    await tx.update("flowb_zk_balances", {
      identity_commitment: newCommitment,
      balance_commitment: newBalanceCommitment,
      update_nonce: 0, // reset nonce for new identity
    }).where({ identity_commitment: oldCommitment });

    // Migrate crew memberships: re-insert into each crew tree
    const crewMemberships = await getCrewMembershipsForCommitment(tx, oldCommitment);
    for (const crew of crewMemberships) {
      const newLeaf = poseidonHash(newCommitment, crew.crewId);
      await insertIntoMerkleTree(tx, crew.treeId, newLeaf);
    }

    // Migrate encrypted blobs
    await tx.update("flowb_zk_encrypted_blobs", {
      identity_commitment: newCommitment,
    }).where({ identity_commitment: oldCommitment });
  });
}
```

### 15.4 Social Recovery Schema

```sql
-- Guardian shares for social recovery
-- Each user can designate N guardians; threshold M-of-N required for recovery
CREATE TABLE IF NOT EXISTS flowb_zk_recovery_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who set up recovery (by identity commitment)
  protected_commitment BYTEA NOT NULL,

  -- Guardian's identity commitment
  guardian_commitment BYTEA NOT NULL,

  -- Encrypted Shamir share: AES-256-GCM(guardian_derived_key, share_bytes)
  -- Only the guardian can decrypt their share
  encrypted_share BYTEA NOT NULL,

  -- Share index (1-based, needed for Shamir reconstruction)
  share_index SMALLINT NOT NULL,

  -- Recovery parameters (public)
  threshold SMALLINT NOT NULL,     -- M required
  total_shares SMALLINT NOT NULL,  -- N total

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_protected_length CHECK (octet_length(protected_commitment) = 32),
  CONSTRAINT chk_guardian_length CHECK (octet_length(guardian_commitment) = 32),
  UNIQUE (protected_commitment, guardian_commitment)
);

CREATE INDEX idx_recovery_protected ON flowb_zk_recovery_guardians (protected_commitment);
CREATE INDEX idx_recovery_guardian ON flowb_zk_recovery_guardians (guardian_commitment);

ALTER TABLE flowb_zk_recovery_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY recovery_guardians_service ON flowb_zk_recovery_guardians
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_recovery_guardians IS
  'Shamir secret sharing for social recovery. Each guardian holds an encrypted share of a recovery secret. M-of-N guardians can authorize a key rotation without the original sk.';
```

---

## 16. Selective Disclosure — Low-Level Protocol

### 16.1 Selective Disclosure Circuit

**Purpose**: Prove a specific attribute of committed data without revealing the full data.

```
Circuit: SelectiveReveal

Private inputs:
  - sk: field
  - nonce: field
  - full_data: field[8]            // up to 8 fields of committed data
  - blinding: field                // Pedersen blinding for the committed data
  - reveal_mask: field             // bitmask: which fields to reveal
  - pathElements[20]: field[]
  - pathIndices[20]: int[]

Public inputs:
  - identityMerkleRoot: field
  - dataCommitment: field          // Poseidon hash of full_data
  - revealedFields: field[8]       // values for revealed fields; 0 for hidden
  - revealMask: field              // which fields are revealed (bitmask)
  - nullifier: field               // optional: prevents re-disclosure

Constraints:
  1.  identityCommitment = Poseidon(sk, nonce)
  2.  MerkleProof(identityCommitment, ...) == identityMerkleRoot
  3.  Poseidon(full_data[0..7]) == dataCommitment
  4.  For each bit i in revealMask:
        if bit i == 1: revealedFields[i] == full_data[i]
        if bit i == 0: revealedFields[i] == 0
  5.  nullifier == Poseidon(sk, "selective_reveal", dataCommitment)
```

**Constraint count**: ~10,000

### 16.2 Range Proof Circuit (Detailed)

For proving "my balance is at least X" or "my heart rate was between A and B":

```
Circuit: RangeProof

Private inputs:
  - value: field                    // the actual value
  - blinding: field                 // Pedersen blinding factor
  - value_bits[64]: field[]         // bit decomposition of value

Public inputs:
  - commitment: field[2]           // Pedersen commitment to value
  - lower_bound: field             // minimum (inclusive)
  - upper_bound: field             // maximum (inclusive)

Constraints:
  1.  // Bit decomposition is valid
      For i in 0..63:
        value_bits[i] * (value_bits[i] - 1) == 0  // each bit is 0 or 1
      Sum(value_bits[i] * 2^i) == value

  2.  PedersenCommit(value, blinding) == commitment

  3.  // Range check: lower_bound <= value <= upper_bound
      value - lower_bound >= 0       // via bit decomposition
      upper_bound - value >= 0       // via bit decomposition
```

**Constraint count**: ~8,000 (bit decomposition is the expensive part)

### 16.3 Leaderboard Opt-In Schema

```sql
-- Leaderboard opt-in: users who choose to reveal their score publicly
CREATE TABLE IF NOT EXISTS flowb_zk_leaderboard_optins (
  identity_commitment BYTEA PRIMARY KEY REFERENCES flowb_zk_identities(identity_commitment),

  -- User's chosen display name (optional, stored as cleartext by choice)
  display_name TEXT,

  -- Revealed balance (user's choice to disclose)
  revealed_balance BIGINT NOT NULL,

  -- Proof that revealed_balance matches the Pedersen commitment
  -- (commitment opening: blinding factor is included in the proof)
  balance_proof BYTEA NOT NULL,

  -- The Pedersen commitment this opening corresponds to
  balance_commitment BYTEA NOT NULL,

  -- When the user opted in (for ranking tiebreakers)
  opted_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Auto-expire: user must re-opt-in periodically
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),

  CONSTRAINT chk_balance_commitment_length CHECK (octet_length(balance_commitment) = 33)
);

CREATE INDEX idx_leaderboard_balance ON flowb_zk_leaderboard_optins (revealed_balance DESC);

ALTER TABLE flowb_zk_leaderboard_optins ENABLE ROW LEVEL SECURITY;
CREATE POLICY leaderboard_service ON flowb_zk_leaderboard_optins
  FOR ALL USING (true) WITH CHECK (true);
```

### 16.4 Designated Verifier Proof

For proving something to a specific party without that party being able to forward the proof:

```typescript
// Designated verifier proof using Chaum's technique
// The proof is indistinguishable from a simulation the verifier could create

interface DesignatedVerifierProof {
  // Standard Groth16 proof
  proof: Uint8Array;
  publicInputs: bigint[];

  // Designated verifier binding
  verifierCommitment: Uint8Array;   // the intended verifier's identity commitment
  binding: Uint8Array;              // Poseidon(proof_hash, verifier_sk) — only verifier can create
}

// The verifier can verify the proof is genuine (they know the binding matches)
// but they cannot prove to a third party that the prover made this proof
// (because the verifier could have simulated it using their own sk)
```

---

## 17. Multi-Device Sync — Low-Level Protocol

### 17.1 Master Key Derivation Hierarchy

```typescript
// Full key derivation tree
const BN254_ORDER = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

interface FlowBKeyTree {
  // Root secret: 256-bit random, generated on first-ever interaction
  skMaster: bigint;

  // Identity commitment (same across all platforms)
  identityCommitment: Uint8Array;  // Poseidon(skMaster, registrationNonce)

  // Platform-specific derived keys (for blob encryption per platform)
  platformKeys: Map<string, Uint8Array>;  // platform → AES-256 key

  // Device binding keys
  deviceBindingKeys: Map<string, bigint>;  // device_commitment → binding_sk
}

function deriveFullKeyTree(skMaster: bigint, registrationNonce: bigint): FlowBKeyTree {
  const identityCommitment = poseidonHash(skMaster, registrationNonce);

  const platforms = ["telegram", "farcaster", "whatsapp", "web", "signal"];
  const platformKeys = new Map<string, Uint8Array>();

  for (const platform of platforms) {
    const info = new TextEncoder().encode(`flowb:${platform}:blob-encryption:v1`);
    const key = hkdf(sha256, bigIntToBytes(skMaster), new Uint8Array(32), info, 32);
    platformKeys.set(platform, key);
  }

  return {
    skMaster,
    identityCommitment,
    platformKeys,
    deviceBindingKeys: new Map(),
  };
}
```

### 17.2 Cross-Platform Sync Table

```sql
-- Cross-platform sync metadata
-- Tracks which platforms a commitment has been linked to
-- (does NOT store platform identifiers — those are encrypted blobs)
CREATE TABLE IF NOT EXISTS flowb_zk_platform_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user's identity commitment
  identity_commitment BYTEA NOT NULL REFERENCES flowb_zk_identities(identity_commitment),

  -- Platform type (public — needed for routing)
  platform TEXT NOT NULL CHECK (platform IN (
    'telegram', 'farcaster', 'whatsapp', 'web', 'signal', 'wearable'
  )),

  -- Platform-specific commitment: Poseidon(skMaster, platform_nonce)
  -- Different from the identity commitment — prevents cross-platform correlation
  -- if the link table is breached
  platform_commitment BYTEA NOT NULL UNIQUE,

  -- ZK proof that this platform_commitment shares the same skMaster
  -- as identity_commitment (IdentityLink circuit proof)
  link_proof BYTEA NOT NULL,

  -- When this link was established
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_identity_length CHECK (octet_length(identity_commitment) = 32),
  CONSTRAINT chk_platform_commitment_length CHECK (octet_length(platform_commitment) = 32),
  UNIQUE (identity_commitment, platform)
);

CREATE INDEX idx_platform_links_identity ON flowb_zk_platform_links (identity_commitment);

ALTER TABLE flowb_zk_platform_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_links_service ON flowb_zk_platform_links
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_platform_links IS
  'Cross-platform identity links. Each row proves a platform commitment shares the same master key as the identity commitment, verified by a ZK proof.';
```

### 17.3 Device Pairing Protocol

```typescript
// BLE pairing flow between phone app and wearable

interface PairingSession {
  devicePubkey: Uint8Array;         // received from wearable over BLE
  deviceCommitment: Uint8Array;     // Poseidon(device_pubkey_x, device_pubkey_y, manufacture_nonce)
  pairingNonce: bigint;             // freshly random
  pairingCommitment: Uint8Array;    // Poseidon(identityCommitment, deviceCommitment, pairingNonce)
}

async function pairWearable(
  skMaster: bigint,
  registrationNonce: bigint,
  devicePubkey: Uint8Array,
  deviceManufactureNonce: bigint
): Promise<PairingSession> {
  const identityCommitment = poseidonHash(skMaster, registrationNonce);

  // Compute device commitment (matching what's in the device registry)
  const [x, y] = decompressEd25519Point(devicePubkey);
  const deviceCommitment = poseidonHash(
    BigInt("0x" + Buffer.from(x).toString("hex")),
    BigInt("0x" + Buffer.from(y).toString("hex")),
    deviceManufactureNonce
  );

  // Generate fresh pairing nonce
  const pairingNonce = bytesToBigInt(randomBytes(32)) % BN254_ORDER;

  // Compute pairing commitment
  const pairingCommitment = poseidonHash(identityCommitment, deviceCommitment, pairingNonce);

  // Store pairing locally
  await localStore.set("device_pairing", {
    devicePubkey,
    deviceCommitment,
    pairingNonce,
    pairingCommitment,
  });

  // Submit pairing commitment to server
  await api.post("/zk/device/pair", {
    identityCommitment,
    pairingCommitment,
    // Note: device identity NOT sent — server only sees the pairing commitment
  });

  return { devicePubkey, deviceCommitment, pairingNonce, pairingCommitment };
}
```

---

## 18. Proof Aggregation and Batching — Low-Level

### 18.1 SnarkPack Batch Verification

For batch-verifying multiple Groth16 proofs with the same verification key:

```typescript
import { groth16 } from "snarkjs";

interface BatchVerificationResult {
  allValid: boolean;
  invalidIndices: number[];
  verificationTimeMs: number;
}

async function batchVerifyGroth16(
  vkey: any,
  proofs: { proof: any; publicInputs: bigint[] }[]
): Promise<BatchVerificationResult> {
  const start = Date.now();

  // SnarkPack: random linear combination of pairing checks
  // Instead of N independent pairing checks, do 1 combined check
  // with random coefficients (Schwartz-Zippel lemma ensures soundness)

  const randomCoeffs = proofs.map(() =>
    bytesToBigInt(randomBytes(16)) % BN254_ORDER
  );

  // Aggregate A points: A_agg = sum(coeff_i * A_i)
  // Aggregate B points: B_agg = sum(coeff_i * B_i)
  // Aggregate C points: C_agg = sum(coeff_i * C_i)
  // Single pairing check: e(A_agg, B_agg) == e(C_agg, delta) * e(public_agg, gamma)

  // Fallback: if batch fails, verify individually to find invalid proofs
  let allValid = true;
  const invalidIndices: number[] = [];

  // For now (before SnarkPack library integration), parallel individual verification
  const results = await Promise.all(
    proofs.map(async ({ proof, publicInputs }, i) => {
      const valid = await groth16.verify(vkey, publicInputs, proof);
      return { index: i, valid };
    })
  );

  for (const { index, valid } of results) {
    if (!valid) {
      allValid = false;
      invalidIndices.push(index);
    }
  }

  return {
    allValid,
    invalidIndices,
    verificationTimeMs: Date.now() - start,
  };
}
```

### 18.2 Nova Folding for Wearable Streams

Wearable attestations arrive as a continuous stream (one every 5 minutes during an active session). Rather than verifying each independently:

```typescript
// Nova Incremental Verifiable Computation (IVC)
// Each new attestation "folds" into a running proof

interface NovaAccumulator {
  // The folded proof so far
  accumulator: Uint8Array;
  // Number of attestations folded
  stepCount: number;
  // Current "running hash" of all folded attestations
  runningHash: Uint8Array;  // Poseidon(prev_hash, new_attestation_hash)
}

// The step circuit: verifies one attestation and folds it into the accumulator
// Circuit: NovaStep
//   Input: previous_accumulator_state, new_attestation
//   Output: new_accumulator_state
//   Constraints:
//     1. new_attestation is well-formed (activity type, intensity, duration valid)
//     2. new_attestation.timestamp > previous_attestation.timestamp (ordering)
//     3. running_hash = Poseidon(prev_running_hash, hash(new_attestation))

// After N attestations, produce a single "compressed" proof:
// "N valid attestations were produced in chronological order by a valid device"
// Verification cost: O(1) regardless of N
```

### 18.3 Batch Verification Queue Table

```sql
-- Proof verification queue for batch processing
-- Proofs are queued and verified in batches for efficiency
CREATE TABLE IF NOT EXISTS flowb_zk_verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Circuit type (determines which verification key to use)
  circuit_id TEXT NOT NULL,

  -- Proof data
  proof BYTEA NOT NULL,
  public_inputs BYTEA NOT NULL,
  nullifier BYTEA NOT NULL,

  -- Metadata for routing the result
  action_type TEXT NOT NULL,
  action_payload BYTEA,  -- additional data needed after verification

  -- Queue management
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verifying', 'verified', 'failed', 'executed')),
  batch_id UUID,  -- set when proof is assigned to a batch
  error_message TEXT,

  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,

  -- Priority: 0 = normal, 1 = high (financial operations), 2 = critical (revocations)
  priority SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_verification_queue_pending
  ON flowb_zk_verification_queue (priority DESC, queued_at ASC)
  WHERE status = 'pending';
CREATE INDEX idx_verification_queue_batch
  ON flowb_zk_verification_queue (batch_id)
  WHERE batch_id IS NOT NULL;

ALTER TABLE flowb_zk_verification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY verification_queue_service ON flowb_zk_verification_queue
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_zk_verification_queue IS
  'Proof verification queue. Proofs are batched by circuit_id for efficient batch verification via SnarkPack.';
```

### 18.4 Batch Processor (Server-Side)

```typescript
// Batch verification worker: runs on a timer or when queue reaches threshold
const BATCH_SIZE = 100;
const BATCH_INTERVAL_MS = 5000;  // 5 seconds

async function processBatchQueue(): Promise<void> {
  // Group pending proofs by circuit_id
  const { data: pending } = await supabase
    .from("flowb_zk_verification_queue")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("queued_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (!pending || pending.length === 0) return;

  // Group by circuit for batch verification
  const byCircuit = new Map<string, typeof pending>();
  for (const proof of pending) {
    const group = byCircuit.get(proof.circuit_id) || [];
    group.push(proof);
    byCircuit.set(proof.circuit_id, group);
  }

  for (const [circuitId, proofs] of byCircuit) {
    const batchId = crypto.randomUUID();

    // Mark as verifying
    await supabase
      .from("flowb_zk_verification_queue")
      .update({ status: "verifying", batch_id: batchId })
      .in("id", proofs.map(p => p.id));

    // Batch verify
    const vkey = await loadVerificationKey(circuitId);
    const result = await batchVerifyGroth16(
      vkey,
      proofs.map(p => ({
        proof: deserializeProof(p.proof),
        publicInputs: deserializePublicInputs(p.public_inputs),
      }))
    );

    // Update results
    for (let i = 0; i < proofs.length; i++) {
      const isValid = !result.invalidIndices.includes(i);
      await supabase
        .from("flowb_zk_verification_queue")
        .update({
          status: isValid ? "verified" : "failed",
          verified_at: new Date().toISOString(),
          error_message: isValid ? null : "Proof verification failed",
        })
        .eq("id", proofs[i].id);

      // Execute verified actions
      if (isValid) {
        await executeVerifiedAction(proofs[i]);
      }
    }
  }
}
```

---

## 19. Compliance Threshold Decryption — Low-Level

### 19.1 Shamir Secret Sharing Implementation

```typescript
import { randomBytes } from "crypto";

const PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

interface ShamirShare {
  index: number;       // 1-based share index
  value: bigint;       // share value (field element)
}

// Split a secret into N shares with threshold T
function shamirSplit(secret: bigint, threshold: number, totalShares: number): ShamirShare[] {
  // Generate random polynomial coefficients: a[0] = secret, a[1..t-1] = random
  const coefficients: bigint[] = [secret];
  for (let i = 1; i < threshold; i++) {
    coefficients.push(bytesToBigInt(randomBytes(32)) % PRIME);
  }

  // Evaluate polynomial at points 1..N
  const shares: ShamirShare[] = [];
  for (let x = 1; x <= totalShares; x++) {
    let y = 0n;
    for (let j = 0; j < coefficients.length; j++) {
      y = (y + coefficients[j] * modPow(BigInt(x), BigInt(j), PRIME)) % PRIME;
    }
    shares.push({ index: x, value: y });
  }

  return shares;
}

// Reconstruct secret from T shares using Lagrange interpolation
function shamirReconstruct(shares: ShamirShare[]): bigint {
  let secret = 0n;

  for (let i = 0; i < shares.length; i++) {
    let numerator = 1n;
    let denominator = 1n;

    for (let j = 0; j < shares.length; j++) {
      if (i === j) continue;
      numerator = (numerator * BigInt(-shares[j].index)) % PRIME;
      denominator = (denominator * BigInt(shares[i].index - shares[j].index)) % PRIME;
    }

    // Normalize to positive field element
    numerator = ((numerator % PRIME) + PRIME) % PRIME;
    denominator = ((denominator % PRIME) + PRIME) % PRIME;

    const lagrangeCoeff = (numerator * modInverse(denominator, PRIME)) % PRIME;
    secret = (secret + shares[i].value * lagrangeCoeff) % PRIME;
  }

  return ((secret % PRIME) + PRIME) % PRIME;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return result;
}

function modInverse(a: bigint, mod: bigint): bigint {
  return modPow(a, mod - 2n, mod); // Fermat's little theorem (mod is prime)
}
```

### 19.2 Compliance Key Management Schema

```sql
-- Compliance key metadata and trustee registry
-- The actual shares are distributed off-band to trustees (NOT stored here)
CREATE TABLE IF NOT EXISTS flowb_zk_compliance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Key generation parameters
  threshold SMALLINT NOT NULL,         -- M required to decrypt
  total_trustees SMALLINT NOT NULL,    -- N total shares
  key_version INTEGER NOT NULL DEFAULT 1,

  -- Public commitment to the compliance key
  -- Allows verification that a reconstructed key matches
  key_commitment BYTEA NOT NULL,  -- Poseidon(K_compliance, generation_nonce)

  -- Key ceremony timestamp
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Revoked when key is rotated (all trustees must participate in rotation)
  revoked_at TIMESTAMPTZ,

  CONSTRAINT chk_threshold CHECK (threshold >= 2),
  CONSTRAINT chk_trustees CHECK (total_trustees >= threshold),
  CONSTRAINT chk_key_commitment_length CHECK (octet_length(key_commitment) = 32)
);

-- Compliance identity mappings: encrypted with the compliance key
CREATE TABLE IF NOT EXISTS flowb_zk_compliance_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The identity commitment this mapping resolves
  identity_commitment BYTEA NOT NULL UNIQUE,

  -- AES-256-GCM(K_compliance, { platform, platform_user_id, registration_ts })
  encrypted_mapping BYTEA NOT NULL,

  -- When this mapping was created
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_identity_length CHECK (octet_length(identity_commitment) = 32)
);

CREATE INDEX idx_compliance_mappings_commitment
  ON flowb_zk_compliance_mappings (identity_commitment);

-- Compliance audit log: records every deanonymization event
CREATE TABLE IF NOT EXISTS flowb_zk_compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which key version was used
  key_version INTEGER NOT NULL,

  -- Hash of the legal order / justification document
  legal_order_hash BYTEA NOT NULL,

  -- Which trustees participated (by index, not identity)
  participating_trustee_indices SMALLINT[] NOT NULL,

  -- The target commitment that was deanonymized
  -- (stored as a hash to prevent the audit log itself from being a lookup table)
  target_commitment_hash BYTEA NOT NULL,  -- SHA-256(identity_commitment)

  -- Result: was the mapping successfully decrypted?
  decryption_successful BOOLEAN NOT NULL,

  -- Timestamp
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- User notification scheduled for (90 days later by default)
  user_notification_at TIMESTAMPTZ,

  -- Gag order? (if true, user_notification_at is null)
  notification_suppressed BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT chk_legal_order_hash_length CHECK (octet_length(legal_order_hash) = 32),
  CONSTRAINT chk_target_hash_length CHECK (octet_length(target_commitment_hash) = 32),
  CONSTRAINT chk_min_trustees CHECK (array_length(participating_trustee_indices, 1) >= 2)
);

ALTER TABLE flowb_zk_compliance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_zk_compliance_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_zk_compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- Compliance tables use stricter policies: read-only for service role
-- Write access only through stored procedures with audit logging
CREATE POLICY compliance_config_read ON flowb_zk_compliance_config
  FOR SELECT USING (true);
CREATE POLICY compliance_mappings_read ON flowb_zk_compliance_mappings
  FOR SELECT USING (true);
CREATE POLICY compliance_audit_read ON flowb_zk_compliance_audit_log
  FOR SELECT USING (true);

COMMENT ON TABLE flowb_zk_compliance_config IS
  'Compliance key parameters. The actual key material is distributed via Shamir shares to trustees and NEVER stored in the database.';
COMMENT ON TABLE flowb_zk_compliance_mappings IS
  'Encrypted identity mappings. Decryptable only with M-of-N trustee cooperation. Maps identity commitments to platform user IDs.';
COMMENT ON TABLE flowb_zk_compliance_audit_log IS
  'Immutable audit log of every deanonymization event. Includes legal justification hash and participating trustees.';
```

### 19.3 Deanonymization Procedure

```sql
-- Stored procedure for compliance deanonymization
-- This is the ONLY way to create an audit log entry
CREATE OR REPLACE FUNCTION flowb_zk_compliance_deanonymize(
  p_target_commitment BYTEA,
  p_legal_order_hash BYTEA,
  p_trustee_indices SMALLINT[],
  p_reconstructed_key BYTEA,        -- the M-of-N reconstructed compliance key
  p_key_version INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_config flowb_zk_compliance_config%ROWTYPE;
  v_mapping flowb_zk_compliance_mappings%ROWTYPE;
  v_key_commitment BYTEA;
  v_result JSONB;
BEGIN
  -- 1. Load compliance config for this key version
  SELECT * INTO v_config
  FROM flowb_zk_compliance_config
  WHERE key_version = p_key_version AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or revoked key version');
  END IF;

  -- 2. Verify threshold met
  IF array_length(p_trustee_indices, 1) < v_config.threshold THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Insufficient trustees: %s provided, %s required',
        array_length(p_trustee_indices, 1), v_config.threshold));
  END IF;

  -- 3. Verify reconstructed key matches commitment
  -- (Application layer computes Poseidon(reconstructed_key, generation_nonce)
  --  and passes it here for verification)
  -- NOTE: actual Poseidon verification done in application layer

  -- 4. Record audit log entry BEFORE attempting decryption
  INSERT INTO flowb_zk_compliance_audit_log (
    key_version, legal_order_hash, participating_trustee_indices,
    target_commitment_hash, decryption_successful,
    user_notification_at
  ) VALUES (
    p_key_version, p_legal_order_hash, p_trustee_indices,
    sha256(p_target_commitment), false,
    now() + INTERVAL '90 days'
  );

  -- 5. Look up encrypted mapping
  SELECT * INTO v_mapping
  FROM flowb_zk_compliance_mappings
  WHERE identity_commitment = p_target_commitment;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No mapping found for commitment');
  END IF;

  -- 6. Update audit log with success
  UPDATE flowb_zk_compliance_audit_log
  SET decryption_successful = true
  WHERE target_commitment_hash = sha256(p_target_commitment)
    AND legal_order_hash = p_legal_order_hash;

  -- 7. Return encrypted mapping (decryption happens in application layer with the key)
  RETURN jsonb_build_object(
    'success', true,
    'encrypted_mapping', encode(v_mapping.encrypted_mapping, 'base64'),
    'created_at', v_mapping.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict direct access to this function
REVOKE EXECUTE ON FUNCTION flowb_zk_compliance_deanonymize FROM PUBLIC;
-- Only the compliance service role can call this
```

---

## 20. Unlock Protocol + ZK Composability — Low-Level

### 20.1 NFT Ownership Proof Circuit

**Purpose**: Prove "I own an Unlock Protocol key (NFT) for a specific Lock" without revealing the wallet address.

```
Circuit: UnlockOwnership

Private inputs:
  - sk: field                          // user's ZK secret key
  - nonce: field                       // registration nonce
  - wallet_address: field              // Ethereum address (20 bytes as field)
  - wallet_blinding: field             // Pedersen blinding for wallet commitment
  - nft_token_id: field                // the specific Unlock key token ID
  - pathElements[20]: field[]
  - pathIndices[20]: int[]

Public inputs:
  - identityMerkleRoot: field
  - walletCommitment: field[2]         // Pedersen(wallet_address, wallet_blinding)
  - lockAddress: field                 // the Unlock Lock contract address
  - lockChainId: field                 // chain ID (8453 for Base)
  - ownershipMerkleRoot: field         // Merkle root of all key holders (from Unlock subgraph)
  - nullifier: field

Constraints:
  1.  identityCommitment = Poseidon(sk, nonce)
  2.  MerkleProof(identityCommitment, ...) == identityMerkleRoot
  3.  PedersenCommit(wallet_address, wallet_blinding) == walletCommitment
  4.  ownershipLeaf = Poseidon(wallet_address, lockAddress, nft_token_id)
  5.  MerkleProof(ownershipLeaf, ...) == ownershipMerkleRoot
  6.  nullifier == Poseidon(Poseidon(sk, "unlock_ownership"), lockAddress)
```

**Constraint count**: ~18,000

### 20.2 Unlock Ownership Tree Sync

The server periodically snapshots Unlock Lock key holders into a Merkle tree for ZK proofs:

```sql
-- Unlock Protocol ownership snapshots
-- Periodically synced from on-chain data via Unlock subgraph
CREATE TABLE IF NOT EXISTS flowb_zk_unlock_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which Lock contract
  lock_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 8453,

  -- Snapshot Merkle tree
  -- Leaves: Poseidon(wallet_address, lock_address, token_id)
  snapshot_tree_id TEXT NOT NULL REFERENCES flowb_zk_merkle_trees(tree_id),
  snapshot_root BYTEA NOT NULL,

  -- Block number this snapshot was taken at
  block_number BIGINT NOT NULL,

  -- Key holder count at snapshot time
  key_count INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_snapshot_root_length CHECK (octet_length(snapshot_root) = 32)
);

CREATE INDEX idx_unlock_snapshots_lock ON flowb_zk_unlock_snapshots (lock_address, block_number DESC);

ALTER TABLE flowb_zk_unlock_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY unlock_snapshots_service ON flowb_zk_unlock_snapshots
  FOR ALL USING (true) WITH CHECK (true);
```

---

## 21. Updated Circuit Directory Structure

```
circuits/
├── identity/
│   ├── identity_membership.circom     // Prove "I'm a registered user"
│   ├── identity_link.circom           // Prove two commitments share the same sk
│   └── key_rotation.circom            // Prove key rotation is valid
│
├── balance/
│   ├── balance_range_proof.circom     // Prove "my balance >= threshold"
│   ├── balance_update.circom          // Prove "old + delta = new" for committed balances
│   └── selective_reveal.circom        // Prove specific fields of committed data
│
├── membership/
│   ├── crew_membership.circom         // Prove "I'm in crew X"
│   └── revocation_check.circom        // Prove "my commitment is NOT revoked"
│
├── danz/
│   ├── dance_attestation.circom       // Prove "a device detected me dancing"
│   ├── partner_dance.circom           // Prove "two users danced together"
│   └── challenge_completion.circom    // Prove "I completed challenge X"
│
├── device/
│   ├── device_membership.circom       // Prove "this is a valid FlowBond device"
│   └── device_pairing.circom          // Prove "I own this device"
│
├── unlock/
│   └── unlock_ownership.circom        // Prove "I hold an Unlock NFT key"
│
├── lib/
│   ├── poseidon.circom                // Poseidon hash (imported from circomlib)
│   ├── pedersen.circom                // Pedersen commitment
│   ├── merkle_proof.circom            // Sparse Merkle Tree inclusion proof
│   ├── range_check.circom             // Bit decomposition range check
│   └── ed25519_verify.circom          // Ed25519 signature verification
│
└── build/
    ├── *.wasm                         // compiled circuits (WASM for browser proving)
    ├── *.r1cs                         // R1CS constraint systems
    ├── *.zkey                         // proving keys (Groth16)
    ├── *.vkey.json                    // verification keys
    └── powers_of_tau/                 // trusted setup ceremony files
        ├── pot12_final.ptau
        └── pot16_final.ptau           // for larger circuits (>16K constraints)
```

---

## 22. Updated Dependencies

```jsonc
{
  "dependencies": {
    // ZK core
    "circomlibjs": "^0.1.7",          // Poseidon hash, Pedersen commitment (in-JS)
    "snarkjs": "^0.7.4",              // Groth16/PLONK prover + verifier

    // Cryptographic primitives
    "@noble/hashes": "^1.4.0",        // HKDF, SHA-256, HMAC
    "@noble/ciphers": "^0.6.0",       // AES-256-GCM for blob/compliance encryption
    "@noble/curves": "^1.4.0",        // BN254, Ed25519 curve operations

    // Shamir secret sharing (compliance)
    "secrets.js-grempe": "^2.0.0",    // Shamir's Secret Sharing Scheme

    // Existing (unchanged)
    "@supabase/supabase-js": "^2.95.3",
    "@coinbase/agentkit": "^0.10.4"
  },
  "devDependencies": {
    "circom": "^2.1.9",               // Circuit compiler (build-time only)
    "mocha": "^10.7.0",               // Circuit test runner
    "@iden3/snarkjs": "^0.7.4"        // Alternative snarkjs with Nova support
  }
}
```

---

## 23. Updated Summary: Complete Data Knowledge Matrix

| Question | Before | After (ZK) | Who Can Answer? |
|----------|--------|------------|-----------------|
| Who is user X? | Cleartext platform ID | 32B commitment | Only the user (or 3-of-5 trustees with court order) |
| How many points? | Exact integer | 33B Pedersen commitment | Only the user (can selectively reveal) |
| Who are user X's friends? | Explicit edge list | Commitment pairs | Only the two connected users |
| Which events attended? | Explicit RSVP list | Attendance nullifiers | Only the user |
| Wallet address? | Cleartext | AES-256-GCM encrypted blob | Only the user |
| Daily check-in done? | Query by user_id + date | Query by nullifier | Anyone (nullifier is public) |
| Is user dancing right now? | Self-reported check-in | Device attestation commitment | The device (via ZK proof) |
| How intense was the dance? | Photo proof (manual review) | Device attestation with intensity commitment | Only the user (can prove "intensity >= medium") |
| Heart rate during dance? | N/A (not collected) | Never leaves device | Only the device/user |
| Are two users dancing together? | N/A | BLE proximity co-attestation | The two devices (via ZK proof) |
| Which dance challenges completed? | Cleartext ledger | Challenge completion nullifiers | Anyone (completion count is public, identity is not) |
| Is user a DANZ subscriber? | Unlock NFT wallet check (reveals address) | ZK proof of Unlock key ownership | Only the user (proves without revealing wallet) |
| Who's in crew X? | Explicit member list | Crew Merkle tree (root public, members hidden) | Only each member (via Merkle witness) |
| What did user X earn in $DANZ? | Trade history cleartext | Encrypted blob + committed balance | Only the user |
| How many users total? | COUNT(*) | Merkle tree leaf_count | Anyone (aggregate is public) |
| Can user be identified under court order? | Yes (cleartext) | Yes (3-of-5 threshold decryption) | Only with valid legal process + 3 independent trustees |
