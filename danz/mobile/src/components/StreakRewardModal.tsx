import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { designSystem } from '../styles/designSystem'
import { fs, hs, ms, vs } from '../utils/responsive'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface StreakRewardModalProps {
  visible: boolean
  onClose: () => void
  streakData: {
    currentStreak: number
    bestStreak: number
    reward: number
    isNewRecord: boolean
    milestone?: number // 7, 14, 30, 60, 100, 365
  }
}

export const StreakRewardModal: React.FC<StreakRewardModalProps> = ({
  visible,
  onClose,
  streakData,
}) => {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose()
    })
  }

  useEffect(() => {
    if (visible) {
      // Trigger haptic on show
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start()

      // Animate the streak icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [visible, fadeAnim, handleClose, rotateAnim, scaleAnim, slideAnim])

  const getStreakMessage = () => {
    const { currentStreak, milestone } = streakData

    if (milestone) {
      switch (milestone) {
        case 7:
          return { title: 'Week Warrior! 🎯', subtitle: '7 days of pure dedication!' }
        case 14:
          return { title: 'Fortnight Fighter! 💪', subtitle: 'Two weeks strong!' }
        case 30:
          return { title: 'Monthly Master! 🏆', subtitle: '30 days of consistency!' }
        case 60:
          return { title: 'Double Month Marvel! 🌟', subtitle: '60 days of excellence!' }
        case 100:
          return { title: 'Century Champion! 👑', subtitle: '100 days legendary!' }
        case 365:
          return { title: 'YEAR OF DANCE! 🎊', subtitle: '365 days of pure magic!' }
        default:
          return { title: `${currentStreak} Day Streak! 🔥`, subtitle: 'Keep the momentum going!' }
      }
    }

    if (currentStreak === 1) {
      return { title: 'Welcome Back! 🎉', subtitle: 'Your journey continues!' }
    } else if (currentStreak <= 3) {
      return { title: 'Building Momentum! ⚡', subtitle: `${currentStreak} days and counting!` }
    } else {
      return { title: `${currentStreak} Day Streak! 🔥`, subtitle: "You're on fire!" }
    }
  }

  const getRewardTier = () => {
    const { currentStreak } = streakData
    if (currentStreak >= 365) return { color: '#FFD700', label: 'LEGENDARY' }
    if (currentStreak >= 100) return { color: '#E91E63', label: 'EPIC' }
    if (currentStreak >= 60) return { color: '#9C27B0', label: 'RARE' }
    if (currentStreak >= 30) return { color: '#3F51B5', label: 'SUPER' }
    if (currentStreak >= 14) return { color: '#00BCD4', label: 'GREAT' }
    if (currentStreak >= 7) return { color: '#4CAF50', label: 'GOOD' }
    return { color: '#FF6B6B', label: 'ACTIVE' }
  }

  const message = getStreakMessage()
  const tier = getRewardTier()
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        {/* Backdrop with blur */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(255, 110, 199, 0.15)', 'rgba(185, 103, 255, 0.15)']}
            style={styles.gradientBackground}
          >
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={ms(24)} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            {/* Streak Icon */}
            <Animated.View style={[styles.iconContainer, { transform: [{ rotate: spin }] }]}>
              <LinearGradient
                colors={[tier.color, designSystem.colors.secondary]}
                style={styles.iconGradient}
              >
                <MaterialCommunityIcons name="fire" size={ms(48)} color="white" />
              </LinearGradient>
            </Animated.View>

            {/* Streak Count */}
            <View style={styles.streakCountContainer}>
              <Text style={[styles.streakCount, { color: tier.color }]}>
                {streakData.currentStreak}
              </Text>
              <Text style={styles.streakLabel}>DAY STREAK</Text>
            </View>

            {/* Message */}
            <Text style={styles.title}>{message.title}</Text>
            <Text style={styles.subtitle}>{message.subtitle}</Text>

            {/* Reward Info */}
            <View style={styles.rewardContainer}>
              <View style={styles.rewardBox}>
                <MaterialCommunityIcons name="cash" size={ms(24)} color="#FFD700" />
                <Text style={styles.rewardAmount}>+{streakData.reward}</Text>
                <Text style={styles.rewardLabel}>$DANZ</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{streakData.bestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: tier.color }]}>{tier.label}</Text>
                <Text style={styles.statLabel}>Tier</Text>
              </View>
            </View>

            {/* New Record Badge */}
            {streakData.isNewRecord && (
              <View style={styles.newRecordBadge}>
                <LinearGradient colors={['#FFD700', '#FFA000']} style={styles.newRecordGradient}>
                  <MaterialCommunityIcons name="trophy" size={ms(16)} color="white" />
                  <Text style={styles.newRecordText}>NEW RECORD!</Text>
                </LinearGradient>
              </View>
            )}

            {/* Progress to next milestone */}
            {streakData.currentStreak < 365 && (
              <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>
                  Next milestone: {getNextMilestone(streakData.currentStreak)} days
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressToNextMilestone(streakData.currentStreak)}%`,
                        backgroundColor: tier.color,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity style={styles.continueButton} onPress={handleClose}>
              <LinearGradient
                colors={[designSystem.colors.primary, designSystem.colors.secondary]}
                style={styles.continueGradient}
              >
                <Text style={styles.continueText}>Keep Dancing!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  )
}

const getNextMilestone = (currentStreak: number): number => {
  const milestones = [7, 14, 30, 60, 100, 365]
  return milestones.find(m => m > currentStreak) || 365
}

const getProgressToNextMilestone = (currentStreak: number): number => {
  const milestones = [7, 14, 30, 60, 100, 365]
  const nextMilestone = milestones.find(m => m > currentStreak) || 365
  const prevMilestone = [...milestones].reverse().find(m => m <= currentStreak) || 0

  const progress = ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100
  return Math.min(progress, 100)
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    backgroundColor: designSystem.colors.background,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    maxHeight: screenHeight * 0.75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  gradientBackground: {
    paddingTop: vs(32),
    paddingHorizontal: hs(24),
    paddingBottom: vs(40),
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: vs(16),
    right: hs(16),
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: vs(20),
  },
  iconGradient: {
    width: ms(96),
    height: ms(96),
    borderRadius: ms(48),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  streakCountContainer: {
    alignItems: 'center',
    marginBottom: vs(16),
  },
  streakCount: {
    fontSize: fs(48),
    fontWeight: '900',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  streakLabel: {
    fontSize: fs(12),
    fontWeight: '700',
    color: designSystem.colors.textSecondary,
    letterSpacing: 2,
  },
  title: {
    fontSize: fs(24),
    fontWeight: 'bold',
    color: designSystem.colors.text,
    marginBottom: vs(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fs(16),
    color: designSystem.colors.textSecondary,
    marginBottom: vs(24),
    textAlign: 'center',
  },
  rewardContainer: {
    marginBottom: vs(24),
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: ms(16),
    paddingVertical: vs(12),
    paddingHorizontal: hs(20),
    gap: hs(8),
  },
  rewardAmount: {
    fontSize: fs(20),
    fontWeight: 'bold',
    color: '#FFD700',
  },
  rewardLabel: {
    fontSize: fs(14),
    color: '#FFD700',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    padding: ms(16),
    marginBottom: vs(24),
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fs(20),
    fontWeight: 'bold',
    color: designSystem.colors.text,
    marginBottom: vs(4),
  },
  statLabel: {
    fontSize: fs(12),
    color: designSystem.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: vs(30),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: hs(20),
  },
  newRecordBadge: {
    position: 'absolute',
    top: vs(80),
    right: hs(40),
    borderRadius: ms(12),
    overflow: 'hidden',
  },
  newRecordGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(6),
    paddingHorizontal: hs(12),
    gap: hs(4),
  },
  newRecordText: {
    fontSize: fs(12),
    fontWeight: 'bold',
    color: 'white',
  },
  progressSection: {
    width: '100%',
    marginBottom: vs(24),
  },
  progressLabel: {
    fontSize: fs(12),
    color: designSystem.colors.textSecondary,
    marginBottom: vs(8),
    textAlign: 'center',
  },
  progressBar: {
    height: vs(4),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: vs(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: vs(2),
  },
  continueButton: {
    width: '100%',
    borderRadius: ms(12),
    overflow: 'hidden',
  },
  continueGradient: {
    paddingVertical: vs(16),
    alignItems: 'center',
  },
  continueText: {
    fontSize: fs(16),
    fontWeight: '600',
    color: 'white',
  },
})
