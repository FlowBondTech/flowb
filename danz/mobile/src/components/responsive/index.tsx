/**
 * Responsive Component Library for DANZ Mobile
 * Reusable components that handle all responsive concerns
 */

import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  type TextStyle,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ComponentSizes,
  DeviceInfo,
  getBorderRadius,
  LineHeights,
  MaxFontMultipliers,
  responsive,
  Shadows,
  Spacing,
  Typography,
  vs,
} from '../../utils/responsive-v2'

// ============================================================================
// Screen Wrapper - Handles safe areas, keyboard, and scrolling
// ============================================================================

interface ScreenWrapperProps {
  children: React.ReactNode
  scrollable?: boolean
  backgroundColor?: string
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  keyboardAvoid?: boolean
  refreshControl?: React.ReactElement<any> | undefined
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  scrollable = true,
  backgroundColor = '#0A0A0F',
  edges = ['top', 'bottom'],
  keyboardAvoid = true,
  refreshControl,
}) => {
  const content = scrollable ? (
    <ScrollView
      bounces={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
      {/* Extra bottom space for tab bar and safe area */}
      <View style={{ height: ComponentSizes.tabBarHeightWithNotch + vs(20) }} />
    </ScrollView>
  ) : (
    <>
      {children}
      <View style={{ height: ComponentSizes.tabBarHeightWithNotch }} />
    </>
  )

  const wrapped = keyboardAvoid ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={edges}>
      {wrapped}
    </SafeAreaView>
  )
}

// ============================================================================
// Typography Components with built-in responsiveness
// ============================================================================

interface ResponsiveTextProps {
  children: React.ReactNode
  style?: TextStyle | TextStyle[]
  numberOfLines?: number
  adjustsFontSizeToFit?: boolean
  minimumFontScale?: number
  maxFontSizeMultiplier?: number
}

export const DisplayText: React.FC<ResponsiveTextProps> = ({
  children,
  style,
  numberOfLines = 2,
  adjustsFontSizeToFit = true,
  minimumFontScale = 0.8,
  maxFontSizeMultiplier = MaxFontMultipliers.heading,
}) => (
  <Text
    style={[
      {
        fontSize: Typography.displayLarge,
        fontWeight: '900',
        lineHeight: LineHeights.displayLarge,
        color: 'white',
      },
      style,
    ]}
    numberOfLines={numberOfLines}
    adjustsFontSizeToFit={adjustsFontSizeToFit}
    minimumFontScale={minimumFontScale}
    maxFontSizeMultiplier={maxFontSizeMultiplier}
  >
    {children}
  </Text>
)

export const Heading: React.FC<ResponsiveTextProps> = ({
  children,
  style,
  numberOfLines = 2,
  adjustsFontSizeToFit = true,
  minimumFontScale = 0.85,
  maxFontSizeMultiplier = MaxFontMultipliers.heading,
}) => (
  <Text
    style={[
      {
        fontSize: Typography.h1,
        fontWeight: '700',
        lineHeight: LineHeights.h1,
        color: 'white',
      },
      style,
    ]}
    numberOfLines={numberOfLines}
    adjustsFontSizeToFit={adjustsFontSizeToFit}
    minimumFontScale={minimumFontScale}
    maxFontSizeMultiplier={maxFontSizeMultiplier}
  >
    {children}
  </Text>
)

export const SubHeading: React.FC<ResponsiveTextProps> = ({
  children,
  style,
  maxFontSizeMultiplier = MaxFontMultipliers.heading,
}) => (
  <Text
    style={[
      {
        fontSize: Typography.h3,
        fontWeight: '600',
        lineHeight: LineHeights.h3,
        color: 'white',
      },
      style,
    ]}
    maxFontSizeMultiplier={maxFontSizeMultiplier}
  >
    {children}
  </Text>
)

export const BodyText: React.FC<ResponsiveTextProps> = ({
  children,
  style,
  maxFontSizeMultiplier = MaxFontMultipliers.body,
}) => (
  <Text
    style={[
      {
        fontSize: Typography.bodyMedium,
        lineHeight: LineHeights.bodyMedium,
        color: 'rgba(255,255,255,0.8)',
      },
      style,
    ]}
    maxFontSizeMultiplier={maxFontSizeMultiplier}
  >
    {children}
  </Text>
)

export const Caption: React.FC<ResponsiveTextProps> = ({
  children,
  style,
  maxFontSizeMultiplier = MaxFontMultipliers.caption,
}) => (
  <Text
    style={[
      {
        fontSize: Typography.caption,
        lineHeight: LineHeights.caption,
        color: 'rgba(255,255,255,0.6)',
      },
      style,
    ]}
    maxFontSizeMultiplier={maxFontSizeMultiplier}
  >
    {children}
  </Text>
)

// ============================================================================
// Button Components
// ============================================================================

interface ResponsiveButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
}) => {
  const heights = {
    small: ComponentSizes.buttonHeightSmall,
    medium: ComponentSizes.buttonHeightMedium,
    large: ComponentSizes.buttonHeightLarge,
  }

  const fontSizes = {
    small: Typography.buttonSmall,
    medium: Typography.button,
    large: Typography.bodyLarge,
  }

  const getBackgroundColor = () => {
    if (disabled) return 'rgba(255,255,255,0.1)'
    switch (variant) {
      case 'primary':
        return '#FF1493'
      case 'secondary':
        return '#B967FF'
      case 'outline':
      case 'ghost':
        return 'transparent'
      default:
        return '#FF1493'
    }
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        {
          minHeight: heights[size],
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.xl,
          borderRadius: getBorderRadius('medium'),
          backgroundColor: getBackgroundColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variant === 'outline' ? '#FF1493' : undefined,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.sm,
          opacity: disabled ? 0.5 : 1,
        },
        fullWidth && { width: '100%' },
        Shadows.medium,
      ]}
    >
      {icon && !loading && icon}
      {loading ? (
        <Text style={{ color: 'white', fontSize: fontSizes[size] }}>Loading...</Text>
      ) : (
        <Text
          style={{
            fontSize: fontSizes[size],
            fontWeight: '600',
            color: variant === 'outline' || variant === 'ghost' ? '#FF1493' : 'white',
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
          maxFontSizeMultiplier={MaxFontMultipliers.button}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  )
}

// ============================================================================
// Card Component
// ============================================================================

interface ResponsiveCardProps {
  children: React.ReactNode
  style?: ViewStyle
  gradient?: boolean
  gradientColors?: readonly [string, string, ...string[]]
  padding?: boolean
  onPress?: () => void
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  style,
  gradient = false,
  gradientColors = ['rgba(255, 20, 147, 0.1)', 'rgba(185, 103, 255, 0.1)'] as const,
  padding = true,
  onPress,
}) => {
  const cardStyle: ViewStyle = {
    borderRadius: ComponentSizes.cardRadius,
    backgroundColor: gradient ? undefined : 'rgba(255,255,255,0.05)',
    padding: padding ? ComponentSizes.cardPadding : 0,
    ...Shadows.small,
    ...style,
  }

  const content = gradient ? (
    <LinearGradient colors={gradientColors} style={cardStyle}>
      {children}
    </LinearGradient>
  ) : (
    <View style={cardStyle}>{children}</View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    )
  }

  return content
}

// ============================================================================
// Input Component
// ============================================================================

interface ResponsiveInputProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  multiline?: boolean
  numberOfLines?: number
  editable?: boolean
  style?: TextStyle
}

export const ResponsiveInput: React.FC<ResponsiveInputProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  editable = true,
  style,
}) => {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.4)"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      editable={editable}
      maxFontSizeMultiplier={MaxFontMultipliers.body}
      style={[
        {
          minHeight: multiline
            ? ComponentSizes.inputHeight * numberOfLines
            : ComponentSizes.inputHeight,
          fontSize: Typography.input,
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          borderRadius: getBorderRadius('medium'),
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          color: 'white',
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
    />
  )
}

// ============================================================================
// Adaptive Layout Components
// ============================================================================

interface AdaptiveGridProps {
  children: React.ReactNode
  columns?: { small: number; medium: number; large: number }
  gap?: number
}

export const AdaptiveGrid: React.FC<AdaptiveGridProps> = ({
  children,
  columns = { small: 1, medium: 2, large: 3 },
  gap = Spacing.md,
}) => {
  const { width } = useWindowDimensions()

  const columnCount = responsive({
    small: columns.small,
    medium: columns.medium,
    large: columns.large,
    default: columns.medium,
  })

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -gap / 2,
      }}
    >
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={{
            width: `${100 / columnCount}%`,
            paddingHorizontal: gap / 2,
            marginBottom: gap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  )
}

interface AdaptiveRowProps {
  children: React.ReactNode
  breakpoint?: number
  gap?: number
  reverse?: boolean
}

export const AdaptiveRow: React.FC<AdaptiveRowProps> = ({
  children,
  breakpoint = 400,
  gap = Spacing.md,
  reverse = false,
}) => {
  const { width } = useWindowDimensions()
  const isStacked = width < breakpoint

  return (
    <View
      style={{
        flexDirection: isStacked ? 'column' : reverse ? 'row-reverse' : 'row',
        gap,
      }}
    >
      {React.Children.map(children, child => (
        <View style={{ flex: isStacked ? 0 : 1 }}>{child}</View>
      ))}
    </View>
  )
}

// ============================================================================
// Spacer Component
// ============================================================================

interface SpacerProps {
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'huge'
  horizontal?: boolean
}

export const Spacer: React.FC<SpacerProps> = ({ size = 'md', horizontal = false }) => {
  const dimension = Spacing[size]
  return (
    <View
      style={{
        width: horizontal ? dimension : undefined,
        height: horizontal ? undefined : dimension,
      }}
    />
  )
}

// ============================================================================
// Container Component
// ============================================================================

interface ContainerProps {
  children: React.ReactNode
  style?: ViewStyle
  maxWidth?: number
  centered?: boolean
}

export const Container: React.FC<ContainerProps> = ({
  children,
  style,
  maxWidth = 600,
  centered = true,
}) => {
  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth: DeviceInfo.isTablet ? maxWidth : '100%',
          paddingHorizontal: Spacing.lg,
          alignSelf: centered ? 'center' : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

// Export all components
export default {
  ScreenWrapper,
  DisplayText,
  Heading,
  SubHeading,
  BodyText,
  Caption,
  ResponsiveButton,
  ResponsiveCard,
  ResponsiveInput,
  AdaptiveGrid,
  AdaptiveRow,
  Spacer,
  Container,
}
