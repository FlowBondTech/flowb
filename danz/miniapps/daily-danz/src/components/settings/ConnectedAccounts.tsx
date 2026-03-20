'use client'

import { useState } from 'react'
import {
  getLinkingStatus,
  getProviderDisplayName,
  getProviderIcon,
  LINKING_REWARDS,
  type User,
  type AuthProvider
} from '@/types/auth'

interface ConnectedAccountsProps {
  user: User
  onConnectProvider?: (provider: AuthProvider) => void
  onDisconnectProvider?: (provider: AuthProvider) => void
}

export function ConnectedAccounts({
  user,
  onConnectProvider,
  onDisconnectProvider
}: ConnectedAccountsProps) {
  const status = getLinkingStatus(user)

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Connected Accounts</h3>
        {status.canClaimFullLinkBonus && (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
            +{LINKING_REWARDS.fullLink} XP available!
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Farcaster */}
        <AccountRow
          provider="farcaster"
          connected={status.hasFarcaster}
          detail={status.farcasterUsername ? `@${status.farcasterUsername}` : undefined}
          onConnect={onConnectProvider}
          onDisconnect={onDisconnectProvider}
          isPrimary={user.authProviders.find(p => p.provider === 'farcaster')?.isPrimary}
        />

        {/* Privy / DANZ Web */}
        <AccountRow
          provider="privy"
          connected={status.hasPrivy}
          detail={status.privyEmail}
          onConnect={onConnectProvider}
          onDisconnect={onDisconnectProvider}
          isPrimary={user.authProviders.find(p => p.provider === 'privy')?.isPrimary}
        />

        {/* Wallets */}
        {user.wallets.map((wallet, index) => (
          <WalletRow
            key={wallet.id}
            address={wallet.address}
            chain={wallet.chain}
            isPrimary={wallet.isPrimary}
            source={wallet.source}
            isFirst={index === 0}
          />
        ))}
      </div>

      {/* Linking benefits info */}
      {(!status.hasFarcaster || !status.hasPrivy) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
          <h4 className="text-sm font-medium text-white mb-2">
            Why link accounts?
          </h4>
          <ul className="space-y-1.5 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Sync XP and streaks across all DANZ apps
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Access your party from web and mobile
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Never lose your progress
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">★</span>
              Earn +{LINKING_REWARDS.firstLink} XP per linked account
            </li>
          </ul>
        </div>
      )}

      {/* Full link celebration */}
      {status.hasFarcaster && status.hasPrivy && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-xl">
              🎉
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">All accounts linked!</p>
              <p className="text-xs text-white/60">Your DANZ experience is fully synced</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Account Row Component
interface AccountRowProps {
  provider: AuthProvider
  connected: boolean
  detail?: string
  isPrimary?: boolean
  onConnect?: (provider: AuthProvider) => void
  onDisconnect?: (provider: AuthProvider) => void
}

function AccountRow({
  provider,
  connected,
  detail,
  isPrimary,
  onConnect,
  onDisconnect
}: AccountRowProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async () => {
    setIsLoading(true)
    try {
      if (connected && onDisconnect) {
        await onDisconnect(provider)
      } else if (!connected && onConnect) {
        await onConnect(provider)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-xl transition-all
      ${connected
        ? 'bg-white/5 border border-white/10'
        : 'bg-white/[0.02] border border-dashed border-white/10 hover:border-white/20'
      }
    `}>
      {/* Provider icon */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center text-xl
        ${connected
          ? 'bg-green-500/20'
          : 'bg-white/5'
        }
      `}>
        {getProviderIcon(provider)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {getProviderDisplayName(provider)}
          </span>
          {isPrimary && (
            <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded">
              Primary
            </span>
          )}
        </div>
        {connected ? (
          <p className="text-xs text-white/50 truncate">{detail || 'Connected'}</p>
        ) : (
          <p className="text-xs text-white/40">Not connected · +{LINKING_REWARDS.firstLink} XP</p>
        )}
      </div>

      {/* Action */}
      {connected ? (
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {!isPrimary && onDisconnect && (
            <button
              onClick={handleAction}
              disabled={isLoading}
              className="text-xs text-white/40 hover:text-red-400 transition-colors"
            >
              {isLoading ? '...' : 'Remove'}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handleAction}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm font-medium text-white
                     bg-gradient-to-r from-pink-500 to-purple-500
                     hover:from-pink-600 hover:to-purple-600
                     rounded-lg transition-all disabled:opacity-50"
        >
          {isLoading ? '...' : 'Connect'}
        </button>
      )}
    </div>
  )
}

// Wallet Row Component
interface WalletRowProps {
  address: string
  chain: string
  isPrimary: boolean
  source?: AuthProvider
  isFirst: boolean
}

function WalletRow({ address, chain, isPrimary, source, isFirst }: WalletRowProps) {
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
      {/* Wallet icon */}
      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xl">
        💎
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {chain.charAt(0).toUpperCase() + chain.slice(1)} Wallet
          </span>
          {isPrimary && (
            <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">
              Primary
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 font-mono">{truncatedAddress}</p>
      </div>

      {/* Source badge */}
      {source && (
        <span className="text-xs text-white/30">
          via {getProviderDisplayName(source)}
        </span>
      )}

      {/* Status */}
      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  )
}

export default ConnectedAccounts
