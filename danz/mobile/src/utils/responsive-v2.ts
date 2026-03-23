/**
 * Responsive Utilities v2 - Enhanced for DANZ Mobile
 * Comprehensive scaling system for all device sizes and accessibility settings
 */

import { Dimensions, PixelRatio, Platform } from 'react-native'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

// Design base dimensions (iPhone X/11/12/13 standard)
const guidelineBaseWidth = 375
const guidelineBaseHeight = 812

// Get font scale from system settings
const fontScale = PixelRatio.getFontScale()

/**
 * Horizontal scaling - for widths, horizontal padding/margins
 * Scales based on screen width relative to base
 */
export const scale = (size: number): number => {
  return (screenWidth / guidelineBaseWidth) * size
}

/**
 * Vertical scaling - for heights, vertical padding/margins
 * Scales based on screen height relative to base
 */
export const verticalScale = (size: number): number => {
  return (screenHeight / guidelineBaseHeight) * size
}

/**
 * Moderate scaling - for elements that should scale less aggressively
 * Good for fonts, border radius, icons
 * @param factor - Controls how much scaling is applied (0 = no scale, 1 = full scale)
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor
}

/**
 * Moderate vertical scaling - same as above but for vertical
 */
export const moderateVerticalScale = (size: number, factor: number = 0.5): number => {
  return size + (verticalScale(size) - size) * factor
}

/**
 * Font scaling with accessibility support
 * Respects system font size but with reasonable limits
 */
export const scaledFontSize = (size: number): number => {
  const newSize = size * fontScale
  const scaledSize = moderateScale(newSize, 0.3) // Less aggressive scaling for fonts

  // Set min/max limits to prevent text from becoming unreadable
  const minSize = size * 0.85
  const maxSize = size * 1.5

  if (scaledSize < minSize) return minSize
  if (scaledSize > maxSize) return maxSize

  return Math.round(scaledSize)
}

// Short aliases for common use
export const s = scale
export const vs = verticalScale
export const ms = moderateScale
export const mvs = moderateVerticalScale
export const fs = scaledFontSize

/**
 * Device detection utilities
 */
export const DeviceInfo = {
  isSmallDevice: screenWidth < 375,
  isMediumDevice: screenWidth >= 375 && screenWidth < 414,
  isLargeDevice: screenWidth >= 414 && screenWidth < 768,
  isTablet: screenWidth >= 768,

  // Height-based detection
  isShortDevice: screenHeight < 700,
  isTallDevice: screenHeight > 850,

  // Platform specific
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',

  // Notch detection (iPhone X and later)
  hasNotch: Platform.OS === 'ios' && (screenHeight >= 812 || screenWidth >= 812),

  // Orientation (basic, doesn't update on rotation)
  isLandscape: screenWidth > screenHeight,
  isPortrait: screenHeight >= screenWidth,
}

/**
 * Responsive breakpoints
 */
export const Breakpoints = {
  small: 360, // Small Android phones, iPhone SE
  medium: 375, // iPhone 6/7/8/SE2/12 mini/13 mini
  large: 414, // iPhone 6+/7+/8+/11/XR/11 Pro Max
  xlarge: 768, // iPad and tablets
  xxlarge: 1024, // iPad Pro and larger tablets
}

/**
 * Get current breakpoint
 */
export const getCurrentBreakpoint = (): string => {
  if (screenWidth < Breakpoints.small) return 'xsmall'
  if (screenWidth < Breakpoints.medium) return 'small'
  if (screenWidth < Breakpoints.large) return 'medium'
  if (screenWidth < Breakpoints.xlarge) return 'large'
  if (screenWidth < Breakpoints.xxlarge) return 'xlarge'
  return 'xxlarge'
}

/**
 * Spacing scale - consistent spacing system
 * Use these instead of hardcoded values
 */
export const Spacing = {
  xxs: ms(2),
  xs: ms(4),
  sm: ms(8),
  md: ms(12),
  lg: ms(16),
  xl: ms(24),
  xxl: ms(32),
  xxxl: ms(48),
  huge: ms(64),
}

/**
 * Typography scale with responsive sizing
 */
export const Typography = {
  // Display
  displayLarge: fs(40),
  displayMedium: fs(36),
  displaySmall: fs(32),

  // Headings
  h1: fs(28),
  h2: fs(24),
  h3: fs(20),
  h4: fs(18),
  h5: fs(16),
  h6: fs(14),

  // Body
  bodyLarge: fs(18),
  bodyMedium: fs(16),
  bodySmall: fs(14),

  // Supporting
  caption: fs(12),
  overline: fs(10),

  // Interactive
  button: fs(16),
  buttonSmall: fs(14),
  input: fs(16),
  label: fs(14),
  helper: fs(12),
}

/**
 * Line heights that match typography scale
 */
export const LineHeights = {
  displayLarge: fs(48),
  displayMedium: fs(44),
  displaySmall: fs(40),
  h1: fs(36),
  h2: fs(32),
  h3: fs(28),
  h4: fs(24),
  h5: fs(22),
  h6: fs(20),
  bodyLarge: fs(26),
  bodyMedium: fs(24),
  bodySmall: fs(20),
  caption: fs(16),
  overline: fs(14),
}

/**
 * Common component dimensions
 */
export const ComponentSizes = {
  // Buttons
  buttonHeightSmall: vs(36),
  buttonHeightMedium: vs(44),
  buttonHeightLarge: vs(52),

  // Inputs
  inputHeight: vs(48),
  inputHeightSmall: vs(40),
  inputHeightLarge: vs(56),

  // Cards
  cardPadding: ms(16),
  cardRadius: ms(12),

  // Icons
  iconSmall: ms(16),
  iconMedium: ms(24),
  iconLarge: ms(32),
  iconXLarge: ms(48),

  // Avatar
  avatarSmall: ms(32),
  avatarMedium: ms(48),
  avatarLarge: ms(64),
  avatarXLarge: ms(96),

  // Tab bar
  tabBarHeight: vs(60),
  tabBarHeightWithNotch: vs(60) + (DeviceInfo.hasNotch ? 34 : 0),

  // Header
  headerHeight: vs(56),
  headerHeightLarge: vs(64),
}

/**
 * Safe area insets (approximate, use react-native-safe-area-context for accurate values)
 */
export const SafeAreaInsets = {
  top: DeviceInfo.hasNotch ? 44 : 20,
  bottom: DeviceInfo.hasNotch ? 34 : 0,
  left: 0,
  right: 0,
}

/**
 * Helper function to get responsive value based on device size
 */
export const responsive = <T>(config: {
  small?: T
  medium?: T
  large?: T
  xlarge?: T
  default: T
}): T => {
  const breakpoint = getCurrentBreakpoint()

  switch (breakpoint) {
    case 'xsmall':
    case 'small':
      return config.small ?? config.default
    case 'medium':
      return config.medium ?? config.default
    case 'large':
      return config.large ?? config.default
    case 'xlarge':
    case 'xxlarge':
      return config.xlarge ?? config.default
    default:
      return config.default
  }
}

/**
 * Max font size multipliers for different text types
 * Use with Text component's maxFontSizeMultiplier prop
 */
export const MaxFontMultipliers = {
  heading: 1.5, // Allow headings to scale up to 1.5x
  body: 2.0, // Body text can scale more for readability
  button: 1.3, // Keep buttons compact
  caption: 1.5, // Small text needs some scaling room
  fixed: 1.0, // For UI that must not scale (like badges)
  navigation: 1.2, // Nav elements scale slightly
}

/**
 * Aspect ratios for consistent media sizing
 */
export const AspectRatios = {
  square: 1,
  video: 16 / 9,
  videoVertical: 9 / 16,
  card: 4 / 3,
  cardWide: 3 / 2,
  banner: 3 / 1,
  story: 9 / 16,
  post: 4 / 5,
}

/**
 * Get scaled border radius based on component size
 */
export const getBorderRadius = (
  size: 'small' | 'medium' | 'large' | 'full',
  dimension?: number,
): number => {
  switch (size) {
    case 'small':
      return ms(4)
    case 'medium':
      return ms(8)
    case 'large':
      return ms(16)
    case 'full':
      return dimension ? dimension / 2 : 9999
    default:
      return ms(8)
  }
}

/**
 * Shadow presets for elevation
 */
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(1) },
    shadowOpacity: 0.18,
    shadowRadius: ms(1),
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.2,
    shadowRadius: ms(3),
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.25,
    shadowRadius: ms(5),
    elevation: 5,
  },
  xlarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(8) },
    shadowOpacity: 0.3,
    shadowRadius: ms(10),
    elevation: 10,
  },
}

// Export all utilities as a namespace for convenient importing
export default {
  scale,
  verticalScale,
  moderateScale,
  moderateVerticalScale,
  scaledFontSize,
  s,
  vs,
  ms,
  mvs,
  fs,
  DeviceInfo,
  Breakpoints,
  getCurrentBreakpoint,
  Spacing,
  Typography,
  LineHeights,
  ComponentSizes,
  SafeAreaInsets,
  responsive,
  MaxFontMultipliers,
  AspectRatios,
  getBorderRadius,
  Shadows,
}
