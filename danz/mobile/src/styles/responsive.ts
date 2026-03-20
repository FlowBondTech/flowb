// Responsive Design System for All iPhone Models
import { Dimensions, PixelRatio, Platform } from 'react-native'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

// iPhone Model Detection based on screen dimensions
const getDeviceType = () => {
  const _ratio = screenHeight / screenWidth

  // iPhone SE, 5s (320x568)
  if (screenWidth <= 320) return 'small'

  // iPhone 6/7/8, SE 2nd gen (375x667)
  if (screenWidth <= 375 && screenHeight <= 667) return 'standard'

  // iPhone 6+/7+/8+ (414x736)
  if (screenWidth <= 414 && screenHeight <= 736) return 'plus'

  // iPhone X/XS, 11 Pro, 12 mini, 13 mini (375x812)
  if (screenWidth <= 375 && screenHeight > 667) return 'x'

  // iPhone XR, 11 (414x896)
  if (screenWidth <= 414 && screenHeight <= 896) return 'xr'

  // iPhone 12/13 Pro (390x844)
  if (screenWidth <= 390) return 'pro'

  // iPhone 12/13/14 Pro Max (428x926) & 14 Pro Max (430x932)
  if (screenWidth >= 428) return 'promax'

  // Default to standard for unknown sizes
  return 'standard'
}

// Base dimensions (designed for iPhone 11 Pro - 375x812)
const BASE_WIDTH = 375
const BASE_HEIGHT = 812

// Scale factors for different device types
const SCALE_FACTORS = {
  small: 0.85, // iPhone SE
  standard: 0.92, // iPhone 6/7/8
  plus: 1.0, // iPhone Plus models
  x: 0.95, // iPhone X/XS
  xr: 1.0, // iPhone XR/11
  pro: 0.97, // iPhone 12/13 Pro
  promax: 1.05, // Pro Max models (slightly larger, not too much)
}

// Get scale factor based on device
const deviceType = getDeviceType()
const scaleFactor = SCALE_FACTORS[deviceType] || 1

// Responsive scaling functions
export const scale = (size: number) => {
  const newSize = (screenWidth / BASE_WIDTH) * size
  return Math.round(PixelRatio.roundToNearestPixel(newSize * scaleFactor))
}

export const verticalScale = (size: number) => {
  const newSize = (screenHeight / BASE_HEIGHT) * size
  return Math.round(PixelRatio.roundToNearestPixel(newSize * scaleFactor))
}

// Moderate scale for fonts (less aggressive scaling)
export const moderateScale = (size: number, factor = 0.5) => {
  const newSize = size + (scale(size) - size) * factor
  return Math.round(PixelRatio.roundToNearestPixel(newSize))
}

// Responsive Typography
export const responsiveFontSize = {
  // Extra small text (badges, labels)
  xxs: moderateScale(10),
  xs: moderateScale(12),

  // Body text
  sm: moderateScale(14),
  md: moderateScale(16),
  lg: moderateScale(18),

  // Headings (more conservative scaling for Pro Max)
  xl: moderateScale(22, 0.3), // Was 24, now scales less
  xxl: moderateScale(28, 0.3), // Was 32, now scales less
  xxxl: moderateScale(34, 0.2), // Was 40, now scales much less
  display: moderateScale(42, 0.2), // Was 48, now scales much less
}

// Responsive Spacing
export const responsiveSpacing = {
  xxs: scale(2),
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
  xxxl: scale(64),
}

// Component-specific sizes
export const componentSizes = {
  // Buttons
  buttonHeightSmall: verticalScale(36),
  buttonHeightMedium: verticalScale(44),
  buttonHeightLarge: verticalScale(52),

  // Cards
  cardPadding: scale(16),
  cardBorderRadius: scale(12),

  // Icons
  iconSmall: scale(20),
  iconMedium: scale(24),
  iconLarge: scale(32),

  // Avatar
  avatarSmall: scale(32),
  avatarMedium: scale(40),
  avatarLarge: scale(56),

  // Tab Bar (smaller on Pro Max)
  tabBarHeight: deviceType === 'promax' ? verticalScale(70) : verticalScale(80),

  // Header
  headerHeight: Platform.OS === 'ios' ? verticalScale(44) : verticalScale(56),

  // Input fields
  inputHeight: verticalScale(48),
  inputPadding: scale(12),
}

// Layout metrics
export const layoutMetrics = {
  contentPadding: scale(20),
  cardMargin: scale(16),
  sectionSpacing: verticalScale(24),

  // Adjusted for different screens
  isSmallDevice: screenWidth < 375,
  isMediumDevice: screenWidth >= 375 && screenWidth < 414,
  isLargeDevice: screenWidth >= 414,

  // Pro Max specific adjustments
  isProMax: deviceType === 'promax',
  isCompact: deviceType === 'small' || deviceType === 'standard',
}

// Helper to get responsive styles
export const getResponsiveStyles = () => {
  const isProMax = layoutMetrics.isProMax
  const isCompact = layoutMetrics.isCompact

  return {
    // Typography adjustments
    headingSize: isProMax
      ? responsiveFontSize.xl
      : isCompact
        ? responsiveFontSize.lg
        : responsiveFontSize.xl,
    bodySize: isProMax
      ? responsiveFontSize.md
      : isCompact
        ? responsiveFontSize.sm
        : responsiveFontSize.md,

    // Spacing adjustments
    containerPadding: isProMax
      ? responsiveSpacing.md
      : isCompact
        ? responsiveSpacing.sm
        : responsiveSpacing.md,
    itemSpacing: isProMax
      ? responsiveSpacing.sm
      : isCompact
        ? responsiveSpacing.xs
        : responsiveSpacing.sm,

    // Component density
    listItemHeight: isProMax
      ? verticalScale(60)
      : isCompact
        ? verticalScale(52)
        : verticalScale(56),
    buttonPadding: isProMax ? scale(14) : isCompact ? scale(10) : scale(12),
  }
}

// Export device info for debugging
export const deviceInfo = {
  type: deviceType,
  width: screenWidth,
  height: screenHeight,
  scaleFactor,
  pixelRatio: PixelRatio.get(),
  isIOS: Platform.OS === 'ios',
}

export default {
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  responsiveSpacing,
  componentSizes,
  layoutMetrics,
  getResponsiveStyles,
  deviceInfo,
}
