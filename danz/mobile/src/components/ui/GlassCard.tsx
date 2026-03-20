import { BlurView } from 'expo-blur'
import type React from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { designSystem } from '@/styles/designSystem'

type GlassTier = 'subtle' | 'medium' | 'strong' | 'intense'

interface GlassCardProps {
  children: React.ReactNode
  tier?: GlassTier
  style?: ViewStyle
  borderRadius?: number
  padding?: number
  /** Show specular highlight border */
  specular?: boolean
  /** Override blur intensity */
  intensity?: number
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  tier = 'medium',
  style,
  borderRadius = designSystem.glass.borderRadius.md,
  padding = 16,
  specular = true,
  intensity,
}) => {
  const { theme } = useTheme()
  const c = theme.colors
  const blurIntensity = intensity ?? designSystem.glass.blur[tier]

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          {
            borderRadius,
            padding,
            backgroundColor: c.glassSurface,
            borderWidth: specular ? 1 : 0,
            borderColor: c.glassBorder,
          } as ViewStyle,
          style,
        ]}
      >
        {children}
      </View>
    )
  }

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <BlurView
        intensity={blurIntensity}
        tint={theme.glass.tint}
        style={[styles.blur, { borderRadius }]}
      >
        <View
          style={[
            styles.content,
            {
              padding,
              borderRadius,
              backgroundColor: c.glassCard,
              borderWidth: specular ? 1 : 0,
              borderColor: c.glassBorder,
            },
          ]}
        >
          {/* Top edge specular highlight */}
          {specular && (
            <View
              style={[
                styles.topHighlight,
                { backgroundColor: c.glassHighlight, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius },
              ]}
            />
          )}
          {children}
        </View>
      </BlurView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  blur: {
    overflow: 'hidden',
  },
  content: {
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
})

export default GlassCard
