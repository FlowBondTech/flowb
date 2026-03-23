// Beautiful Animated UI Components

import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  type TextStyle,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native'
import { designSystem } from '../../styles/designSystem'

const { width } = Dimensions.get('window')

// Animated Gradient Button
interface GradientButtonProps {
  title: string
  onPress: () => void
  colors?: readonly [string, string, ...string[]]
  style?: ViewStyle
  textStyle?: TextStyle
  disabled?: boolean
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  colors = designSystem.colors.gradients.primary,
  style,
  textStyle,
  disabled = false,
  icon,
  variant = 'primary',
  size = 'md',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Subtle glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [glowAnim])

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 20 },
    md: { paddingVertical: 14, paddingHorizontal: 28 },
    lg: { paddingVertical: 18, paddingHorizontal: 36 },
  }

  const textSizes = {
    sm: designSystem.typography.fontSize.sm,
    md: designSystem.typography.fontSize.md,
    lg: designSystem.typography.fontSize.lg,
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.outlineButton,
            sizeStyles[size],
            { transform: [{ scale: scaleAnim }] },
            style,
          ]}
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.outlineInner}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[styles.buttonText, { fontSize: textSizes[size] }, textStyle]}>
              {title}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyles[size]]}
        >
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.buttonText, { fontSize: textSizes[size] }, textStyle]}>{title}</Text>
        </LinearGradient>
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.6],
              }),
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  )
}

// Glassmorphic Card
interface GlassCardProps {
  children: React.ReactNode
  style?: ViewStyle
  intensity?: number
  gradient?: boolean
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 20,
  gradient = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  return (
    <Animated.View style={[styles.glassCard, { opacity: fadeAnim }, style]}>
      <BlurView intensity={intensity} style={StyleSheet.absoluteFillObject}>
        <View style={styles.glassBackground} />
      </BlurView>
      {gradient && (
        <LinearGradient
          colors={['rgba(255, 110, 199, 0.1)', 'rgba(185, 103, 255, 0.1)'] as const}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <View style={styles.glassContent}>{children}</View>
    </Animated.View>
  )
}

// Animated Progress Ring (simplified without SVG for now)
interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  children?: React.ReactNode
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = designSystem.colors.primary,
  children,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: true,
    }).start()
  }, [progress, animatedValue])

  return (
    <View style={[styles.progressContainer, { width: size, height: size }]}>
      <View
        style={[
          styles.progressRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: designSystem.colors.surface,
          },
        ]}
      >
        <View
          style={[
            styles.progressRingFill,
            {
              width: size - strokeWidth * 2,
              height: size - strokeWidth * 2,
              borderRadius: (size - strokeWidth * 2) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderLeftColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [
                {
                  rotate: animatedValue.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      {children && <View style={styles.progressContent}>{children}</View>}
    </View>
  )
}

// Floating Action Button
interface FloatingActionButtonProps {
  onPress: () => void
  icon: React.ReactNode
  colors?: readonly [string, string, ...string[]]
  style?: ViewStyle
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  colors = designSystem.colors.gradients.primary,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  const handlePress = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      rotateAnim.setValue(0)
      onPress()
    })
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.fabContainer,
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
          style,
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          {icon}
        </LinearGradient>
        <View style={styles.fabShadow} />
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  // Button Styles
  buttonContainer: {
    borderRadius: designSystem.borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: designSystem.borderRadius.full,
  },
  outlineButton: {
    borderRadius: designSystem.borderRadius.full,
    padding: 2,
    overflow: 'hidden',
  },
  outlineInner: {
    backgroundColor: designSystem.colors.background,
    borderRadius: designSystem.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: designSystem.colors.text,
    fontWeight: 'bold',
    letterSpacing: designSystem.typography.letterSpacing.wide,
  },
  iconContainer: {
    marginRight: designSystem.spacing.sm,
  },
  glowEffect: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: designSystem.borderRadius.full,
    backgroundColor: designSystem.colors.primary,
    ...designSystem.shadows.glow,
  },

  // Glass Card Styles
  glassCard: {
    borderRadius: designSystem.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  glassContent: {
    padding: designSystem.spacing.lg,
  },

  // Progress Ring Styles
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingFill: {
    position: 'absolute',
  },
  progressContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAB Styles
  fabContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    ...designSystem.shadows.lg,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 24,
    backgroundColor: designSystem.colors.primary,
    opacity: 0.3,
    ...designSystem.shadows.glow,
  },
})
