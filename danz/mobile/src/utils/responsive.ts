import { Dimensions, PixelRatio } from 'react-native'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

// Base dimensions (iPhone 14 Pro)
const baseWidth = 393
const baseHeight = 852

// Scale factors
const widthScale = screenWidth / baseWidth
const heightScale = screenHeight / baseHeight
const scale = Math.min(widthScale, heightScale)

// Font scaling based on device settings
const fontScale = PixelRatio.getFontScale()

/**
 * Scales a value based on device width
 * Use for: margins, paddings, widths
 */
export const horizontalScale = (size: number): number => {
  return Math.round(size * widthScale)
}

/**
 * Scales a value based on device height
 * Use for: heights, vertical margins/paddings
 */
export const verticalScale = (size: number): number => {
  return Math.round(size * heightScale)
}

/**
 * Scales a value moderately (average of width and height scales)
 * Use for: border radius, icon sizes
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return Math.round(size + (scale - 1) * size * factor)
}

/**
 * Scales font sizes with respect to device font settings
 * Includes min/max limits to prevent text from being too small or too large
 */
export const scaledFontSize = (size: number): number => {
  const newSize = size * fontScale

  // Set min and max font sizes to maintain readability
  const minSize = size * 0.85 // Don't go below 85% of intended size
  const maxSize = size * 1.3 // Don't go above 130% of intended size

  if (newSize < minSize) return minSize
  if (newSize > maxSize) return maxSize

  return Math.round(newSize)
}

/**
 * Responsive dimensions helper
 */
export const responsiveDimensions = {
  width: screenWidth,
  height: screenHeight,
  isSmallDevice: screenWidth < 375,
  isMediumDevice: screenWidth >= 375 && screenWidth < 414,
  isLargeDevice: screenWidth >= 414,
  isTablet: screenWidth >= 768,
  fontScale,

  // Common responsive values
  padding: {
    xs: horizontalScale(4),
    sm: horizontalScale(8),
    md: horizontalScale(16),
    lg: horizontalScale(24),
    xl: horizontalScale(32),
  },

  fontSize: {
    xs: scaledFontSize(10),
    sm: scaledFontSize(12),
    md: scaledFontSize(14),
    lg: scaledFontSize(16),
    xl: scaledFontSize(20),
    xxl: scaledFontSize(24),
    xxxl: scaledFontSize(32),
  },

  iconSize: {
    xs: moderateScale(16),
    sm: moderateScale(20),
    md: moderateScale(24),
    lg: moderateScale(32),
    xl: moderateScale(40),
  },

  borderRadius: {
    sm: moderateScale(4),
    md: moderateScale(8),
    lg: moderateScale(12),
    xl: moderateScale(16),
    round: moderateScale(9999),
  },
}

// Shorthand exports
export const hs = horizontalScale
export const vs = verticalScale
export const ms = moderateScale
export const fs = scaledFontSize
export const rd = responsiveDimensions
