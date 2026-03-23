import { useApolloClient } from '@apollo/client/react'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { ImageLoader } from '../components/ui/ImageLoader'
import { DIMENSIONS } from '../constants/dimensions'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../contexts/LocationContext'
import {
  GetMyRegisteredEventsDocument,
  useCancelEventRegistrationMutation,
  useGetEventQuery,
  useRegisterForEventMutation,
} from '../generated/graphql'
import { designSystem } from '../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../styles/responsive'
import { formatEventTimes, getTimezone } from '../utils/eventDateHelpers'
import {
  getEventStatus,
  isEventOngoing,
  isEventPast,
  isEventUpcoming,
} from '../utils/eventStatusHelpers'
import { getTimeUntilEvent } from '../utils/formatters/timeFormatter'
import { calculateDistance, formatDistance } from '../utils/locationUtils'
import { getCoverUrl } from '../utils/supabaseTransforms'

interface Participant {
  privy_id: string
  avatar_url?: string
  display_name?: string
  username?: string
}

export const EventDetailsScreen: React.FC = () => {
  const { user } = useAuth()
  const { userLocation } = useLocation()
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { eventId, event: passedEvent } = route.params // Get both eventId and optional event
  const { top } = useSafeAreaInsets()

  const [actionLoading, setActionLoading] = useState(false)
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Use GraphQL to fetch event
  const client = useApolloClient()
  const {
    data: eventData,
    loading,
    refetch,
    networkStatus,
  } = useGetEventQuery({
    variables: { id: eventId },
    fetchPolicy: 'cache-first', // Use cache first to prevent flashing
    nextFetchPolicy: 'cache-and-network', // Then fetch in background for subsequent queries
    notifyOnNetworkStatusChange: false, // Don't update loading state on background refetch
  })

  // Only show loading on initial load, not on refetch
  const isInitialLoading = loading && networkStatus === 1

  const [registerForEvent] = useRegisterForEventMutation({
    onCompleted: async () => {
      Toast.show({
        type: 'success',
        text1: 'Registered Successfully',
        text2: 'You have been registered for this event',
      })

      // Refetch the event data and other affected queries
      await refetch()
      client.refetchQueries({
        include: [GetMyRegisteredEventsDocument],
      })
    },
    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: error.message || 'Could not register for event',
      })
    },
  })

  const [cancelRegistration] = useCancelEventRegistrationMutation({
    onCompleted: async () => {
      Toast.show({
        type: 'success',
        text1: 'Registration Cancelled',
        text2: 'Your registration has been cancelled',
      })

      // Refetch the event data and other affected queries
      await refetch()
      client.refetchQueries({
        include: [GetMyRegisteredEventsDocument],
      })
    },
    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Cancellation Failed',
        text2: error.message || 'Could not cancel registration',
      })
    },
  })

  // Use fetched event data if available, otherwise use passed event
  // The fetched event will have participants data through EventWithParticipants fragment
  const event = eventData?.event || passedEvent || null

  // Extract participants from the event data (handle different data structures)
  // Only include participants with 'registered' or 'attended' status
  const participants =
    event?.participants
      ?.filter((p: any) => p.status === 'registered' || p.status === 'attended')
      ?.map((p: any) => p.user || p) || []

  useEffect(() => {
    // Calculate distance if user location is available and event has coordinates
    if (userLocation && event?.location_latitude && event?.location_longitude) {
      console.log('userLocation:', userLocation)
      const eventLocation = {
        latitude: Number(event.location_latitude),
        longitude: Number(event.location_longitude),
      }

      console.log('eventLocation:', eventLocation)

      // Only calculate if we have valid coordinates
      if (!Number.isNaN(eventLocation.latitude) && !Number.isNaN(eventLocation.longitude)) {
        const dist = calculateDistance(userLocation, eventLocation)
        setCalculatedDistance(dist)
      } else {
        console.warn('Invalid event coordinates:', {
          lat: event.location_latitude,
          lon: event.location_longitude,
        })
      }
    }
  }, [userLocation, event?.location_latitude, event?.location_longitude])

  const handleJoinEvent = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to join events', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Auth') },
      ])
      return
    }

    if (!event) return

    try {
      setActionLoading(true)
      await registerForEvent({ variables: { eventId: event.id } })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      console.error('Error joining event:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveEvent = async () => {
    Alert.alert('Leave Event', 'Are you sure you want to cancel your registration?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (!event) return

          try {
            setActionLoading(true)
            await cancelRegistration({ variables: { eventId: event.id } })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          } catch (error: any) {
            console.error('Error leaving event:', error)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  // Removed - now using timezone helpers

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return designSystem.colors.success
      case 'ongoing':
        return designSystem.colors.primary
      case 'completed':
        return designSystem.colors.textSecondary
      case 'cancelled':
        return designSystem.colors.error
      default:
        return designSystem.colors.textSecondary
    }
  }

  const getSkillLevelColor = (level?: string) => {
    switch (level) {
      case 'beginner':
        return designSystem.colors.success
      case 'intermediate':
        return designSystem.colors.accentYellow
      case 'advanced':
        return designSystem.colors.error
      default:
        return designSystem.colors.primary
    }
  }

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[designSystem.colors.dark, '#0a0a0a']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designSystem.colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[designSystem.colors.dark, '#0a0a0a']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const isOwner = event.facilitator_id === user?.privy_id
  const canEdit = isOwner || user?.role === 'admin'

  // Calculate event status based on timestamps
  const eventStatus = getEventStatus(event.start_date_time, event.end_date_time)
  const isPastEvent = isEventPast(event.end_date_time)
  const isOngoing = isEventOngoing(event.start_date_time, event.end_date_time)
  const isUpcoming = isEventUpcoming(event.start_date_time)

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await refetch()
              setRefreshing(false)
            }}
            tintColor={designSystem.colors.primary}
            colors={[designSystem.colors.primary]}
          />
        }
      >
        {/* Header with Image */}
        <View style={styles.imageContainer}>
          {event.image_url ? (
            <ImageLoader
              source={{ uri: getCoverUrl(event.image_url, 'full') }}
              style={styles.eventImage}
              placeholderColor={`${designSystem.colors.white}10`}
            />
          ) : (
            <View style={[styles.eventImage, styles.placeholderImage]}>
              <LinearGradient
                colors={['#1a1a1a', '#2a2a2a']}
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons name="musical-notes" size={60} color={`${designSystem.colors.primary}40`} />
              <Text style={styles.placeholderText}>Dance Event</Text>
            </View>
          )}

          {/* Header Actions */}
          <View
            style={[styles.headerActions, { paddingTop: top + DIMENSIONS.headerButtonPadding }]}
          >
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <View style={styles.actionButtonCircle}>
                <Ionicons name="arrow-back" size={24} color={designSystem.colors.white} />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            {/* Edit Button if owner/admin */}
            {canEdit && (
              <TouchableOpacity
                onPress={() => navigation.navigate('EditEvent', { eventId: event.id })}
              >
                <View style={styles.actionButtonCircle}>
                  <Ionicons name="pencil" size={20} color={designSystem.colors.white} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Distance Badge */}
          {calculatedDistance !== null && calculatedDistance !== undefined && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={14} color="#FFFFFF" />
              <Text style={styles.distanceText}>{formatDistance(calculatedDistance)}</Text>
            </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          {/* Title, Time Remaining and Status */}
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{event.title}</Text>
              {!isPastEvent && event.start_date_time && (
                <Text style={styles.timeRemaining}>{getTimeUntilEvent(event.start_date_time)}</Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: `${getStatusColor(eventStatus)}20`,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: getStatusColor(eventStatus),
                  },
                ]}
              >
                {eventStatus.charAt(0).toUpperCase() + eventStatus.slice(1)}
              </Text>
            </View>
          </View>

          {/* Category, Skill Level, and Dance Styles */}
          <View style={styles.tagsRow}>
            {event.category && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{event.category}</Text>
              </View>
            )}
            {event.skill_level && (
              <View
                style={[
                  styles.tag,
                  { backgroundColor: `${getSkillLevelColor(event.skill_level)}20` },
                ]}
              >
                <Text style={[styles.tagText, { color: getSkillLevelColor(event.skill_level) }]}>
                  {event.skill_level === 'all'
                    ? 'All Levels'
                    : event.skill_level.charAt(0).toUpperCase() + event.skill_level.slice(1)}
                </Text>
              </View>
            )}
            {event.is_virtual && (
              <View style={styles.virtualTag}>
                <Ionicons name="videocam" size={14} color={designSystem.colors.primary} />
                <Text style={styles.virtualTagText}>Virtual</Text>
              </View>
            )}
          </View>

          {event.dance_styles && event.dance_styles.length > 0 && (
            <View style={styles.danceStylesRow}>
              {event.dance_styles.map((style: string, index: number) => (
                <View key={index} style={styles.danceStyleTag}>
                  <Text style={styles.danceStyleText}>{style}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Date and Time with Local Timezone */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={designSystem.colors.primary} />
              <View style={styles.dateTimeInfo}>
                <Text style={styles.infoText}>
                  {formatEventTimes(event.start_date_time, event.end_date_time).date}
                </Text>
                <Text style={styles.infoSubText}>
                  {formatEventTimes(event.start_date_time, event.end_date_time).time} (
                  {getTimezone()})
                </Text>
                <Text style={styles.durationText}>
                  Duration: {formatEventTimes(event.start_date_time, event.end_date_time).duration}
                </Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons
                name={event.is_virtual ? 'videocam-outline' : 'location-outline'}
                size={20}
                color={designSystem.colors.primary}
              />
              <View style={styles.locationInfo}>
                <Text style={styles.infoText}>{event.location_name}</Text>
                {event.location_address && (
                  <Text style={styles.infoSubText}>{event.location_address}</Text>
                )}
                {event.location_city && (
                  <Text style={styles.infoSubText}>{event.location_city}</Text>
                )}
                {event.is_virtual && event.virtual_link && (
                  <TouchableOpacity>
                    <Text style={styles.linkText}>{event.virtual_link}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Facilitator */}
          {event.facilitator && (
            <View style={styles.facilitatorSection}>
              <Text style={styles.sectionTitle}>Hosted by</Text>
              <TouchableOpacity
                style={styles.facilitatorRow}
                onPress={() =>
                  navigation.navigate('UserProfile', {
                    userId: event.facilitator_id,
                    user: event.facilitator as any, // Pass full facilitator info with org details
                  })
                }
              >
                {event.facilitator.avatar_url ? (
                  <ImageLoader
                    source={{ uri: event.facilitator.avatar_url }}
                    style={styles.facilitatorAvatar}
                  />
                ) : (
                  <View style={styles.facilitatorAvatarPlaceholder}>
                    <Ionicons name="person" size={20} color={designSystem.colors.textSecondary} />
                  </View>
                )}
                <View style={styles.facilitatorInfo}>
                  <Text style={styles.facilitatorName}>
                    {event.facilitator.display_name ||
                      event.facilitator.username ||
                      event.facilitator_name}
                  </Text>
                  {event.facilitator.role === 'organizer' &&
                    event.facilitator.is_organizer_approved &&
                    event.facilitator.company_name && (
                      <Text style={styles.facilitatorOrg}>{event.facilitator.company_name}</Text>
                    )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={designSystem.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Description */}
          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {/* Requirements */}
          {event.requirements && (
            <View style={styles.requirementsSection}>
              <Text style={styles.sectionTitle}>Requirements</Text>
              <Text style={styles.requirements}>{event.requirements}</Text>
            </View>
          )}

          {/* Capacity and Price */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={20} color={designSystem.colors.primary} />
              <Text style={styles.statText}>
                {event.registration_count ?? event.current_capacity ?? participants.length ?? 0}
                {event.max_capacity ? `/${event.max_capacity}` : ''} attending
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="pricetag-outline" size={20} color={designSystem.colors.primary} />
              <Text style={styles.statText}>
                {!event.price_usd || event.price_usd === 0
                  ? 'Free'
                  : `$${event.price_usd} ${event.currency || 'USD'}`}
              </Text>
            </View>
          </View>

          {/* Participants Preview */}
          {participants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={styles.sectionTitle}>Attendees</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {participants.slice(0, 10).map((participant: Participant, index: number) => (
                  <TouchableOpacity
                    key={participant.privy_id || index}
                    style={styles.participantItem}
                    onPress={() =>
                      navigation.navigate('UserProfile', {
                        userId: participant.privy_id,
                        user: participant, // Pass full participant info
                      })
                    }
                  >
                    {participant.avatar_url ? (
                      <ImageLoader
                        source={{ uri: participant.avatar_url }}
                        style={styles.participantAvatar}
                      />
                    ) : (
                      <View style={styles.participantAvatarPlaceholder}>
                        <Ionicons
                          name="person"
                          size={16}
                          color={designSystem.colors.textSecondary}
                        />
                      </View>
                    )}
                    <Text style={styles.participantName} numberOfLines={1}>
                      {participant.display_name || participant.username || 'User'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {participants.length > 10 && (
                  <View style={styles.moreParticipants}>
                    <Text style={styles.moreParticipantsText}>+{participants.length - 10}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Button - Show based on event status */}
      <View style={styles.actionButtonContainer}>
        {/* Show join/leave button for upcoming events (including owners) */}
        {isUpcoming ? (
          <>
            {isOwner && (
              <View style={styles.ownerInfoContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={designSystem.colors.primary}
                />
                <Text style={styles.ownerInfoText}>You are hosting this event</Text>
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.actionButton,
                event.is_registered && styles.leaveButton,
                actionLoading && styles.disabledButton,
              ]}
              onPress={event.is_registered ? handleLeaveEvent : handleJoinEvent}
              disabled={actionLoading}
            >
              <LinearGradient
                colors={
                  event.is_registered ? ['#666', '#444'] : designSystem.colors.gradients.primary
                }
                style={styles.actionButtonGradient}
              >
                {actionLoading ? (
                  <ActivityIndicator color={designSystem.colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name={event.is_registered ? 'exit-outline' : 'add-circle-outline'}
                      size={24}
                      color={designSystem.colors.white}
                    />
                    <Text style={styles.actionButtonText}>
                      {event.is_registered ? 'Leave Event' : 'Join Event'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : isOngoing ? (
          /* Show ongoing status */
          <View style={styles.statusInfoContainer}>
            <Ionicons name="time-outline" size={24} color={designSystem.colors.primary} />
            <Text style={styles.statusInfoText}>Event is currently ongoing</Text>
          </View>
        ) : isPastEvent ? (
          /* Show ended status */
          <View style={styles.statusInfoContainer}>
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              color={designSystem.colors.textSecondary}
            />
            <Text style={styles.statusInfoText}>Event has ended</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.dark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: verticalScale(150), // Increased to prevent content hiding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  errorText: {
    fontSize: moderateScale(18),
    color: designSystem.colors.textSecondary,
    marginBottom: verticalScale(20),
  },
  backButton: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    backgroundColor: `${designSystem.colors.primary}30`,
    borderRadius: moderateScale(20),
  },
  backButtonText: {
    fontSize: moderateScale(16),
    color: designSystem.colors.primary,
    fontWeight: '600',
  },
  imageContainer: {
    height: verticalScale(DIMENSIONS.coverImageHeight),
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: `${designSystem.colors.white}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: scale(20),
    zIndex: 10,
  },
  actionButtonCircle: {
    width: scale(DIMENSIONS.headerButtonSize),
    height: scale(DIMENSIONS.headerButtonSize),
    borderRadius: scale(DIMENSIONS.headerButtonSize / 2),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: scale(20),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  titleContainer: {
    flex: 1,
    marginRight: scale(12),
  },
  timeRemaining: {
    fontSize: moderateScale(14),
    color: designSystem.colors.primary,
    fontWeight: '500',
    marginTop: verticalScale(4),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: designSystem.colors.white,
  },
  statusBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  statusText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  tag: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: `${designSystem.colors.white}10`,
    borderRadius: moderateScale(12),
  },
  tagText: {
    fontSize: moderateScale(12),
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  virtualTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: `${designSystem.colors.primary}20`,
    borderRadius: moderateScale(12),
    gap: scale(4),
  },
  virtualTagText: {
    fontSize: moderateScale(12),
    color: designSystem.colors.primary,
    fontWeight: '500',
  },
  danceStylesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginBottom: verticalScale(16),
  },
  danceStyleTag: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    backgroundColor: `${designSystem.colors.accent}20`,
    borderRadius: moderateScale(10),
  },
  danceStyleText: {
    fontSize: moderateScale(11),
    color: designSystem.colors.accent,
    fontWeight: '500',
  },
  infoSection: {
    marginVertical: verticalScale(16),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
    gap: scale(12),
  },
  locationInfo: {
    flex: 1,
  },
  dateTimeInfo: {
    flex: 1,
  },
  infoText: {
    fontSize: moderateScale(15),
    color: designSystem.colors.white,
    flex: 1,
  },
  infoSubText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    marginTop: verticalScale(2),
  },
  linkText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.primary,
    marginTop: verticalScale(4),
    textDecorationLine: 'underline',
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: designSystem.colors.white,
    marginBottom: verticalScale(12),
  },
  facilitatorSection: {
    marginVertical: verticalScale(20),
  },
  facilitatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${designSystem.colors.white}05`,
    padding: scale(12),
    borderRadius: moderateScale(12),
  },
  facilitatorAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
  },
  facilitatorAvatarPlaceholder: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: `${designSystem.colors.white}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilitatorInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  facilitatorName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  facilitatorOrg: {
    fontSize: moderateScale(13),
    color: designSystem.colors.primary,
    marginTop: verticalScale(2),
  },
  facilitatorBio: {
    fontSize: moderateScale(13),
    color: designSystem.colors.textSecondary,
    marginTop: verticalScale(2),
  },
  descriptionSection: {
    marginVertical: verticalScale(20),
  },
  description: {
    fontSize: moderateScale(15),
    color: designSystem.colors.text,
    lineHeight: moderateScale(22),
  },
  requirementsSection: {
    marginVertical: verticalScale(20),
    padding: scale(16),
    backgroundColor: `${designSystem.colors.accentYellow}10`,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: `${designSystem.colors.accentYellow}30`,
  },
  requirements: {
    fontSize: moderateScale(14),
    color: designSystem.colors.text,
    lineHeight: moderateScale(20),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: verticalScale(20),
    paddingVertical: verticalScale(16),
    backgroundColor: `${designSystem.colors.white}05`,
    borderRadius: moderateScale(12),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  statText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.white,
    fontWeight: '500',
  },
  participantsSection: {
    marginVertical: verticalScale(20),
  },
  participantItem: {
    alignItems: 'center',
    marginRight: scale(16),
    width: scale(60),
  },
  participantAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    marginBottom: verticalScale(4),
  },
  participantAvatarPlaceholder: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: `${designSystem.colors.white}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  participantName: {
    fontSize: moderateScale(11),
    color: designSystem.colors.textSecondary,
    textAlign: 'center',
  },
  moreParticipants: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: `${designSystem.colors.white}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreParticipantsText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    fontWeight: '600',
  },
  actionButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(16),
    paddingBottom: verticalScale(30),
    backgroundColor: designSystem.colors.dark,
    borderTopWidth: 1,
    borderTopColor: `${designSystem.colors.white}10`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButton: {
    borderRadius: moderateScale(24),
    overflow: 'hidden',
  },
  leaveButton: {
    // Style for leave button if needed
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    paddingVertical: verticalScale(14), // Reduced padding
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  actionButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  statusInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    gap: scale(12),
  },
  statusInfoText: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: designSystem.colors.textSecondary,
  },
  ownerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8), // Reduced padding
    gap: scale(6),
    marginBottom: verticalScale(8), // Reduced margin
  },
  ownerInfoText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: designSystem.colors.primary,
  },
  placeholderText: {
    fontSize: moderateScale(16),
    color: designSystem.colors.textSecondary,
    marginTop: verticalScale(10),
    fontWeight: '500',
  },
  durationText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.primary,
    marginTop: verticalScale(4),
    fontWeight: '500',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: verticalScale(12),
    left: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    gap: scale(4),
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
})
