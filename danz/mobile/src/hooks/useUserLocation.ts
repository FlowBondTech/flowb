import { useEffect, useState } from 'react'
import {
  type Coordinates,
  getCurrentLocation,
  isLocationServicesEnabled,
} from '../utils/locationUtils'

export const useUserLocation = () => {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [locationLoading, setLocationLoading] = useState(false) // Start with false, only load when needed
  const [locationError, setLocationError] = useState<string | null>(null)
  const [hasAttemptedLocation, setHasAttemptedLocation] = useState(false)

  const fetchLocation = async () => {
    if (userLocation || locationLoading) return // Already have location

    try {
      setLocationLoading(true)
      setLocationError(null)
      setHasAttemptedLocation(true)

      const servicesEnabled = await isLocationServicesEnabled()
      if (!servicesEnabled) {
        setLocationError('Location services are disabled')
        setLocationLoading(false)
        return
      }

      const location = await getCurrentLocation()
      if (location) {
        setUserLocation(location)
      } else {
        setLocationError('Unable to get location')
      }
    } catch (error) {
      console.error('Error getting location:', error)
      setLocationError('Failed to get location')
    } finally {
      setLocationLoading(false)
    }
  }

  useEffect(() => {
    if (!hasAttemptedLocation) {
      fetchLocation()
    }
  }, [hasAttemptedLocation])

  return {
    userLocation,
    locationLoading,
    locationError,
    hasAttemptedLocation,
    refreshLocation: fetchLocation,
  }
}
