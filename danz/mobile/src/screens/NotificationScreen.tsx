import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { NotificationItem, type NotificationItemProps } from '../components/NotificationItem'
import { useTheme } from '../contexts/ThemeContext'
import {
  NotificationType as GqlNotificationType,
  useGetMyNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useDeleteNotificationMutation,
} from '../generated/graphql'
import { designSystem } from '../styles/designSystem'
import type { RootStackNavigationProp } from '../types/navigation'

type LocalNotificationType = NotificationItemProps['type']

// Map GraphQL notification types to local component types
const mapNotificationType = (gqlType: GqlNotificationType): LocalNotificationType => {
  switch (gqlType) {
    case GqlNotificationType.Achievement:
      return 'reward'
    case GqlNotificationType.AdminBroadcast:
      return 'system'
    case GqlNotificationType.DanceBond:
      return 'social'
    case GqlNotificationType.EventManagerBroadcast:
      return 'system'
    case GqlNotificationType.EventReminder:
      return 'event'
    case GqlNotificationType.EventUpdate:
      return 'event'
    case GqlNotificationType.PostComment:
      return 'social'
    case GqlNotificationType.PostLike:
      return 'social'
    case GqlNotificationType.Referral:
      return 'reward'
    case GqlNotificationType.System:
      return 'system'
    default:
      return 'system'
  }
}

// Map local filter types to GraphQL types
const mapFilterToGqlType = (filter: 'all' | LocalNotificationType): GqlNotificationType | undefined => {
  if (filter === 'all') return undefined
  switch (filter) {
    case 'dance':
      // Dance type doesn't have a direct mapping - use undefined to show all
      return undefined
    case 'event':
      return GqlNotificationType.EventUpdate
    case 'challenge':
      // Challenge doesn't have a direct mapping
      return undefined
    case 'social':
      return GqlNotificationType.DanceBond
    case 'reward':
      return GqlNotificationType.Achievement
    case 'system':
      return GqlNotificationType.System
    default:
      return undefined
  }
}

export const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Notifications'>>()
  const { theme } = useTheme()

  const [selectedFilter, setSelectedFilter] = useState<'all' | LocalNotificationType>('all')
  const [refreshing, setRefreshing] = useState(false)

  // GraphQL queries and mutations
  const {
    data,
    loading,
    error,
    refetch,
  } = useGetMyNotificationsQuery({
    variables: {
      limit: 50,
      offset: 0,
      type: mapFilterToGqlType(selectedFilter),
    },
    fetchPolicy: 'cache-and-network',
  })

  const [markNotificationRead] = useMarkNotificationReadMutation()
  const [markAllNotificationsRead] = useMarkAllNotificationsReadMutation()
  const [deleteNotification] = useDeleteNotificationMutation()

  // Transform GraphQL notifications to component format
  const notifications = useMemo(() => {
    if (!data?.myNotifications?.notifications) return []

    return data.myNotifications.notifications.map(notification => ({
      id: notification.id,
      type: mapNotificationType(notification.type),
      title: notification.title,
      message: notification.message,
      timestamp: new Date(notification.created_at),
      read: notification.read,
      // Map action data for navigation
      actionData: {
        action_type: notification.action_type,
        event_id: notification.event_id,
        post_id: notification.post_id,
        achievement_id: notification.achievement_id,
        bond_id: notification.bond_id,
      },
      sender: notification.sender,
    }))
  }, [data])

  const unreadCount = data?.myNotifications?.unread_count || 0

  // Filter notifications locally for types that don't have direct GraphQL mapping
  const filteredNotifications = useMemo(() => {
    if (selectedFilter === 'all') return notifications

    // For types with direct mapping, the query already filters
    if (['event', 'social', 'reward', 'system'].includes(selectedFilter)) {
      return notifications
    }

    // For dance and challenge, filter locally
    return notifications.filter(n => n.type === selectedFilter)
  }, [notifications, selectedFilter])

  const handleNotificationPress = useCallback(
    async (notification: typeof notifications[0]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      // Mark as read if not already
      if (!notification.read) {
        try {
          await markNotificationRead({
            variables: { id: notification.id },
            optimisticResponse: {
              markNotificationRead: {
                __typename: 'Notification',
                id: notification.id,
                read: true,
                read_at: new Date().toISOString(),
              },
            },
          })
        } catch (err) {
          console.error('Failed to mark notification as read:', err)
        }
      }

      // Navigate based on type
      switch (notification.type) {
        case 'event':
        case 'challenge':
        case 'social':
        case 'dance':
          navigation.navigate('TabNavigator')
          break
        case 'reward':
          navigation.navigate('Wallet')
          break
        default:
          Alert.alert(notification.title, notification.message)
      }
    },
    [navigation, markNotificationRead],
  )

  const handleMarkAsRead = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await markNotificationRead({
        variables: { id },
        optimisticResponse: {
          markNotificationRead: {
            __typename: 'Notification',
            id,
            read: true,
            read_at: new Date().toISOString(),
          },
        },
      })
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [markNotificationRead])

  const handleMarkAllAsRead = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await markAllNotificationsRead({
        refetchQueries: ['GetMyNotifications'],
      })
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [markAllNotificationsRead])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } catch (err) {
      console.error('Failed to refresh notifications:', err)
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const handleClearAll = useCallback(() => {
    Alert.alert('Clear All Notifications', 'Are you sure you want to clear all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          // Delete all notifications one by one (backend doesn't have bulk delete)
          try {
            for (const notification of notifications) {
              await deleteNotification({
                variables: { id: notification.id },
              })
            }
            await refetch()
          } catch (err) {
            console.error('Failed to clear notifications:', err)
          }
        },
      },
    ])
  }, [notifications, deleteNotification, refetch])

  const filters: Array<{ key: 'all' | LocalNotificationType; label: string; icon?: string }> = [
    { key: 'all', label: 'All' },
    { key: 'dance', label: 'Dance', icon: '💃' },
    { key: 'event', label: 'Events', icon: '📅' },
    { key: 'challenge', label: 'Challenges', icon: '🏆' },
    { key: 'social', label: 'Social', icon: '👥' },
    { key: 'reward', label: 'Rewards', icon: '🎁' },
  ]

  // Loading state
  if (loading && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.surface]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading notifications...
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.surface]}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
            </View>
            <View style={styles.menuButton} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
              Failed to load notifications
            </Text>
            <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]}>
              {error.message}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              Alert.alert('Notification Options', '', [
                { text: 'Mark All as Read', onPress: handleMarkAllAsRead },
                { text: 'Clear All', onPress: handleClearAll, style: 'destructive' },
                { text: 'Cancel', style: 'cancel' },
              ])
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, selectedFilter === filter.key && styles.filterChipActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setSelectedFilter(filter.key)
              }}
            >
              {filter.icon && <Text style={styles.filterIcon}>{filter.icon}</Text>}
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter.key && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Notifications List */}
        <ScrollView
          style={styles.notificationsList}
          contentContainerStyle={styles.notificationsContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={designSystem.colors.primary}
            />
          }
        >
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-off-outline"
                size={64}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No notifications
              </Text>
              <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
                {selectedFilter === 'all'
                  ? "You're all caught up!"
                  : `No ${selectedFilter} notifications`}
              </Text>
            </View>
          ) : (
            <>
              {unreadCount > 0 && selectedFilter === 'all' && (
                <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
                  <Text style={styles.markAllText}>Mark all as read</Text>
                </TouchableOpacity>
              )}

              {filteredNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  id={notification.id}
                  type={notification.type}
                  title={notification.title}
                  message={notification.message}
                  timestamp={notification.timestamp}
                  read={notification.read}
                  onPress={() => handleNotificationPress(notification)}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: designSystem.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: `${designSystem.colors.primary}20`,
    borderWidth: 1,
    borderColor: designSystem.colors.primary,
  },
  filterIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: designSystem.colors.primary,
    fontWeight: '600',
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    paddingBottom: 100,
  },
  markAllButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 8,
  },
  markAllText: {
    color: designSystem.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: designSystem.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
