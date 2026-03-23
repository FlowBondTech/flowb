'use client'

import sdk from '@farcaster/frame-sdk'
import { useCallback, useEffect, useState } from 'react'

type FrameContext = Awaited<typeof sdk.context>

export interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  custody?: string
}

export interface UseFarcasterSDKReturn {
  isLoaded: boolean
  isInFrame: boolean
  context: FrameContext | null
  user: FarcasterUser | null
  error: string | null
  ready: () => Promise<void>
  openUrl: (url: string) => Promise<void>
  close: () => Promise<void>
  composeCast: (text: string, embeds?: string[]) => Promise<void>
}

export function useFarcasterSDK(): UseFarcasterSDKReturn {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInFrame, setIsInFrame] = useState(false)
  const [context, setContext] = useState<FrameContext | null>(null)
  const [user, setUser] = useState<FarcasterUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Check if we're in a Farcaster frame context
        const frameContext = await sdk.context

        if (frameContext) {
          setIsInFrame(true)
          setContext(frameContext)

          // Extract user info from context
          if (frameContext.user) {
            setUser({
              fid: frameContext.user.fid,
              username: frameContext.user.username,
              displayName: frameContext.user.displayName,
              pfpUrl: frameContext.user.pfpUrl,
            })
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

  // CRITICAL: Call this to hide the splash screen
  const ready = useCallback(async () => {
    try {
      await sdk.actions.ready()
      console.log('[Farcaster SDK] App ready - splash screen hidden')
    } catch (err) {
      console.error('[Farcaster SDK] Ready error:', err)
    }
  }, [])

  // Open external URL in Farcaster browser
  const openUrl = useCallback(async (url: string) => {
    try {
      await sdk.actions.openUrl(url)
    } catch (err) {
      // Fallback to window.open if not in frame
      window.open(url, '_blank')
    }
  }, [])

  // Close the miniapp
  const close = useCallback(async () => {
    try {
      await sdk.actions.close()
    } catch (err) {
      console.error('[Farcaster SDK] Close error:', err)
    }
  }, [])

  // Compose a cast (post) on Farcaster
  const composeCast = useCallback(async (text: string, embeds?: string[]) => {
    try {
      // Use the Farcaster SDK to open composer
      // This opens the cast composer with pre-filled text
      const castUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}${
        embeds?.length ? `&embeds[]=${embeds.map(e => encodeURIComponent(e)).join('&embeds[]=')}` : ''
      }`
      await sdk.actions.openUrl(castUrl)
    } catch (err) {
      // Fallback to opening Warpcast in browser
      const fallbackUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`
      window.open(fallbackUrl, '_blank')
    }
  }, [])

  return {
    isLoaded,
    isInFrame,
    context,
    user,
    error,
    ready,
    openUrl,
    close,
    composeCast,
  }
}
