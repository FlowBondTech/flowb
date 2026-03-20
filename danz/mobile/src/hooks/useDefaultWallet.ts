/**
 * useDefaultWallet Hook
 * Manages default wallet selection and persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'
import type { ChainType, UnifiedWallet, WalletPreferences } from '@/types/wallet'

const WALLET_PREFS_KEY = '@danz_wallet_preferences'

const DEFAULT_PREFERENCES: WalletPreferences = {
  defaultEthWalletId: null,
  defaultSolWalletId: null,
  showTestnets: false,
  hideZeroBalances: false,
  preferredCurrency: 'USD',
}

interface UseDefaultWalletResult {
  preferences: WalletPreferences
  isLoading: boolean
  error: string | null

  // Get default wallet for a chain from a list of wallets
  getDefaultWallet: (wallets: UnifiedWallet[], chainType: ChainType) => UnifiedWallet | null

  // Set default wallet for a chain
  setDefaultWallet: (walletId: string, chainType: ChainType) => Promise<void>

  // Clear default wallet for a chain
  clearDefaultWallet: (chainType: ChainType) => Promise<void>

  // Update preferences
  updatePreferences: (updates: Partial<WalletPreferences>) => Promise<void>

  // Reset to defaults
  resetPreferences: () => Promise<void>
}

export function useDefaultWallet(): UseDefaultWalletResult {
  const [preferences, setPreferences] = useState<WalletPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load preferences from storage on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const stored = await AsyncStorage.getItem(WALLET_PREFS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WalletPreferences>
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })
      }
    } catch (err) {
      console.error('Failed to load wallet preferences:', err)
      setError('Failed to load wallet preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const savePreferences = async (newPrefs: WalletPreferences) => {
    try {
      await AsyncStorage.setItem(WALLET_PREFS_KEY, JSON.stringify(newPrefs))
      setPreferences(newPrefs)
    } catch (err) {
      console.error('Failed to save wallet preferences:', err)
      throw new Error('Failed to save wallet preferences')
    }
  }

  const getDefaultWallet = useCallback(
    (wallets: UnifiedWallet[], chainType: ChainType): UnifiedWallet | null => {
      if (!wallets || wallets.length === 0) return null

      // Get the default wallet ID for this chain
      const defaultId =
        chainType === 'ethereum' ? preferences.defaultEthWalletId : preferences.defaultSolWalletId

      // Filter wallets by chain type
      const chainWallets = wallets.filter(w => w.chainType === chainType)

      if (chainWallets.length === 0) return null

      // Try to find the default wallet
      if (defaultId) {
        const defaultWallet = chainWallets.find(w => w.id === defaultId)
        if (defaultWallet) return defaultWallet
      }

      // Fallback: prefer embedded wallets, then first available
      const embeddedWallet = chainWallets.find(w => w.walletType === 'embedded')
      return embeddedWallet || chainWallets[0]
    },
    [preferences.defaultEthWalletId, preferences.defaultSolWalletId],
  )

  const setDefaultWallet = useCallback(
    async (walletId: string, chainType: ChainType) => {
      const updates: Partial<WalletPreferences> =
        chainType === 'ethereum'
          ? { defaultEthWalletId: walletId }
          : { defaultSolWalletId: walletId }

      await savePreferences({ ...preferences, ...updates })
    },
    [preferences],
  )

  const clearDefaultWallet = useCallback(
    async (chainType: ChainType) => {
      const updates: Partial<WalletPreferences> =
        chainType === 'ethereum' ? { defaultEthWalletId: null } : { defaultSolWalletId: null }

      await savePreferences({ ...preferences, ...updates })
    },
    [preferences],
  )

  const updatePreferences = useCallback(
    async (updates: Partial<WalletPreferences>) => {
      await savePreferences({ ...preferences, ...updates })
    },
    [preferences],
  )

  const resetPreferences = useCallback(async () => {
    await savePreferences(DEFAULT_PREFERENCES)
  }, [])

  return {
    preferences,
    isLoading,
    error,
    getDefaultWallet,
    setDefaultWallet,
    clearDefaultWallet,
    updatePreferences,
    resetPreferences,
  }
}

export default useDefaultWallet
