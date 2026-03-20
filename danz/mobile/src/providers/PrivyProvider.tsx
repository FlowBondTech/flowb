import { PrivyProvider } from '@privy-io/expo'
import type React from 'react'

interface PrivyProviderWrapperProps {
  children: React.ReactNode
}

export const privyConfig = {
  appId: process.env.EXPO_PUBLIC_PRIVY_APP_ID,
  clientId: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID,

  // Appearance customization for mobile
  appearance: {
    theme: 'dark' as const,
    accentColor: '#FF6EC7', // DANZ pink color
    logo: 'https://danz.now/danz-icon-pink.png', // DANZ logo URL
    loginMessage: 'Move. Connect. Earn.',
  },

  // Embedded wallet configuration
  embedded: {
    ethereum: {
      createOnLogin: 'all-users' as const,
    },
    solana: {
      createOnLogin: 'all-users' as const,
    },
  },
} as const

/**
 * PrivyProvider wrapper component
 * Provides Privy authentication context to the entire app
 */
export const PrivyProviderWrapper: React.FC<PrivyProviderWrapperProps> = ({ children }) => {
  if (!privyConfig.appId) {
    console.error(
      'Privy App ID is not configured. Please set EXPO_PUBLIC_PRIVY_APP_ID in your environment.',
    )
  }

  return (
    <PrivyProvider
      appId={privyConfig.appId!}
      clientId={privyConfig.clientId}
      config={{
        embedded: privyConfig.embedded,
      }}
    >
      {children}
    </PrivyProvider>
  )
}
