'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { base, baseSepolia } from 'wagmi/chains'

// USDC contract addresses
const USDC_ADDRESSES = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
}

// Treasury address - receives party creation fees
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000'

// Party creation cost in USDC
export const PARTY_CREATION_COST = 2 // $2 USDC

// Minimal ERC20 ABI for transfer
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export type PaymentStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

interface UseUSDCPaymentReturn {
  payForPartyCreation: () => Promise<`0x${string}` | null>
  status: PaymentStatus
  error: string | null
  txHash: `0x${string}` | null
  isConnected: boolean
  address: `0x${string}` | undefined
  reset: () => void
}

export function useUSDCPayment(): UseUSDCPaymentReturn {
  const { address, isConnected, chain } = useAccount()
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { writeContractAsync } = useWriteContract()

  // Get USDC address for current chain
  const getUSDCAddress = useCallback(() => {
    const chainId = chain?.id || base.id
    return USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES] || USDC_ADDRESSES[base.id]
  }, [chain])

  const payForPartyCreation = useCallback(async (): Promise<`0x${string}` | null> => {
    if (!address || !isConnected) {
      setError('Wallet not connected')
      setStatus('error')
      return null
    }

    if (!TREASURY_ADDRESS || TREASURY_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setError('Treasury address not configured')
      setStatus('error')
      return null
    }

    try {
      setStatus('pending')
      setError(null)

      const usdcAddress = getUSDCAddress()
      // USDC has 6 decimals
      const amount = parseUnits(PARTY_CREATION_COST.toString(), 6)

      // Send USDC transfer transaction
      const hash = await writeContractAsync({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [TREASURY_ADDRESS, amount],
      })

      setTxHash(hash)
      setStatus('confirming')

      // Note: The calling component should use useWaitForTransactionReceipt
      // to wait for confirmation before proceeding
      return hash
    } catch (err) {
      console.error('Payment error:', err)
      const message = err instanceof Error ? err.message : 'Payment failed'

      // Parse common error messages
      if (message.includes('user rejected') || message.includes('User rejected')) {
        setError('Transaction cancelled')
      } else if (message.includes('insufficient')) {
        setError('Insufficient USDC balance')
      } else {
        setError(message)
      }

      setStatus('error')
      return null
    }
  }, [address, isConnected, getUSDCAddress, writeContractAsync])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setTxHash(null)
  }, [])

  return {
    payForPartyCreation,
    status,
    error,
    txHash,
    isConnected,
    address,
    reset,
  }
}

// Hook to wait for transaction confirmation
export function usePaymentConfirmation(txHash: `0x${string}` | null | undefined) {
  const { isLoading, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  return {
    isConfirming: isLoading,
    isConfirmed: isSuccess,
    isError,
    error: error?.message || null,
  }
}
