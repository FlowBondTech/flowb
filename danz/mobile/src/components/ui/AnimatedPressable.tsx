import type React from 'react'
import { useCallback } from 'react'
import { Pressable, StyleSheet, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useHaptics } from '@/hooks/useHaptics'

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable)

interface AnimatedPressableProps {
  children: React.ReactNode
  onPress?: () => void
  onLongPress?: () => void
  style?: ViewStyle
  scaleOnPress?: number
  haptic?: boolean
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection'
  disabled?: boolean
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  scaleOnPress = 0.97,
  haptic = true,
  hapticType = 'light',
  disabled = false,
}) => {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  const haptics = useHaptics()

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleOnPress, {
      damping: 15,
      stiffness: 400,
    })
    opacity.value = withTiming(0.9, { duration: 100 })
  }, [scaleOnPress, scale, opacity])

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    })
    opacity.value = withTiming(1, { duration: 100 })
  }, [scale, opacity])

  const handlePress = useCallback(() => {
    if (disabled) return
    if (haptic) {
      haptics.trigger(hapticType)
    }
    onPress?.()
  }, [disabled, haptic, hapticType, haptics, onPress])

  const handleLongPress = useCallback(() => {
    if (disabled) return
    if (haptic) {
      haptics.trigger('heavy')
    }
    onLongPress?.()
  }, [disabled, haptic, haptics, onLongPress])

  return (
    <AnimatedPressableBase
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style, disabled && styles.disabled]}
    >
      {children}
    </AnimatedPressableBase>
  )
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
})

export default AnimatedPressable
