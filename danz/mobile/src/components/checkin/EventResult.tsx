import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { designSystem } from '../../styles/designSystem'

interface EventInfo {
  id: string
  title: string
  location_name?: string | null
  start_date_time?: string | null
  end_date_time?: string | null
  facilitator?: {
    display_name?: string | null
    username?: string | null
  } | null
}

interface EventResultProps {
  event: EventInfo
  checkinSuccess: boolean | null
  checkinMessage: string | null
  isCheckingIn: boolean
  onCheckin: () => void
  onReset: () => void
}

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return 'TBD'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const EventResult: React.FC<EventResultProps> = ({
  event,
  checkinSuccess,
  checkinMessage,
  isCheckingIn,
  onCheckin,
  onReset,
}) => {
  const organizerName = event.facilitator?.display_name || event.facilitator?.username || 'Unknown'

  if (checkinSuccess === true) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={64} color={designSystem.colors.success} />
          <Text style={styles.successTitle}>Checked In!</Text>
          <Text style={styles.successMessage}>{checkinMessage || 'You are checked in.'}</Text>
          <Text style={styles.eventTitle}>{event.title}</Text>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
          <Text style={styles.resetText}>Scan Another</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (checkinSuccess === false) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Ionicons name="close-circle" size={64} color={designSystem.colors.error} />
          <Text style={styles.errorTitle}>Check-In Failed</Text>
          <Text style={styles.errorMessage}>{checkinMessage || 'Something went wrong.'}</Text>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
          <Text style={styles.resetText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.eventCard}>
        <Text style={styles.eventTitle}>{event.title}</Text>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color={designSystem.colors.textSecondary} />
          <Text style={styles.detailText}>{event.location_name || 'No location'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color={designSystem.colors.textSecondary} />
          <Text style={styles.detailText}>{formatDateTime(event.start_date_time)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={18} color={designSystem.colors.textSecondary} />
          <Text style={styles.detailText}>Hosted by {organizerName}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          onCheckin()
        }}
        disabled={isCheckingIn}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[...designSystem.colors.gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.checkinButton}
        >
          {isCheckingIn ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.checkinText}>Check In</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        <Text style={styles.resetText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  eventCard: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: designSystem.borderRadius.lg,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: designSystem.colors.surfaceLight,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: designSystem.colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 15,
    color: designSystem.colors.textSecondary,
    flex: 1,
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: designSystem.borderRadius.lg,
  },
  checkinText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  resetText: {
    fontSize: 15,
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  successCard: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: designSystem.borderRadius.lg,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: designSystem.colors.success,
    marginTop: 12,
  },
  successMessage: {
    fontSize: 15,
    color: designSystem.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: designSystem.borderRadius.lg,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.2)',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: designSystem.colors.error,
    marginTop: 12,
  },
  errorMessage: {
    fontSize: 15,
    color: designSystem.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
})
