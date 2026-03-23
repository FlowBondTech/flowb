import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { PendingGigApplication } from '@/components/gigs/gigManagerTypes'

interface ReviewModalProps {
  visible: boolean
  application: PendingGigApplication | null
  action: 'approve' | 'reject' | null
  loading: boolean
  onConfirm: (reason?: string) => void
  onCancel: () => void
}

export function ReviewModal({ visible, application, action, loading, onConfirm, onCancel }: ReviewModalProps) {
  const { theme } = useTheme()
  const colors = theme.colors
  const [reason, setReason] = useState('')
  const isApprove = action === 'approve'
  const actionColor = isApprove ? colors.success : colors.error
  const actionLabel = isApprove ? 'Approve' : 'Reject'

  const handleConfirm = () => { onConfirm(isApprove ? undefined : reason); setReason('') }
  const handleCancel = () => { setReason(''); onCancel() }

  if (!application) return null
  const { user, gig } = application

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={handleCancel} />
        <View style={[s.modal, { backgroundColor: colors.surface }]}>
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <Ionicons name={isApprove ? 'checkmark-circle' : 'close-circle'} size={28} color={actionColor} />
            <Text style={[s.title, { color: colors.text }]}>{actionLabel} Application?</Text>
          </View>
          <View style={s.body}>
            <View style={s.row}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.placeholder, { backgroundColor: colors.primary + '30' }]}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: colors.text }]}>{user?.display_name || user?.username || 'Unknown'}</Text>
                <Text style={[s.username, { color: colors.textSecondary }]}>@{user?.username || 'unknown'}</Text>
              </View>
            </View>
            <View style={[s.gigBox, { backgroundColor: colors.card }]}>
              {gig?.role?.icon && <Text style={{ fontSize: 24 }}>{gig.role.icon}</Text>}
              <Text style={[s.gigTitle, { color: colors.text }]}>{gig?.title || 'Untitled Gig'}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{gig?.event?.title || 'No event'}</Text>
              {gig?.danzReward ? <Text style={[s.reward, { color: colors.accent }]}>{gig.danzReward} DANZ</Text> : null}
            </View>
            {!isApprove && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>Rejection reason (optional)</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Position already filled..."
                  placeholderTextColor={colors.textMuted}
                  value={reason} onChangeText={setReason} multiline numberOfLines={3} textAlignVertical="top"
                />
              </View>
            )}
          </View>
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, { borderWidth: 1, borderColor: colors.border }]} onPress={handleCancel} disabled={loading}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: actionColor }]} onPress={handleConfirm} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.confirmText}>{actionLabel}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: { width: '88%', maxWidth: 400, borderRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 10, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  body: { padding: 20, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  username: { fontSize: 13, marginTop: 2 },
  gigBox: { padding: 14, borderRadius: 12, alignItems: 'center', gap: 4 },
  gigTitle: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  reward: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80 },
  actions: { flexDirection: 'row', padding: 16, gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
