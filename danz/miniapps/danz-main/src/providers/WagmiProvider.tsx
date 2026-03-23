'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { WagmiProvider as WagmiProviderBase, createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

// Wagmi config for Base chain - Coinbase Wallet only for miniapp
const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'DANZ',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

const queryClient = new QueryClient()

interface WagmiProviderProps {
  children: ReactNode
}

export function WagmiProvider({ children }: WagmiProviderProps) {
  return (
    <WagmiProviderBase config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProviderBase>
  )
}
