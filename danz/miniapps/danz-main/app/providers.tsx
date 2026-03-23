'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ApolloProvider } from '@/providers/ApolloProvider'
import { WagmiProvider } from '@/providers/WagmiProvider'
import type { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider>
      <ApolloProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ApolloProvider>
    </WagmiProvider>
  )
}
