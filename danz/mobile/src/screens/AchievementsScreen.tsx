import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
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
import {
  AchievementCategory,
  AchievementRarity,
  useMyAchievementsQuery,
  useMyAchievementStatsQuery,
  type MyAchievementsQuery,
} from '@/generated/graphql'
import { useTheme } from '@/contexts/ThemeContext'

// Derive the achievement item type from the generated query type
type Achievement = MyAchievementsQuery['myAchievements'][number]

const RARITY_COLORS: Record<AchievementRarity, string> = {
  [AchievementRarity.Common]: '#9CA3AF',
  [AchievementRarity.Uncommon]: '#10B981',
  [AchievementRarity.Rare]: '#3B82F6',
  [AchievementRarity.Epic]: '#8B5CF6',
  [AchievementRarity.Legendary]: '#F59E0B',
}

const RARITY_BG_COLORS: Record<AchievementRarity, string> = {
  [AchievementRarity.Common]: 'rgba(156, 163, 175, 0.1)',
  [AchievementRarity.Uncommon]: 'rgba(16, 185, 129, 0.1)',
  [AchievementRarity.Rare]: 'rgba(59, 130, 246, 0.1)',
  [AchievementRarity.Epic]: 'rgba(139, 92, 246, 0.15)',
  [AchievementRarity.Legendary]: 'rgba(245, 158, 11, 0.15)',
}

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  [AchievementCategory.Sessions]: 'Sessions',
  [AchievementCategory.Duration]: 'Duration',
  [AchievementCategory.Streak]: 'Streaks',
  [AchievementCategory.Movement]: 'Movement',
  [AchievementCategory.Milestone]: 'Milestones',
  [AchievementCategory.Social]: 'Social',
  [AchievementCategory.Special]: 'Special',
}

type TabType = 'all' | 'unlocked' | 'locked'

export const AchievementsScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { theme } = useTheme()
  const c = theme.colors
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'ALL'>('ALL')

  const { data, loading, error, refetch } = useMyAchievementsQuery()
  const { data: statsData } = useMyAchievementStatsQuery()

  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const achievements: Achievement[] = data?.myAchievements || []
  const stats = statsData?.myAchievementStats

  // Filter achievements
  const filteredAchievements = achievements.filter((a) => {
    // Tab filter
    if (activeTab === 'unlocked' && !a.is_unlocked) return false
    if (activeTab === 'locked' && a.is_unlocked) return false

    // Category filter
    if (selectedCategory !== 'ALL' && a.category !== selectedCategory) return false

    return true
  })

  const renderStatsHeader = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: c.glassCard }]}>
        <Text style={[styles.statValue, { color: c.text }]}>{stats?.total_unlocked || 0}</Text>
        <Text style={[styles.statLabel, { color: c.textSecondary }]}>Unlocked</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: c.glassCard }]}>
        <Text style={[styles.statValue, { color: c.text }]}>{stats?.total_available || 0}</Text>
        <Text style={[styles.statLabel, { color: c.textSecondary }]}>Available</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: c.glassCard }]}>
        <Text style={[styles.statValue, { color: c.text }]}>{stats?.total_xp_earned || 0}</Text>
        <Text style={[styles.statLabel, { color: c.textSecondary }]}>XP Earned</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: c.glassCard }]}>
        <Text style={[styles.statValue, { color: c.text }]}>{stats?.total_danz_earned || 0}</Text>
        <Text style={[styles.statLabel, { color: c.textSecondary }]}>$DANZ</Text>
      </View>
    </View>
  )

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {(['all', 'unlocked', 'locked'] as TabType[]).map((tab) => (
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
              activeTab === tab && { color: c.text },
            ]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderCategoryFilter = () => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={['ALL', ...Object.values(AchievementCategory)] as (AchievementCategory | 'ALL')[]}
      keyExtractor={(item) => item}
      contentContainerStyle={styles.categoryList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.categoryChip,
            { backgroundColor: c.glassCard },
            selectedCategory === item && { backgroundColor: c.primary },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            setSelectedCategory(item)
          }}
        >
          <Text
            style={[
              styles.categoryChipText,
              { color: c.textSecondary },
              selectedCategory === item && { color: c.text },
            ]}
          >
            {item === 'ALL' ? 'All' : CATEGORY_LABELS[item as AchievementCategory]}
          </Text>
        </TouchableOpacity>
      )}
    />
  )

  const renderAchievementCard = ({ item }: { item: Achievement }) => {
    const rarityColor = RARITY_COLORS[item.rarity]
    const bgColor = item.is_unlocked ? RARITY_BG_COLORS[item.rarity] : c.glassCard

    return (
      <TouchableOpacity
        style={[styles.achievementCard, { backgroundColor: bgColor, borderColor: c.glassBorder }]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }}
      >
        <View style={styles.achievementHeader}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: item.is_unlocked ? rarityColor : 'rgba(100,100,100,0.3)' },
            ]}
          >
            <Text style={styles.achievementIcon}>
              {item.is_unlocked ? item.icon : '🔒'}
            </Text>
          </View>
          <View style={styles.achievementInfo}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.achievementTitle,
                  { color: c.text },
                  !item.is_unlocked && styles.lockedText,
                ]}
              >
                {item.title}
              </Text>
              <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                <Text style={styles.rarityText}>{item.rarity}</Text>
              </View>
            </View>
            <Text
              style={[
                styles.achievementDescription,
                { color: c.textSecondary },
                !item.is_unlocked && styles.lockedText,
              ]}
              numberOfLines={2}
            >
              {item.description}
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
                  width: `${Math.min(item.percentage, 100)}%`,
                  backgroundColor: item.is_unlocked ? rarityColor : c.textMuted,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: c.textSecondary }]}>
            {item.current_progress} / {item.target}
          </Text>
        </View>

        {/* Rewards */}
        <View style={styles.rewardsRow}>
          <View style={styles.rewardItem}>
            <Ionicons name="flash" size={14} color={c.warning} />
            <Text style={[styles.rewardText, { color: c.textSecondary }]}>{item.xp_reward} XP</Text>
          </View>
          <View style={styles.rewardItem}>
            <Ionicons name="diamond" size={14} color={c.secondary} />
            <Text style={[styles.rewardText, { color: c.textSecondary }]}>{item.danz_reward} $DANZ</Text>
          </View>
          {item.is_unlocked && item.unlocked_at && (
            <Text style={[styles.unlockedDate, { color: c.textMuted }]}>
              Unlocked {new Date(item.unlocked_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color={c.error} />
          <Text style={[styles.errorText, { color: c.error }]}>Failed to load achievements</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: c.primary }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryButtonText, { color: c.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.glassBorder }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: c.glassBorder }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Achievements</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={filteredAchievements}
        keyExtractor={(item) => item.achievement_type}
        renderItem={renderAchievementCard}
        ListHeaderComponent={
          <>
            {renderStatsHeader()}
            {renderTabs()}
            {renderCategoryFilter()}
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
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>No achievements found</Text>
            <Text style={[styles.emptySubtext, { color: c.textMuted }]}>
              {activeTab === 'unlocked'
                ? 'Complete dance sessions to unlock achievements!'
                : 'Check back later for new achievements'}
            </Text>
          </View>
        }
      />
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
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
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
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  achievementCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  achievementDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  lockedText: {
    opacity: 0.5,
  },
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
    minWidth: 60,
    textAlign: 'right',
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  unlockedDate: {
    fontSize: 11,
    marginLeft: 'auto',
  },
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

export default AchievementsScreen
