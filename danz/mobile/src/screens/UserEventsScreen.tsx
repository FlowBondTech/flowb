import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type React from 'react'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EventCard } from '../components/events/EventCard'
import { useTheme } from '../contexts/ThemeContext'
import { useGetMyRegisteredEventsQuery } from '../generated/graphql'
import type { RootStackNavigationProp } from '../types/navigation'
import { LinearGradientCompat as LinearGradient } from '../utils/platformUtils'

// Filter button component
const FilterButton: React.FC<{
  value: 'all' | 'upcoming' | 'past'
  label: string
  filter: 'all' | 'upcoming' | 'past'
  theme: any
  onPress: () => void
}> = ({ value, label, filter, theme, onPress }) => (
  <TouchableOpacity
    style={[styles.filterButton, filter === value && { backgroundColor: theme.colors.primary }]}
    onPress={onPress}
  >
    <Text
      style={[styles.filterButtonText, { color: filter === value ? '#FFFFFF' : theme.colors.text }]}
    >
      {label}
    </Text>
  </TouchableOpacity>
)

export const UserEventsScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'UserEvents'>>()
  const { theme } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  // Fetch user's events
  const { data, loading: isLoading, refetch } = useGetMyRegisteredEventsQuery()

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleEventPress = useCallback(
    (eventId: string, event?: any) => {
      navigation.navigate('EventDetails', { eventId, event })
    },
    [navigation],
  )

  const handleBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  // Filter events based on selected filter
  const filteredEvents = data?.events?.events?.filter(event => {
    if (filter === 'all') return true
    const now = new Date()
    const eventEnd = new Date(event.end_date_time)
    if (filter === 'upcoming') return eventEnd >= now
    if (filter === 'past') return eventEnd < now
    return true
  })

  const renderEventItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.eventCardWrapper}>
        <EventCard
          event={item}
          onPress={() => handleEventPress(item.id, item)}
          isAttending={true}
        />
      </View>
    ),
    [handleEventPress],
  )

  if (isLoading && !refreshing) {
    return (
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading your events...
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Events</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterContainer, { borderBottomColor: theme.colors.border }]}>
          <FilterButton
            value="all"
            label="All"
            filter={filter}
            theme={theme}
            onPress={() => setFilter('all')}
          />
          <FilterButton
            value="upcoming"
            label="Upcoming"
            filter={filter}
            theme={theme}
            onPress={() => setFilter('upcoming')}
          />
          <FilterButton
            value="past"
            label="Past"
            filter={filter}
            theme={theme}
            onPress={() => setFilter('past')}
          />
        </View>

        {/* Events List */}
        <FlatList
          data={filteredEvents || []}
          renderItem={renderEventItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {filter === 'upcoming'
                  ? 'No Upcoming Events'
                  : filter === 'past'
                    ? 'No Past Events'
                    : 'No Events Yet'}
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {filter === 'upcoming'
                  ? "You haven't registered for any upcoming events"
                  : filter === 'past'
                    ? "You haven't attended any events yet"
                    : 'Join an event to see it here'}
              </Text>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('TabNavigator')}
              >
                <Text style={styles.browseButtonText}>Browse Events</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  eventCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
