// Movement Tracking Screen - No Scroll Design

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MovementDetailsModal } from '../components/MovementDetailsModal'
import { ProTipsModal } from '../components/ProTipsModal'
import { GlassCard } from '../components/ui/AnimatedComponents'
import { designSystem } from '../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../styles/responsive'

const { width, height } = Dimensions.get('window')

export const MovementTrackingScreen = () => {
  const [isTracking, setIsTracking] = useState(false)
  const [bpm, setBpm] = useState(0)
  const [movementScore, setMovementScore] = useState(0)
  const [calories, setCalories] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentSong, setCurrentSong] = useState('Waiting for music...')
  const [_flowState, _setFlowState] = useState('neutral')
  const [showProTips, setShowProTips] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const pulseAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0)).current
  const _glowAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isTracking) {
      // Start animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start()

      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
      ).start()

      // Simulate tracking data
      const interval = setInterval(() => {
        setBpm(Math.floor(120 + Math.random() * 40))
        setMovementScore(prev => Math.min(100, prev + Math.random() * 5))
        setCalories(prev => prev + Math.random() * 0.5)
        setDuration(prev => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isTracking, pulseAnim, rotateAnim])

  const toggleTracking = () => {
    setIsTracking(!isTracking)
    if (!isTracking) {
      // Reset values when starting
      setMovementScore(0)
      setCalories(0)
      setDuration(0)
      setCurrentSong('Shape of You - Ed Sheeran')

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getFlowStateColor = () => {
    if (movementScore > 80) return designSystem.colors.success
    if (movementScore > 50) return designSystem.colors.accentYellow
    return designSystem.colors.primary
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={designSystem.colors.gradients.dark}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated Background Circles */}
      <Animated.View
        style={[
          styles.bgCircle1,
          {
            transform: [
              { scale: scaleAnim },
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bgCircle2,
          {
            transform: [
              { scale: scaleAnim },
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '-360deg'],
                }),
              },
            ],
          },
        ]}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={designSystem.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Movement Tracking</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.tipsButton} onPress={() => setShowProTips(true)}>
            <MaterialCommunityIcons
              name="lightbulb-on"
              size={20}
              color={designSystem.colors.accentYellow}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={20} color={designSystem.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tracking Circle */}
      <View style={styles.trackingContainer}>
        <Animated.View
          style={[
            styles.outerRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: isTracking ? 1 : 0.3,
            },
          ]}
        >
          <LinearGradient
            colors={designSystem.colors.gradients.primary}
            style={styles.ringGradient}
          />
        </Animated.View>

        <TouchableOpacity
          onPress={toggleTracking}
          style={styles.trackingButton}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              isTracking
                ? designSystem.colors.gradients.fire
                : designSystem.colors.gradients.primary
            }
            style={styles.trackingButtonGradient}
          >
            {isTracking ? (
              <View style={styles.trackingContent}>
                <MaterialCommunityIcons
                  name="pause"
                  size={moderateScale(40)}
                  color={designSystem.colors.text}
                />
                <Text style={styles.trackingStatus}>Dancing</Text>
                <Text style={styles.trackingBPM}>{bpm} BPM</Text>
              </View>
            ) : (
              <View style={styles.trackingContent}>
                <MaterialCommunityIcons
                  name="music"
                  size={moderateScale(40)}
                  color={designSystem.colors.text}
                />
                <Text style={styles.trackingStatus}>Start Dancing</Text>
                <Text style={styles.trackingHint}>Tap to begin</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Current Song - Compact */}
      {isTracking && (
        <GlassCard style={styles.songCard}>
          <View style={styles.songInfo}>
            <MaterialCommunityIcons
              name="music-note"
              size={18}
              color={designSystem.colors.primary}
            />
            <View style={styles.songText}>
              <Text style={styles.songTitle}>{currentSong}</Text>
            </View>
          </View>
        </GlassCard>
      )}

      {/* Live Stats - Compact Grid */}
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <MaterialCommunityIcons name="fire" size={18} color={designSystem.colors.accentYellow} />
          <Text style={styles.statValue}>{calories.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Cal</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <Ionicons name="time-outline" size={18} color={designSystem.colors.accent} />
          <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          <Text style={styles.statLabel}>Time</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <MaterialCommunityIcons name="chart-line" size={18} color={getFlowStateColor()} />
          <Text style={styles.statValue}>{movementScore.toFixed(0)}%</Text>
          <Text style={styles.statLabel}>Flow</Text>
        </GlassCard>
      </View>

      {/* Bottom Section - Rewards & Flow State */}
      <View style={styles.bottomSection}>
        {/* Rewards Preview - Compact */}
        {isTracking ? (
          <GlassCard style={styles.rewardsCardCompact} gradient>
            <View style={styles.rewardsCompact}>
              <View style={styles.rewardsLeft}>
                <MaterialCommunityIcons
                  name="trophy"
                  size={18}
                  color={designSystem.colors.accentYellow}
                />
                <Text style={styles.rewardsValueCompact}>
                  +{(movementScore * 0.1).toFixed(2)} $DANZ
                </Text>
              </View>
              <View style={styles.rewardsBonus}>
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={12}
                  color={designSystem.colors.accentYellow}
                />
                <Text style={styles.rewardsBonusTextCompact}>2x bonus</Text>
              </View>
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.flowStateCardCompact}>
            <View style={styles.flowStateCompact}>
              <Text style={styles.flowStateTitleCompact}>Flow State</Text>
              <View style={styles.flowIndicator}>
                {['🔥', '⚡', '💫', '✨'].map((emoji, index) => (
                  <Text
                    key={index}
                    style={[styles.flowEmoji, { opacity: movementScore > index * 25 ? 1 : 0.3 }]}
                  >
                    {emoji}
                  </Text>
                ))}
              </View>
            </View>
          </GlassCard>
        )}

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setShowDetails(!showDetails)}
          >
            <LinearGradient
              colors={designSystem.colors.gradients.secondary}
              style={styles.quickActionGradient}
            >
              <MaterialCommunityIcons
                name="chart-line"
                size={16}
                color={designSystem.colors.text}
              />
              <Text style={styles.quickActionText}>Details</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton}>
            <LinearGradient
              colors={designSystem.colors.gradients.secondary}
              style={styles.quickActionGradient}
            >
              <Ionicons name="share-outline" size={16} color={designSystem.colors.text} />
              <Text style={styles.quickActionText}>Share</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pro Tips Modal */}
      <ProTipsModal visible={showProTips} onClose={() => setShowProTips(false)} />

      {/* Movement Details Modal */}
      <MovementDetailsModal
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        movementScore={movementScore}
        duration={duration}
        calories={calories}
        bpm={bpm}
        isTracking={isTracking}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.background,
  },
  bgCircle1: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    borderWidth: 1,
    borderColor: `${designSystem.colors.primary}20`,
    top: -width * 0.5,
    left: -width * 0.5,
  },
  bgCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    borderWidth: 1,
    borderColor: `${designSystem.colors.secondary}20`,
    top: -width * 0.25,
    left: -width * 0.25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(10),
  },
  backButton: {
    padding: scale(8),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    color: designSystem.colors.text,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
  },
  tipsButton: {
    padding: scale(8),
    marginRight: scale(8),
  },
  settingsButton: {
    padding: scale(8),
  },
  trackingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(200),
    marginVertical: verticalScale(15),
  },
  outerRing: {
    position: 'absolute',
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
  },
  ringGradient: {
    flex: 1,
    borderRadius: scale(90),
    opacity: 0.3,
  },
  trackingButton: {
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
    overflow: 'hidden',
    ...designSystem.shadows.xl,
  },
  trackingButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingContent: {
    alignItems: 'center',
  },
  trackingStatus: {
    fontSize: moderateScale(16),
    color: designSystem.colors.text,
    fontWeight: 'bold',
    marginTop: verticalScale(8),
  },
  trackingBPM: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    marginTop: verticalScale(4),
  },
  trackingHint: {
    fontSize: moderateScale(12),
    color: designSystem.colors.textSecondary,
    marginTop: verticalScale(4),
  },
  songCard: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(12),
    paddingVertical: verticalScale(8),
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songText: {
    marginLeft: scale(8),
    flex: 1,
  },
  songTitle: {
    fontSize: moderateScale(13),
    color: designSystem.colors.text,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    gap: scale(12),
    marginBottom: verticalScale(15),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: verticalScale(12),
  },
  statValue: {
    fontSize: moderateScale(16),
    color: designSystem.colors.text,
    fontWeight: 'bold',
    marginTop: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateScale(10),
    color: designSystem.colors.textSecondary,
    marginTop: verticalScale(2),
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: verticalScale(20),
  },
  rewardsCardCompact: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(12),
    paddingVertical: verticalScale(10),
  },
  rewardsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardsValueCompact: {
    fontSize: moderateScale(14),
    color: designSystem.colors.success,
    fontWeight: 'bold',
    marginLeft: scale(8),
  },
  rewardsBonus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${designSystem.colors.accentYellow}20`,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  rewardsBonusTextCompact: {
    fontSize: moderateScale(10),
    color: designSystem.colors.accentYellow,
    marginLeft: scale(4),
    fontWeight: '600',
  },
  flowStateCardCompact: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(12),
    paddingVertical: verticalScale(10),
  },
  flowStateCompact: {
    alignItems: 'center',
  },
  flowStateTitleCompact: {
    fontSize: moderateScale(12),
    color: designSystem.colors.text,
    fontWeight: '600',
    marginBottom: verticalScale(8),
  },
  flowIndicator: {
    flexDirection: 'row',
    gap: scale(12),
  },
  flowEmoji: {
    fontSize: moderateScale(18),
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    gap: scale(12),
  },
  quickActionButton: {
    flex: 1,
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    gap: scale(6),
  },
  quickActionText: {
    fontSize: moderateScale(12),
    color: designSystem.colors.text,
    fontWeight: '600',
  },
})

export default MovementTrackingScreen
