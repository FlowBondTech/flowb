import { Feather, Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { ApplicationCard } from '@/components/gigs/ApplicationCard'
import type { GigManagerStats, PendingGigApplication } from '@/components/gigs/gigManagerTypes'
import { ReviewModal } from '@/components/gigs/ReviewModal'
import { useTheme } from '@/contexts/ThemeContext'
import {
  useGetGigManagerDashboardQuery,
  useReviewGigApplicationMutation,
} from '@/generated/graphql'
import { useHaptics } from '@/hooks/useHaptics'
import { calcApprovalRate } from '@/utils/gigManagerUtils'

// Re-export for external consumers
export type { PendingGigApplication } from '@/components/gigs/gigManagerTypes'

export const GigManagerScreen = () => {
  const { theme } = useTheme()
  const c = theme.colors
  const navigation = useNavigation()
  const haptics = useHaptics()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedApp, setSelectedApp] = useState<PendingGigApplication | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)

  const { data, loading, error, refetch } = useGetGigManagerDashboardQuery()
  const [reviewMutation, { loading: reviewLoading }] = useReviewGigApplicationMutation()

  const apps: PendingGigApplication[] = data?.gigManagerDashboard?.pendingGigApplications ?? []
  const stats: GigManagerStats | null = data?.gigManagerDashboard?.stats ?? null

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false) }, [refetch])

  const openReview = (app: PendingGigApplication, action: 'approve' | 'reject') => {
    haptics.buttonPress(); setSelectedApp(app); setReviewAction(action)
  }

  const handleConfirm = async (reason?: string) => {
    if (!selectedApp || !reviewAction) return
    try {
      await reviewMutation({
        variables: { applicationId: selectedApp.id, input: {
          status: reviewAction === 'approve' ? 'APPROVED' : 'REJECTED',
          ...(reason ? { rejectionReason: reason } : {}),
        }},
      })
      if (reviewAction === 'approve') { haptics.success(); Toast.show({ type: 'success', text1: 'Application Approved', text2: 'Applicant notified' }) }
      else { haptics.error(); Toast.show({ type: 'info', text1: 'Application Rejected' }) }
      setSelectedApp(null); setReviewAction(null); refetch()
    } catch { haptics.error(); Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to review application' }) }
  }

  const closeModal = () => { setSelectedApp(null); setReviewAction(null) }

  const header = () => (
    <View style={[s.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 }]}>
      <TouchableOpacity onPress={() => { haptics.selection(); navigation.goBack() }} style={s.backBtn}>
        <Feather name="arrow-left" size={24} color={c.text} />
      </TouchableOpacity>
      <Text style={[s.screenTitle, { color: c.text }]}>Gig Manager</Text>
      <View style={{ width: 40 }} />
    </View>
  )

  if (loading && !refreshing) return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      {header()}
      <View style={s.centered}><ActivityIndicator size="large" color={c.primary} /><Text style={{ fontSize: 14, marginTop: 12, color: c.textSecondary }}>Loading dashboard...</Text></View>
    </View>
  )

  if (error) return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      {header()}
      <View style={s.centered}>
        <Ionicons name="warning-outline" size={48} color={c.error} />
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, color: c.text }}>Something went wrong</Text>
        <Text style={{ fontSize: 14, textAlign: 'center', marginTop: 8, color: c.textSecondary }}>{error.message}</Text>
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: c.primary }]} onPress={() => refetch()}><Text style={s.retryText}>Retry</Text></TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      {header()}
      <FlatList data={apps} keyExtractor={i => i.id}
        renderItem={({ item }) => <ApplicationCard application={item} onApprove={a => openReview(a, 'approve')} onReject={a => openReview(a, 'reject')} />}
        ListHeaderComponent={() => (
          <>
            {stats && (
              <View style={[s.statsBar, { backgroundColor: c.glassCard, borderWidth: 1, borderColor: c.glassBorder }]}>
                <Stat label="Today" value={String(stats.todayReviewed)} color={c.primary} labelColor={c.textMuted} />
                <View style={[s.divider, { backgroundColor: c.glassBorder }]} />
                <Stat label="Approved" value={String(stats.approvedCount)} color={c.success} labelColor={c.textMuted} />
                <View style={[s.divider, { backgroundColor: c.glassBorder }]} />
                <Stat label="Rejected" value={String(stats.rejectedCount)} color={c.error} labelColor={c.textMuted} />
                <View style={[s.divider, { backgroundColor: c.glassBorder }]} />
                <Stat label="Rate" value={calcApprovalRate(stats.approvedCount, stats.totalReviewed)} color={c.accent} labelColor={c.textMuted} />
              </View>
            )}
            <Text style={[s.section, { color: c.textSecondary }]}>Pending Applications ({apps.length})</Text>
          </>
        )}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={c.textMuted} />
            <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, color: c.text }}>All caught up!</Text>
            <Text style={{ fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, color: c.textSecondary }}>No pending applications to review. Pull down to refresh.</Text>
          </View>
        }
      />
      <ReviewModal visible={selectedApp !== null} application={selectedApp} action={reviewAction} loading={reviewLoading} onConfirm={handleConfirm} onCancel={closeModal} />
    </View>
  )
}

function Stat({ label, value, color, labelColor }: { label: string; value: string; color: string; labelColor: string }) {
  return (
    <View style={s.statItem}>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color: labelColor }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 20, fontWeight: '700' },
  statsBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { width: 1, marginHorizontal: 8 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 16, marginBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
})
