/**
 * useWalletBalances Hook (stubbed — Privy wallet SDK removed)
 * Returns empty balances so consuming components don't crash.
 */

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

export const useWalletBalances = (): UseWalletBalancesResult => {
  return {
    balances: [],
    isLoading: false,
    error: null,
    refetch: async () => {},
    totalUsdValue: '0.00',
  }
}

// Helper to truncate wallet address
export const truncateAddress = (address: string, chars = 4): string => {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}
