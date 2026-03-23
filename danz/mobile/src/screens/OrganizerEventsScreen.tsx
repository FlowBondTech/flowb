import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
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
import { useGetOrganizerEventsQuery } from '../generated/graphql'
import type { RootStackNavigationProp, RootStackRouteProp } from '../types/navigation'
import { LinearGradientCompat as LinearGradient } from '../utils/platformUtils'

export const OrganizerEventsScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'OrganizerEvents'>>()
  const route = useRoute<RootStackRouteProp<'OrganizerEvents'>>()
  const { theme } = useTheme()
  const [refreshing, setRefreshing] = useState(false)

  const { organizerId, organizerName } = route.params

  // Fetch events by organizer
  const {
    data,
    loading: isLoading,
    refetch,
  } = useGetOrganizerEventsQuery({
    variables: { organizerId },
    skip: !organizerId,
    fetchPolicy: 'cache-first', // Use cached data if available
    nextFetchPolicy: 'cache-first', // Keep using cache after first fetch
  })

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

  const renderEventItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.eventCardWrapper}>
        <EventCard event={item} onPress={() => handleEventPress(item.id, item)} />
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading events...
          </Text>
        </View>
      </LinearGradient>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Events by {organizerName || 'Organizer'}
            </Text>
            {data?.organizer?.company_name && (
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {data.organizer.company_name}
              </Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Events List */}
        <FlatList
          data={data?.events?.events || []}
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
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Events Found</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                This organizer hasn't created any events yet
              </Text>
            </View>
          }
        />
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
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
  },
})
