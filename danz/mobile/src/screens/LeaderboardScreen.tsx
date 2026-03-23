import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  LeaderboardMetric,
  useGetGlobalLeaderboardQuery,
  useGetMyLeaderboardSummaryQuery,
  useGetWeeklyLeaderboardQuery,
  type LeaderboardEntry,
} from '@/generated/graphql'
import { useTheme } from '@/contexts/ThemeContext'

type TimePeriod = 'week' | 'month' | 'all'

type MetricOption = {
  key: LeaderboardMetric
  label: string
  icon: string
  iconFamily: 'ionicons' | 'material'
}

const METRIC_OPTIONS: MetricOption[] = [
  { key: LeaderboardMetric.Xp, label: 'XP', icon: 'flash', iconFamily: 'ionicons' },
  { key: LeaderboardMetric.Points, label: 'Points', icon: 'star', iconFamily: 'ionicons' },
  {
    key: LeaderboardMetric.EventsAttended,
    label: 'Events',
    icon: 'calendar',
    iconFamily: 'ionicons',
  },
  { key: LeaderboardMetric.Streak, label: 'Streak', icon: 'flame', iconFamily: 'ionicons' },
  {
    key: LeaderboardMetric.DanceTime,
    label: 'Dance Time',
    icon: 'timer-outline',
    iconFamily: 'ionicons',
  },
  {
    key: LeaderboardMetric.MovementScore,
    label: 'Movement',
    icon: 'run',
    iconFamily: 'material',
  },
]

const PODIUM_COLORS = {
  1: { bg: 'rgba(255, 230, 109, 0.15)', border: '#FFE66D', text: '#FFE66D' },
  2: { bg: 'rgba(192, 192, 192, 0.12)', border: '#C0C0C0', text: '#C0C0C0' },
  3: { bg: 'rgba(205, 127, 50, 0.12)', border: '#CD7F32', text: '#CD7F32' },
} as const

const formatValue = (value: number, metric: LeaderboardMetric): string => {
  if (metric === LeaderboardMetric.DanceTime) {
    const hours = Math.floor(value / 60)
    const minutes = Math.round(value % 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return Math.round(value).toLocaleString()
}

const metricLabel = (metric: LeaderboardMetric): string => {
  const option = METRIC_OPTIONS.find((m) => m.key === metric)
  return option?.label ?? 'Points'
}

export const LeaderboardScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { theme } = useTheme()
  const c = theme.colors
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week')
  const [selectedMetric, setSelectedMetric] = useState<LeaderboardMetric>(LeaderboardMetric.Xp)
  const [refreshing, setRefreshing] = useState(false)

  const isWeekly = timePeriod === 'week'

  const {
    data: globalData,
    loading: globalLoading,
    refetch: refetchGlobal,
  } = useGetGlobalLeaderboardQuery({
    variables: { metric: selectedMetric, limit: 50 },
    skip: isWeekly,
  })

  const {
    data: weeklyData,
    loading: weeklyLoading,
    refetch: refetchWeekly,
  } = useGetWeeklyLeaderboardQuery({
    variables: { metric: selectedMetric, limit: 50 },
    skip: !isWeekly,
  })

  const {
    data: summaryData,
    loading: summaryLoading,
    refetch: refetchSummary,
  } = useGetMyLeaderboardSummaryQuery()

  const loading = (isWeekly ? weeklyLoading : globalLoading) || summaryLoading
  const leaderboard = isWeekly ? weeklyData?.weeklyLeaderboard : globalData?.globalLeaderboard
  const entries: LeaderboardEntry[] = (leaderboard?.entries as LeaderboardEntry[]) ?? []
  const summary = summaryData?.myLeaderboardSummary

  const topThree = useMemo(() => entries.slice(0, 3), [entries])
  const restEntries = useMemo(() => entries.slice(3), [entries])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      isWeekly ? refetchWeekly() : refetchGlobal(),
      refetchSummary(),
    ])
    setRefreshing(false)
  }, [isWeekly, refetchWeekly, refetchGlobal, refetchSummary])

  const handleTimePeriodChange = (period: TimePeriod) => {
    if (period === timePeriod) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setTimePeriod(period)
  }

  const handleMetricChange = (metric: LeaderboardMetric) => {
    if (metric === selectedMetric) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedMetric(metric)
  }

  const renderRankChange = (entry: LeaderboardEntry) => {
    const change = entry.rank_change
    if (change == null || change === 0) {
      return <Ionicons name="remove" size={14} color={c.textMuted} />
    }
    if (change > 0) {
      return (
        <View style={styles.rankChangeRow}>
          <Ionicons name="caret-up" size={12} color={c.success} />
          <Text style={[styles.rankChangeText, { color: c.success }]}>
            {change}
          </Text>
        </View>
      )
    }
    return (
      <View style={styles.rankChangeRow}>
        <Ionicons name="caret-down" size={12} color={c.error} />
        <Text style={[styles.rankChangeText, { color: c.error }]}>
          {Math.abs(change)}
        </Text>
      </View>
    )
  }

  const renderAvatar = (entry: LeaderboardEntry, size: number) => {
    if (entry.avatar_url) {
      return (
        <Image
          source={{ uri: entry.avatar_url }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        />
      )
    }
    return (
      <View
        style={[
          styles.avatarPlaceholder,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: c.surface,
          },
        ]}
      >
        <Text style={[styles.avatarInitial, { fontSize: size * 0.4, color: c.textSecondary }]}>
          {(entry.display_name || entry.username || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
    )
  }

  const renderSummaryCard = () => {
    if (!summary) return null
    const weeklyChange = summary.weekly_change ?? 0
    const percentile = summary.percentile ?? 0
    const globalRank = summary.global_rank

    return (
      <LinearGradient
        colors={theme.gradients.primary as unknown as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Your Global Rank</Text>
            <Text style={styles.summaryRank}>
              #{globalRank?.toLocaleString() ?? '--'}
            </Text>
          </View>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryPercentile}>
              Top {Math.max(1, Math.round(100 - percentile))}%
            </Text>
          </View>
        </View>
        <View style={styles.summaryBottom}>
          <View style={styles.summaryStatItem}>
            <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.summaryStatText}>
              {weeklyChange > 0 ? '+' : ''}
              {weeklyChange} this week
            </Text>
          </View>
          {summary.friends_rank != null && (
            <View style={styles.summaryStatItem}>
              <Ionicons name="people" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryStatText}>
                #{summary.friends_rank} among friends
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    )
  }

  const renderTimePills = () => {
    const periods: { key: TimePeriod; label: string }[] = [
      { key: 'week', label: 'Week' },
      { key: 'month', label: 'Month' },
      { key: 'all', label: 'All Time' },
    ]

    return (
      <View style={styles.pillRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[
              styles.pill,
              { backgroundColor: timePeriod === p.key ? c.primary : c.glassCard },
              timePeriod === p.key && { borderColor: c.glassBorder, borderWidth: 1 },
            ]}
            onPress={() => handleTimePeriodChange(p.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: timePeriod === p.key ? '#FFFFFF' : c.textMuted },
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  const renderMetricChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {METRIC_OPTIONS.map((option) => {
        const isActive = selectedMetric === option.key
        return (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.chip,
              { backgroundColor: isActive ? c.secondary : c.glassCard },
              !isActive && { borderWidth: 1, borderColor: c.glassBorder },
            ]}
            onPress={() => handleMetricChange(option.key)}
            activeOpacity={0.7}
          >
            {option.iconFamily === 'material' ? (
              <MaterialCommunityIcons
                name={option.icon as any}
                size={14}
                color={isActive ? '#FFFFFF' : c.textMuted}
              />
            ) : (
              <Ionicons
                name={option.icon as any}
                size={14}
                color={isActive ? '#FFFFFF' : c.textMuted}
              />
            )}
            <Text
              style={[
                styles.chipText,
                { color: isActive ? '#FFFFFF' : c.textMuted },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )

  const renderPodium = () => {
    if (topThree.length === 0) return null

    // Podium order: 2nd, 1st, 3rd
    const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean)
    if (podiumOrder.length === 0) return null

    return (
      <View style={styles.podiumContainer}>
        {podiumOrder.map((entry, idx) => {
          if (!entry) return null
          const rank = entry.rank as 1 | 2 | 3
          const colors = PODIUM_COLORS[rank]
          const isFirst = rank === 1
          const avatarSize = isFirst ? 64 : 52

          return (
            <View
              key={entry.user_id}
              style={[
                styles.podiumItem,
                isFirst && styles.podiumItemFirst,
              ]}
            >
              {isFirst && (
                <MaterialCommunityIcons
                  name="crown"
                  size={24}
                  color={c.warning}
                  style={styles.crownIcon}
                />
              )}
              <View
                style={[
                  styles.podiumAvatarBorder,
                  {
                    borderColor: colors.border,
                    width: avatarSize + 6,
                    height: avatarSize + 6,
                    borderRadius: (avatarSize + 6) / 2,
                  },
                ]}
              >
                {renderAvatar(entry, avatarSize)}
              </View>
              <View
                style={[
                  styles.podiumRankBadge,
                  { backgroundColor: colors.border },
                ]}
              >
                <Text style={styles.podiumRankText}>{rank}</Text>
              </View>
              <Text style={[styles.podiumName, { color: c.text }]} numberOfLines={1}>
                {entry.display_name || entry.username}
              </Text>
              <Text style={[styles.podiumValue, { color: colors.text }]}>
                {formatValue(entry.value, selectedMetric)}
              </Text>
            </View>
          )
        })}
      </View>
    )
  }

  const renderRankItem = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.is_current_user

    return (
      <View
        style={[
          styles.rankRow,
          {
            backgroundColor: isCurrentUser ? c.glassHighlight : c.glassCard,
            borderColor: isCurrentUser ? c.primary : c.glassBorder,
            borderWidth: isCurrentUser ? 1.5 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.rankNumber,
            { color: isCurrentUser ? c.primary : c.textSecondary },
          ]}
        >
          {item.rank}
        </Text>
        {renderAvatar(item, 40)}
        <View style={styles.rankInfo}>
          <Text
            style={[
              styles.rankName,
              { color: isCurrentUser ? c.primary : c.text },
            ]}
            numberOfLines={1}
          >
            {item.display_name || item.username}
          </Text>
          <Text style={[styles.rankUsername, { color: c.textMuted }]} numberOfLines={1}>
            @{item.username}
          </Text>
        </View>
        <View style={styles.rankRight}>
          <Text
            style={[
              styles.rankValue,
              { color: isCurrentUser ? c.primary : c.text },
            ]}
          >
            {formatValue(item.value, selectedMetric)}
          </Text>
          <Text style={[styles.rankMetricLabel, { color: c.textMuted }]}>
            {metricLabel(selectedMetric)}
          </Text>
        </View>
        <View style={styles.rankChangeContainer}>
          {renderRankChange(item)}
        </View>
      </View>
    )
  }

  const renderListHeader = () => (
    <>
      {renderSummaryCard()}
      {renderTimePills()}
      {renderMetricChips()}
      {renderPodium()}
      {restEntries.length > 0 && (
        <View style={styles.listSectionHeader}>
          <Text style={[styles.listSectionTitle, { color: c.text }]}>Rankings</Text>
          <Text style={[styles.listSectionCount, { color: c.textMuted }]}>
            {leaderboard?.total_participants?.toLocaleString() ?? 0} dancers
          </Text>
        </View>
      )}
    </>
  )

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: c.glassBorder }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: c.glassCard }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>Leaderboard</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>
            Loading leaderboard...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: c.glassBorder }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: c.glassCard }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Leaderboard</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={restEntries}
        keyExtractor={(item) => item.user_id}
        renderItem={renderRankItem}
        ListHeaderComponent={renderListHeader}
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
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={64} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                No rankings yet
              </Text>
              <Text style={[styles.emptySubtext, { color: c.textMuted }]}>
                Start dancing to appear on the leaderboard!
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
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

  // Summary Card
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  summaryRank: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  summaryPercentile: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryBottom: {
    flexDirection: 'row',
    gap: 20,
  },
  summaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryStatText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },

  // Time Period Pills
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Metric Chips
  chipRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
  },
  podiumItemFirst: {
    marginBottom: 12,
  },
  crownIcon: {
    marginBottom: 4,
  },
  podiumAvatarBorder: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -11,
  },
  podiumRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A0A0F',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    maxWidth: 90,
    textAlign: 'center',
  },
  podiumValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },

  // List Section
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  listSectionCount: {
    fontSize: 13,
  },

  // Rank Row
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
  },
  rankNumber: {
    width: 32,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  avatar: {
    marginLeft: 4,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  avatarInitial: {
    fontWeight: '700',
  },
  rankInfo: {
    flex: 1,
    marginLeft: 10,
  },
  rankName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rankUsername: {
    fontSize: 12,
    marginTop: 1,
  },
  rankRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  rankValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  rankMetricLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  rankChangeContainer: {
    width: 32,
    alignItems: 'center',
  },
  rankChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rankChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingBottom: 100,
  },

  // States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
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

export default LeaderboardScreen
