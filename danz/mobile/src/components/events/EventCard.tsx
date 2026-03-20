import { Ionicons } from '@expo/vector-icons'
import type React from 'react'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocation } from '../../contexts/LocationContext'
import type { Event } from '../../generated/graphql'
import { designSystem } from '../../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../../styles/responsive'
import { getCategoryEmoji } from '../../utils/eventHelpers'
import { isEventOngoing } from '../../utils/eventStatusHelpers'
import { formatEventDate, formatTime } from '../../utils/formatters/dateFormatter'
import { getTimeUntilEvent } from '../../utils/formatters/timeFormatter'
import { calculateDistance, formatDistance } from '../../utils/locationUtils'
import { getCoverUrl } from '../../utils/supabaseTransforms'
import { ImageLoader } from '../ui/ImageLoader'

interface EventCardProps {
  event: Event
  onPress: () => void
  isAttending?: boolean
  distance?: number // Distance in kilometers
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, isAttending, distance }) => {
  const { userLocation } = useLocation()
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null)

  useEffect(() => {
    // Calculate distance if user location is available and event has coordinates
    if (userLocation && event.location_latitude && event.location_longitude) {
      const eventLocation = {
        latitude: Number(event.location_latitude),
        longitude: Number(event.location_longitude),
      }

      // Only calculate if we have valid coordinates
      if (!Number.isNaN(eventLocation.latitude) && !Number.isNaN(eventLocation.longitude)) {
        const dist = calculateDistance(userLocation, eventLocation)
        setCalculatedDistance(dist)
      }
    }
  }, [userLocation, event.location_latitude, event.location_longitude])

  const handlePress = () => {
    // Pass the entire event data when navigating
    onPress()
  }

  // Use provided distance or calculated distance
  const displayDistance = distance !== undefined ? distance : calculatedDistance

  // Check event status
  const isPastEvent = new Date(event.end_date_time) < new Date()
  const isOngoing = isEventOngoing(event.start_date_time, event.end_date_time)
  const timeRemaining = !isPastEvent && !isOngoing ? getTimeUntilEvent(event.start_date_time) : null

  // Determine attendance status
  const isRegistered = isAttending || event.is_registered
  const hasAttended = isRegistered && isPastEvent
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.eventCardTouchable}>
      <View style={styles.eventCard}>
        {/* Event Image */}
        <View style={styles.imageContainer}>
          {event.image_url ? (
            <ImageLoader
              source={{ uri: getCoverUrl(event.image_url, 'thumbnail') }}
              style={styles.eventImage}
              placeholderColor={`${designSystem.colors.primary}20`}
            />
          ) : (
            <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
              <Text style={styles.eventEmoji}>{getCategoryEmoji(event.category || '')}</Text>
            </View>
          )}

          {/* Attending/Attended Indicator */}
          {isRegistered && (
            <View style={[styles.attendingBadge, hasAttended && styles.attendedBadge]}>
              <Ionicons
                name={hasAttended ? 'checkmark-done' : 'calendar-outline'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.attendingText}>{hasAttended ? 'Attended' : 'Attending'}</Text>
            </View>
          )}

          {/* Distance Badge */}
          {displayDistance !== null && displayDistance !== undefined && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={14} color="#FFFFFF" />
              <Text style={styles.distanceText}>{formatDistance(displayDistance)}</Text>
            </View>
          )}
        </View>

        {/* Content Container */}
        <View style={styles.eventContent}>
          {/* Header with Title and Participants */}
          <View style={styles.eventHeader}>
            <View style={styles.titleSection}>
              <Text style={styles.eventTitle} numberOfLines={2}>
                {event.title}
              </Text>
              {isPastEvent ? (
                <Text style={styles.pastEventStatus}>Event Ended</Text>
              ) : isOngoing ? (
                <Text style={styles.ongoingStatus}>Ongoing</Text>
              ) : (
                timeRemaining && <Text style={styles.timeRemaining}>{timeRemaining}</Text>
              )}
            </View>
            <View style={styles.participantsTag}>
              <Ionicons name="people" size={16} color={designSystem.colors.white} />
              <Text style={styles.participantsText}>
                {event.registration_count || 0}
                {event.max_capacity ? `/${event.max_capacity}` : ''}
              </Text>
            </View>
          </View>

          {/* Date and Time */}
          <View style={styles.eventDateTime}>
            <View style={styles.dateTimeItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={designSystem.colors.textSecondary}
              />
              <Text style={styles.dateTimeText}>{formatEventDate(event.start_date_time)}</Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Ionicons name="time-outline" size={14} color={designSystem.colors.textSecondary} />
              <Text style={styles.dateTimeText}>{formatTime(event.start_date_time)}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.eventLocation}>
            <Ionicons
              name={event.is_virtual ? 'videocam-outline' : 'location-outline'}
              size={14}
              color={designSystem.colors.textSecondary}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {event.location_name}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  eventCardTouchable: {
    marginBottom: verticalScale(12),
  },
  eventCard: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}10`,
  },
  imageContainer: {
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: verticalScale(180),
    backgroundColor: `${designSystem.colors.primary}10`,
  },
  eventImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${designSystem.colors.primary}15`,
  },
  eventEmoji: {
    fontSize: moderateScale(48),
  },
  attendingBadge: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.primary,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(20),
    gap: scale(4),
  },
  attendedBadge: {
    backgroundColor: `${designSystem.colors.textSecondary}90`,
  },
  attendingText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  eventContent: {
    padding: moderateScale(16),
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  titleSection: {
    flex: 1,
    marginRight: scale(8),
  },
  eventTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: designSystem.colors.white,
    lineHeight: moderateScale(24),
  },
  timeRemaining: {
    fontSize: moderateScale(13),
    color: designSystem.colors.primary,
    fontWeight: '500',
    marginTop: verticalScale(2),
  },
  ongoingStatus: {
    fontSize: moderateScale(13),
    color: designSystem.colors.success,
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  pastEventStatus: {
    fontSize: moderateScale(13),
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
    marginTop: verticalScale(2),
  },
  participantsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${designSystem.colors.primary}20`,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
    gap: scale(4),
  },
  participantsText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  eventDateTime: {
    flexDirection: 'row',
    gap: scale(16),
    marginBottom: verticalScale(8),
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  dateTimeText: {
    fontSize: moderateScale(13),
    color: designSystem.colors.textSecondary,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(16),
  },
  locationText: {
    flex: 1,
    fontSize: moderateScale(13),
    color: designSystem.colors.textSecondary,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  statText: {
    fontSize: moderateScale(13),
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  skillBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(10),
  },
  skillText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: verticalScale(12),
    left: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    gap: scale(4),
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
})
