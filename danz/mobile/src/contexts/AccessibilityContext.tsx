import AsyncStorage from '@react-native-async-storage/async-storage'
import type React from 'react'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { Dimensions, PixelRatio } from 'react-native'

export type FontSizeLevel = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

interface FontSizeConfig {
  level: FontSizeLevel
  displayName: string
  scale: number
  description: string
}

// Device detection for responsive scaling
const { width, height } = Dimensions.get('window')
const _screenSize = Math.sqrt(width * width + height * height)
const _pixelDensity = PixelRatio.get()

// Detect device type based on screen dimensions
const getDeviceType = () => {
  // iPhone SE, iPhone 8, etc. (small screens)
  if (width <= 375 && height <= 667) return 'small'
  // iPhone 12 mini, iPhone 13 mini (compact)
  if (width <= 375 && height <= 812) return 'compact'
  // iPhone 12, 13, 14, 15 (standard)
  if (width <= 390 && height <= 844) return 'standard'
  // iPhone 12 Pro Max, 13 Pro Max, 14 Plus, 15 Plus (large)
  if (width <= 428 && height <= 926) return 'large'
  // iPhone 14 Pro, 15 Pro (pro)
  if (width <= 393 && height <= 852) return 'pro'
  // iPhone 14 Pro Max, 15 Pro Max (pro-max)
  if (width >= 430 && height >= 932) return 'pro-max'
  // iPad or unknown
  return width >= 768 ? 'tablet' : 'standard'
}

const deviceType = getDeviceType()

// Font size configurations with device-specific adjustments
const fontSizeConfigs: Record<FontSizeLevel, FontSizeConfig> = {
  xs: {
    level: 'xs',
    displayName: 'Extra Small',
    scale: 0.75,
    description: 'Smallest text size for maximum content',
  },
  sm: {
    level: 'sm',
    displayName: 'Small',
    scale: 0.875,
    description: 'Compact text for more content visibility',
  },
  md: {
    level: 'md',
    displayName: 'Medium',
    scale: 1.0,
    description: 'Default comfortable reading size',
  },
  lg: {
    level: 'lg',
    displayName: 'Large',
    scale: 1.125,
    description: 'Easier reading with larger text',
  },
  xl: {
    level: 'xl',
    displayName: 'Extra Large',
    scale: 1.25,
    description: 'Enhanced visibility for visual comfort',
  },
  xxl: {
    level: 'xxl',
    displayName: 'Maximum',
    scale: 1.5,
    description: 'Maximum size for accessibility needs',
  },
}

// Device-specific scale adjustments
const getDeviceScaleAdjustment = () => {
  switch (deviceType) {
    case 'small':
    case 'compact':
      return 0.9 // Slightly smaller on small screens
    case 'standard':
    case 'pro':
      return 1.0 // Normal scale
    case 'large':
    case 'pro-max':
      return 1.05 // Slightly larger on big screens
    case 'tablet':
      return 1.2 // Larger on tablets
    default:
      return 1.0
  }
}

const deviceScaleAdjustment = getDeviceScaleAdjustment()

// Responsive font sizes with accessibility scaling
export interface ResponsiveFontSizes {
  // Headings
  h1: number
  h2: number
  h3: number
  h4: number
  h5: number
  h6: number

  // Body text
  bodyLarge: number
  body: number
  bodySmall: number

  // UI elements
  button: number
  buttonSmall: number
  caption: number
  label: number

  // Special
  title: number
  subtitle: number
  micro: number
}

const getResponsiveFontSizes = (scale: number): ResponsiveFontSizes => {
  const finalScale = scale * deviceScaleAdjustment

  // Base sizes optimized for different device types - smaller defaults
  const baseSizes = {
    h1: deviceType === 'small' ? 22 : 24,
    h2: deviceType === 'small' ? 18 : 20,
    h3: deviceType === 'small' ? 16 : 18,
    h4: deviceType === 'small' ? 14 : 16,
    h5: deviceType === 'small' ? 13 : 14,
    h6: deviceType === 'small' ? 12 : 13,
    bodyLarge: deviceType === 'small' ? 13 : 14,
    body: deviceType === 'small' ? 11 : 12,
    bodySmall: deviceType === 'small' ? 10 : 11,
    button: deviceType === 'small' ? 12 : 13,
    buttonSmall: deviceType === 'small' ? 11 : 12,
    caption: deviceType === 'small' ? 9 : 10,
    label: deviceType === 'small' ? 10 : 11,
    title: deviceType === 'small' ? 20 : 22,
    subtitle: deviceType === 'small' ? 14 : 15,
    micro: deviceType === 'small' ? 8 : 9,
  }

  // Apply scaling
  return Object.entries(baseSizes).reduce((acc, [key, value]) => {
    acc[key as keyof ResponsiveFontSizes] = Math.round(value * finalScale)
    return acc
  }, {} as ResponsiveFontSizes)
}

// Responsive spacing that scales with font size
export interface ResponsiveSpacing {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  xxl: number
}

const getResponsiveSpacing = (scale: number): ResponsiveSpacing => {
  const finalScale = scale * deviceScaleAdjustment

  const baseSpacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  }

  return Object.entries(baseSpacing).reduce((acc, [key, value]) => {
    acc[key as keyof ResponsiveSpacing] = Math.round(value * finalScale)
    return acc
  }, {} as ResponsiveSpacing)
}

// Line height multipliers based on font size
const getLineHeightMultiplier = (fontSize: number): number => {
  if (fontSize < 14) return 1.6
  if (fontSize < 18) return 1.5
  if (fontSize < 24) return 1.4
  return 1.3
}

interface AccessibilityContextValue {
  // Font size
  fontSizeLevel: FontSizeLevel
  setFontSizeLevel: (level: FontSizeLevel) => void
  fontSizes: ResponsiveFontSizes
  fontScale: number

  // Spacing
  spacing: ResponsiveSpacing

  // Device info
  deviceType: string
  deviceScaleAdjustment: number

  // Helpers
  getScaledValue: (baseValue: number) => number
  getLineHeight: (fontSize: number) => number

  // Other accessibility settings
  reduceMotion: boolean
  setReduceMotion: (value: boolean) => void
  highContrast: boolean
  setHighContrast: (value: boolean) => void
  boldText: boolean
  setBoldText: (value: boolean) => void
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined)

const FONT_SIZE_STORAGE_KEY = '@danz:fontSize'
const REDUCE_MOTION_STORAGE_KEY = '@danz:reduceMotion'
const HIGH_CONTRAST_STORAGE_KEY = '@danz:highContrast'
const BOLD_TEXT_STORAGE_KEY = '@danz:boldText'

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fontSizeLevel, setFontSizeLevelState] = useState<FontSizeLevel>('sm')
  const [reduceMotion, setReduceMotionState] = useState(false)
  const [highContrast, setHighContrastState] = useState(false)
  const [boldText, setBoldTextState] = useState(false)

  const loadSavedSettings = async () => {
    try {
      const [savedFontSize, savedReduceMotion, savedHighContrast, savedBoldText] =
        await Promise.all([
          AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY),
          AsyncStorage.getItem(REDUCE_MOTION_STORAGE_KEY),
          AsyncStorage.getItem(HIGH_CONTRAST_STORAGE_KEY),
          AsyncStorage.getItem(BOLD_TEXT_STORAGE_KEY),
        ])

      if (savedFontSize && savedFontSize in fontSizeConfigs) {
        setFontSizeLevelState(savedFontSize as FontSizeLevel)
      }
      if (savedReduceMotion !== null) {
        setReduceMotionState(savedReduceMotion === 'true')
      }
      if (savedHighContrast !== null) {
        setHighContrastState(savedHighContrast === 'true')
      }
      if (savedBoldText !== null) {
        setBoldTextState(savedBoldText === 'true')
      }
    } catch (error) {
      console.error('Error loading accessibility settings:', error)
    }
  }

  // Load saved settings on mount
  useEffect(() => {
    loadSavedSettings()
  }, [loadSavedSettings])

  const setFontSizeLevel = async (level: FontSizeLevel) => {
    try {
      setFontSizeLevelState(level)
      await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, level)
    } catch (error) {
      console.error('Error saving font size:', error)
    }
  }

  const setReduceMotion = async (value: boolean) => {
    try {
      setReduceMotionState(value)
      await AsyncStorage.setItem(REDUCE_MOTION_STORAGE_KEY, value.toString())
    } catch (error) {
      console.error('Error saving reduce motion setting:', error)
    }
  }

  const setHighContrast = async (value: boolean) => {
    try {
      setHighContrastState(value)
      await AsyncStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, value.toString())
    } catch (error) {
      console.error('Error saving high contrast setting:', error)
    }
  }

  const setBoldText = async (value: boolean) => {
    try {
      setBoldTextState(value)
      await AsyncStorage.setItem(BOLD_TEXT_STORAGE_KEY, value.toString())
    } catch (error) {
      console.error('Error saving bold text setting:', error)
    }
  }

  const currentConfig = fontSizeConfigs[fontSizeLevel]
  const fontSizes = getResponsiveFontSizes(currentConfig.scale)
  const spacing = getResponsiveSpacing(currentConfig.scale)

  const getScaledValue = (baseValue: number) => {
    return Math.round(baseValue * currentConfig.scale * deviceScaleAdjustment)
  }

  const getLineHeight = (fontSize: number) => {
    return Math.round(fontSize * getLineHeightMultiplier(fontSize))
  }

  const value: AccessibilityContextValue = {
    fontSizeLevel,
    setFontSizeLevel,
    fontSizes,
    fontScale: currentConfig.scale,
    spacing,
    deviceType,
    deviceScaleAdjustment,
    getScaledValue,
    getLineHeight,
    reduceMotion,
    setReduceMotion,
    highContrast,
    setHighContrast,
    boldText,
    setBoldText,
  }

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Helper hook for responsive styles
export const useResponsiveStyles = () => {
  const { fontSizes, spacing, boldText, getLineHeight } = useAccessibility()

  return {
    text: {
      h1: {
        fontSize: fontSizes.h1,
        lineHeight: getLineHeight(fontSizes.h1),
        fontWeight: boldText ? '700' : ('600' as any),
      },
      h2: {
        fontSize: fontSizes.h2,
        lineHeight: getLineHeight(fontSizes.h2),
        fontWeight: boldText ? '700' : ('600' as any),
      },
      h3: {
        fontSize: fontSizes.h3,
        lineHeight: getLineHeight(fontSizes.h3),
        fontWeight: boldText ? '600' : ('500' as any),
      },
      body: {
        fontSize: fontSizes.body,
        lineHeight: getLineHeight(fontSizes.body),
        fontWeight: boldText ? '500' : ('400' as any),
      },
      bodySmall: {
        fontSize: fontSizes.bodySmall,
        lineHeight: getLineHeight(fontSizes.bodySmall),
        fontWeight: boldText ? '500' : ('400' as any),
      },
      caption: {
        fontSize: fontSizes.caption,
        lineHeight: getLineHeight(fontSizes.caption),
        fontWeight: boldText ? '500' : ('400' as any),
      },
    },
    spacing,
  }
}

/**
 * Hook that provides accessibility-aware font scaling
 * Use this instead of fs() from responsive.ts to respect user's font size preferences
 *
 * @example
 * const { afs } = useAccessibleFontSize()
 * <Text style={{ fontSize: afs(16) }}>Hello</Text>
 */
export const useAccessibleFontSize = () => {
  const { fontScale, deviceScaleAdjustment, getScaledValue } = useAccessibility()

  // Accessibility-aware font size function (drop-in replacement for fs())
  const afs = (size: number): number => {
    return Math.round(size * fontScale * deviceScaleAdjustment)
  }

  return {
    afs,
    fontScale,
    getScaledValue,
  }
}
