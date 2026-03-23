import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
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

// Ring dimensions for dance timer
const RING_SIZE = screenWidth * 0.75
const STROKE_WIDTH = 20
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export const DanceScreen: React.FC = () => {
  const navigation = useNavigation()
  const [createFreestyleSession] = useCreateFreestyleSessionMutation()

  const [seconds, setSeconds] = useState(0)
  const [bpm, setBpm] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [xpEarned, setXpEarned] = useState(0)
  const [motionIntensity, setMotionIntensity] = useState(0)
  const [movementScore, setMovementScore] = useState(0)
  const [peakBPM, setPeakBPM] = useState(0)
  const [motionData, setMotionData] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const beatAnim = useRef(new Animated.Value(1)).current

  // Calculate progress (3 minute sessions)
  const sessionGoal = 180 // 3 minutes in seconds
  const progress = Math.min((seconds / sessionGoal) * 100, 100)
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
  }, [fadeAnim, glowAnim, pulseAnim])

  // Initialize motion sensors on mount
  useEffect(() => {
    const initSensors = async () => {
      try {
        const status = await motionService.initialize()
        console.log('Motion sensors initialized:', status)

        if (!status.accelerometer) {
          Toast.show({
            type: 'warning',
            text1: 'Motion Sensors Unavailable',
            text2: 'Using simulated data for this session',
          })
        }
      } catch (error) {
        console.error('Failed to initialize motion sensors:', error)
      }
    }

    initSensors()
  }, [])

  // Start motion tracking when component mounts
  useEffect(() => {
    if (isActive) {
      motionService.startMotionTracking(
        data => {
          // Update motion intensity
          setMotionIntensity(data.intensity)

          // Update BPM if available
          if (data.bpm) {
            setBpm(data.bpm)
            setPeakBPM(prev => Math.max(prev, data.bpm || 0))

            // Beat animation
            Animated.sequence([
              Animated.timing(beatAnim, {
                toValue: 1.2,
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

          // Calculate movement score (0-100 based on intensity)
          const score = Math.min(Math.floor(data.intensity * 100), 100)
          setMovementScore(score)

          // Collect motion data samples every second (for backend analysis)
          setMotionData(prev => {
            // Keep only last 600 samples (10 min max)
            const newData = [
              ...prev,
              {
                timestamp: Date.now(),
                intensity: data.intensity,
                bpm: data.bpm,
              },
            ]
            return newData.slice(-600)
          })
        },
        confidence => {
          // Beat match callback - trigger haptic feedback
          if (confidence > 0.7) {
            motionService.playBeatFeedback()
          }
        },
      )
    }

    return () => {
      if (!isActive) {
        motionService.stopMotionTracking()
      }
    }
  }, [isActive, beatAnim])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1)

        // Calculate XP earned based on motion intensity (1-5 XP per second based on intensity)
        const intensityMultiplier = Math.max(motionIntensity, 0.2) // Minimum 0.2 multiplier
        const xpGain = Math.floor(2 * intensityMultiplier)
        setXpEarned(prev => prev + xpGain)
      }, 1000)
    } else if (!isActive && seconds !== 0) {
      if (interval) clearInterval(interval)
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsActive(!isActive)
  }

  const handleStop = async () => {
    if (isSaving) return
    setIsSaving(true)
    setIsActive(false)

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Stop motion tracking
    motionService.stopMotionTracking()

    try {
      // Save session to backend via GraphQL
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

        Toast.show({
          type: 'success',
          text1: 'Dance Session Complete! 💃',
          text2: `+${pointsEarned} points earned • Score: ${movementScore}`,
          visibilityTime: 3000,
        })

        // Navigate back after showing toast
        setTimeout(() => {
          navigation.goBack()
        }, 1500)
      }
    } catch (error) {
      console.error('[DanceScreen] Failed to save session:', error)
      Toast.show({
        type: 'error',
        text1: 'Failed to Save Session',
        text2: 'Please try again',
      })
      setIsSaving(false)
      setIsActive(true)
    }
  }

  const handleMinimize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.goBack()
  }

  const id = useId()

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.closeButton} onPress={handleStop}>
        <Ionicons name="close" size={ms(24)} color="white" />
      </TouchableOpacity>

      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>🔥 DANCING</Text>
      </View>

      <TouchableOpacity style={styles.minimizeButton} onPress={handleMinimize}>
        <Feather name="minimize-2" size={ms(22)} color="white" />
      </TouchableOpacity>
    </View>
  )

  const renderProgressRing = () => (
    <View style={styles.progressContainer}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glowEffect,
          {
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FF6B6B', '#FF1493', '#B967FF', 'transparent']}
          style={styles.glowGradient}
        />
      </Animated.View>

      {/* SVG Progress Ring */}
      <Svg width={RING_SIZE} height={RING_SIZE} style={styles.progressRing}>
        <Defs>
          <SvgGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B6B" />
            <Stop offset="50%" stopColor="#FF1493" />
            <Stop offset="100%" stopColor="#B967FF" />
          </SvgGradient>
        </Defs>

        {/* Background ring */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />

        {/* Progress ring */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={`url(#${id})`}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.ringCenter}>
        <Animated.Text style={[styles.timerText, { transform: [{ scale: beatAnim }] }]}>
          {formatTime(seconds)}
        </Animated.Text>
        <Text style={styles.bpmText}>{bpm || '--'} BPM</Text>
        <View style={styles.earnedContainer}>
          <Text style={styles.earnedAmount}>+{Math.floor(xpEarned)}</Text>
          <Text style={styles.earnedLabel}>XP EARNED</Text>
        </View>
      </View>
    </View>
  )

  const renderStats = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <MaterialCommunityIcons name="fire" size={24} color="#FF6B6B" />
        <Text style={styles.statValue}>{Math.floor(seconds * 0.15)}</Text>
        <Text style={styles.statLabel}>Calories</Text>
      </View>

      <View style={styles.statCard}>
        <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFD700" />
        <Text style={styles.statValue}>{movementScore}</Text>
        <Text style={styles.statLabel}>Score</Text>
      </View>

      <View style={styles.statCard}>
        <MaterialCommunityIcons name="music-note" size={24} color="#B967FF" />
        <Text style={styles.statValue}>{Math.floor(seconds / 30)}</Text>
        <Text style={styles.statLabel}>Songs</Text>
      </View>
    </View>
  )

  const renderControls = () => (
    <View style={styles.controls}>
      <TouchableOpacity
        style={styles.controlButton}
        onPress={handlePauseResume}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={isActive ? ['#FF6B6B', '#FF1493'] : ['#4ADE80', '#22C55E']}
          style={styles.controlGradient}
        >
          <Ionicons name={isActive ? 'pause' : 'play'} size={32} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, styles.stopButton]}
        onPress={handleStop}
        activeOpacity={0.9}
      >
        <View style={styles.stopButtonInner}>
          <Ionicons name="stop" size={32} color="#FF6B6B" />
        </View>
      </TouchableOpacity>
    </View>
  )

  return (
    <LinearGradient colors={['#1A0033', '#2D1B69', '#0A0033']} style={styles.container}>
      <SafeAreaView style={[styles.safeArea]}>
        <StatusBar barStyle="light-content" backgroundColor="#1A0033" />

        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {renderHeader()}

          <View style={styles.content}>
            {renderProgressRing()}
            {renderStats()}
            {renderControls()}
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  closeButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimizeButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B6B',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    width: RING_SIZE * 1.2,
    height: RING_SIZE * 1.2,
    borderRadius: RING_SIZE * 0.6,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
  },
  progressRing: {
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  bpmText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  earnedContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  earnedAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFD700',
  },
  earnedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 24,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  controlGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'visible',
  },
  stopButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 40,
  },
})
