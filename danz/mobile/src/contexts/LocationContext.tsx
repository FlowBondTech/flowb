import React, { createContext, type ReactNode, useContext } from 'react'
import { useUserLocation } from '../hooks/useUserLocation'
import type { Coordinates } from '../utils/locationUtils'

interface LocationContextType {
  userLocation: Coordinates | null
  locationLoading: boolean
  locationError: string | null
  hasAttemptedLocation: boolean
  refreshLocation: () => Promise<void>
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const locationData = useUserLocation()

  return <LocationContext.Provider value={locationData}>{children}</LocationContext.Provider>
}

export const useLocation = () => {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
