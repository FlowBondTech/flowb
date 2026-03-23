'use client'

import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'

interface ExperimentalContextType {
  experimentalEnabled: boolean
  setExperimentalEnabled: (enabled: boolean) => void
  toggleExperimental: () => void
}

const ExperimentalContext = createContext<ExperimentalContextType | undefined>(undefined)

const EXPERIMENTAL_STORAGE_KEY = 'danz-experimental-features'

export function ExperimentalProvider({ children }: { children: ReactNode }) {
  const [experimentalEnabled, setExperimentalEnabledState] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load saved setting on mount
  useEffect(() => {
    const saved = localStorage.getItem(EXPERIMENTAL_STORAGE_KEY)
    if (saved === 'true') {
      setExperimentalEnabledState(true)
    }
    setMounted(true)
  }, [])

  const setExperimentalEnabled = useCallback((enabled: boolean) => {
    setExperimentalEnabledState(enabled)
    localStorage.setItem(EXPERIMENTAL_STORAGE_KEY, enabled.toString())
  }, [])

  const toggleExperimental = useCallback(() => {
    setExperimentalEnabled(!experimentalEnabled)
  }, [experimentalEnabled, setExperimentalEnabled])

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <ExperimentalContext.Provider
        value={{
          experimentalEnabled: false,
          setExperimentalEnabled: () => {},
          toggleExperimental: () => {},
        }}
      >
        {children}
      </ExperimentalContext.Provider>
    )
  }

  return (
    <ExperimentalContext.Provider
      value={{
        experimentalEnabled,
        setExperimentalEnabled,
        toggleExperimental,
      }}
    >
      {children}
    </ExperimentalContext.Provider>
  )
}

export function useExperimental() {
  const context = useContext(ExperimentalContext)
  if (context === undefined) {
    throw new Error('useExperimental must be used within an ExperimentalProvider')
  }
  return context
}
