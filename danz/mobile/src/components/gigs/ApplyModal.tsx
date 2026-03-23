import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import type React from 'react'
import { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { designSystem } from '@/styles/designSystem'
import { fs, hs, ms, vs } from '@/utils/responsive'
import { getRoleIcon } from './GigCard'

interface ApplyModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  loading: boolean
  gigTitle: string
  roleName?: string | null
  roleSlug?: string | null
  danzReward: number
  eventTitle?: string | null
  timeCommitment?: string | null
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading,
  gigTitle,
  roleName,
  roleSlug,
  danzReward,
  eventTitle,
  timeCommitment,
}) => {
  const [note, setNote] = useState('')
  const icon = getRoleIcon(roleSlug || roleName)

  const handleConfirm = () => {
    onConfirm(note.trim())
    setNote('')
  }

  const handleClose = () => {
    setNote('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity style={styles.container} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Apply for Gig</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={ms(24)} color={designSystem.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Gig summary */}
          <View style={styles.gigSummary}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name={icon as any} size={ms(24)} color={designSystem.colors.primary} />
            </View>
            <View style={styles.gigInfo}>
              <Text style={styles.gigTitle} numberOfLines={2}>{gigTitle}</Text>
              {roleName && <Text style={styles.gigMeta}>{roleName}</Text>}
              {eventTitle && <Text style={styles.gigMeta}>{eventTitle}</Text>}
            </View>
          </View>

          {/* Details row */}
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Reward</Text>
              <Text style={styles.rewardValue}>{danzReward} $DANZ</Text>
            </View>
            {timeCommitment && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{timeCommitment}</Text>
              </View>
            )}
          </View>

          {/* Note input */}
          <Text style={styles.inputLabel}>Application note (optional)</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="Tell the organizer why you'd be great for this gig..."
            placeholderTextColor={designSystem.colors.textTertiary}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{note.length}/500</Text>

          {/* Confirm */}
          <TouchableOpacity
            style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.confirmText}>Confirm Application</Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: designSystem.colors.surface,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    padding: ms(24),
    paddingBottom: vs(40),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  headerTitle: { fontSize: fs(18), fontWeight: '700', color: '#FFFFFF' },
  gigSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: hs(12), marginBottom: vs(16) },
  iconCircle: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: 'rgba(255,110,199,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gigInfo: { flex: 1 },
  gigTitle: { fontSize: fs(16), fontWeight: '600', color: '#FFFFFF', marginBottom: vs(4) },
  gigMeta: { fontSize: fs(12), color: designSystem.colors.textSecondary },
  detailsRow: {
    flexDirection: 'row',
    gap: hs(16),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    padding: ms(14),
    marginBottom: vs(16),
  },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: fs(11), color: designSystem.colors.textTertiary, marginBottom: vs(4) },
  rewardValue: { fontSize: fs(16), fontWeight: '700', color: '#FFE66D' },
  detailValue: { fontSize: fs(14), fontWeight: '600', color: '#FFFFFF' },
  inputLabel: { fontSize: fs(13), fontWeight: '600', color: designSystem.colors.textSecondary, marginBottom: vs(8) },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    padding: ms(14),
    fontSize: fs(14),
    color: '#FFFFFF',
    minHeight: vs(90),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  charCount: {
    fontSize: fs(11),
    color: designSystem.colors.textTertiary,
    textAlign: 'right',
    marginTop: vs(4),
    marginBottom: vs(16),
  },
  confirmButton: {
    backgroundColor: designSystem.colors.primary,
    borderRadius: ms(12),
    paddingVertical: vs(14),
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmText: { fontSize: fs(16), fontWeight: '700', color: '#FFFFFF' },
})
