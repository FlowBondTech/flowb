'use client'

import { useCallback, useEffect, useState } from 'react'

// Dynamic import to avoid SSR issues
let sdk: any = null

interface FrameContext {
  user?: {
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
  }
  client?: {
    clientFid: number
    added: boolean
    notificationDetails?: {
      url: string
      token: string
    }
  }
}

interface AddFrameResult {
  added: boolean
  notificationDetails?: {
    url: string
    token: string
  }
}

export interface UseFarcasterFrameReturn {
  isLoaded: boolean
  isInFrame: boolean
  context: FrameContext | null
  user: FrameContext['user'] | null
  isFrameAdded: boolean
  notificationToken: string | null
  error: string | null
  ready: () => Promise<void>
  addFrame: () => Promise<AddFrameResult | null>
  openUrl: (url: string) => Promise<void>
  close: () => Promise<void>
  composeCast: (text: string, embeds?: string[]) => Promise<void>
}

/**
 * Hook for Farcaster Frame SDK integration.
 * Handles frame context, user info, and notification permissions.
 */
export function useFarcasterFrame(): UseFarcasterFrameReturn {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInFrame, setIsInFrame] = useState(false)
  const [context, setContext] = useState<FrameContext | null>(null)
  const [isFrameAdded, setIsFrameAdded] = useState(false)
  const [notificationToken, setNotificationToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize SDK
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Dynamic import for client-side only
        if (typeof window !== 'undefined') {
          const frameSdk = await import('@farcaster/frame-sdk')
          sdk = frameSdk.default

          // Get frame context
          const frameContext = await sdk.context

          if (frameContext) {
            setIsInFrame(true)
            setContext(frameContext)

            // Check if frame is already added (notifications enabled)
            if (frameContext.client?.added) {
              setIsFrameAdded(true)
              if (frameContext.client.notificationDetails?.token) {
                setNotificationToken(frameContext.client.notificationDetails.token)
              }
            }
          }
        }

        setIsLoaded(true)
      } catch (err) {
        console.error('[Farcaster SDK] Initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK')
        setIsLoaded(true)
      }
    }

    initializeSDK()
  }, [])

  // Signal frame is ready (hides Farcaster splash)
  const ready = useCallback(async () => {
    if (!sdk) return
    try {
      await sdk.actions.ready()
      console.log('[Farcaster SDK] Frame ready')
    } catch (err) {
      console.error('[Farcaster SDK] Ready error:', err)
    }
  }, [])

  // Request to add frame (enables notifications)
  const addFrame = useCallback(async (): Promise<AddFrameResult | null> => {
    if (!sdk || !isInFrame) {
      console.warn('[Farcaster SDK] Cannot add frame - not in frame context')
      return null
    }

    try {
      const result = await sdk.actions.addFrame()

      if (result.added) {
        setIsFrameAdded(true)
        if (result.notificationDetails?.token) {
          setNotificationToken(result.notificationDetails.token)
        }
        console.log('[Farcaster SDK] Frame added successfully')
      }

      return result
    } catch (err) {
      console.error('[Farcaster SDK] Add frame error:', err)
      return null
    }
  }, [isInFrame])

  // Open URL in Farcaster browser
  const openUrl = useCallback(
    async (url: string) => {
      if (sdk && isInFrame) {
        try {
          await sdk.actions.openUrl(url)
          return
        } catch (err) {
          console.error('[Farcaster SDK] Open URL error:', err)
        }
      }
      // Fallback to window.open
      window.open(url, '_blank')
    },
    [isInFrame],
  )

  // Close the miniapp
  const close = useCallback(async () => {
    if (!sdk) return
    try {
      await sdk.actions.close()
    } catch (err) {
      console.error('[Farcaster SDK] Close error:', err)
    }
  }, [])

  // Compose a cast
  const composeCast = useCallback(
    async (text: string, embeds?: string[]) => {
      const castUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}${
        embeds?.length
          ? `&embeds[]=${embeds.map(e => encodeURIComponent(e)).join('&embeds[]=')}`
          : ''
      }`

      if (sdk && isInFrame) {
        try {
          await sdk.actions.openUrl(castUrl)
          return
        } catch (err) {
          console.error('[Farcaster SDK] Compose cast error:', err)
        }
      }
      // Fallback
      window.open(castUrl, '_blank')
    },
    [isInFrame],
  )

  return {
    isLoaded,
    isInFrame,
    context,
    user: context?.user || null,
    isFrameAdded,
    notificationToken,
    error,
    ready,
    addFrame,
    openUrl,
    close,
    composeCast,
  }
}
