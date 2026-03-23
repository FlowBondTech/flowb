import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  useMyAchievementsQuery,
  useClaimAchievementRewardMutation,
  useGetUserTransactionsQuery,
  TransactionStatus,
} from '@/generated/graphql'

type TabType = 'tokens' | 'nfts' | 'history'

export const ClaimRewardsScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { user } = useAuth()
  const { theme } = useTheme()
  const c = theme.colors

  const [activeTab, setActiveTab] = useState<TabType>('tokens')
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successDetails, setSuccessDetails] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Real GraphQL queries
  const {
    data: achievementsData,
    loading: achievementsLoading,
    refetch: refetchAchievements,
  } = useMyAchievementsQuery()

  const [claimReward] = useClaimAchievementRewardMutation()

  const {
    data: txData,
    loading: txLoading,
    refetch: refetchTransactions,
  } = useGetUserTransactionsQuery({
    variables: {
      user_id: user?.privy_id || '',
      limit: 20,
      status: TransactionStatus.Completed,
    },
    skip: !user?.privy_id,
  })

  // Derived data from real queries
  const claimableAchievements = useMemo(
    () =>
      (achievementsData?.myAchievements ?? []).filter(
        a => a.is_unlocked && a.danz_reward > 0,
      ),
    [achievementsData],
  )

  const transactions = useMemo(
    () => txData?.getUserTransactions?.transactions ?? [],
    [txData],
  )

  const totalClaimableAmount = useMemo(
    () => claimableAchievements.reduce((sum, a) => sum + a.danz_reward, 0),
    [claimableAchievements],
  )

  const totalClaimedAmount = useMemo(
    () => transactions.reduce((sum, t) => sum + t.points_amount, 0),
    [transactions],
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetchAchievements(), refetchTransactions()])
    setRefreshing(false)
  }, [refetchAchievements, refetchTransactions])

  const handleClaim = async (achievementType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setClaimingId(achievementType)
    try {
      const result = await claimReward({
        variables: { achievementType },
      })
      if (result.data?.claimAchievementReward) {
        const claimed = result.data.claimAchievementReward
        setSuccessDetails({
          title: claimed.title,
          amount: claimed.danz_reward,
          tokenSymbol: '$DANZ',
          itemType: 'token',
        })
        setShowSuccessModal(true)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        refetchAchievements()
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Claim Failed',
        text2: err.message || 'Could not claim reward',
      })
    } finally {
      setClaimingId(null)
    }
  }

  const handleClaimAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setClaimingId('all')
    let totalClaimed = 0
    try {
      for (const achievement of claimableAchievements) {
        try {
          await claimReward({
            variables: { achievementType: achievement.achievement_type },
          })
          totalClaimed += achievement.danz_reward
        } catch {
          /* skip already claimed */
        }
      }
      if (totalClaimed > 0) {
        setSuccessDetails({
          title: 'All Rewards Claimed',
          amount: totalClaimed,
          tokenSymbol: '$DANZ',
          itemType: 'token',
        })
        setShowSuccessModal(true)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      refetchAchievements()
    } finally {
      setClaimingId(null)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SESSIONS':
        return <Ionicons name="calendar" size={20} color="white" />
      case 'SOCIAL':
        return <Ionicons name="person-add" size={20} color="white" />
      case 'MILESTONE':
        return <Ionicons name="trophy" size={20} color="white" />
      case 'STREAK':
        return <Ionicons name="flame" size={20} color="white" />
      case 'MOVEMENT':
        return <Ionicons name="body" size={20} color="white" />
      case 'DURATION':
        return <Ionicons name="time" size={20} color="white" />
      default:
        return <Ionicons name="gift" size={20} color="white" />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY':
        return '#F59E0B'
      case 'EPIC':
        return '#A855F7'
      case 'RARE':
        return '#3B82F6'
      case 'UNCOMMON':
        return '#10B981'
      default:
        return '#6B7280'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SESSIONS':
        return '#3B82F6'
      case 'SOCIAL':
        return '#10B981'
      case 'MILESTONE':
        return '#F59E0B'
      case 'STREAK':
        return '#EF4444'
      case 'MOVEMENT':
        return '#8B5CF6'
      case 'DURATION':
        return '#06B6D4'
      default:
        return c.primary
    }
  }

  const renderTab = (tab: TabType, label: string, count?: number) => (
    <TouchableOpacity
      style={[
        styles.tab,
        { backgroundColor: c.glassCard, borderColor: c.glassBorder },
        activeTab === tab && { backgroundColor: c.primary, borderColor: c.primary },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setActiveTab(tab)
      }}
    >
      <Text
        style={[
          styles.tabText,
          { color: c.textSecondary },
          activeTab === tab && styles.activeTabText,
        ]}
      >
        {label} {count !== undefined && `(${count})`}
      </Text>
    </TouchableOpacity>
  )

  type AchievementItem = (typeof claimableAchievements)[number]

  const renderTokenItem = ({ item }: { item: AchievementItem }) => {
    const categoryColor = getCategoryColor(item.category)
    const rarityColor = getRarityColor(item.rarity)
    const isClaiming =
      claimingId === item.achievement_type || claimingId === 'all'

    return (
      <View
        style={[
          styles.rewardCard,
          { backgroundColor: c.glassCard, borderColor: c.glassBorder },
        ]}
      >
        <View style={styles.rewardCardContent}>
          <View
            style={[
              styles.typeIconContainer,
              { backgroundColor: categoryColor },
            ]}
          >
            {getCategoryIcon(item.category)}
          </View>
          <View style={styles.rewardInfo}>
            <Text style={[styles.rewardTitle, { color: c.text }]}>
              {item.title}
            </Text>
            <Text
              style={[styles.rewardDescription, { color: c.textSecondary }]}
            >
              {item.description}
            </Text>
            <View style={styles.rewardMeta}>
              <View
                style={[styles.rarityBadgeSmall, { backgroundColor: rarityColor }]}
              >
                <Text style={styles.rarityTextSmall}>
                  {item.rarity}
                </Text>
              </View>
              {item.unlocked_at && (
                <Text style={[styles.rewardMetaText, { color: c.textSecondary }]}>
                  Unlocked{' '}
                  {new Date(item.unlocked_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.rewardAmountContainer}>
            <Text style={[styles.rewardAmount, { color: c.primary }]}>
              {item.danz_reward}
            </Text>
            <Text style={[styles.tokenSymbol, { color: c.textSecondary }]}>
              $DANZ
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.claimButton,
            { backgroundColor: c.primary },
            isClaiming && styles.claimButtonDisabled,
          ]}
          onPress={() => handleClaim(item.achievement_type)}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.claimButtonText}>Claim</Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  type TransactionItem = (typeof transactions)[number]

  const renderHistoryItem = ({ item }: { item: TransactionItem }) => (
    <View
      style={[
        styles.historyCard,
        { backgroundColor: c.glassCard, borderColor: c.glassBorder },
      ]}
    >
      <View
        style={[
          styles.historyIconContainer,
          { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
        ]}
      >
        <Ionicons name="checkmark-circle" size={24} color={c.success} />
      </View>
      <View style={styles.historyInfo}>
        <Text style={[styles.historyTitle, { color: c.text }]}>
          {item.action?.action_name ?? item.action_key}
        </Text>
        <View style={styles.historyMeta}>
          <Text style={[styles.historyMetaText, { color: c.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {item.action?.description && (
            <Text
              style={[styles.historyMetaText, { color: c.textSecondary }]}
              numberOfLines={1}
            >
              {item.action.description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.historyAmount}>
        <Text style={styles.historyAmountText}>+{item.points_amount}</Text>
        <Text style={[styles.historyTokenSymbol, { color: c.textSecondary }]}>
          $DANZ
        </Text>
      </View>
    </View>
  )

  const renderEmptyState = (type: TabType) => {
    const configs = {
      tokens: {
        icon: 'flash' as const,
        title: 'No Tokens to Claim',
        description:
          'Complete achievements and dance sessions to earn $DANZ tokens!',
      },
      nfts: {
        icon: 'trophy' as const,
        title: 'NFTs Coming Soon',
        description: 'NFT rewards are not yet available. Stay tuned!',
      },
      history: {
        icon: 'time' as const,
        title: 'No Claim History',
        description: 'Your claimed rewards will appear here.',
      },
    }
    const config = configs[type]

    return (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIconContainer,
            { backgroundColor: `${c.primary}20` },
          ]}
        >
          <Ionicons name={config.icon} size={40} color={c.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: c.text }]}>
          {config.title}
        </Text>
        <Text style={[styles.emptyDescription, { color: c.textSecondary }]}>
          {config.description}
        </Text>
      </View>
    )
  }

  const isLoading = achievementsLoading && !refreshing

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: c.glassCard }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>
            Claim Rewards
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: c.glassCard }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>
          Claim Rewards
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
          />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: `${c.primary}18`,
                borderColor: `${c.primary}50`,
              },
            ]}
          >
            <View style={styles.summaryIconRow}>
              <Ionicons name="flash" size={20} color={c.primary} />
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>
                Claimable Tokens
              </Text>
            </View>
            <Text style={[styles.summaryValue, { color: c.text }]}>
              {totalClaimableAmount}{' '}
              <Text style={[styles.summarySymbol, { color: c.primary }]}>
                $DANZ
              </Text>
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View
              style={[
                styles.summaryCardSmall,
                { backgroundColor: c.glassCard, borderColor: c.glassBorder },
              ]}
            >
              <View style={styles.summaryIconRow}>
                <Ionicons name="trophy" size={16} color="#EC4899" />
                <Text
                  style={[styles.summaryLabelSmall, { color: c.textSecondary }]}
                >
                  Unlocked
                </Text>
              </View>
              <Text style={[styles.summaryValueSmall, { color: c.text }]}>
                {claimableAchievements.length}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCardSmall,
                { backgroundColor: c.glassCard, borderColor: c.glassBorder },
              ]}
            >
              <View style={styles.summaryIconRow}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text
                  style={[styles.summaryLabelSmall, { color: c.textSecondary }]}
                >
                  Claimed
                </Text>
              </View>
              <Text style={[styles.summaryValueSmall, { color: c.text }]}>
                {totalClaimedAmount}
              </Text>
            </View>
          </View>
        </View>

        {/* Claim All Button */}
        {claimableAchievements.length > 1 && activeTab === 'tokens' && (
          <TouchableOpacity
            style={[
              styles.claimAllButton,
              { backgroundColor: c.primary },
              claimingId !== null && styles.claimButtonDisabled,
            ]}
            onPress={handleClaimAll}
            disabled={claimingId !== null}
          >
            {claimingId === 'all' ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.claimAllButtonText}>Claiming All...</Text>
              </>
            ) : (
              <>
                <Ionicons name="flash" size={20} color="white" />
                <Text style={styles.claimAllButtonText}>
                  Claim All ({totalClaimableAmount} $DANZ)
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {renderTab('tokens', 'Tokens', claimableAchievements.length)}
          {renderTab('nfts', 'NFTs', 0)}
          {renderTab('history', 'History')}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'tokens' &&
            (claimableAchievements.length > 0 ? (
              <FlatList
                data={claimableAchievements}
                renderItem={renderTokenItem}
                keyExtractor={item => item.achievement_type}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              />
            ) : (
              renderEmptyState('tokens')
            ))}

          {activeTab === 'nfts' && renderEmptyState('nfts')}

          {activeTab === 'history' &&
            (transactions.length > 0 ? (
              <FlatList
                data={transactions}
                renderItem={renderHistoryItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                ListFooterComponent={
                  txLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={c.primary}
                      style={{ marginTop: 16 }}
                    />
                  ) : null
                }
              />
            ) : (
              renderEmptyState('history')
            ))}
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: c.glassOverlay }]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: c.surface,
                borderColor: `${c.primary}50`,
              },
            ]}
          >
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color={c.success} />
            </View>
            <Text style={[styles.successTitle, { color: c.text }]}>
              Successfully Claimed!
            </Text>
            {successDetails && (
              <>
                <View style={styles.successAmountContainer}>
                  <Text style={[styles.successAmount, { color: c.primary }]}>
                    {successDetails.amount}
                  </Text>
                  <Text style={[styles.successSymbol, { color: c.text }]}>
                    {successDetails.tokenSymbol}
                  </Text>
                </View>
                <Text
                  style={[styles.successSubtitle, { color: c.textSecondary }]}
                >
                  {successDetails.title}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: c.primary }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    padding: 20,
    gap: 12,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCardSmall: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryLabelSmall: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  summaryValueSmall: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summarySymbol: {
    fontSize: 16,
  },
  claimAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  claimAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  rewardCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  rewardCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  rewardDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  rewardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardMetaText: {
    fontSize: 12,
  },
  rarityBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityTextSmall: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
  },
  rewardAmountContainer: {
    alignItems: 'flex-end',
  },
  rewardAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tokenSymbol: {
    fontSize: 12,
  },
  claimButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.5,
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  historyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyMeta: {
    gap: 2,
  },
  historyMetaText: {
    fontSize: 12,
  },
  historyAmount: {
    alignItems: 'flex-end',
  },
  historyAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  historyTokenSymbol: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  successAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  successSymbol: {
    fontSize: 16,
    marginLeft: 8,
  },
  successSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  doneButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})
