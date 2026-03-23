'use client'

import { NeynarContextProvider, Theme } from '@neynar/react'
import type { ReactNode } from 'react'

const NEYNAR_CLIENT_ID = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || ''

interface NeynarProviderProps {
  children: ReactNode
}

export function NeynarProvider({ children }: NeynarProviderProps) {
  if (!NEYNAR_CLIENT_ID) {
    // If no client ID, just render children without Neynar context
    console.warn('Neynar client ID not configured')
    return <>{children}</>
  }

  return (
    <NeynarContextProvider
      settings={{
        clientId: NEYNAR_CLIENT_ID,
        defaultTheme: Theme.Dark,
        eventsCallbacks: {
          onAuthSuccess: (data) => {
            console.log('Neynar auth success:', data)
          },
          onSignout: () => {
            console.log('Neynar signout')
          },
        },
      }}
    >
      {children}
    </NeynarContextProvider>
  )
}
