import { MaterialCommunityIcons } from '@expo/vector-icons'
import type React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { designSystem } from '@/styles/designSystem'
import { fs, hs, ms, vs } from '@/utils/responsive'

/** Maps role slug/category to a MaterialCommunityIcons name */
export const getRoleIcon = (slug?: string | null): string => {
  if (!slug) return 'briefcase'
  const lower = slug.toLowerCase()
  if (lower.includes('dj')) return 'music-circle'
  if (lower.includes('host') || lower.includes('mc')) return 'microphone-variant'
  if (lower.includes('photo')) return 'camera'
  if (lower.includes('promot')) return 'bullhorn'
  if (lower.includes('video')) return 'video'
  if (lower.includes('secur') || lower.includes('door')) return 'shield-account'
  if (lower.includes('dance') || lower.includes('instructor')) return 'human-greeting-variant'
  if (lower.includes('decor') || lower.includes('setup')) return 'palette'
  return 'briefcase'
}

/** Status badge color mapping */
const STATUS_COLORS: Record<string, string> = {
  open: designSystem.colors.accentGreen,
  filled: designSystem.colors.textTertiary,
  applied: designSystem.colors.accentYellow,
  approved: designSystem.colors.accentGreen,
  pending: designSystem.colors.accentYellow,
  rejected: designSystem.colors.error,
  completed: designSystem.colors.accent,
  withdrawn: designSystem.colors.textTertiary,
}

interface GigCardProps {
  title: string
  roleName?: string | null
  roleSlug?: string | null
  eventTitle?: string | null
  eventDate?: string | null
  eventLocation?: string | null
  danzReward: number
  bonusDanz?: number | null
  slotsAvailable: number
  slotsFilled: number
  timeCommitment?: string | null
  status: string
  applicationStatus?: string | null
  canApply?: boolean
  onApply: () => void
}

export const GigCard: React.FC<GigCardProps> = ({
  title,
  roleName,
  roleSlug,
  eventTitle,
  eventDate,
  eventLocation,
  danzReward,
  bonusDanz,
  slotsAvailable,
  slotsFilled,
  timeCommitment,
  status,
  applicationStatus,
  canApply,
  onApply,
}) => {
  const icon = getRoleIcon(roleSlug || roleName)
  const displayStatus = applicationStatus || status
  const statusColor = STATUS_COLORS[displayStatus.toLowerCase()] || designSystem.colors.textTertiary
  const slotsRemaining = Math.max(0, slotsAvailable - slotsFilled)
  const fillPercent = slotsAvailable > 0 ? (slotsFilled / slotsAvailable) * 100 : 0

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const showApplyButton = canApply && !applicationStatus && status.toLowerCase() === 'open'

  return (
    <View style={styles.card}>
      {/* Top row: icon + role badge + reward */}
      <View style={styles.topRow}>
        <View style={styles.roleSection}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={icon as any} size={ms(22)} color={designSystem.colors.primary} />
          </View>
          {roleName && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleName}</Text>
            </View>
          )}
        </View>
        <View style={styles.rewardSection}>
          <Text style={styles.rewardAmount}>{danzReward}</Text>
          <Text style={styles.rewardLabel}>$DANZ</Text>
          {bonusDanz != null && bonusDanz > 0 && (
            <Text style={styles.bonusText}>+{bonusDanz} bonus</Text>
          )}
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{title}</Text>

      {/* Event info */}
      {eventTitle && (
        <View style={styles.eventRow}>
          <MaterialCommunityIcons name="calendar" size={ms(14)} color={designSystem.colors.textSecondary} />
          <Text style={styles.eventText} numberOfLines={1}>
            {eventTitle}{formattedDate ? ` \u2022 ${formattedDate}` : ''}
          </Text>
        </View>
      )}
      {eventLocation && (
        <View style={styles.eventRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={ms(14)} color={designSystem.colors.textSecondary} />
          <Text style={styles.eventText} numberOfLines={1}>{eventLocation}</Text>
        </View>
      )}

      {/* Slots progress */}
      <View style={styles.slotsRow}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(fillPercent, 100)}%` }]} />
        </View>
        <Text style={styles.slotsText}>{slotsFilled}/{slotsAvailable} filled</Text>
      </View>

      {/* Bottom row: time commitment + status + action */}
      <View style={styles.bottomRow}>
        {timeCommitment && (
          <View style={styles.timeChip}>
            <MaterialCommunityIcons name="clock-outline" size={ms(12)} color={designSystem.colors.textSecondary} />
            <Text style={styles.timeText}>{timeCommitment}</Text>
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
          </Text>
        </View>
        {showApplyButton && slotsRemaining > 0 && (
          <TouchableOpacity style={styles.applyButton} onPress={onApply} activeOpacity={0.7}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(16),
    padding: ms(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: vs(10),
  },
  roleSection: { flexDirection: 'row', alignItems: 'center', gap: hs(8) },
  iconCircle: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: 'rgba(255,110,199,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: 'rgba(185,103,255,0.15)',
    paddingHorizontal: hs(10),
    paddingVertical: vs(3),
    borderRadius: ms(6),
  },
  roleBadgeText: { fontSize: fs(11), fontWeight: '600', color: '#D4A5FF' },
  rewardSection: { alignItems: 'flex-end' },
  rewardAmount: { fontSize: fs(22), fontWeight: '700', color: '#FFE66D' },
  rewardLabel: { fontSize: fs(11), fontWeight: '600', color: '#FFE66D', marginTop: -2 },
  bonusText: { fontSize: fs(10), color: designSystem.colors.accentGreen, marginTop: vs(2) },
  title: { fontSize: fs(16), fontWeight: '700', color: '#FFFFFF', marginBottom: vs(8) },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: hs(6), marginBottom: vs(4) },
  eventText: { fontSize: fs(12), color: designSystem.colors.textSecondary, flex: 1 },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(10),
    marginTop: vs(8),
    marginBottom: vs(10),
  },
  progressBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3, backgroundColor: designSystem.colors.primary },
  slotsText: { fontSize: fs(11), color: designSystem.colors.textSecondary, minWidth: 60, textAlign: 'right' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: hs(8) },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(4),
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: hs(8),
    paddingVertical: vs(4),
    borderRadius: ms(6),
  },
  timeText: { fontSize: fs(11), color: designSystem.colors.textSecondary },
  statusBadge: { paddingHorizontal: hs(10), paddingVertical: vs(4), borderRadius: ms(6) },
  statusText: { fontSize: fs(11), fontWeight: '600' },
  applyButton: {
    marginLeft: 'auto',
    backgroundColor: designSystem.colors.primary,
    paddingHorizontal: hs(16),
    paddingVertical: vs(6),
    borderRadius: ms(8),
  },
  applyButtonText: { fontSize: fs(13), fontWeight: '700', color: '#FFFFFF' },
})
