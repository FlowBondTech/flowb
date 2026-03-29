/**
 * useWalletManager Hook (stubbed — Privy wallet SDK removed)
 * Returns empty wallets and no-op methods so consuming components don't crash.
 */

import { useCallback, useState } from 'react'
import type { ChainType, UnifiedWallet, WalletLinkState } from '@/types/wallet'

interface UseWalletManagerResult {
  wallets: UnifiedWallet[]
  isLoading: boolean
  error: string | null
  linkState: WalletLinkState
  startLinkEthereum: () => Promise<void>
  startLinkSolana: () => Promise<void>
  cancelLink: () => void
  unlinkWallet: (walletId: string) => Promise<void>
  getDefaultWallet: (chainType: ChainType) => UnifiedWallet | null
  setDefaultWallet: (walletId: string, chainType: ChainType) => Promise<void>
  totalBalanceUsd: string
  refetch: () => Promise<void>
}

export function useWalletManager(): UseWalletManagerResult {
  const [linkState] = useState<WalletLinkState>({
    status: 'idle',
    error: null,
    connectedAddress: null,
    selectedChain: null,
  })

  const noop = useCallback(async () => {}, [])

  return {
    wallets: [],
    isLoading: false,
    error: null,
    linkState,
    startLinkEthereum: noop,
    startLinkSolana: noop,
    cancelLink: () => {},
    unlinkWallet: noop,
    getDefaultWallet: () => null,
    setDefaultWallet: noop,
    totalBalanceUsd: '0.00',
    refetch: noop,
  }
}

export default useWalletManager
