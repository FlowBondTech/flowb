-- ============================================================
-- FLOWBOND LAYER 0 — SOVEREIGN IDENTITY PROTOCOL
-- Migration: 001_flowbond_layer0.sql
-- Stack: Supabase / PostgreSQL
-- Version: 2.0.0 (ZK + ICP + Multichain)
--
-- Architecture:
--   • flowbond_identities  — single source of truth
--   • wallet_connections   — provider-agnostic, swap freely
--   • private_data_vault   — encrypted refs to ICP canisters
--   • data_consent_grants  — user controls who sees what
--   • zk_proofs_issued     — audit trail of proofs given out
--   • used_nullifiers      — anti-double-claim
--   • points_ledger        — append-only, never mutate
--   • missions             — educational chain unlocks
--   • referrals            — universal, any conversion type
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================
-- ENUMS
-- ============================================================

-- All supported chains — add new entry to extend, nothing else breaks
create type chain_id as enum (
  -- EVM family (ECDSA secp256k1)
  'base',
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'bnb',
  -- Non-EVM (EdDSA ed25519)
  'solana',
  'near',
  'stellar',
  'ton',
  -- Substrate (sr25519)
  'polkadot',
  'kusama',
  -- Bitcoin family
  'bitcoin',
  'lightning',
  -- Internet Computer
  'icp',
  -- Cosmos
  'cosmos'
);

-- Crypto curve — determines key grouping strategy
create type crypto_curve as enum (
  'ecdsa_secp256k1',   -- EVM + Bitcoin
  'eddsa_ed25519',     -- Solana, NEAR, TON, Stellar
  'sr25519',           -- Polkadot / Substrate
  'ecdsa_secp256r1',   -- Passkey / WebAuthn / P-256
  'schnorr',           -- Bitcoin Taproot
  'icp_chain_key'      -- ICP threshold signatures
);

-- Wallet provider abstraction
create type wallet_provider as enum (
  'thirdweb',
  'dfns',
  'privy',
  'metamask',
  'phantom',
  'near_wallet',
  'polkadot_js',
  'talisman',
  'nightly',
  'icp_internet_identity',
  'ton_connect',
  'external_siwe',     -- Sign-In with Ethereum
  'external_siws',     -- Sign-In with Solana
  'internal'           -- future FlowBond native
);

-- Global roles
create type global_role as enum (
  'user',
  'organizer',
  'artist',
  'speaker',
  'panelist',
  'sponsor',
  'moderator',
  'admin',
  'superadmin'
);

create type role_scope as enum (
  'global',
  'product',
  'event'
);

-- Points ledger transaction types
create type points_tx_type as enum (
  'earn_referral_signup',
  'earn_referral_ticket',
  'earn_referral_product',
  'earn_referral_checkin',
  'earn_mission_complete',
  'earn_checkin',
  'earn_move',
  'earn_admin_grant',
  'spend_ticket',
  'spend_upgrade',
  'spend_product',
  'spend_transfer',
  'adjust_correction'
);

create type mission_status as enum (
  'locked',
  'available',
  'in_progress',
  'completed',
  'claimed'
);

create type referral_event_type as enum (
  'signup',
  'ticket_purchase',
  'product_purchase',
  'event_checkin'
);

create type referral_status as enum (
  'pending',
  'converted',
  'rewarded',
  'expired',
  'flagged'
);

-- ZK proof types FlowBond can issue
create type zk_proof_type as enum (
  'membership',        -- proves belonging to a group (event, tier)
  'eligibility',       -- proves meeting a threshold (points >= N)
  'uniqueness',        -- proves one-human-one-action (anti-sybil)
  'action_complete',   -- proves a mission/tx was done
  'data_access'        -- proves consent was granted
);

-- Private data categories (for consent scoping)
create type private_data_type as enum (
  'email',
  'phone',
  'wallet_map',        -- full list of linked wallet addresses
  'kyc_hash',          -- hashed KYC reference, never raw
  'location',          -- event check-in location history
  'biometric_hash'     -- future: proof of personhood hash
);

-- Data consent scopes (what an app can request)
create type consent_scope as enum (
  'profile_public',    -- handle, avatar, bio
  'points_balance',    -- current balance only
  'points_history',    -- full transaction history
  'missions',          -- completed missions list
  'roles',             -- roles in events/products
  'wallet_evm',        -- EVM address only
  'wallet_solana',
  'wallet_full_map',   -- all linked wallets (sensitive)
  'referral_stats',
  'email',             -- requires ZK proof + explicit grant
  'phone'              -- requires ZK proof + explicit grant
);


-- ============================================================
-- CORE IDENTITY
-- ============================================================

create table flowbond_identities (
  -- Primary
  id                  uuid primary key default uuid_generate_v4(),
  handle              text unique not null,
  display_name        text,
  avatar_url          text,
  bio                 text,

  -- Auth link
  auth_user_id        uuid unique references auth.users(id) on delete set null,
  email               text unique,
  phone               text unique,

  -- Wallet addresses (nullable — unlocked via missions or explicit connect)
  -- EVM: one address covers all EVM chains
  evm_address         text unique,
  -- Non-EVM
  solana_address      text unique,
  near_address        text unique,
  polkadot_address    text unique,   -- SS58 format
  cosmos_address      text unique,   -- Bech32
  ton_address         text unique,
  bitcoin_address     text unique,   -- native SegWit preferred
  lightning_node_id   text unique,   -- Lightning node pub key
  icp_principal       text unique,   -- ICP Internet Identity principal

  -- Points (denormalized for reads — ledger is source of truth)
  points_balance      bigint not null default 0 check (points_balance >= 0),

  -- Referral
  referral_code       text unique not null
                        default upper(substring(gen_random_uuid()::text, 1, 8)),
  referred_by_id      uuid references flowbond_identities(id) on delete set null,

  -- ZK identity commitment (public — used for Semaphore group membership)
  -- Hash of (internal secret + nullifier seed). Never store the preimage here.
  zk_identity_commitment  text unique,

  -- ICP private vault canister (stores encrypted private data)
  icp_vault_canister_id   text,

  -- Flags
  is_public           boolean not null default true,
  is_verified         boolean not null default false,
  is_active           boolean not null default true,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_seen_at        timestamptz
);

alter table flowbond_identities
  add constraint handle_format
  check (handle ~ '^[a-z0-9_]{3,30}$');

create index idx_identity_handle       on flowbond_identities(handle);
create index idx_identity_evm          on flowbond_identities(evm_address)
  where evm_address is not null;
create index idx_identity_solana       on flowbond_identities(solana_address)
  where solana_address is not null;
create index idx_identity_icp          on flowbond_identities(icp_principal)
  where icp_principal is not null;
create index idx_identity_referral     on flowbond_identities(referral_code);
create index idx_identity_referred_by  on flowbond_identities(referred_by_id)
  where referred_by_id is not null;
create index idx_identity_zk_commit    on flowbond_identities(zk_identity_commitment)
  where zk_identity_commitment is not null;


-- ============================================================
-- WALLET CONNECTIONS
-- Provider-agnostic. Swap Thirdweb → Dfns → native without migration.
-- ============================================================

create table wallet_connections (
  id                  uuid primary key default uuid_generate_v4(),
  identity_id         uuid not null
                        references flowbond_identities(id) on delete cascade,

  chain               chain_id not null,
  curve               crypto_curve not null,
  address             text not null,

  provider            wallet_provider not null,
  provider_wallet_id  text,           -- provider's internal ID

  -- Key grouping: wallets sharing the same cryptographic key
  key_group_id        uuid,

  -- ICP-specific: for Chain Fusion managed wallets
  icp_canister_signer text,           -- ICP canister ID managing this key

  is_primary          boolean not null default false,
  is_embedded         boolean not null default false,
  is_active           boolean not null default true,

  label               text,
  connected_at        timestamptz not null default now(),
  last_used_at        timestamptz,

  unique(identity_id, chain, address)
);

create index idx_wallet_identity  on wallet_connections(identity_id);
create index idx_wallet_address   on wallet_connections(address, chain);
create index idx_wallet_provider  on wallet_connections(provider, provider_wallet_id)
  where provider_wallet_id is not null;
create index idx_wallet_keygroup  on wallet_connections(key_group_id)
  where key_group_id is not null;


-- ============================================================
-- PRIVATE DATA VAULT
-- Encrypted references — actual data lives on ICP canister.
-- FlowBond stores only the pointer, never the plaintext.
-- ============================================================

create table private_data_vault (
  id                  uuid primary key default uuid_generate_v4(),
  identity_id         uuid not null
                        references flowbond_identities(id) on delete cascade,

  data_type           private_data_type not null,

  -- ICP canister reference (where the encrypted data actually lives)
  icp_canister_id     text not null,
  icp_data_key        text not null,   -- key within the canister

  -- Encryption metadata (not the key itself)
  encryption_scheme   text not null default 'aes-256-gcm+vetkeys',
  content_hash        text not null,   -- hash of plaintext for integrity check

  -- Access log
  last_accessed_at    timestamptz,
  access_count        integer not null default 0,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique(identity_id, data_type)
);

create index idx_vault_identity on private_data_vault(identity_id);


-- ============================================================
-- DATA CONSENT GRANTS
-- User explicitly grants an app access to specific data scopes.
-- Revocable at any time. Full audit trail.
-- ============================================================

create table data_consent_grants (
  id                  uuid primary key default uuid_generate_v4(),
  identity_id         uuid not null
                        references flowbond_identities(id) on delete cascade,

  -- Who is requesting (app slug or external domain)
  grantee_app         text not null,
  grantee_domain      text,

  -- What they're allowed to see
  scopes              consent_scope[] not null,

  -- ZK requirement: for sensitive scopes, require a ZK proof
  zk_proof_required   boolean not null default false,
  zk_proof_hash       text,           -- hash of the proof presented at grant time

  -- Consent metadata
  granted_via         text,           -- 'dashboard', 'oauth_flow', 'event_checkin'
  purpose_description text,           -- human-readable, shown in consent UI

  -- Lifecycle
  granted_at          timestamptz not null default now(),
  expires_at          timestamptz,    -- null = until revoked
  revoked_at          timestamptz,
  last_used_at        timestamptz,
  use_count           integer not null default 0,

  is_active           boolean not null default true
    generated always as (revoked_at is null and
      (expires_at is null or expires_at > now())) stored
);

create index idx_consent_identity on data_consent_grants(identity_id);
create index idx_consent_app      on data_consent_grants(grantee_app, is_active);
create index idx_consent_active   on data_consent_grants(identity_id, is_active)
  where is_active = true;


-- ============================================================
-- ZK PROOFS ISSUED
-- Every proof FlowBond issues is logged here.
-- User can see who they proved what to, and when it expires.
-- ============================================================

create table zk_proofs_issued (
  id                  uuid primary key default uuid_generate_v4(),
  identity_id         uuid not null
                        references flowbond_identities(id) on delete cascade,

  proof_type          zk_proof_type not null,

  -- The nullifier hash (public — used to prevent double-use)
  nullifier_hash      text not null,

  -- What was proven (no raw data — only the claim)
  claim_description   text not null,  -- e.g. "points_balance >= 500"
  public_inputs_hash  text,           -- hash of public circuit inputs

  -- Who received this proof
  issued_to_app       text not null,
  issued_to_domain    text,

  -- Proof metadata
  proof_system        text not null default 'groth16', -- groth16, plonk, stark
  circuit_id          text,           -- which circuit generated this
  verification_tx     text,           -- on-chain verification tx if applicable
  verified_via        text,           -- 'zkverify', 'on_chain_evm', 'local'

  -- Lifecycle
  issued_at           timestamptz not null default now(),
  expires_at          timestamptz,
  is_revoked          boolean not null default false,

  unique(nullifier_hash, proof_type)
);

create index idx_zkproof_identity   on zk_proofs_issued(identity_id);
create index idx_zkproof_nullifier  on zk_proofs_issued(nullifier_hash);
create index idx_zkproof_app        on zk_proofs_issued(issued_to_app);


-- ============================================================
-- USED NULLIFIERS
-- Prevents double-claim of any ZK-gated action.
-- Append-only. Never delete.
-- ============================================================

create table used_nullifiers (
  nullifier_hash      text primary key,
  proof_type          zk_proof_type not null,
  action_context      text,           -- what this nullifier was used for
  used_at             timestamptz not null default now()
);

create index idx_nullifier_type on used_nullifiers(proof_type);


-- ============================================================
-- PRODUCTS
-- ============================================================

create table products (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  domain      text,
  is_active   boolean not null default true,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

insert into products (slug, name, domain) values
  ('flownation', 'FlowNation',  'flownation.world'),
  ('danz',       'danz.now',    'danz.now'),
  ('flowbond',   'FlowBond',    'app.flowbond.xyz');


-- ============================================================
-- EVENTS
-- ============================================================

create table events (
  id              uuid primary key default uuid_generate_v4(),
  product_id      uuid not null references products(id),
  organizer_id    uuid references flowbond_identities(id) on delete set null,

  slug            text unique not null,
  name            text not null,
  description     text,

  city            text,
  country         text,
  venue_name      text,
  venue_address   text,

  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  timezone        text not null default 'UTC',

  is_public       boolean not null default true,
  max_capacity    integer,
  config          jsonb not null default '{}',

  -- ZK Semaphore group for this event (members = ticket holders)
  semaphore_group_id  text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_events_product   on events(product_id);
create index idx_events_starts_at on events(starts_at);
create index idx_events_slug      on events(slug);

-- Seed CDMX pilot event
insert into events (product_id, slug, name, city, country, venue_name, starts_at, ends_at, timezone)
select
  p.id,
  'cdmx-2025-04-30',
  'FLOW CDMX',
  'Mexico City', 'MX',
  'Huerto Roma Verde',
  '2025-04-30 12:00:00-06',
  '2025-04-30 22:00:00-06',
  'America/Mexico_City'
from products p where p.slug = 'flownation';


-- ============================================================
-- IDENTITY ROLES
-- ============================================================

create table identity_roles (
  id              uuid primary key default uuid_generate_v4(),
  identity_id     uuid not null
                    references flowbond_identities(id) on delete cascade,
  role            global_role not null,
  scope           role_scope not null default 'global',

  product_slug    text,
  event_id        uuid references events(id) on delete cascade,

  granted_by_id   uuid references flowbond_identities(id) on delete set null,
  granted_at      timestamptz not null default now(),
  expires_at      timestamptz,
  is_active       boolean not null default true,

  -- Artist bio, speaker topic, sponsor info — role-specific
  profile_data    jsonb not null default '{}',

  unique(identity_id, role, scope, coalesce(product_slug,''), coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

create index idx_roles_identity on identity_roles(identity_id);
create index idx_roles_event    on identity_roles(event_id) where event_id is not null;
create index idx_roles_active   on identity_roles(identity_id, role) where is_active = true;


-- ============================================================
-- MISSIONS — Educational chain-unlock progression
-- ============================================================

create table missions (
  id                      uuid primary key default uuid_generate_v4(),
  product_id              uuid references products(id),
  event_id                uuid references events(id),

  slug                    text unique not null,
  title                   text not null,
  description             text,

  unlocks_chain           chain_id,
  sort_order              integer not null default 0,
  requires_mission_id     uuid references missions(id),

  points_reward           integer not null default 0,
  xp_reward               integer not null default 0,

  -- Steps, video URLs, quiz questions
  content                 jsonb not null default '{}',

  -- Required on-chain action to prove completion
  -- e.g. { "type": "send_tx", "chain": "solana", "min_amount": 0 }
  required_action         jsonb,

  -- ZK: require a proof to claim this mission reward
  zk_proof_required       boolean not null default false,
  zk_circuit_id           text,

  is_active               boolean not null default true,
  created_at              timestamptz not null default now()
);

-- Seed the 5 core chain missions
insert into missions (slug, title, unlocks_chain, sort_order, points_reward, description) values
  ('base-onboarding',     'Base: Your First Wallet',    'base',     1, 100,
   'Understand EVM basics, receive your Base wallet, send your first gasless tx'),
  ('solana-basics',       'Solana: Speed & Scale',      'solana',   2, 150,
   'Learn SPL tokens, Solana accounts, sign your first Solana transaction'),
  ('polkadot-intro',      'Polkadot: The Relay Chain',  'polkadot', 3, 200,
   'Explore parachains, cross-chain messaging, stake your first DOT'),
  ('near-accounts',       'NEAR: Human-Readable IDs',   'near',     4, 200,
   'Claim your .near account, learn storage staking, call a smart contract'),
  ('bitcoin-lightning',   'Bitcoin & Lightning',        'lightning',5, 300,
   'Open a Lightning channel via ICP, send your first sats, understand UTXO'),
  ('icp-identity',        'ICP: Sovereign Compute',     'icp',      6, 300,
   'Create an Internet Identity, interact with a canister, understand vetKeys'),
  ('ton-ecosystem',       'TON: Telegram Chain',        'ton',      7, 150,
   'Explore TON ecosystem, mint a simple token, understand workchains'),
  ('multichain-sovereign','Multichain Sovereign',       null,       8, 1000,
   'Complete all 7 chain missions — you own your full multichain identity');


-- ============================================================
-- USER MISSION PROGRESS
-- ============================================================

create table user_missions (
  id              uuid primary key default uuid_generate_v4(),
  identity_id     uuid not null
                    references flowbond_identities(id) on delete cascade,
  mission_id      uuid not null references missions(id) on delete cascade,

  status          mission_status not null default 'locked',
  progress_data   jsonb not null default '{}',

  -- On-chain proof of completion
  proof_tx_hash   text,
  proof_chain     chain_id,
  proof_block     bigint,

  -- ZK proof of completion (for ZK-gated missions)
  zk_nullifier    text references used_nullifiers(nullifier_hash),

  started_at      timestamptz,
  completed_at    timestamptz,
  claimed_at      timestamptz,

  unique(identity_id, mission_id)
);

create index idx_user_missions_identity on user_missions(identity_id);
create index idx_user_missions_status   on user_missions(identity_id, status);


-- ============================================================
-- REFERRALS — Universal, any conversion type
-- ============================================================

create table referrals (
  id                  uuid primary key default uuid_generate_v4(),

  referrer_id         uuid not null
                        references flowbond_identities(id) on delete cascade,
  referred_id         uuid references flowbond_identities(id) on delete set null,

  referral_code_used  text not null,

  event_type          referral_event_type not null,
  product_id          uuid references products(id),
  event_id            uuid references events(id),

  resource_type       text,
  resource_id         uuid,
  resource_amount_usd numeric(10,2),

  -- UTM / attribution
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  referral_url        text,

  -- ZK: nullifier prevents double referral claim
  zk_nullifier_hash   text,

  referrer_points     integer not null default 0,
  referred_points     integer not null default 0,

  status              referral_status not null default 'pending',

  clicked_at          timestamptz not null default now(),
  converted_at        timestamptz,
  rewarded_at         timestamptz,
  expires_at          timestamptz default now() + interval '30 days',

  ip_hash             text,           -- hashed, never raw IP
  flagged_reason      text
);

create index idx_referrals_referrer on referrals(referrer_id, status);
create index idx_referrals_referred on referrals(referred_id)
  where referred_id is not null;
create index idx_referrals_code     on referrals(referral_code_used);
create index idx_referrals_event    on referrals(event_id)
  where event_id is not null;


-- ============================================================
-- POINTS LEDGER — Append-only. Never update. Never delete.
-- ============================================================

create table points_ledger (
  id              uuid primary key default uuid_generate_v4(),
  identity_id     uuid not null
                    references flowbond_identities(id) on delete cascade,

  tx_type         points_tx_type not null,
  amount          integer not null,
  balance_after   bigint not null,

  description     text,
  referral_id     uuid references referrals(id) on delete set null,
  mission_id      uuid references missions(id) on delete set null,
  event_id        uuid references events(id) on delete set null,
  triggered_by_id uuid references flowbond_identities(id) on delete set null,

  -- ZK proof that authorized this transaction (optional)
  zk_proof_ref    text,

  created_at      timestamptz not null default now(),

  check (balance_after >= 0)
);

create index idx_ledger_identity on points_ledger(identity_id, created_at desc);
create index idx_ledger_type     on points_ledger(tx_type);
create index idx_ledger_referral on points_ledger(referral_id)
  where referral_id is not null;


-- ============================================================
-- PROFILE STOREFRONTS — /@handle public page config
-- ============================================================

create table profile_storefronts (
  id              uuid primary key default uuid_generate_v4(),
  identity_id     uuid unique not null
                    references flowbond_identities(id) on delete cascade,

  theme           text not null default 'default',
  cover_url       text,
  accent_color    text,

  featured_events uuid[] not null default '{}',
  featured_links  jsonb not null default '[]',
  social          jsonb not null default '{}',

  -- What the user chooses to show publicly
  show_referral_link      boolean not null default true,
  show_points_balance     boolean not null default false,
  show_missions_badge     boolean not null default true,
  show_chains_unlocked    boolean not null default true,
  show_zk_badge           boolean not null default false,

  updated_at      timestamptz not null default now()
);


-- ============================================================
-- IDENTITY SESSIONS (cross-product SSO)
-- ============================================================

create table identity_sessions (
  id              uuid primary key default uuid_generate_v4(),
  identity_id     uuid not null
                    references flowbond_identities(id) on delete cascade,

  product_slug    text,
  token_hash      text unique not null,

  device_type     text,               -- 'web', 'mobile', 'nfc', 'wearable'
  user_agent      text,
  ip_hash         text,

  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '30 days',
  last_active_at  timestamptz not null default now(),
  revoked_at      timestamptz
);

create index idx_sessions_identity on identity_sessions(identity_id);
create index idx_sessions_token    on identity_sessions(token_hash)
  where revoked_at is null;


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_identity_updated_at
  before update on flowbond_identities
  for each row execute function set_updated_at();
create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at();
create trigger trg_storefront_updated_at
  before update on profile_storefronts
  for each row execute function set_updated_at();
create trigger trg_vault_updated_at
  before update on private_data_vault
  for each row execute function set_updated_at();


-- On new Supabase auth user → create FlowBond identity automatically
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer as $$
declare
  v_handle  text;
  v_base    text;
  v_count   integer := 0;
begin
  v_base := lower(regexp_replace(
    coalesce(split_part(new.email, '@', 1), 'user'),
    '[^a-z0-9_]', '', 'g'
  ));
  if length(v_base) < 3 then v_base := 'user' || v_base; end if;
  v_base   := substring(v_base, 1, 24);
  v_handle := v_base;

  loop
    begin
      insert into flowbond_identities (auth_user_id, email, handle, display_name)
      values (
        new.id, new.email, v_handle,
        coalesce(new.raw_user_meta_data->>'full_name', v_handle)
      );

      -- Default storefront
      insert into profile_storefronts (identity_id)
        select id from flowbond_identities where auth_user_id = new.id;

      -- Unlock first mission (Base onboarding)
      insert into user_missions (identity_id, mission_id, status)
        select fi.id, m.id, 'available'
        from flowbond_identities fi
        cross join missions m
        where fi.auth_user_id = new.id
          and m.slug = 'base-onboarding';

      exit;
    exception when unique_violation then
      v_count  := v_count + 1;
      v_handle := v_base || v_count::text;
    end;
  end loop;

  return new;
end; $$;

create trigger trg_new_auth_user
  after insert on auth.users
  for each row execute function handle_new_auth_user();


-- Atomic points operation
-- ALWAYS use this function — never UPDATE points_balance directly
create or replace function add_points(
  p_identity_id   uuid,
  p_amount        integer,
  p_tx_type       points_tx_type,
  p_description   text    default null,
  p_referral_id   uuid    default null,
  p_mission_id    uuid    default null,
  p_event_id      uuid    default null,
  p_triggered_by  uuid    default null,
  p_zk_proof_ref  text    default null
)
returns bigint language plpgsql security definer as $$
declare v_new_balance bigint;
begin
  select points_balance + p_amount into v_new_balance
  from flowbond_identities where id = p_identity_id for update;

  if not found then raise exception 'Identity not found: %', p_identity_id; end if;
  if v_new_balance < 0 then raise exception 'Insufficient points balance'; end if;

  update flowbond_identities set points_balance = v_new_balance where id = p_identity_id;

  insert into points_ledger (
    identity_id, tx_type, amount, balance_after,
    description, referral_id, mission_id, event_id, triggered_by_id, zk_proof_ref
  ) values (
    p_identity_id, p_tx_type, p_amount, v_new_balance,
    p_description, p_referral_id, p_mission_id, p_event_id, p_triggered_by, p_zk_proof_ref
  );

  return v_new_balance;
end; $$;


-- Process referral conversion + award points
create or replace function process_referral_conversion(
  p_referral_id   uuid,
  p_event_type    referral_event_type
)
returns void language plpgsql security definer as $$
declare
  v_ref           referrals%rowtype;
  v_referrer_pts  integer;
  v_referred_pts  integer;
begin
  select * into v_ref from referrals
  where id = p_referral_id and status = 'pending' for update;

  if not found then
    raise exception 'Referral not found or already processed: %', p_referral_id;
  end if;

  case p_event_type
    when 'signup' then
      v_referrer_pts := 500; v_referred_pts := 100;
    when 'ticket_purchase' then
      v_referrer_pts := greatest(50, (v_ref.resource_amount_usd * 0.06)::integer);
      v_referred_pts := 25;
    when 'product_purchase' then
      v_referrer_pts := greatest(20, (v_ref.resource_amount_usd * 0.025)::integer);
      v_referred_pts := 10;
    when 'event_checkin' then
      v_referrer_pts := 30; v_referred_pts := 15;
  end case;

  update referrals set
    status          = 'rewarded',
    referrer_points = v_referrer_pts,
    referred_points = v_referred_pts,
    converted_at    = now(),
    rewarded_at     = now()
  where id = p_referral_id;

  perform add_points(v_ref.referrer_id, v_referrer_pts,
    ('earn_referral_' || p_event_type::text)::points_tx_type,
    'Referral: ' || p_event_type::text, p_referral_id);

  if v_ref.referred_id is not null then
    perform add_points(v_ref.referred_id, v_referred_pts,
      ('earn_referral_' || p_event_type::text)::points_tx_type,
      'Welcome bonus via referral', p_referral_id);
  end if;
end; $$;


-- Complete mission → unlock chain wallet + award points + unlock next mission
create or replace function complete_mission(
  p_identity_id   uuid,
  p_mission_id    uuid,
  p_proof_tx_hash text    default null,
  p_proof_chain   chain_id default null,
  p_proof_block   bigint  default null,
  p_zk_nullifier  text    default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_mission   missions%rowtype;
  v_um        user_missions%rowtype;
  v_balance   bigint;
begin
  select * into v_mission from missions where id = p_mission_id;
  if not found then raise exception 'Mission not found'; end if;

  select * into v_um from user_missions
  where identity_id = p_identity_id and mission_id = p_mission_id for update;

  if not found then raise exception 'Mission not available for user'; end if;
  if v_um.status not in ('available','in_progress') then
    raise exception 'Mission already completed or locked';
  end if;

  -- ZK nullifier check for gated missions
  if v_mission.zk_proof_required and p_zk_nullifier is null then
    raise exception 'ZK proof required for this mission';
  end if;

  if p_zk_nullifier is not null then
    insert into used_nullifiers (nullifier_hash, proof_type, action_context)
    values (p_zk_nullifier, 'action_complete', 'mission:' || v_mission.slug)
    on conflict (nullifier_hash) do
      update set nullifier_hash = excluded.nullifier_hash
      where false; -- forces unique violation if already used

    if not found then
      raise exception 'ZK nullifier already used — duplicate claim attempt';
    end if;
  end if;

  update user_missions set
    status        = 'claimed',
    completed_at  = now(),
    claimed_at    = now(),
    proof_tx_hash = p_proof_tx_hash,
    proof_chain   = p_proof_chain,
    proof_block   = p_proof_block,
    zk_nullifier  = p_zk_nullifier
  where id = v_um.id;

  if v_mission.points_reward > 0 then
    v_balance := add_points(p_identity_id, v_mission.points_reward,
      'earn_mission_complete',
      'Mission: ' || v_mission.title, null, p_mission_id);
  end if;

  -- Unlock next mission
  update user_missions um set status = 'available'
  from missions m
  where m.id = um.mission_id
    and m.requires_mission_id = p_mission_id
    and um.identity_id = p_identity_id
    and um.status = 'locked';

  return jsonb_build_object(
    'success',        true,
    'mission_slug',   v_mission.slug,
    'points_earned',  v_mission.points_reward,
    'chain_unlocked', v_mission.unlocks_chain,
    'new_balance',    coalesce(v_balance, 0)
  );
end; $$;


-- Get current identity id from Supabase auth session
create or replace function current_identity_id()
returns uuid language sql stable as $$
  select id from flowbond_identities
  where auth_user_id = auth.uid() limit 1;
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table flowbond_identities  enable row level security;
alter table wallet_connections    enable row level security;
alter table private_data_vault    enable row level security;
alter table data_consent_grants   enable row level security;
alter table zk_proofs_issued      enable row level security;
alter table used_nullifiers       enable row level security;
alter table identity_roles        enable row level security;
alter table user_missions         enable row level security;
alter table referrals             enable row level security;
alter table points_ledger         enable row level security;
alter table profile_storefronts   enable row level security;
alter table identity_sessions     enable row level security;

-- Identities
create policy "Public profiles readable"
  on flowbond_identities for select
  using (is_public = true or auth_user_id = auth.uid());
create policy "Users update own identity"
  on flowbond_identities for update
  using (auth_user_id = auth.uid());

-- Wallets
create policy "Own wallets readable"
  on wallet_connections for select
  using (identity_id = current_identity_id());
create policy "Own wallets insertable"
  on wallet_connections for insert
  with check (identity_id = current_identity_id());

-- Private vault — only owner
create policy "Own vault readable"
  on private_data_vault for select
  using (identity_id = current_identity_id());

-- Consent grants — owner manages, grantee can check active grants
create policy "Own consent grants"
  on data_consent_grants for all
  using (identity_id = current_identity_id());

-- ZK proofs — owner sees their proofs
create policy "Own ZK proofs"
  on zk_proofs_issued for select
  using (identity_id = current_identity_id());

-- Nullifiers — public read (needed for verification), no write from client
create policy "Nullifiers public readable"
  on used_nullifiers for select using (true);

-- Roles — readable by all
create policy "Roles readable" on identity_roles for select using (true);

-- Missions — own progress
create policy "Own missions"
  on user_missions for select
  using (identity_id = current_identity_id());

-- Points — own ledger read-only
create policy "Own ledger"
  on points_ledger for select
  using (identity_id = current_identity_id());

-- Referrals — referrer and referred
create policy "Own referrals"
  on referrals for select
  using (referrer_id = current_identity_id() or referred_id = current_identity_id());

-- Storefronts — public if profile is public
create policy "Public storefronts"
  on profile_storefronts for select
  using (exists (
    select 1 from flowbond_identities fi
    where fi.id = profile_storefronts.identity_id
      and (fi.is_public = true or fi.auth_user_id = auth.uid())
  ));
create policy "Own storefront update"
  on profile_storefronts for update
  using (identity_id = current_identity_id());


-- ============================================================
-- VIEWS
-- ============================================================

create or replace view public_profiles as
select
  fi.id,
  fi.handle,
  fi.display_name,
  fi.avatar_url,
  fi.bio,
  fi.referral_code,
  fi.is_verified,
  fi.created_at,
  -- Points only shown if user opted in
  case when ps.show_points_balance then fi.points_balance else null end as points_balance,
  -- Chains unlocked — shows which, not the addresses
  jsonb_build_object(
    'base',      fi.evm_address is not null,
    'solana',    fi.solana_address is not null,
    'polkadot',  fi.polkadot_address is not null,
    'near',      fi.near_address is not null,
    'bitcoin',   fi.bitcoin_address is not null,
    'lightning', fi.lightning_node_id is not null,
    'icp',       fi.icp_principal is not null,
    'ton',       fi.ton_address is not null
  ) as chains_unlocked,
  -- ZK badge
  case when ps.show_zk_badge then
    fi.zk_identity_commitment is not null
  else false end as has_zk_identity,
  -- Storefront
  ps.theme, ps.cover_url, ps.accent_color, ps.social,
  ps.show_referral_link, ps.show_chains_unlocked,
  ps.show_missions_badge, ps.featured_events
from flowbond_identities fi
left join profile_storefronts ps on ps.identity_id = fi.id
where fi.is_public = true and fi.is_active = true;


create or replace view referral_leaderboard as
select
  fi.id, fi.handle, fi.display_name, fi.avatar_url,
  count(r.id) filter (where r.status = 'rewarded')       as total_referrals,
  coalesce(sum(r.referrer_points) filter (where r.status = 'rewarded'), 0) as total_pts_earned,
  max(r.converted_at)                                     as last_referral_at
from flowbond_identities fi
left join referrals r on r.referrer_id = fi.id
group by fi.id, fi.handle, fi.display_name, fi.avatar_url
order by total_referrals desc;


create or replace view identity_consent_dashboard as
select
  dcg.id,
  dcg.identity_id,
  dcg.grantee_app,
  dcg.grantee_domain,
  dcg.scopes,
  dcg.zk_proof_required,
  dcg.purpose_description,
  dcg.granted_at,
  dcg.expires_at,
  dcg.last_used_at,
  dcg.use_count,
  dcg.is_active,
  dcg.revoked_at
from data_consent_grants dcg
where dcg.identity_id = current_identity_id();


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table flowbond_identities is
  'Single source of truth. One row = one person across all FlowBond products.';
comment on table wallet_connections is
  'Provider-agnostic wallet registry. Swap Thirdweb/Dfns/Privy without schema changes.';
comment on table private_data_vault is
  'Pointers to ICP canister-encrypted data. FlowBond never stores plaintext private data.';
comment on table data_consent_grants is
  'User-controlled data sharing. Every access by any app requires an explicit grant here.';
comment on table zk_proofs_issued is
  'Audit trail of every ZK proof issued. User can see who received what proof.';
comment on table used_nullifiers is
  'Append-only anti-double-claim registry. Never delete.';
comment on table points_ledger is
  'Append-only financial ledger. Never update or delete rows.';
comment on function add_points is
  'Atomic. Always use this. Never UPDATE points_balance directly.';
