import * as Location from 'expo-location'
import { Alert, Linking, Platform } from 'react-native'

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface LocationAddress {
  formattedAddress: string
  street?: string
  city?: string
  region?: string
  country?: string
  postalCode?: string
  coordinates: Coordinates
}

/**
 * Request location permissions from the user
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  console.log('Requesting location permission...')
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()

    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Needed',
        'DANZ needs access to your location to show events near you. Please enable location services in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:')
              } else {
                Linking.openSettings()
              }
            },
          },
        ],
      )
      return false
    }

    return true
  } catch (error) {
    console.error('Error requesting location permission:', error)
    return false
  }
}

/**
 * Get the user's current location
 */
export const getCurrentLocation = async (): Promise<Coordinates | null> => {
  console.log('Getting current location...')
  try {
    const hasPermission = await requestLocationPermission()
    if (!hasPermission) return null

    // Check if location services are enabled
    const servicesEnabled = await Location.hasServicesEnabledAsync()
    if (!servicesEnabled) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services in your device settings to see distances to events.',
        [{ text: 'OK' }],
      )
      return null
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low, // Use Low accuracy to prevent excessive battery drain
      // Remove mayShowUserSettingsDialog as it can cause issues
    })

    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }

    // Check if this is a simulator default location (San Francisco)
    const isSanFrancisco =
      Math.abs(coords.latitude - 37.7749) < 0.01 && Math.abs(coords.longitude + 122.4194) < 0.01

    if (isSanFrancisco && typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '⚠️ Default simulator location detected (San Francisco).',
        'To test with custom location in simulator:',
        'iOS: Debug > Location > Custom Location',
        'Android: Extended Controls > Location',
      )
    }

    return coords
  } catch (error) {
    console.error('Error getting current location:', error)
    Alert.alert('Location Error', 'Unable to get your current location. Please try again.')
    return null
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  // Ensure coordinates are valid numbers
  const lat1 = Number(coord1.latitude)
  const lon1 = Number(coord1.longitude)
  const lat2 = Number(coord2.latitude)
  const lon2 = Number(coord2.longitude)

  // Check for invalid coordinates
  if (Number.isNaN(lat1) || Number.isNaN(lon1) || Number.isNaN(lat2) || Number.isNaN(lon2)) {
    console.warn('Invalid coordinates provided to calculateDistance:', { coord1, coord2 })
    return 0
  }

  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  }
  return `${distanceKm.toFixed(1)}km`
}

/**
 * Reverse geocode coordinates to get address
 */
export const reverseGeocode = async (coordinates: Coordinates): Promise<LocationAddress | null> => {
  try {
    const [result] = await Location.reverseGeocodeAsync(coordinates)

    if (result) {
      const formattedAddress = [result.street, result.city, result.region, result.country]
        .filter(Boolean)
        .join(', ')

      return {
        formattedAddress,
        street: result.street || undefined,
        city: result.city || undefined,
        region: result.region || undefined,
        country: result.country || undefined,
        postalCode: result.postalCode || undefined,
        coordinates,
      }
    }

    return null
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

/**
 * Geocode an address to get coordinates
 */
export const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
  try {
    const results = await Location.geocodeAsync(address)

    if (results && results.length > 0) {
      const { latitude, longitude } = results[0]
      return { latitude, longitude }
    }

    return null
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

/**
 * Check if location services are enabled
 */
export const isLocationServicesEnabled = async (): Promise<boolean> => {
  try {
    console.log('Checking if location services are enabled...')
    const enabled = await Location.hasServicesEnabledAsync()
    return enabled
  } catch (error) {
    console.error('Error checking location services:', error)
    return false
  }
}

/**
 * Watch user's location with updates
 */
export const watchUserLocation = async (
  callback: (location: Coordinates) => void,
  options?: {
    accuracy?: Location.Accuracy
    distanceInterval?: number
    timeInterval?: number
  },
): Promise<Location.LocationSubscription | null> => {
  try {
    const hasPermission = await requestLocationPermission()
    if (!hasPermission) return null

    return await Location.watchPositionAsync(
      {
        accuracy: options?.accuracy || Location.Accuracy.Balanced,
        distanceInterval: options?.distanceInterval || 10, // Update every 10 meters
        timeInterval: options?.timeInterval || 5000, // Update every 5 seconds
      },
      location => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
      },
    )
  } catch (error) {
    console.error('Error watching location:', error)
    return null
  }
}
