---
title: AgentKit Plugin
---

# AgentKit Plugin

Wraps [Coinbase AgentKit](https://github.com/coinbase/agentkit) with `CdpEvmWalletProvider` on the Base network.

**Source**: `src/plugins/agentkit/index.ts` (225 lines)

## Actions

| Action | Description | Auth |
|--------|-------------|------|
| `wallet-balance` | Get wallet balance (ETH + tokens) | No |
| `wallet-address` | Get the agent wallet address | No |
| `send-eth` | Send ETH to an address | Yes |
| `send-token` | Send ERC20 token to an address | Yes |
| `token-balance` | Get ERC20 token balance | No |

## Configuration

Requires CDP credentials:

```env
CDP_API_KEY_NAME=           # API key name (UUID)
CDP_API_KEY_PRIVATE_KEY=    # API key private key (PEM or base64)
CDP_WALLET_SECRET=          # Wallet secret for signing
CDP_ACCOUNT_ADDRESS=        # Default account address on Base
```

## Architecture

- Uses `@coinbase/agentkit` SDK
- Wallet provider: `CdpEvmWalletProvider`
- Network: Base (Coinbase L2)
- Action providers: `walletActionProvider`, `erc20ActionProvider`

---

*Updated 2026-02-20*
