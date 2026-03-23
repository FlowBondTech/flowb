import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
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
import Toast from 'react-native-toast-message'
import { ApplyModal, GigCard } from '@/components/gigs'
import { useTheme } from '@/contexts/ThemeContext'
import type { GetMyGigDashboardQuery } from '@/generated/graphql'
import { useGetMyGigDashboardQuery, useApplyForGigMutation } from '@/generated/graphql'
import { fs, hs, ms, vs } from '@/utils/responsive'

// ---------------------------------------------------------------------------
// Derived types from the generated query
// ---------------------------------------------------------------------------

type DashboardData = GetMyGigDashboardQuery['myGigDashboard']
type AvailableGig = DashboardData['availableGigs'][number]
type GigApplicationEntry = DashboardData['activeGigs'][number]

type TabType = 'available' | 'active' | 'history'

export const GigsScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { theme } = useTheme()
  const c = theme.colors

  const [activeTab, setActiveTab] = useState<TabType>('available')
  const [refreshing, setRefreshing] = useState(false)
  const [applyTarget, setApplyTarget] = useState<AvailableGig | null>(null)

  const { data, loading, error, refetch } = useGetMyGigDashboardQuery({
    fetchPolicy: 'cache-and-network',
  })

  const [applyForGig, { loading: applyLoading }] = useApplyForGigMutation()

  const dashboard = data?.myGigDashboard
  const stats = dashboard?.stats

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleApplyConfirm = async (note: string) => {
    if (!applyTarget) return
    try {
      await applyForGig({ variables: { gigId: applyTarget.id, note: note || undefined } })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Toast.show({ type: 'success', text1: 'Application Sent', text2: 'Good luck!', visibilityTime: 2500 })
      setApplyTarget(null)
      refetch()
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Application Failed', text2: err?.message || 'Please try again', visibilityTime: 3000 })
    }
  }

  // Resolve the list based on active tab
  const getListData = (): (AvailableGig | GigApplicationEntry)[] => {
    if (!dashboard) return []
    if (activeTab === 'available') return dashboard.availableGigs || []
    if (activeTab === 'active') return dashboard.activeGigs || []
    return dashboard.recentHistory || []
  }

  const renderGigItem = ({ item }: { item: AvailableGig | GigApplicationEntry }) => {
    // Normalise: application items wrap a gig
    const isApplication = 'gig' in item && 'gigId' in item
    const gig: AvailableGig = isApplication ? (item as GigApplicationEntry).gig : (item as AvailableGig)
    const appStatus = isApplication ? (item as GigApplicationEntry).status : gig.myApplication?.status

    return (
      <GigCard
        title={gig.title}
        roleName={gig.role?.name}
        roleSlug={gig.role?.slug}
        eventTitle={gig.event?.title}
        eventDate={gig.event?.start_date_time}
        eventLocation={[gig.event?.location_name, gig.event?.location_city].filter(Boolean).join(', ')}
        danzReward={gig.danzReward}
        bonusDanz={gig.bonusDanz}
        slotsAvailable={gig.slotsAvailable}
        slotsFilled={gig.slotsFilled}
        timeCommitment={gig.timeCommitment}
        status={gig.status}
        applicationStatus={appStatus}
        canApply={gig.canApply}
        onApply={() => setApplyTarget(gig)}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (error && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        <View style={styles.centered}>
          <Ionicons name="warning" size={ms(48)} color={c.error} />
          <Text style={[styles.errorText, { color: c.error }]}>Failed to load gigs</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: c.primary }]} onPress={() => refetch()}>
            <Text style={[styles.retryText, { color: c.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <LinearGradient colors={[c.background, c.surface]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.glassBorder }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: c.glassCard }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={ms(24)} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Gigs</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={getListData() as any[]}
        keyExtractor={(item) => item.id}
        renderItem={renderGigItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        ListHeaderComponent={
          <>
            {/* Stats card */}
            <StatsCard
              danzEarned={stats?.totalDanzEarned ?? 0}
              gigsCompleted={stats?.totalGigsCompleted ?? 0}
              avgRating={stats?.averageRating ?? 0}
            />
            {/* Tabs */}
            <View style={styles.tabs}>
              {(['available', 'active', 'history'] as TabType[]).map((tab) => (
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
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={c.primary} />
            </View>
          ) : (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={ms(56)} color={c.textMuted} />
              <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>
                {activeTab === 'available' ? 'No gigs available' : activeTab === 'active' ? 'No active gigs' : 'No gig history'}
              </Text>
              <Text style={[styles.emptySubtext, { color: c.textMuted }]}>
                {activeTab === 'available' ? 'Check back soon for new opportunities!' : 'Your gig activity will appear here.'}
              </Text>
            </View>
          )
        }
      />

      {/* Apply modal */}
      <ApplyModal
        visible={!!applyTarget}
        onClose={() => setApplyTarget(null)}
        onConfirm={handleApplyConfirm}
        loading={applyLoading}
        gigTitle={applyTarget?.title ?? ''}
        roleName={applyTarget?.role?.name}
        roleSlug={applyTarget?.role?.slug}
        danzReward={applyTarget?.danzReward ?? 0}
        eventTitle={applyTarget?.event?.title}
        timeCommitment={applyTarget?.timeCommitment}
      />
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Stats sub-component (kept inline since it is small)
// ---------------------------------------------------------------------------

const StatsCard: React.FC<{ danzEarned: number; gigsCompleted: number; avgRating: number }> = ({
  danzEarned,
  gigsCompleted,
  avgRating,
}) => {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <View style={styles.statsCard}>
      <LinearGradient
        colors={[c.glassCard, c.glassSurface]}
        style={[styles.statsGradient, { borderColor: c.glassBorder }]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: c.warning }]}>{danzEarned}</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>$DANZ Earned</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.glassBorder }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: c.warning }]}>{gigsCompleted}</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>Completed</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.glassBorder }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: c.warning }]}>{avgRating > 0 ? avgRating.toFixed(1) : '--'}</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>Avg Rating</Text>
        </View>
      </LinearGradient>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles (structural only -- colors applied inline via theme)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: hs(16),
    paddingVertical: vs(12),
    borderBottomWidth: 1,
  },
  backBtn: {
    width: ms(40), height: ms(40), borderRadius: ms(20),
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: fs(20), fontWeight: '700' },
  headerRight: { width: ms(40) },
  listContent: { paddingHorizontal: hs(16), paddingBottom: vs(100), gap: vs(12) },
  // Stats
  statsCard: { borderRadius: ms(16), overflow: 'hidden', marginBottom: vs(4) },
  statsGradient: {
    flexDirection: 'row',
    padding: ms(18),
    borderWidth: 1,
    borderRadius: ms(16),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fs(22), fontWeight: '700', marginBottom: vs(4) },
  statLabel: { fontSize: fs(11) },
  statDivider: { width: 1, marginVertical: vs(2) },
  // Tabs
  tabs: { flexDirection: 'row', gap: hs(8), marginBottom: vs(4) },
  tab: {
    flex: 1,
    paddingVertical: vs(10),
    borderRadius: ms(8),
    alignItems: 'center',
  },
  tabText: { fontSize: fs(14), fontWeight: '600' },
  // Empty / error
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: vs(64), gap: vs(12) },
  errorText: { fontSize: fs(16), textAlign: 'center' },
  retryButton: { paddingHorizontal: hs(24), paddingVertical: vs(10), borderRadius: ms(8) },
  retryText: { fontSize: fs(14), fontWeight: '600' },
  emptyTitle: { fontSize: fs(18), fontWeight: '600' },
  emptySubtext: { fontSize: fs(14), textAlign: 'center', paddingHorizontal: hs(32) },
})
