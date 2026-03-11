---
title: FlowBond Email Provisioning
---

# FlowBond Email Provisioning System

Every authenticated user receives a @flowbond.io email address, automatically generated at first sign-in regardless of auth method. This provides a unified communication identity for users who may not have an email (wallet-only, Telegram, Signal users) and a privacy-preserving contact layer for all users.

## Email Generation Logic

Email addresses are generated deterministically based on the user's primary auth method, with fallback chains to ensure every user gets a human-readable address:

| Auth Method | Primary Handle Source | Fallback Chain | Example Output |
|---|---|---|---|
| Google / Apple / OAuth | Given name from OAuth profile | Email local part → user_id prefix | alex.rivera@flowbond.io |
| Farcaster | Farcaster username (fname) | FID number | dwr@flowbond.io |
| Telegram | Telegram @username | Telegram display name → user_id prefix | t.alice@flowbond.io |
| Signal | Signal profile name | Truncated key fingerprint | s.jordan@flowbond.io |
| EVM Wallet | ENS name (if resolved) | Truncated address (0x1a2b…) → user_id prefix | vitalik@flowbond.io or 0x1a2b.eth@flowbond.io |
| Solana Wallet | SNS / Bonfida domain (if resolved) | Truncated pubkey → user_id prefix | toly.sol@flowbond.io |
| Bitcoin Wallet | BNS name (if resolved) | Truncated address → user_id prefix | satoshi.btc@flowbond.io |
| Email / Phone (Web3Auth) | Original email address local part | Phone digits → user_id prefix | alex.rivera@flowbond.io |

## Handle Resolution Algorithm

The system follows a deterministic resolution process to generate unique, human-readable email addresses:

1. Extract the preferred handle from the primary auth method (see table above).
2. Normalize: lowercase, strip special characters, replace spaces with dots, truncate to 30 characters.
3. Check uniqueness against auth_emails table.
4. If collision: append a numeric suffix (alex.rivera2@flowbond.io) or prompt user to choose a custom handle.
5. For wallet users without on-chain names: attempt ENS/SNS/BNS reverse resolution. If none found, generate a readable handle from the address prefix with a method tag (e.g., 0x1a2b.eth@flowbond.io).
6. Store the generated email in auth_emails and update the canonical user record.

Users can customize their handle once after generation, subject to availability. Subsequent changes require a cooldown period (30 days) to prevent abuse.

## Email Infrastructure

The email system is built on a lightweight transactional infrastructure, not a full mailbox provider.

### Inbound Email

- MX records for flowbond.io point to an inbound processing service (Cloudflare Email Workers or AWS SES Inbound).
- Inbound messages are parsed and routed based on the user's routing rules (auth_email_routing table).
- Default behavior: forward to user's linked OAuth email if one exists; otherwise, deliver to FlowBond's in-app notification system.
- Spam filtering via DNS-based blocklists and content analysis before forwarding.

### Outbound Email

- Users can send from their @flowbond.io address via the FlowBond platform (in-app compose) or SMTP relay.
- All outbound mail is DKIM-signed, SPF-aligned, and DMARC-enforced to ensure deliverability.
- Rate limits: 100 outbound messages per day per user (free tier), 1,000 for Pro subscribers.
- Outbound mail includes an unsubscribe header and complies with CAN-SPAM / GDPR requirements.

### Aliases & Disposable Addresses

- Users can create up to 5 aliases (e.g., alex+events@flowbond.io, alex+sponsors@flowbond.io) for routing purposes.
- Disposable aliases: auto-expiring addresses for one-time use (event registrations, vendor comms) that expire after a set period or number of received messages.
- Project-based aliases: for FlowBond SaaS clients, generate project-specific addresses (projectname@flowbond.io) that route to team members.

## Privacy-Preserving Communication

The email system integrates with FlowB's privacy layer:

- **ZK-verified email**: Users can prove they own a @flowbond.io address without revealing which one, using ZK proofs over the email credential.
- **Relay mode**: For sensitive communications, users can enable relay mode where FlowBond strips metadata (IP, client headers, timestamps) from forwarded messages before delivery.
- **No content storage**: FlowBond does not store email content after routing. Messages are processed in-memory and forwarded; only delivery metadata (timestamp, sender domain, size) is logged for debugging.
- **Encrypted forwarding**: If the destination supports it (PGP keys on file, or forwarding to a ProtonMail/Tutanota address), FlowBond encrypts the forwarded message end-to-end.

## Integration with Auth Flow

Email provisioning is triggered automatically during the auth callback:

1. User completes authentication via any method.
2. Auth callback handler checks if user has an existing auth_emails record.
3. If not: invoke /api/auth/email/provision, which runs the handle resolution algorithm and creates the email address.
4. The generated email is returned as part of the session response and available via useAuth().getEmail().
5. User sees their new @flowbond.io address in the post-auth welcome screen with options to set forwarding and customize the handle.

For users who already have an email via OAuth (e.g., Google sign-in), the @flowbond.io address serves as a privacy-preserving alternative they can use for public-facing interactions, keeping their personal email private.

## Email-Based Recovery

The @flowbond.io email address also serves as an additional recovery vector:

- If a wallet-only user loses access to their wallet, they can initiate account recovery via their @flowbond.io email (which forwards to their configured destination).
- Recovery requires verification of the forwarding destination plus a time-locked cooldown (48 hours) to prevent unauthorized recovery attempts.
- This does not replace Web3Auth's MPC recovery for embedded wallets; it provides an additional recovery path for the FlowBond account itself.
