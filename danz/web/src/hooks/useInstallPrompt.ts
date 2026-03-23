'use client'

import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UseInstallPromptReturn {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  isAndroid: boolean
  isMobile: boolean
  promptInstall: () => Promise<boolean>
  dismissBanner: () => void
  showBanner: boolean
}

const BANNER_DISMISSED_KEY = 'danz-install-banner-dismissed'
const BANNER_DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)
    const isMobileDevice = isIOSDevice || isAndroidDevice || /mobile/.test(userAgent)

    setIsIOS(isIOSDevice)
    setIsAndroid(isAndroidDevice)
    setIsMobile(isMobileDevice)

    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    setIsInstalled(isStandalone)

    // Check if banner was recently dismissed
    const dismissedAt = localStorage.getItem(BANNER_DISMISSED_KEY)
    const wasDismissed =
      dismissedAt && Date.now() - Number.parseInt(dismissedAt, 10) < BANNER_DISMISS_DURATION

    // Show banner for mobile users who haven't installed and haven't dismissed
    if (isMobileDevice && !isStandalone && !wasDismissed) {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    // Capture the beforeinstallprompt event (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setShowBanner(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setShowBanner(false)
        return true
      }
      return false
    } catch (error) {
      console.error('Error prompting install:', error)
      return false
    }
  }, [deferredPrompt])

  const dismissBanner = useCallback(() => {
    setShowBanner(false)
    localStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString())
  }, [])

  return {
    isInstallable: !!deferredPrompt || isIOS,
    isInstalled,
    isIOS,
    isAndroid,
    isMobile,
    promptInstall,
    dismissBanner,
    showBanner,
  }
}
