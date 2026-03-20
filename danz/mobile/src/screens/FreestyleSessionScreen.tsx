import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg'
import Toast from 'react-native-toast-message'
import { MusicSource, useCreateFreestyleSessionMutation } from '@/generated/graphql'
import motionService from '../services/motionService'
import { ms } from '../utils/responsive'

const { width: screenWidth } = Dimensions.get('window')

// Ring dimensions for freestyle timer
const RING_SIZE = screenWidth * 0.65
const STROKE_WIDTH = 16
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Max session time: 10 minutes = 600 seconds
const MAX_SESSION_SECONDS = 600

export const FreestyleSessionScreen: React.FC = () => {
  const navigation = useNavigation()
  const [createFreestyleSession] = useCreateFreestyleSessionMutation()

  const [seconds, setSeconds] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [motionIntensity, setMotionIntensity] = useState(0)
  const [movementScore, setMovementScore] = useState(0)
  const [motionData, setMotionData] = useState<any[]>([])

  // Music state
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [showMusicModal, setShowMusicModal] = useState(false)

  // Partner finder state
  const [showPartnerModal, setShowPartnerModal] = useState(false)

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const beatAnim = useRef(new Animated.Value(1)).current

  // Burning animation values
  const burnAnim = useRef(new Animated.Value(0)).current
  const flameAnim = useRef(new Animated.Value(0)).current
  const sparkAnim = useRef(new Animated.Value(0)).current

  // Calculate progress (max 10 minutes)
  const progress = Math.min((seconds / MAX_SESSION_SECONDS) * 100, 100)
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress / 100)

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    // Flame animation for burning effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(flameAnim, {
          toValue: 0.6,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    // Spark animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(sparkAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [fadeAnim, glowAnim, pulseAnim, flameAnim, sparkAnim])

  // Update burn animation based on intensity
  useEffect(() => {
    Animated.timing(burnAnim, {
      toValue: motionIntensity,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }, [motionIntensity, burnAnim])

  // Initialize motion sensors on mount
  useEffect(() => {
    const initSensors = async () => {
      try {
        const status = await motionService.initialize()
        console.log('Motion sensors initialized:', status)

        if (!status.isAvailable) {
          Toast.show({
            type: 'error',
            text1: 'Motion Sensors Unavailable',
            text2: 'Motion tracking requires device sensors',
          })
          return
        }

        // Start motion tracking with real-time updates
        motionService.startMotionTracking(
          (data) => {
            // Update motion intensity in real-time
            setMotionIntensity(data.intensity)

            // Calculate and update movement score (0-100)
            const score = Math.min(data.intensity * 100, 100)
            setMovementScore(prevScore => Math.max(prevScore, score))

            // Haptic feedback on high intensity movement
            if (data.intensity > 0.7) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
          },
          (beatConfidence) => {
            // Optional: haptic feedback on beat detection
            if (beatConfidence > 0.6) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
            }
          }
        )

        console.log('Motion tracking started')
      } catch (error) {
        console.error('Failed to initialize motion sensors:', error)
      }
    }

    initSensors()

    // Cleanup on unmount
    return () => {
      if (motionService.isTracking()) {
        motionService.stopTracking()
      }
    }
  }, [])

  // Timer - motion is now tracked in real-time via callback
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && seconds < MAX_SESSION_SECONDS) {
      interval = setInterval(() => {
        setSeconds(s => s + 1)

        // Store motion data sample every second for session save
        const sample = motionService.getLatestMotionData()
        if (sample) {
          setMotionData(prev => [...prev, { ...sample, timestamp: Date.now() }])
        }

        // Beat animation based on current motion intensity
        if (motionIntensity > 0.3) {
          Animated.sequence([
            Animated.timing(beatAnim, {
              toValue: 1.1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(beatAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start()
        }
      }, 1000)
    } else if (seconds >= MAX_SESSION_SECONDS && isActive) {
      // Auto-stop at 10 minutes
      handleStop()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, seconds, motionIntensity])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePauseResume = () => {
    setIsActive(!isActive)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleStop = async () => {
    setIsActive(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

    // Stop music if playing
    if (isMusicPlaying) {
      setIsMusicPlaying(false)
    }

    try {
      // Save freestyle session
      const { data } = await createFreestyleSession({
        variables: {
          input: {
            duration_seconds: seconds,
            movement_score: movementScore,
            music_source: MusicSource.Licensed,
            motion_data: motionData.length > 0 ? motionData : undefined,
            completed: true,
          },
        },
      })

      if (data?.createFreestyleSession) {
        const pointsEarned = data.createFreestyleSession.points_awarded
        const achievementsUnlocked = data.createFreestyleSession.achievements_unlocked || []

        // Show session complete toast
        Toast.show({
          type: 'success',
          text1: 'Freestyle Complete! 🎉',
          text2: `+${pointsEarned} points earned`,
        })

        // Show achievement unlock notifications
        if (achievementsUnlocked.length > 0) {
          // Delay achievement toasts so they appear after session complete toast
          setTimeout(() => {
            achievementsUnlocked.forEach((achievementType: string, index: number) => {
              setTimeout(() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                Toast.show({
                  type: 'success',
                  text1: 'Achievement Unlocked!',
                  text2: achievementType.replace(/_/g, ' '),
                  visibilityTime: 3000,
                })
              }, index * 1500) // Stagger achievement toasts
            })
          }, 2500)
        }

        // Navigate back after showing notifications
        const navDelay = achievementsUnlocked.length > 0
          ? 2500 + (achievementsUnlocked.length * 1500) + 1000
          : 2000
        setTimeout(() => {
          navigation.goBack()
        }, navDelay)
      }
    } catch (error) {
      console.error('Failed to save freestyle session:', error)
      Toast.show({
        type: 'error',
        text1: 'Failed to Save Session',
        text2: 'Please try again',
      })
    }

    // Stop motion tracking
    if (motionService.isTracking()) {
      motionService.stopTracking()
    }
  }

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    Alert.alert('Cancel Freestyle?', 'Your progress will be lost', [
      { text: 'Continue', style: 'cancel' },
      {
        text: 'Cancel Session',
        style: 'destructive',
        onPress: () => {
          if (motionService.isTracking()) {
            motionService.stopTracking()
          }
          setIsMusicPlaying(false)
          navigation.goBack()
        },
      },
    ])
  }

  // Music handlers
  const handleToggleMusic = () => {
    setShowMusicModal(true)
  }

  const getIntensityColor = () => {
    if (motionIntensity > 0.7) return '#FF4500' // Orange-red for high intensity
    if (motionIntensity > 0.4) return '#FF6B00' // Orange for medium
    return '#FFD600' // Yellow for low
  }

  const getBurnGradient = (): readonly [string, string, ...string[]] => {
    if (motionIntensity > 0.7) return ['#FF0000', '#FF4500', '#FF6B00', '#FFD600'] as const
    if (motionIntensity > 0.4) return ['#FF4500', '#FF6B00', '#FFD600', '#FFFF00'] as const
    return ['#FF6B00', '#FFD600', '#FFFF00', '#FFF8DC'] as const
  }

  const timeRemaining = MAX_SESSION_SECONDS - seconds

  // Render burning intensity bar
  const renderBurningIntensityBar = () => {
    const barWidth = burnAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    })

    return (
      <View style={styles.intensityContainer}>
        <View style={styles.intensityHeader}>
          <Text style={styles.intensityLabel}>Movement Intensity</Text>
          <View style={styles.intensityIconContainer}>
            <Animated.View style={{ opacity: flameAnim, transform: [{ scale: flameAnim }] }}>
              <MaterialCommunityIcons name="fire" size={20} color={getIntensityColor()} />
            </Animated.View>
          </View>
        </View>

        <View style={styles.intensityBarContainer}>
          {/* Background glow effect */}
          <Animated.View
            style={[
              styles.intensityGlow,
              {
                width: barWidth,
                opacity: burnAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.3, 0.6],
                }),
              },
            ]}
          />

          {/* Main burning bar */}
          <Animated.View style={[styles.intensityBarOuter, { width: barWidth }]}>
            <LinearGradient
              colors={getBurnGradient()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.intensityBarGradient}
            />

            {/* Flame tips at the end */}
            {motionIntensity > 0.3 && (
              <Animated.View
                style={[
                  styles.flameTip,
                  {
                    opacity: flameAnim,
                    transform: [
                      {
                        translateY: flameAnim.interpolate({
                          inputRange: [0.6, 1],
                          outputRange: [0, -3],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <MaterialCommunityIcons name="fire" size={16} color="#FF4500" />
              </Animated.View>
            )}
          </Animated.View>

          {/* Sparks */}
          {motionIntensity > 0.5 && (
            <>
              <Animated.View
                style={[
                  styles.spark,
                  {
                    left: `${motionIntensity * 80}%`,
                    opacity: sparkAnim,
                    transform: [
                      {
                        translateY: sparkAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -8],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.spark,
                  {
                    left: `${motionIntensity * 60}%`,
                    opacity: sparkAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                    transform: [
                      {
                        translateY: sparkAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-4, -12],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </>
          )}
        </View>

        <Text style={[styles.intensityPercent, { color: getIntensityColor() }]}>
          {Math.round(motionIntensity * 100)}%
        </Text>
      </View>
    )
  }

  // Render music modal with coming soon empty state
  const renderMusicModal = () => (
    <Modal
      visible={showMusicModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowMusicModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Music</Text>
            <TouchableOpacity onPress={() => setShowMusicModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="music-note-plus" size={64} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyStateTitle}>Music integration coming soon</Text>
            <Text style={styles.emptyStateDescription}>
              Connect your favorite music services and dance to your own beats
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  )

  // Render partner finder modal with coming soon empty state
  const renderPartnerModal = () => (
    <Modal
      visible={showPartnerModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPartnerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Find Dance Partner</Text>
            <TouchableOpacity onPress={() => setShowPartnerModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="account-group" size={64} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyStateTitle}>Partner discovery coming soon</Text>
            <Text style={styles.emptyStateDescription}>
              Invite friends from your FlowBond group to join freestyle sessions together
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1a0033', '#330066', '#1a0033']}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Danz Now!</Text>
          <TouchableOpacity style={styles.partnerButton} onPress={() => setShowPartnerModal(true)}>
            <MaterialCommunityIcons name="account-plus" size={24} color="#FF6B9D" />
          </TouchableOpacity>
        </View>

        {/* Timer Ring */}
        <View style={styles.timerContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svg}>
            <Defs>
              <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FF6B9D" stopOpacity="1" />
                <Stop offset="100%" stopColor="#C471ED" stopOpacity="1" />
              </SvgGradient>
            </Defs>

            {/* Background Ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />

            {/* Progress Ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke="url(#ringGradient)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>

          <Animated.View
            style={[
              styles.timerContent,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Text style={styles.timerText}>{formatTime(seconds)}</Text>
            <Text style={styles.timerLabel}>
              {timeRemaining > 0 ? `${Math.ceil(timeRemaining / 60)}min left` : 'Max time!'}
            </Text>

            {/* Movement Score Indicator */}
            <Animated.View
              style={[
                styles.scoreContainer,
                {
                  transform: [{ scale: beatAnim }],
                  backgroundColor: `${getIntensityColor()}20`,
                  borderColor: getIntensityColor(),
                },
              ]}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={20} color={getIntensityColor()} />
              <Text style={[styles.scoreText, { color: getIntensityColor() }]}>
                {Math.round(movementScore)}
              </Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Burning Motion Intensity Bar */}
        {renderBurningIntensityBar()}

        {/* Control Buttons */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.musicButton]}
            onPress={handleToggleMusic}
          >
            <MaterialCommunityIcons
              name="music-note-plus"
              size={28}
              color="#fff"
            />
            <Text style={styles.controlText}>Add Music</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.pauseButton]}
            onPress={handlePauseResume}
          >
            <Feather name={isActive ? 'pause' : 'play'} size={32} color="#fff" />
            <Text style={styles.controlText}>{isActive ? 'Pause' : 'Resume'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStop}
            disabled={seconds < 10}
          >
            <Feather name="square" size={28} color="#fff" />
            <Text style={styles.controlText}>Finish</Text>
          </TouchableOpacity>
        </View>

        {/* Info Text */}
        <Text style={styles.infoText}>
          {seconds < 10
            ? 'Dance for at least 10 seconds'
            : `Keep moving! ${Math.round((seconds / MAX_SESSION_SECONDS) * 100)}% complete`}
        </Text>
      </Animated.View>

      {renderMusicModal()}
      {renderPartnerModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: ms(20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: ms(12),
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: ms(22),
    fontWeight: '800',
    color: '#fff',
  },
  partnerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 157, 0.15)',
    borderRadius: 22,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: ms(20),
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  timerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerText: {
    fontSize: ms(48),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -2,
  },
  timerLabel: {
    fontSize: ms(14),
    color: '#fff',
    opacity: 0.6,
    marginTop: ms(4),
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(12),
    paddingHorizontal: ms(16),
    paddingVertical: ms(8),
    borderRadius: ms(20),
    borderWidth: 2,
  },
  scoreText: {
    fontSize: ms(18),
    fontWeight: '700',
    marginLeft: ms(4),
  },
  intensityContainer: {
    marginTop: ms(32),
    paddingHorizontal: ms(8),
  },
  intensityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(10),
  },
  intensityLabel: {
    fontSize: ms(14),
    color: '#fff',
    opacity: 0.7,
  },
  intensityIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityBarContainer: {
    height: ms(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: ms(8),
    overflow: 'visible',
    position: 'relative',
  },
  intensityGlow: {
    position: 'absolute',
    height: ms(24),
    top: -4,
    left: 0,
    borderRadius: ms(12),
    backgroundColor: '#FF6B00',
  },
  intensityBarOuter: {
    height: '100%',
    borderRadius: ms(8),
    overflow: 'hidden',
    position: 'relative',
  },
  intensityBarGradient: {
    flex: 1,
  },
  flameTip: {
    position: 'absolute',
    right: -8,
    top: -4,
  },
  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD600',
    top: -4,
  },
  intensityPercent: {
    fontSize: ms(14),
    fontWeight: '700',
    textAlign: 'right',
    marginTop: ms(6),
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ms(16),
    marginTop: ms(32),
  },
  controlButton: {
    alignItems: 'center',
    paddingVertical: ms(14),
    paddingHorizontal: ms(20),
    borderRadius: ms(16),
    minWidth: ms(90),
  },
  musicButton: {
    backgroundColor: 'rgba(196, 113, 237, 0.25)',
  },
  pauseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  stopButton: {
    backgroundColor: '#FF6B9D',
  },
  controlText: {
    fontSize: ms(12),
    fontWeight: '600',
    color: '#fff',
    marginTop: ms(6),
  },
  infoText: {
    fontSize: ms(14),
    color: '#fff',
    opacity: 0.6,
    textAlign: 'center',
    marginTop: ms(24),
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a0033',
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    paddingHorizontal: ms(20),
    paddingTop: ms(20),
    paddingBottom: ms(40),
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(8),
  },
  modalTitle: {
    fontSize: ms(20),
    fontWeight: '700',
    color: '#fff',
  },
  // Empty state styles for modals
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(48),
    paddingHorizontal: ms(24),
  },
  emptyStateTitle: {
    fontSize: ms(18),
    fontWeight: '600',
    color: '#fff',
    marginTop: ms(20),
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: ms(14),
    color: 'rgba(255,255,255,0.5)',
    marginTop: ms(10),
    textAlign: 'center',
    lineHeight: ms(20),
  },
})
