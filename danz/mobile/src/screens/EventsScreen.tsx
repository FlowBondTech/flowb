import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import { EventCard } from '../components/events/EventCard'
import { EventEmptyState } from '../components/events/EventEmptyState'
import { EventsHeader } from '../components/events/EventsHeader'
import { EventTabs, type EventTabType } from '../components/events/EventTabs'
import { useAuth } from '../contexts/AuthContext'
import {
  EventSortBy,
  EventStatus,
  type Event as EventType,
  useGetEventsQuery,
} from '../generated/graphql'
import { designSystem } from '../styles/designSystem'
import { verticalScale } from '../styles/responsive'

export const EventsScreen = () => {
  const navigation = useNavigation<any>()
  const { user } = useAuth()

  // State
  const [selectedTab, setSelectedTab] = useState<EventTabType>('upcoming')
  const [refreshing, setRefreshing] = useState(false)

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current
  const scrollY = useRef(new Animated.Value(0)).current

  // Check if user can create events (manager, admin, or approved organizer)
  const canCreateEvents =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    (user?.role === 'organizer' && user?.is_organizer_approved === true)

  // Use GraphQL hooks
  const {
    data: eventsData,
    loading: eventsLoading,
    refetch: refetchEvents,
  } = useGetEventsQuery({
    variables: {
      filter: {
        status: EventStatus.Upcoming, // Backend now returns all events that haven't ended (upcoming + ongoing)
      },
      sortBy: EventSortBy.DateAsc,
    },
  })
  const {
    data: userEventsData,
    loading: userEventsLoading,
    refetch: refetchUserEvents,
  } = useGetEventsQuery({
    skip: !user,
    variables: {
      filter: {
        registered_by_me: true,
      },
      sortBy: EventSortBy.DateDesc,
    },
  })
  const {
    data: pastEventsData,
    loading: pastEventsLoading,
    refetch: refetchPastEvents,
  } = useGetEventsQuery({
    variables: {
      filter: {
        status: EventStatus.Past,
      },
      sortBy: EventSortBy.DateDesc,
    },
  })
  const {
    data: createdEventsData,
    loading: createdEventsLoading,
    refetch: refetchCreatedEvents,
  } = useGetEventsQuery({
    skip: !user || !canCreateEvents, // Only run for users who can create events
    variables: {
      filter: {
        created_by_me: true,
      },
      sortBy: EventSortBy.DateDesc,
    },
  })

  // Extract data from queries - backend already filters for upcoming + ongoing
  const events = eventsData?.events?.events || []
  const joinedEvents = userEventsData?.events?.events || []
  const pastEvents = pastEventsData?.events?.events || []
  const createdEvents = createdEventsData?.events?.events || []

  // Combine loading states
  const loading = eventsLoading || userEventsLoading || pastEventsLoading || createdEventsLoading

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      refetchEvents(),
      refetchUserEvents(),
      refetchPastEvents(),
      refetchCreatedEvents(),
    ])
    setRefreshing(false)
  }

  const handleCreateEvent = () => {
    navigation.navigate('CreateEvent')
  }

  const handleEventPress = (event: EventType) => {
    // Pass both eventId and full event data
    navigation.navigate('EventDetails', { eventId: event.id, eventData: event })
  }

  const switchTab = (tab: EventTabType) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()

    setSelectedTab(tab)
  }

  const renderEventCard = ({ item }: { item: EventType }) => (
    <EventCard
      event={item}
      onPress={() => handleEventPress(item)}
      isAttending={item.is_registered || false}
    />
  )

  const currentEvents =
    selectedTab === 'joined'
      ? joinedEvents
      : selectedTab === 'past'
        ? pastEvents
        : selectedTab === 'created'
          ? createdEvents
          : events

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[designSystem.colors.dark, '#0a0a0a']}
        style={StyleSheet.absoluteFillObject}
      />

      <EventsHeader canCreateEvents={!!canCreateEvents} onCreatePress={handleCreateEvent} />

      <EventTabs
        selectedTab={selectedTab}
        onTabChange={switchTab}
        showCreatedTab={canCreateEvents}
      />

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designSystem.colors.primary} />
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {currentEvents.length === 0 ? (
            <EventEmptyState tabType={selectedTab} />
          ) : (
            <FlatList
              data={currentEvents}
              renderItem={renderEventCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={designSystem.colors.primary}
                />
              }
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: false,
              })}
              scrollEventThrottle={16}
            />
          )}
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: verticalScale(100),
    gap: verticalScale(12),
  },
})
