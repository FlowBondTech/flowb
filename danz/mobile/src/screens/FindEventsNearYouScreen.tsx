import { Feather, Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EventCard } from '../components/events/EventCard'
import { MapViewCompat, MarkerCompat } from '../components/MapViewCompat'
import { useLocation } from '../contexts/LocationContext'
import { useGetEventsNearLocationQuery } from '../generated/graphql'
import { useThemedStyles } from '../hooks/useThemedStyles'
import { moderateScale, scale, verticalScale } from '../styles/responsive'
import { formatDistance } from '../utils/locationUtils'

type ViewMode = 'list' | 'map'

interface EventWithDistance {
  event: any
  distance: number
}

export const FindEventsNearYouScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { styles: themedStyles, colors } = useThemedStyles()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [maxDistance, setMaxDistance] = useState(10) // Default 10km radius
  const [refreshing, setRefreshing] = useState(false)
  const { userLocation, locationLoading, locationError, refreshLocation } = useLocation()

  useEffect(() => {
    if (!userLocation) {
      refreshLocation()
    }
  }, [!!userLocation])

  const {
    data: eventsData,
    loading: eventsLoading,
    refetch,
  } = useGetEventsNearLocationQuery({
    variables: {
      latitude: userLocation?.latitude!,
      longitude: userLocation?.longitude!,
      radius: maxDistance === 0 ? 10000 : maxDistance, // Use 10000km for "All"
    },
    skip: !userLocation, // Only fetch when we have a location
  })

  const events = eventsData?.events?.events

  // Events are already filtered by backend (status: upcoming includes non-ended events)
  const eventsWithDistance = useMemo(() => {
    if (!events) return []

    // Backend already filters for non-ended events via status: upcoming in the query
    return events.map(event => ({
      event,
      distance: event.distance || 0,
    }))
  }, [events])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetch(), refreshLocation()])
    setRefreshing(false)
  }, [refetch, refreshLocation])

  const renderEventCard = ({ item }: { item: EventWithDistance }) => (
    <View style={styles.cardWrapper}>
      <EventCard
        event={item.event}
        onPress={() =>
          navigation.navigate('EventDetails', { eventId: item.event.id, event: item.event })
        }
        distance={item.distance}
      />
    </View>
  )

  const renderDistanceFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {[5, 10, 25, 50, 100, 0].map(distance => (
        <TouchableOpacity
          key={distance}
          onPress={() => setMaxDistance(distance)}
          style={[styles.filterChip, maxDistance === distance && styles.filterChipActive]}
        >
          <Text
            style={[styles.filterChipText, maxDistance === distance && styles.filterChipTextActive]}
          >
            {distance === 0 ? 'All' : `${distance}km`}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )

  const renderMapView = useCallback(() => {
    if (!userLocation) return null

    const mapRegion = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: maxDistance * 0.02,
      longitudeDelta: maxDistance * 0.02,
    }

    return (
      <MapViewCompat
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {eventsWithDistance.map(({ event, distance }) => {
          // Only render markers for events with valid coordinates
          if (!event.location_latitude || !event.location_longitude) return null

          return (
            <MarkerCompat
              key={event.id}
              coordinate={{
                latitude: Number(event.location_latitude),
                longitude: Number(event.location_longitude),
              }}
              title={event.title}
              description={`${formatDistance(distance)} away`}
              onCalloutPress={() =>
                navigation.navigate('EventDetails', { eventId: event.id, event })
              }
            />
          )
        })}
      </MapViewCompat>
    )
  }, [userLocation, eventsWithDistance, maxDistance, navigation])

  const renderListView = () => (
    <FlatList
      data={eventsWithDistance}
      renderItem={renderEventCard}
      keyExtractor={item => item.event.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={scale(48)} color={colors.textSecondary} />
          <Text style={[themedStyles.text, styles.emptyTitle]}>No events nearby</Text>
          <Text style={[themedStyles.textSecondary, styles.emptyText]}>
            Try increasing the search radius or check back later
          </Text>
        </View>
      }
    />
  )

  // Show location requirement screen if location not available
  if (!userLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={scale(24)} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Events Near You</Text>
            <View style={{ width: scale(32) }} />
          </View>
        </View>
        <View style={[styles.centerContent, { flex: 1 }]}>
          <Ionicons name="location-outline" size={scale(64)} color={colors.primary} />
          <Text style={[themedStyles.text, styles.emptyTitle]}>Location Required</Text>
          <Text style={[themedStyles.textSecondary, styles.emptyText]}>
            We need your location to show events near you
          </Text>
          {locationError && (
            <Text style={[themedStyles.textSecondary, styles.errorText]}>{locationError}</Text>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refreshLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="refresh-cw" size={scale(16)} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Show loading screen while getting location or events
  if (locationLoading || !userLocation || eventsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={scale(24)} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Events Near You</Text>
            <View style={{ width: scale(32) }} />
          </View>
        </View>
        <View style={[styles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[themedStyles.text, styles.loadingText]}>
            {locationLoading || !userLocation ? 'Getting your location...' : 'Loading events...'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={scale(24)} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Events Near You</Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              onPress={() => setViewMode('list')}
              style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            >
              <Feather name="list" size={scale(18)} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('map')}
              style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
            >
              <Feather name="map" size={scale(18)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {renderDistanceFilter()}

        <View style={styles.statsBar}>
          <View style={styles.stat}>
            <Feather name="map-pin" size={scale(14)} color={colors.primary} />
            <Text style={styles.statText}>
              {eventsWithDistance.length} events{' '}
              {maxDistance === 0 ? 'sorted by distance' : `within ${maxDistance}km`}
            </Text>
          </View>
        </View>
      </View>

      {viewMode === 'map' ? renderMapView() : renderListView()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: scale(8),
    padding: scale(2),
  },
  toggleButton: {
    padding: scale(6),
    borderRadius: scale(6),
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(182, 103, 255, 0.3)',
  },
  filterContainer: {
    maxHeight: verticalScale(50),
  },
  filterContent: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  filterChip: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: scale(8),
  },
  filterChipActive: {
    backgroundColor: '#B967FF',
  },
  filterChipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateScale(13),
    marginLeft: scale(6),
  },
  map: {
    flex: 1,
  },
  listContent: {
    paddingVertical: verticalScale(16),
    backgroundColor: '#000000',
  },
  cardWrapper: {
    marginHorizontal: scale(16),
    marginBottom: verticalScale(16),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(32),
  },
  emptyTitle: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyText: {
    marginTop: verticalScale(8),
    textAlign: 'center',
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  loadingText: {
    marginTop: verticalScale(16),
  },
  errorText: {
    marginTop: verticalScale(8),
    textAlign: 'center',
    fontSize: moderateScale(12),
    color: 'rgba(255, 100, 100, 0.8)',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B967FF',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    marginTop: verticalScale(24),
    gap: scale(8),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
})
