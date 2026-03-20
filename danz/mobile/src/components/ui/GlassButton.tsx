import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useCallback } from 'react'
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  type TextStyle,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useHaptics } from '@/hooks/useHaptics'
import { designSystem } from '@/styles/designSystem'

interface GlassButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'small' | 'medium' | 'large'
  icon?: keyof typeof Ionicons.glyphMap
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  hapticType?: 'light' | 'medium' | 'heavy'
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  hapticType = 'light',
}) => {
  const { theme } = useTheme()
  const c = theme.colors
  const haptics = useHaptics()

  const handlePress = useCallback(() => {
    if (disabled || loading) return
    haptics.trigger(hapticType)
    onPress()
  }, [disabled, loading, hapticType, onPress, haptics])

  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14, iconSize: 16, radius: designSystem.glass.borderRadius.sm },
    medium: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 16, iconSize: 20, radius: designSystem.glass.borderRadius.md },
    large: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 18, iconSize: 24, radius: designSystem.glass.borderRadius.lg },
  }

  const currentSize = sizeStyles[size]

  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return { gradient: [c.primary, c.secondary || c.primary], text: '#FFFFFF', border: 'transparent' }
      case 'secondary':
        return { gradient: [c.glassCard, c.glassCard], text: c.text, border: c.glassBorder }
      case 'ghost':
        return { gradient: ['transparent', 'transparent'], text: c.primary, border: c.glassBorder }
      case 'danger':
        return { gradient: ['#FF4444', '#CC0000'], text: '#FFFFFF', border: 'transparent' }
      default:
        return { gradient: [c.primary, c.primary], text: '#FFFFFF', border: 'transparent' }
    }
  }

  const variantColors = getVariantColors()

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator size="small" color={variantColors.text} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={currentSize.iconSize} color={variantColors.text} style={styles.iconLeft} />
          )}
          <Text style={[styles.text, { fontSize: currentSize.fontSize, color: variantColors.text, opacity: disabled ? 0.5 : 1 }, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={currentSize.iconSize} color={variantColors.text} style={styles.iconRight} />
          )}
        </>
      )}
    </View>
  )

  // Primary / danger: gradient fill
  if (variant === 'primary' || variant === 'danger') {
    return (
      <TouchableOpacity onPress={handlePress} disabled={disabled || loading} activeOpacity={0.8} style={[fullWidth && styles.fullWidth, style]}>
        <LinearGradient
          colors={variantColors.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, { paddingVertical: currentSize.paddingVertical, paddingHorizontal: currentSize.paddingHorizontal, borderRadius: currentSize.radius, opacity: disabled ? 0.5 : 1 }]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  // Secondary: frosted glass blur
  if (variant === 'secondary' && Platform.OS !== 'web') {
    return (
      <TouchableOpacity onPress={handlePress} disabled={disabled || loading} activeOpacity={0.8} style={[{ borderRadius: currentSize.radius, overflow: 'hidden' }, fullWidth && styles.fullWidth, style]}>
        <BlurView intensity={designSystem.glass.blur.subtle} tint={theme.glass.tint} style={{ borderRadius: currentSize.radius, overflow: 'hidden' }}>
          <View
            style={[
              styles.button,
              {
                paddingVertical: currentSize.paddingVertical,
                paddingHorizontal: currentSize.paddingHorizontal,
                borderRadius: currentSize.radius,
                borderWidth: 1,
                borderColor: variantColors.border,
                backgroundColor: c.glassCard,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            {renderContent()}
          </View>
        </BlurView>
      </TouchableOpacity>
    )
  }

  // Ghost and web fallback
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          borderRadius: currentSize.radius,
          borderWidth: variant === 'ghost' ? 1 : 1,
          borderColor: variantColors.border,
          backgroundColor: variant === 'secondary' ? c.glassSurface : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {renderContent()}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  fullWidth: {
    width: '100%',
  },
})

export default GlassButton
