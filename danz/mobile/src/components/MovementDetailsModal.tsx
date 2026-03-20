import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import type React from 'react'
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { designSystem } from '../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../styles/responsive'
import { GlassCard } from './ui/AnimatedComponents'

const { width, height } = Dimensions.get('window')

interface MovementDetailsModalProps {
  visible: boolean
  onClose: () => void
  movementScore: number
  duration: number
  calories: number
  bpm: number
  isTracking: boolean
}

export const MovementDetailsModal: React.FC<MovementDetailsModalProps> = ({
  visible,
  onClose,
  movementScore,
  duration,
  calories,
  bpm,
  isTracking,
}) => {
  const getFlowStateColor = () => {
    if (movementScore > 80) return designSystem.colors.success
    if (movementScore > 50) return designSystem.colors.accentYellow
    return designSystem.colors.primary
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <BlurView intensity={20} style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Movement Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={designSystem.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Movement Intensity Chart */}
            {isTracking && (
              <GlassCard style={styles.chartCard}>
                <Text style={styles.chartTitle}>Movement Intensity</Text>
                <View style={styles.chart}>
                  {[...Array(15)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.chartBar,
                        {
                          height: Math.random() * 60 + 20,
                          backgroundColor:
                            i % 2 === 0
                              ? designSystem.colors.primary
                              : designSystem.colors.secondary,
                        },
                      ]}
                    />
                  ))}
                </View>
              </GlassCard>
            )}

            {/* Detailed Stats */}
            <GlassCard style={styles.detailedStats}>
              <Text style={styles.sectionTitle}>Session Statistics</Text>

              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="fire"
                    size={20}
                    color={designSystem.colors.accentYellow}
                  />
                  <Text style={styles.statLabel}>Calories Burned</Text>
                </View>
                <Text style={styles.statValue}>{calories.toFixed(1)}</Text>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={20} color={designSystem.colors.accent} />
                  <Text style={styles.statLabel}>Active Duration</Text>
                </View>
                <Text style={styles.statValue}>{formatDuration(duration)}</Text>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="heart-pulse"
                    size={20}
                    color={designSystem.colors.error}
                  />
                  <Text style={styles.statLabel}>Beats Per Minute</Text>
                </View>
                <Text style={styles.statValue}>{bpm} BPM</Text>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="chart-line" size={20} color={getFlowStateColor()} />
                  <Text style={styles.statLabel}>Flow Score</Text>
                </View>
                <Text style={[styles.statValue, { color: getFlowStateColor() }]}>
                  {movementScore.toFixed(0)}%
                </Text>
              </View>
            </GlassCard>

            {/* Flow State Breakdown */}
            <GlassCard style={styles.flowStatesCard}>
              <Text style={styles.sectionTitle}>Flow State Progress</Text>
              <View style={styles.flowStates}>
                {[
                  { name: 'Warming Up', threshold: 0, icon: '🔥' },
                  { name: 'In Rhythm', threshold: 25, icon: '⚡' },
                  { name: 'Peak Flow', threshold: 50, icon: '💫' },
                  { name: 'Transcendent', threshold: 75, icon: '✨' },
                ].map((state, _index) => (
                  <View
                    key={state.name}
                    style={[
                      styles.flowState,
                      {
                        opacity: movementScore > state.threshold ? 1 : 0.3,
                        borderColor:
                          movementScore > state.threshold
                            ? getFlowStateColor()
                            : designSystem.colors.surface,
                      },
                    ]}
                  >
                    <Text style={styles.flowStateEmoji}>{state.icon}</Text>
                    <Text style={styles.flowStateText}>{state.name}</Text>
                    <Text style={styles.flowStateThreshold}>{state.threshold}%+</Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* Performance Insights */}
            <GlassCard style={styles.insightsCard}>
              <Text style={styles.sectionTitle}>Performance Insights</Text>

              {movementScore > 80 && (
                <View style={styles.insight}>
                  <MaterialCommunityIcons
                    name="trending-up"
                    size={16}
                    color={designSystem.colors.success}
                  />
                  <Text style={styles.insightText}>Excellent flow state! You're in the zone.</Text>
                </View>
              )}

              {movementScore > 50 && movementScore <= 80 && (
                <View style={styles.insight}>
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={16}
                    color={designSystem.colors.accentYellow}
                  />
                  <Text style={styles.insightText}>
                    Good rhythm! Keep moving to reach peak flow.
                  </Text>
                </View>
              )}

              {movementScore <= 50 && (
                <View style={styles.insight}>
                  <MaterialCommunityIcons
                    name="help-circle"
                    size={16}
                    color={designSystem.colors.primary}
                  />
                  <Text style={styles.insightText}>
                    Getting warmed up. Let the music guide your movement.
                  </Text>
                </View>
              )}

              {duration > 600 && (
                <View style={styles.insight}>
                  <MaterialCommunityIcons
                    name="trophy"
                    size={16}
                    color={designSystem.colors.accentYellow}
                  />
                  <Text style={styles.insightText}>
                    10+ minute session! Bonus multiplier activated.
                  </Text>
                </View>
              )}
            </GlassCard>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: `${designSystem.colors.background}95`,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(40),
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    paddingBottom: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: `${designSystem.colors.textTertiary}20`,
  },
  modalTitle: {
    fontSize: moderateScale(20),
    color: designSystem.colors.text,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: scale(4),
  },
  chartCard: {
    marginBottom: verticalScale(16),
  },
  chartTitle: {
    fontSize: moderateScale(16),
    color: designSystem.colors.text,
    fontWeight: '600',
    marginBottom: verticalScale(12),
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: verticalScale(80),
    gap: scale(4),
  },
  chartBar: {
    flex: 1,
    borderRadius: scale(2),
  },
  detailedStats: {
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    color: designSystem.colors.text,
    fontWeight: '600',
    marginBottom: verticalScale(16),
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    paddingVertical: verticalScale(8),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    marginLeft: scale(12),
  },
  statValue: {
    fontSize: moderateScale(14),
    color: designSystem.colors.text,
    fontWeight: 'bold',
  },
  flowStatesCard: {
    marginBottom: verticalScale(16),
  },
  flowStates: {
    gap: verticalScale(12),
  },
  flowState: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
    backgroundColor: `${designSystem.colors.surface}40`,
  },
  flowStateEmoji: {
    fontSize: moderateScale(20),
    marginRight: scale(12),
  },
  flowStateText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.text,
    fontWeight: '500',
    flex: 1,
  },
  flowStateThreshold: {
    fontSize: moderateScale(12),
    color: designSystem.colors.textSecondary,
  },
  insightsCard: {
    marginBottom: verticalScale(16),
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
    padding: scale(12),
    backgroundColor: `${designSystem.colors.primary}10`,
    borderRadius: scale(8),
  },
  insightText: {
    fontSize: moderateScale(13),
    color: designSystem.colors.text,
    lineHeight: moderateScale(18),
    marginLeft: scale(8),
    flex: 1,
  },
})
