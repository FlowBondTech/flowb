'use client'

import { useCallback, useEffect, useState } from 'react'

export interface WalletBalance {
  address: string
  balance: string
  balanceFormatted: string
  chainType: 'ethereum' | 'solana'
  symbol: string
}

interface UseWalletBalancesResult {
  balances: Record<string, WalletBalance>
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  getBalance: (address: string) => WalletBalance | undefined
}

// RPC endpoints
const ETH_RPC = 'https://mainnet.base.org' // Base mainnet
const SOL_RPC = 'https://api.mainnet-beta.solana.com'

// Constants
const LAMPORTS_PER_SOL = 1_000_000_000
const WEI_PER_ETH = BigInt('1000000000000000000')

export function useWalletBalances(
  addresses: { address: string; chainType: 'ethereum' | 'solana' }[],
): UseWalletBalancesResult {
  const [balances, setBalances] = useState<Record<string, WalletBalance>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEthBalance = async (address: string): Promise<WalletBalance | null> => {
    try {
      const response = await fetch(ETH_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest'],
        }),
      })
      const data = await response.json()

      if (data.error) {
        console.error('ETH RPC error:', data.error)
        return null
      }

      const balanceWei = BigInt(data.result || '0x0')
      const balanceEth = Number(balanceWei) / Number(WEI_PER_ETH)

      return {
        address,
        balance: balanceWei.toString(),
        balanceFormatted: balanceEth.toFixed(6),
        chainType: 'ethereum',
        symbol: 'ETH',
      }
    } catch (err) {
      console.error('Error fetching ETH balance:', err)
      return null
    }
  }

  const fetchSolBalance = async (address: string): Promise<WalletBalance | null> => {
    try {
      const response = await fetch(SOL_RPC, {
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

      if (data.error) {
        console.error('SOL RPC error:', data.error)
        return null
      }

      const balanceLamports = data.result?.value || 0
      const balanceSol = balanceLamports / LAMPORTS_PER_SOL

      return {
        address,
        balance: balanceLamports.toString(),
        balanceFormatted: balanceSol.toFixed(6),
        chainType: 'solana',
        symbol: 'SOL',
      }
    } catch (err) {
      console.error('Error fetching SOL balance:', err)
      return null
    }
  }

  const refetch = useCallback(async () => {
    if (addresses.length === 0) {
      setBalances({})
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const newBalances: Record<string, WalletBalance> = {}

      await Promise.all(
        addresses.map(async ({ address, chainType }) => {
          const balance =
            chainType === 'solana' ? await fetchSolBalance(address) : await fetchEthBalance(address)

          if (balance) {
            newBalances[address] = balance
          }
        }),
      )

      setBalances(newBalances)
    } catch (err) {
      console.error('Error fetching balances:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch balances')
    } finally {
      setIsLoading(false)
    }
  }, [addresses])

  // Fetch balances when addresses change
  useEffect(() => {
    if (addresses.length > 0) {
      refetch()
    }
  }, [addresses.length])

  const getBalance = useCallback(
    (address: string) => {
      return balances[address]
    },
    [balances],
  )

  return {
    balances,
    isLoading,
    error,
    refetch,
    getBalance,
  }
}
