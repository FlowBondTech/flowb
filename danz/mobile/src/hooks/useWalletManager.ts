/**
 * useWalletManager Hook
 * Comprehensive wallet management including embedded and linked wallets
 */

import { useEmbeddedEthereumWallet, useEmbeddedSolanaWallet, usePrivy } from '@privy-io/expo'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPublicClient, formatEther, http } from 'viem'
import { base } from 'viem/chains'
import type { ChainType, UnifiedWallet, WalletClientType, WalletLinkState } from '@/types/wallet'
import { createWalletId, NETWORKS } from '@/types/wallet'
import { useDefaultWallet } from './useDefaultWallet'

// Viem client for Base chain
const baseClient = createPublicClient({
  chain: base,
  transport: http(),
})

// Solana constants
const LAMPORTS_PER_SOL = 1_000_000_000
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'

// Price placeholders (TODO: integrate real price feed)
const PRICES = {
  ETH: 3500,
  SOL: 200,
}

interface UseWalletManagerResult {
  // All wallets (embedded + linked)
  wallets: UnifiedWallet[]
  isLoading: boolean
  error: string | null

  // Wallet linking (future implementation with Privy)
  linkState: WalletLinkState
  startLinkEthereum: () => Promise<void>
  startLinkSolana: () => Promise<void>
  cancelLink: () => void

  // Wallet management
  unlinkWallet: (walletId: string) => Promise<void>

  // Default wallet
  getDefaultWallet: (chainType: ChainType) => UnifiedWallet | null
  setDefaultWallet: (walletId: string, chainType: ChainType) => Promise<void>

  // Total balance
  totalBalanceUsd: string

  // Refresh
  refetch: () => Promise<void>
}

export function useWalletManager(): UseWalletManagerResult {
  const { user } = usePrivy()
  const { wallets: ethWallets } = useEmbeddedEthereumWallet()
  const { wallets: solWallets } = useEmbeddedSolanaWallet()
  const { getDefaultWallet: getDefaultFromPrefs, setDefaultWallet: setDefaultInPrefs } =
    useDefaultWallet()

  const [wallets, setWallets] = useState<UnifiedWallet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkState, setLinkState] = useState<WalletLinkState>({
    status: 'idle',
    error: null,
    connectedAddress: null,
    selectedChain: null,
  })

  // Fetch ETH balance for an address
  const fetchEthBalance = async (address: string): Promise<{ balance: string; usd: string }> => {
    try {
      const balance = await baseClient.getBalance({ address: address as `0x${string}` })
      const balanceEth = formatEther(balance)
      const usdValue = (parseFloat(balanceEth) * PRICES.ETH).toFixed(2)
      return { balance: balanceEth, usd: usdValue }
    } catch (err) {
      console.error('Failed to fetch ETH balance:', err)
      return { balance: '0', usd: '0' }
    }
  }

  // Fetch SOL balance for an address
  const fetchSolBalance = async (address: string): Promise<{ balance: string; usd: string }> => {
    try {
      const response = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      })
      const data = await response.json()
      const lamports = data.result?.value || 0
      const balanceSol = (lamports / LAMPORTS_PER_SOL).toFixed(6)
      const usdValue = (parseFloat(balanceSol) * PRICES.SOL).toFixed(2)
      return { balance: balanceSol, usd: usdValue }
    } catch (err) {
      console.error('Failed to fetch SOL balance:', err)
      return { balance: '0', usd: '0' }
    }
  }

  // Convert embedded wallet to UnifiedWallet
  const toUnifiedWallet = (
    address: string,
    chainType: ChainType,
    walletType: 'embedded' | 'linked',
    clientType: WalletClientType,
    balance: string,
    usdValue: string,
  ): UnifiedWallet => {
    const network = chainType === 'ethereum' ? NETWORKS.base : NETWORKS.solana
    return {
      id: createWalletId(address, chainType),
      address,
      chainType,
      walletType,
      walletClientType: clientType,
      network: network.name,
      networkId: network.networkId,
      symbol: network.nativeSymbol,
      balance,
      balanceFormatted: parseFloat(balance).toFixed(6),
      balanceUsd: usdValue,
      isDefault: false, // Will be set after loading preferences
      canSign: walletType === 'embedded',
      createdAt: Date.now(),
    }
  }

  // Load all wallets and their balances
  const loadWallets = useCallback(async () => {
    if (!user) {
      setWallets([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const allWallets: UnifiedWallet[] = []
      const seenAddresses = new Set<string>()

      // 1. Process Ethereum wallets (embedded or linked via Privy)
      if (ethWallets && ethWallets.length > 0) {
        for (const wallet of ethWallets) {
          const address = wallet.address
          if (address && !seenAddresses.has(address.toLowerCase())) {
            seenAddresses.add(address.toLowerCase())
            const { balance, usd } = await fetchEthBalance(address)
            // Check if this is a linked wallet or embedded
            const isLinked = (wallet as any).walletClientType && (wallet as any).walletClientType !== 'privy'
            const walletType = isLinked ? 'linked' : 'embedded'
            const clientType = (wallet as any).walletClientType || 'privy'
            allWallets.push(toUnifiedWallet(address, 'ethereum', walletType, clientType, balance, usd))
          }
        }
      }

      // 2. Process Solana wallets (embedded or linked via Privy)
      if (solWallets && solWallets.length > 0) {
        for (const wallet of solWallets) {
          const address = wallet.address
          if (address && !seenAddresses.has(address.toLowerCase())) {
            seenAddresses.add(address.toLowerCase())
            const { balance, usd } = await fetchSolBalance(address)
            // Check if this is a linked wallet or embedded
            const isLinked = (wallet as any).walletClientType && (wallet as any).walletClientType !== 'privy'
            const walletType = isLinked ? 'linked' : 'embedded'
            const clientType = (wallet as any).walletClientType || 'privy'
            allWallets.push(toUnifiedWallet(address, 'solana', walletType, clientType, balance, usd))
          }
        }
      }

      // 3. Process linked wallets from user.linked_accounts (Privy v0.58+)
      const linkedAccounts = (user as any).linked_accounts || (user as any).linkedAccounts || []
      for (const account of linkedAccounts) {
        if (account.type === 'wallet' && account.address) {
          const address = account.address
          const chainType: ChainType = account.chainType === 'solana' ? 'solana' : 'ethereum'

          if (!seenAddresses.has(address.toLowerCase())) {
            seenAddresses.add(address.toLowerCase())

            // Determine wallet client type
            let clientType: WalletClientType = 'unknown'
            if (account.walletClient) {
              const client = account.walletClient.toLowerCase()
              if (client.includes('metamask')) clientType = 'metamask'
              else if (client.includes('phantom')) clientType = 'phantom'
              else if (client.includes('coinbase')) clientType = 'coinbase'
              else if (client.includes('walletconnect')) clientType = 'walletconnect'
            }

            const { balance, usd } =
              chainType === 'ethereum'
                ? await fetchEthBalance(address)
                : await fetchSolBalance(address)

            allWallets.push(toUnifiedWallet(address, chainType, 'linked', clientType, balance, usd))
          }
        }
      }

      setWallets(allWallets)
    } catch (err) {
      console.error('Failed to load wallets:', err)
      setError('Failed to load wallets')
    } finally {
      setIsLoading(false)
    }
  }, [user, ethWallets, solWallets])

  // Load wallets when dependencies change
  useEffect(() => {
    loadWallets()
  }, [loadWallets])

  // Get default wallet for a chain
  const getDefaultWallet = useCallback(
    (chainType: ChainType): UnifiedWallet | null => {
      return getDefaultFromPrefs(wallets, chainType)
    },
    [wallets, getDefaultFromPrefs],
  )

  // Set default wallet for a chain
  const setDefaultWallet = useCallback(
    async (walletId: string, chainType: ChainType) => {
      await setDefaultInPrefs(walletId, chainType)
    },
    [setDefaultInPrefs],
  )

  // Calculate total USD balance
  const totalBalanceUsd = useMemo(() => {
    const total = wallets.reduce((sum, wallet) => {
      return sum + parseFloat(wallet.balanceUsd || '0')
    }, 0)
    return total.toFixed(2)
  }, [wallets])

  // Wallet linking - placeholder for future Privy integration
  const startLinkEthereum = useCallback(async () => {
    setLinkState({
      status: 'connecting',
      error: null,
      connectedAddress: null,
      selectedChain: 'ethereum',
    })

    // External wallet linking requires development builds with deep linking configured
    // For Expo Go, embedded wallets are the primary wallet option
    setTimeout(() => {
      setLinkState({
        status: 'error',
        error:
          'External wallet linking requires a development build. For now, use your embedded Base wallet - it works great!',
        connectedAddress: null,
        selectedChain: 'ethereum',
      })
    }, 1000)
  }, [])

  const startLinkSolana = useCallback(async () => {
    setLinkState({
      status: 'connecting',
      error: null,
      connectedAddress: null,
      selectedChain: 'solana',
    })

    // External wallet linking requires development builds with deep linking configured
    // For Expo Go, embedded wallets are the primary wallet option
    setTimeout(() => {
      setLinkState({
        status: 'error',
        error:
          'External wallet linking requires a development build. For now, use your embedded Solana wallet - it works great!',
        connectedAddress: null,
        selectedChain: 'solana',
      })
    }, 1000)
  }, [])

  const cancelLink = useCallback(() => {
    setLinkState({
      status: 'idle',
      error: null,
      connectedAddress: null,
      selectedChain: null,
    })
  }, [])

  // Unlink wallet - placeholder
  const unlinkWallet = useCallback(async (walletId: string) => {
    // TODO: Implement with Privy's useUnlinkWallet
    console.log('Unlinking wallet:', walletId)
    throw new Error('Wallet unlinking not yet implemented')
  }, [])

  return {
    wallets,
    isLoading,
    error,
    linkState,
    startLinkEthereum,
    startLinkSolana,
    cancelLink,
    unlinkWallet,
    getDefaultWallet,
    setDefaultWallet,
    totalBalanceUsd,
    refetch: loadWallets,
  }
}

export default useWalletManager
