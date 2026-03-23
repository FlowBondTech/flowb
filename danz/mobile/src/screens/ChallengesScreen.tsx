import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import Toast from 'react-native-toast-message'
import {
  ChallengeCategory,
  ChallengeDifficulty,
  ChallengeStatus,
  type GetDailyChallengesQuery,
  type GetMyChallengeStatsQuery,
  type GetMyChallengesQuery,
  useClaimChallengeRewardMutation,
  useGetDailyChallengesQuery,
  useGetMyChallengeStatsQuery,
  useGetMyChallengesQuery,
  useStartChallengeMutation,
} from '@/generated/graphql'
import { useTheme } from '../contexts/ThemeContext'
import { designSystem } from '../styles/designSystem'

// ---------------------------------------------------------------------------
// Derived types from codegen query return shapes
// ---------------------------------------------------------------------------
type DailyChallenge = GetDailyChallengesQuery['dailyChallenges']['challenges'][number]
type UserProgress = NonNullable<GetDailyChallengesQuery['dailyChallenges']['user_progress']>[number]
type ActiveUserChallenge = GetMyChallengesQuery['myActiveChallenges'][number]
type Stats = GetMyChallengeStatsQuery['myChallengeStats']

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  [ChallengeDifficulty.Easy]: '#10B981',
  [ChallengeDifficulty.Medium]: '#F59E0B',
  [ChallengeDifficulty.Hard]: '#F97316',
  [ChallengeDifficulty.Extreme]: '#EF4444',
}

const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  [ChallengeDifficulty.Easy]: 'Easy',
  [ChallengeDifficulty.Medium]: 'Medium',
  [ChallengeDifficulty.Hard]: 'Hard',
  [ChallengeDifficulty.Extreme]: 'Expert',
}

const CATEGORY_ICONS: Record<ChallengeCategory, keyof typeof Ionicons.glyphMap> = {
  [ChallengeCategory.DanceTime]: 'musical-notes',
  [ChallengeCategory.Social]: 'people',
  [ChallengeCategory.Community]: 'people',
  [ChallengeCategory.Exploration]: 'calendar',
  [ChallengeCategory.Streak]: 'flame',
  [ChallengeCategory.Mastery]: 'school',
  [ChallengeCategory.Calories]: 'fitness',
  [ChallengeCategory.MovementScore]: 'body',
}

type TabType = 'daily' | 'active' | 'completed'

// Unified item shape used by the FlatList
interface ChallengeListItem {
  challenge: DailyChallenge | ActiveUserChallenge['challenge']
  progress: UserProgress | null
  status: ChallengeStatus
  expiresAt: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return ''
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${mins}m left`
  return `${mins}m left`
}

function findProgressForChallenge(
  challengeId: string,
  userProgress: UserProgress[] | null | undefined,
): UserProgress | null {
  if (!userProgress) return null
  return userProgress.find(p => p.challenge_id === challengeId) ?? null
}

function statusFromProgress(prog: UserProgress | null): ChallengeStatus {
  if (!prog) return ChallengeStatus.Available
  return prog.status
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const ChallengesScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { theme } = useTheme()
  const c = theme.colors
  const [activeTab, setActiveTab] = useState<TabType>('daily')
  const [claimingId, setClaimingId] = useState<string | null>(null)

  // ---- GraphQL queries ----
  const {
    data: dailyData,
    loading: dailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useGetDailyChallengesQuery()

  const {
    data: myChallengesData,
    loading: myChallengesLoading,
    error: myChallengesError,
    refetch: refetchMyChallenges,
  } = useGetMyChallengesQuery()

  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useGetMyChallengeStatsQuery()

  // ---- GraphQL mutations ----
  const [startChallengeMutation] = useStartChallengeMutation()
  const [claimChallengeRewardMutation] = useClaimChallengeRewardMutation()

  // Derived loading / error state
  const loading = dailyLoading || myChallengesLoading || statsLoading
  const error = dailyError || myChallengesError || statsError

  // Stats with safe defaults
  const stats: Stats | null = statsData?.myChallengeStats ?? null

  // Refresh control
  const [refreshing, setRefreshing] = useState(false)

  // Timer ref for countdown updates
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, setTick] = useState(0)

  // Countdown timer - refresh every minute
  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 60000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetchDaily(), refetchMyChallenges(), refetchStats()])
    setRefreshing(false)
  }, [refetchDaily, refetchMyChallenges, refetchStats])

  const handleStart = useCallback(
    async (challengeId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      try {
        await startChallengeMutation({
          variables: { challengeId },
          refetchQueries: ['GetDailyChallenges', 'GetMyChallenges'],
        })
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Failed to start challenge',
          text2: err instanceof Error ? err.message : 'Please try again',
          position: 'bottom',
          visibilityTime: 2500,
        })
      }
    },
    [startChallengeMutation],
  )

  const handleClaim = useCallback(
    async (challengeId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      setClaimingId(challengeId)

      try {
        const result = await claimChallengeRewardMutation({
          variables: { challengeId },
          refetchQueries: ['GetDailyChallenges', 'GetMyChallenges', 'GetMyChallengeStats'],
        })

        const reward = result.data?.claimChallengeReward?.challenge
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Toast.show({
          type: 'success',
          text1: 'Reward Claimed!',
          text2: reward
            ? `+${reward.xp_reward} XP, +${reward.points_reward} pts added`
            : 'XP and points added to your account',
          position: 'bottom',
          visibilityTime: 2500,
        })
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Failed to claim reward',
          text2: err instanceof Error ? err.message : 'Please try again',
          position: 'bottom',
          visibilityTime: 2500,
        })
      } finally {
        setClaimingId(null)
      }
    },
    [claimChallengeRewardMutation],
  )

  // Filtered challenge list based on active tab
  const filteredItems = useMemo((): ChallengeListItem[] => {
    if (activeTab === 'daily') {
      const challenges = dailyData?.dailyChallenges?.challenges ?? []
      const userProgress = dailyData?.dailyChallenges?.user_progress ?? null
      return challenges.map(ch => {
        const prog = findProgressForChallenge(ch.id, userProgress)
        return {
          challenge: ch,
          progress: prog,
          status: statusFromProgress(prog),
          expiresAt: prog?.expires_at ?? null,
        }
      })
    }

    if (activeTab === 'active') {
      const active = myChallengesData?.myActiveChallenges ?? []
      return active
        .filter(uc => uc.status === ChallengeStatus.InProgress)
        .map(uc => ({
          challenge: uc.challenge,
          progress: {
            id: uc.id,
            challenge_id: uc.challenge_id,
            status: uc.status,
            progress: uc.progress,
            started_at: uc.started_at,
            completed_at: null,
            expires_at: uc.expires_at,
          } as UserProgress,
          status: uc.status,
          expiresAt: uc.expires_at ?? null,
        }))
    }

    // completed tab: show from daily user_progress with completed/claimed status
    const userProgress = dailyData?.dailyChallenges?.user_progress ?? []
    const challenges = dailyData?.dailyChallenges?.challenges ?? []
    return userProgress
      .filter(p => p.status === ChallengeStatus.Completed || p.status === ChallengeStatus.Claimed)
      .map(p => {
        const challenge = challenges.find(ch => ch.id === p.challenge_id)
        if (!challenge) return null
        return {
          challenge,
          progress: p,
          status: p.status,
          expiresAt: p.expires_at ?? null,
        }
      })
      .filter(Boolean) as ChallengeListItem[]
  }, [activeTab, dailyData, myChallengesData])

  // ------- Render helpers -------

  const renderStatsHeader = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: c.glassCard, borderColor: c.glassBorder, borderWidth: 1 }]}>
        <Ionicons name="checkmark-circle" size={18} color={c.success} />
        <Text style={[styles.statValue, { color: c.text }]}>{stats?.total_completed ?? 0}</Text>
        <Text style={[styles.statLabel, { color: c.textSecondary }]}>Completed</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: c.glassCard, borderColor: c.glassBorder, borderWidth: 1 }]}>
        <Ionicons name="flash" size={18} color="#F59E0B" />
        <Text style={[styles.statValue, { color: c.text }]}>{stats?.total_xp_earned ?? 0}</Text>
        <Text style={[styles.statLabel, { color: c.textSecondary }]}>XP Earned</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: c.glassCard, borderColor: c.glassBorder, borderWidth: 1 }]}>
        <Ionicons name="flame" size={18} color="#EF4444" />
        <Text style={[styles.statValue, { color: c.text }]}>{stats?.current_streak ?? 0}</Text>
        <Text style={[styles.statLabel, { color: c.textSecondary }]}>Streak</Text>
      </View>
    </View>
  )

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {(['daily', 'active', 'completed'] as TabType[]).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            { backgroundColor: c.glassCard },
            activeTab === tab && { backgroundColor: c.primary },
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
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderActionButton = (challengeId: string, status: ChallengeStatus) => {
    if (status === ChallengeStatus.Claimed) {
      return (
        <View
          style={[
            styles.actionButton,
            {
              backgroundColor: `${c.success}18`,
              borderWidth: 1,
              borderColor: c.success,
            },
          ]}
        >
          <Ionicons name="checkmark" size={16} color={c.success} />
          <Text style={[styles.actionButtonText, { color: c.success }]}>Completed</Text>
        </View>
      )
    }

    if (status === ChallengeStatus.Completed) {
      const isClaiming = claimingId === challengeId
      return (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: c.success }]}
          onPress={() => handleClaim(challengeId)}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="gift" size={16} color="white" />
              <Text style={styles.actionButtonText}>Claim</Text>
            </>
          )}
        </TouchableOpacity>
      )
    }

    if (status === ChallengeStatus.InProgress) {
      return (
        <View
          style={[
            styles.actionButton,
            {
              backgroundColor: `${c.primary}26`,
              borderWidth: 1,
              borderColor: c.primary,
            },
          ]}
        >
          <Ionicons name="time" size={16} color={c.primary} />
          <Text style={[styles.actionButtonText, { color: c.primary }]}>In Progress</Text>
        </View>
      )
    }

    if (status === ChallengeStatus.Expired) {
      return (
        <View
          style={[
            styles.actionButton,
            {
              backgroundColor: `${c.error}1A`,
              borderWidth: 1,
              borderColor: c.error,
            },
          ]}
        >
          <Ionicons name="close-circle" size={16} color={c.error} />
          <Text style={[styles.actionButtonText, { color: c.error }]}>Expired</Text>
        </View>
      )
    }

    // available
    return (
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: c.primary }]}
        onPress={() => handleStart(challengeId)}
      >
        <Ionicons name="play" size={16} color="white" />
        <Text style={styles.actionButtonText}>Start</Text>
      </TouchableOpacity>
    )
  }

  const renderChallengeCard = ({ item }: { item: ChallengeListItem }) => {
    const { challenge, progress: prog, status, expiresAt } = item
    const currentProgress = prog?.progress ?? 0
    const percentage = Math.min((currentProgress / challenge.target_value) * 100, 100)
    const difficultyColor = DIFFICULTY_COLORS[challenge.difficulty]
    const difficultyLabel = DIFFICULTY_LABELS[challenge.difficulty]
    const categoryIcon = CATEGORY_ICONS[challenge.category] ?? 'help-circle'

    const isActive = status === ChallengeStatus.InProgress
    const isDone = status === ChallengeStatus.Completed || status === ChallengeStatus.Claimed
    const isExpired = status === ChallengeStatus.Expired

    return (
      <View
        style={[
          styles.challengeCard,
          {
            backgroundColor: c.glassCard,
            borderColor: c.glassBorder,
          },
          isActive && {
            borderColor: c.primary,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 4,
          },
          isExpired && styles.challengeCardExpired,
        ]}
      >
        {/* Top row: icon, title, difficulty badge */}
        <View style={styles.cardTopRow}>
          <View style={[styles.categoryIconContainer, { backgroundColor: c.glassHighlight }]}>
            <Ionicons name={categoryIcon} size={20} color={c.primary} />
          </View>
          <View style={styles.cardTitleBlock}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.challengeTitle, { color: c.text }, isExpired && styles.dimmedText]}
                numberOfLines={1}
              >
                {challenge.title}
              </Text>
              <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
                <Text style={styles.difficultyText}>{difficultyLabel}</Text>
              </View>
            </View>
            <Text
              style={[styles.challengeDescription, { color: c.textSecondary }, isExpired && styles.dimmedText]}
              numberOfLines={2}
            >
              {challenge.description}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: c.glassBorder }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: isDone
                    ? c.success
                    : isExpired
                      ? c.error
                      : c.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: c.textSecondary }]}>
            {currentProgress}/{challenge.target_value} {challenge.target_unit}
          </Text>
        </View>

        {/* Bottom row: rewards, time, action */}
        <View style={styles.cardBottomRow}>
          <View style={styles.rewardsRow}>
            <View style={styles.rewardItem}>
              <Ionicons name="flash" size={14} color="#F59E0B" />
              <Text style={[styles.rewardText, { color: c.textSecondary }]}>
                {challenge.xp_reward} XP
              </Text>
            </View>
            <View style={styles.rewardItem}>
              <Ionicons name="diamond" size={14} color="#8B5CF6" />
              <Text style={[styles.rewardText, { color: c.textSecondary }]}>
                {challenge.points_reward} pts
              </Text>
            </View>
            {isActive && expiresAt && (
              <View style={styles.rewardItem}>
                <Ionicons name="time-outline" size={14} color={c.textSecondary} />
                <Text style={[styles.timeText, { color: c.textSecondary }]}>
                  {getTimeRemaining(expiresAt)}
                </Text>
              </View>
            )}
          </View>
          {renderActionButton(challenge.id, status)}
        </View>
      </View>
    )
  }

  // ------- Loading / Error states -------

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>Loading challenges...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color={c.error} />
          <Text style={[styles.errorText, { color: c.error }]}>Failed to load challenges</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: c.primary }]}
            onPress={onRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ------- Main render -------

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.glassBorder }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: c.glassCard }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Challenges</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={item => item.challenge.id}
        renderItem={renderChallengeCard}
        ListHeaderComponent={
          <>
            {renderStatsHeader()}
            {renderTabs()}
          </>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              {activeTab === 'daily'
                ? 'No challenges available'
                : activeTab === 'active'
                  ? 'No active challenges'
                  : 'No completed challenges yet'}
            </Text>
            <Text style={[styles.emptySubtext, { color: c.textMuted }]}>
              {activeTab === 'daily'
                ? 'Check back tomorrow for new daily challenges!'
                : activeTab === 'active'
                  ? 'Start a challenge from the Daily tab to get going!'
                  : 'Complete challenges to earn XP and points'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Styles (structural only -- colors applied via inline theme tokens)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Challenge card
  challengeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  challengeCardExpired: {
    opacity: 0.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleBlock: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  challengeDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  dimmedText: {
    opacity: 0.5,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },

  // Bottom row
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Action buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Loading / error / empty
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})

export default ChallengesScreen
