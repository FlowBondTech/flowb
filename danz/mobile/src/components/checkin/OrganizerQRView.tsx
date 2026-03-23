import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import type React from 'react'
import { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Toast from 'react-native-toast-message'
import { designSystem } from '../../styles/designSystem'

interface OrganizerQRViewProps {
  checkinCode: string
  eventTitle: string
  isRegenerating: boolean
  onRegenerate: () => void
}

export const OrganizerQRView: React.FC<OrganizerQRViewProps> = ({
  checkinCode,
  eventTitle,
  isRegenerating,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await Clipboard.setStringAsync(checkinCode)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCopied(true)
    Toast.show({ type: 'success', text1: 'Copied!', text2: 'Check-in code copied to clipboard' })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Code',
      'This will invalidate the current check-in code. Attendees with the old code will need the new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            onRegenerate()
          },
        },
      ],
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your Event</Text>
      <Text style={styles.eventTitle}>{eventTitle}</Text>

      <View style={styles.qrContainer}>
        <View style={styles.qrWrapper}>
          <QRCode
            value={checkinCode}
            size={200}
            backgroundColor="#FFFFFF"
            color="#000000"
          />
        </View>
      </View>

      <Text style={styles.codeLabel}>Check-in Code</Text>
      <TouchableOpacity style={styles.codeRow} onPress={handleCopy} activeOpacity={0.7}>
        <Text style={styles.codeText}>{checkinCode}</Text>
        <Ionicons
          name={copied ? 'checkmark-circle' : 'copy-outline'}
          size={20}
          color={copied ? designSystem.colors.success : designSystem.colors.primary}
        />
      </TouchableOpacity>

      <Text style={styles.hint}>
        Show this QR code to attendees or share the check-in code.
      </Text>

      <TouchableOpacity
        style={styles.regenerateButton}
        onPress={handleRegenerate}
        disabled={isRegenerating}
        activeOpacity={0.7}
      >
        {isRegenerating ? (
          <ActivityIndicator size="small" color={designSystem.colors.warning} />
        ) : (
          <>
            <Ionicons name="refresh-outline" size={18} color={designSystem.colors.warning} />
            <Text style={styles.regenerateText}>Regenerate Code</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: designSystem.colors.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: designSystem.colors.text,
    marginTop: 8,
    marginBottom: 28,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: designSystem.borderRadius.xl,
    padding: 20,
    marginBottom: 24,
    ...designSystem.shadows.lg,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeLabel: {
    fontSize: 13,
    color: designSystem.colors.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 1,
    borderColor: designSystem.colors.surfaceLight,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    color: designSystem.colors.primary,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 14,
    color: designSystem.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 230, 109, 0.3)',
  },
  regenerateText: {
    fontSize: 14,
    fontWeight: '600',
    color: designSystem.colors.warning,
  },
})
