import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { designSystem } from '../../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../../styles/responsive'

interface EventsHeaderProps {
  canCreateEvents: boolean
  onCreatePress: () => void
}

export const EventsHeader: React.FC<EventsHeaderProps> = ({ canCreateEvents, onCreatePress }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Events</Text>
      {canCreateEvents && (
        <TouchableOpacity style={styles.createButton} onPress={onCreatePress}>
          <LinearGradient
            colors={designSystem.colors.gradients.primary}
            style={styles.createButtonGradient}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(20),
  },
  headerTitle: {
    fontSize: moderateScale(32),
    fontWeight: '700',
    color: designSystem.colors.white,
    letterSpacing: -0.5,
  },
  createButton: {
    borderRadius: moderateScale(20),
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    gap: scale(4),
  },
  createButtonText: {
    color: designSystem.colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
})
