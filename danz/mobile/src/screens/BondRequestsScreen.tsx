import { Feather, Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { useTheme } from '@/contexts/ThemeContext'
import {
  type GetMyPendingBondRequestsQuery,
  type GetMySentBondRequestsQuery,
  useCancelBondRequestMutation,
  useGetMyBondRequestStatsQuery,
  useGetMyPendingBondRequestsQuery,
  useGetMySentBondRequestsQuery,
  useRespondToBondRequestMutation,
} from '@/generated/graphql'
import { useHaptics } from '@/hooks/useHaptics'

type BondRequestItem = NonNullable<GetMyPendingBondRequestsQuery['myPendingBondRequests']>[0]
type SentBondRequestItem = NonNullable<GetMySentBondRequestsQuery['mySentBondRequests']>[0]

type TabType = 'received' | 'sent'

export default function BondRequestsScreen() {
  const { theme } = useTheme()
  const colors = theme.colors
  const navigation = useNavigation()
  const haptics = useHaptics()
  const [activeTab, setActiveTab] = useState<TabType>('received')
  const [refreshing, setRefreshing] = useState(false)

  // Queries
  const {
    data: receivedData,
    loading: receivedLoading,
    refetch: refetchReceived,
  } = useGetMyPendingBondRequestsQuery({
    variables: { limit: 50 },
  })

  const {
    data: sentData,
    loading: sentLoading,
    refetch: refetchSent,
  } = useGetMySentBondRequestsQuery({
    variables: { limit: 50 },
  })

  const { data: statsData, refetch: refetchStats } = useGetMyBondRequestStatsQuery()

  // Mutations
  const [respondToRequest, { loading: respondLoading }] = useRespondToBondRequestMutation()
  const [cancelRequest, { loading: cancelLoading }] = useCancelBondRequestMutation()

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchReceived(), refetchSent(), refetchStats()])
    setRefreshing(false)
  }

  const handleAccept = async (requestId: string) => {
    haptics.buttonPress()
    try {
      await respondToRequest({
        variables: { input: { request_id: requestId, accept: true } },
      })
      haptics.success()
      Toast.show({
        type: 'success',
        text1: 'Bond Accepted!',
        text2: 'You are now bonded with this dancer',
      })
      refetchReceived()
      refetchStats()
    } catch (error) {
      haptics.error()
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to accept bond request',
      })
    }
  }

  const handleReject = async (requestId: string) => {
    haptics.buttonPress()
    try {
      await respondToRequest({
        variables: { input: { request_id: requestId, accept: false } },
      })
      haptics.warning()
      Toast.show({
        type: 'info',
        text1: 'Request Declined',
      })
      refetchReceived()
      refetchStats()
    } catch (error) {
      haptics.error()
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to decline request',
      })
    }
  }

  const handleCancel = async (requestId: string) => {
    haptics.buttonPress()
    try {
      await cancelRequest({ variables: { requestId } })
      haptics.selection()
      Toast.show({
        type: 'info',
        text1: 'Request Cancelled',
      })
      refetchSent()
      refetchStats()
    } catch (error) {
      haptics.error()
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to cancel request',
      })
    }
  }

  const renderReceivedItem = ({ item }: { item: BondRequestItem }) => {
    const requester = item.requester
    const matchReasons = item.match_reasons

    return (
      <View style={[styles.requestCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() =>
            (navigation as any).navigate('UserProfile', { userId: requester?.privy_id })
          }
        >
          {requester?.avatar_url ? (
            <Image source={{ uri: requester.avatar_url }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: colors.primary + '30' },
              ]}
            >
              <Ionicons name="person" size={28} color={colors.primary} />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: colors.text }]}>
              @{requester?.username || 'unknown'}
            </Text>
            {requester?.display_name && (
              <Text style={[styles.displayName, { color: colors.textSecondary }]}>
                {requester.display_name}
              </Text>
            )}
            {item.message && (
              <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
                "{item.message}"
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {matchReasons && (
          <View style={styles.matchReasons}>
            {matchReasons.mutual_bonds > 0 && (
              <View style={[styles.matchBadge, { backgroundColor: colors.primary + '20' }]}>
                <Feather name="users" size={12} color={colors.primary} />
                <Text style={[styles.matchText, { color: colors.primary }]}>
                  {matchReasons.mutual_bonds} mutual
                </Text>
              </View>
            )}
            {matchReasons.same_events > 0 && (
              <View style={[styles.matchBadge, { backgroundColor: colors.secondary + '20' }]}>
                <Feather name="calendar" size={12} color={colors.secondary} />
                <Text style={[styles.matchText, { color: colors.secondary }]}>
                  {matchReasons.same_events} events
                </Text>
              </View>
            )}
            {matchReasons.similarity_score > 0.5 && (
              <View style={[styles.matchBadge, { backgroundColor: '#10B981' + '20' }]}>
                <Ionicons name="sparkles" size={12} color="#10B981" />
                <Text style={[styles.matchText, { color: '#10B981' }]}>
                  {Math.round(matchReasons.similarity_score * 100)}% match
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.rejectButton, { borderColor: colors.error }]}
            onPress={() => handleReject(item.id)}
            disabled={respondLoading}
          >
            <Feather name="x" size={20} color={colors.error} />
            <Text style={[styles.rejectText, { color: colors.error }]}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAccept(item.id)}
            disabled={respondLoading}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.acceptGradient}
            >
              {respondLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={20} color="#fff" />
                  <Text style={styles.acceptText}>Accept</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderSentItem = ({ item }: { item: SentBondRequestItem }) => {
    const recipient = item.recipient
    const isPending = item.status === 'pending'

    return (
      <View style={[styles.requestCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() =>
            (navigation as any).navigate('UserProfile', { userId: recipient?.privy_id })
          }
        >
          {recipient?.avatar_url ? (
            <Image source={{ uri: recipient.avatar_url }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: colors.primary + '30' },
              ]}
            >
              <Ionicons name="person" size={28} color={colors.primary} />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: colors.text }]}>
              @{recipient?.username || 'unknown'}
            </Text>
            {recipient?.display_name && (
              <Text style={[styles.displayName, { color: colors.textSecondary }]}>
                {recipient.display_name}
              </Text>
            )}
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status === 'accepted'
                        ? '#10B98120'
                        : item.status === 'rejected'
                          ? colors.error + '20'
                          : colors.primary + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        item.status === 'accepted'
                          ? '#10B981'
                          : item.status === 'rejected'
                            ? colors.error
                            : colors.primary,
                    },
                  ]}
                >
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {isPending && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.textSecondary }]}
            onPress={() => handleCancel(item.id)}
            disabled={cancelLoading}
          >
            {cancelLoading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <>
                <Feather name="x" size={16} color={colors.textSecondary} />
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const receivedRequests = receivedData?.myPendingBondRequests || []
  const sentRequests = sentData?.mySentBondRequests || []
  const stats = statsData?.myBondRequestStats

  const isLoading = activeTab === 'received' ? receivedLoading : sentLoading

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            haptics.selection()
            navigation.goBack()
          }}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Bond Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats */}
      {stats && (
        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.pending_received}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_bonds}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Bonds</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {stats.acceptance_rate ? `${Math.round(stats.acceptance_rate * 100)}%` : '--'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accept Rate</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'received' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => {
            haptics.selection()
            setActiveTab('received')
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'received' ? colors.primary : colors.textSecondary },
            ]}
          >
            Received ({receivedRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'sent' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => {
            haptics.selection()
            setActiveTab('sent')
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'sent' ? colors.primary : colors.textSecondary },
            ]}
          >
            Sent ({sentRequests.filter(r => r.status === 'pending').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'received' ? (
        <FlatList
          data={receivedRequests}
          renderItem={renderReceivedItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No pending requests</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                When someone wants to bond with you, their request will appear here
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={sentRequests}
          renderItem={renderSentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="paper-plane-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No sent requests</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Bond requests you send will appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  requestCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  displayName: {
    fontSize: 14,
    marginTop: 2,
  },
  message: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  matchReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 4,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
})
