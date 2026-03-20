import React from 'react'
import { OpenStreetMapView } from './OpenStreetMapView'

interface MapViewCompatProps {
  style?: any
  initialRegion?: {
    latitude: number
    longitude: number
    latitudeDelta: number
    longitudeDelta: number
  }
  showsUserLocation?: boolean
  showsMyLocationButton?: boolean
  children?: React.ReactNode
}

export const MapViewCompat: React.FC<MapViewCompatProps> = ({
  style,
  initialRegion,
  showsUserLocation,
  showsMyLocationButton,
  children,
}) => {
  // Extract markers from children
  const markers = React.Children.toArray(children)
    .filter((child: any) => child?.props?.coordinate)
    .map((child: any, index) => ({
      id: child.key || `marker-${index}`,
      latitude: child.props.coordinate.latitude,
      longitude: child.props.coordinate.longitude,
      title: child.props.title || '',
      description: child.props.description || '',
      onPress: child.props.onCalloutPress,
    }))

  const handleMarkerPress = (markerId: string) => {
    const marker = markers.find(m => m.id === markerId)
    if (marker?.onPress) {
      marker.onPress()
    }
  }

  if (!initialRegion) {
    return null
  }

  // Calculate zoom level from delta (rough approximation)
  const zoom = Math.round(Math.log(360 / initialRegion.latitudeDelta) / Math.LN2)

  return (
    <OpenStreetMapView
      style={style}
      latitude={initialRegion.latitude}
      longitude={initialRegion.longitude}
      zoom={zoom}
      markers={markers}
      showUserLocation={showsUserLocation}
      onMarkerPress={handleMarkerPress}
    />
  )
}

interface MarkerCompatProps {
  coordinate: {
    latitude: number
    longitude: number
  }
  title?: string
  description?: string
  onCalloutPress?: () => void
}

export const MarkerCompat: React.FC<MarkerCompatProps> = () => {
  // Markers are children of MapView, they don't render anything on their own
  return null
}
