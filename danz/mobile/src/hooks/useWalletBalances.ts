import { useEmbeddedEthereumWallet, useEmbeddedSolanaWallet, usePrivy } from '@privy-io/expo'
import { useCallback, useEffect, useState } from 'react'
import { createPublicClient, formatEther, http } from 'viem'
import { base } from 'viem/chains'

export interface WalletBalance {
  address: string
  balance: string
  balanceFormatted: string
  chain: 'ethereum' | 'solana'
  network: string
  symbol: string
  usdValue?: string
}

export interface UseWalletBalancesResult {
  balances: WalletBalance[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  totalUsdValue: string
}

// Base Mainnet RPC
const baseClient = createPublicClient({
  chain: base,
  transport: http(),
})

// Solana RPC
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'
const LAMPORTS_PER_SOL = 1_000_000_000

export const useWalletBalances = (): UseWalletBalancesResult => {
  const { user } = usePrivy()
  const { wallets: ethWallets } = useEmbeddedEthereumWallet()
  const { wallets: solWallets } = useEmbeddedSolanaWallet()

  const [balances, setBalances] = useState<WalletBalance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEthBalance = useCallback(async (address: string): Promise<WalletBalance | null> => {
    try {
      const balance = await baseClient.getBalance({ address: address as `0x${string}` })
      const formatted = formatEther(balance)

      return {
        address,
        balance: balance.toString(),
        balanceFormatted: Number(formatted).toFixed(6),
        chain: 'ethereum',
        network: 'Base',
        symbol: 'ETH',
      }
    } catch (err) {
      console.error('Error fetching ETH balance:', err)
      return null
    }
  }, [])

  const fetchSolBalance = useCallback(async (address: string): Promise<WalletBalance | null> => {
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
      const balance = data.result?.value || 0
      const formatted = balance / LAMPORTS_PER_SOL

      return {
        address,
        balance: balance.toString(),
        balanceFormatted: formatted.toFixed(6),
        chain: 'solana',
        network: 'Solana',
        symbol: 'SOL',
      }
    } catch (err) {
      console.error('Error fetching SOL balance:', err)
      return null
    }
  }, [])

  const refetch = useCallback(async () => {
    if (!user) {
      setBalances([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const newBalances: WalletBalance[] = []

      // Fetch ETH balances from embedded wallets
      if (ethWallets && ethWallets.length > 0) {
        for (const wallet of ethWallets) {
          const balance = await fetchEthBalance(wallet.address)
          if (balance) {
            newBalances.push(balance)
          }
        }
      }

      // Fallback to linked wallets from user object
      if (user.linkedAccounts) {
        for (const account of user.linkedAccounts) {
          if (account.type === 'wallet' && account.chainType === 'ethereum') {
            // Check if we already have this address
            const exists = newBalances.some(
              b => b.address.toLowerCase() === account.address.toLowerCase(),
            )
            if (!exists) {
              const balance = await fetchEthBalance(account.address)
              if (balance) {
                newBalances.push(balance)
              }
            }
          }
        }
      }

      // Fetch SOL balances from embedded wallets
      if (solWallets && solWallets.length > 0) {
        for (const wallet of solWallets) {
          const balance = await fetchSolBalance(wallet.address)
          if (balance) {
            newBalances.push(balance)
          }
        }
      }

      // Fallback to linked wallets from user object
      if (user.linkedAccounts) {
        for (const account of user.linkedAccounts) {
          if (account.type === 'wallet' && account.chainType === 'solana') {
            const exists = newBalances.some(b => b.address === account.address)
            if (!exists) {
              const balance = await fetchSolBalance(account.address)
              if (balance) {
                newBalances.push(balance)
              }
            }
          }
        }
      }

      setBalances(newBalances)
    } catch (err) {
      console.error('Error fetching wallet balances:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch balances')
    } finally {
      setIsLoading(false)
    }
  }, [user, ethWallets, solWallets, fetchEthBalance, fetchSolBalance])

  // Fetch balances when user or wallets change
  useEffect(() => {
    refetch()
  }, [user?.id, ethWallets?.length, solWallets?.length])

  // Calculate total USD value (placeholder - would need price feed integration)
  const totalUsdValue = balances
    .reduce((total, b) => {
      // Placeholder prices - integrate with price feed for real values
      const prices: Record<string, number> = { ETH: 3500, SOL: 200 }
      const price = prices[b.symbol] || 0
      return total + Number(b.balanceFormatted) * price
    }, 0)
    .toFixed(2)

  return {
    balances,
    isLoading,
    error,
    refetch,
    totalUsdValue,
  }
}

// Helper to truncate wallet address
export const truncateAddress = (address: string, chars = 4): string => {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}
