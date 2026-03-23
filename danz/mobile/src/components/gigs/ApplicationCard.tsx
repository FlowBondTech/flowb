import { Feather, Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { PendingGigApplication } from '@/components/gigs/gigManagerTypes'
import { formatTimeAgo } from '@/utils/gigManagerUtils'

interface Props {
  application: PendingGigApplication
  onApprove: (app: PendingGigApplication) => void
  onReject: (app: PendingGigApplication) => void
}

export function ApplicationCard({ application, onApprove, onReject }: Props) {
  const { theme } = useTheme()
  const colors = theme.colors
  const { user, gig } = application
  const role = gig?.role

  return (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.topRow}>
        <View style={s.userInfo}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.placeholder, { backgroundColor: colors.primary + '30' }]}>
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>
          )}
          <View style={s.userDetails}>
            <Text style={[s.displayName, { color: colors.text }]} numberOfLines={1}>
              {user?.display_name || user?.username || 'Unknown'}
            </Text>
            <Text style={{ fontSize: 13, marginTop: 1, color: colors.textSecondary }}>
              @{user?.username || 'unknown'}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>{formatTimeAgo(application.createdAt)}</Text>
      </View>

      <View style={s.gigRow}>
        {role && (
          <View style={[s.roleBadge, { backgroundColor: colors.primary + '18' }]}>
            {role.icon ? <Text style={{ fontSize: 14 }}>{role.icon}</Text> : <Ionicons name="briefcase-outline" size={14} color={colors.primary} />}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{role.name}</Text>
          </View>
        )}
        <View style={s.eventInfo}>
          <Feather name="calendar" size={12} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, flex: 1, color: colors.textSecondary }} numberOfLines={1}>{gig?.event?.title || 'No event'}</Text>
        </View>
      </View>

      {gig?.danzReward ? (
        <View style={s.rewardRow}>
          <Ionicons name="diamond-outline" size={14} color={colors.accent} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>{gig.danzReward} DANZ reward</Text>
        </View>
      ) : null}

      {application.applicationNote ? (
        <View style={[s.noteBox, { backgroundColor: colors.surface }]}>
          <Feather name="message-circle" size={13} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, flex: 1, lineHeight: 18, color: colors.textSecondary }} numberOfLines={3}>{application.applicationNote}</Text>
        </View>
      ) : null}

      <View style={s.actions}>
        <TouchableOpacity style={[s.rejectBtn, { borderColor: colors.error }]} onPress={() => onReject(application)}>
          <Feather name="x" size={18} color={colors.error} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.error }}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.approveBtn, { backgroundColor: colors.success }]} onPress={() => onApprove(application)}>
          <Feather name="check" size={18} color="#0A0A0F" />
          <Text style={s.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  userDetails: { flex: 1, marginLeft: 10 },
  displayName: { fontSize: 15, fontWeight: '600' },
  gigRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10, flexWrap: 'wrap' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, gap: 5 },
  eventInfo: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  noteBox: { flexDirection: 'row', marginTop: 10, padding: 10, borderRadius: 10, gap: 8, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', marginTop: 14, gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1, gap: 6 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10, gap: 6 },
  approveText: { fontSize: 14, fontWeight: '700', color: '#0A0A0F' },
})
