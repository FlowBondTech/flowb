/**
 * Themed version of designSystem that uses the current theme colors
 * This replaces the static designSystem with dynamic theme-aware colors
 */

import { Dimensions, Platform } from 'react-native'
import type { Theme } from '../contexts/ThemeContext'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export const createThemedDesignSystem = (theme: Theme) => ({
  colors: {
    ...theme.colors,
    // Legacy mappings for gradual migration
    background: theme.colors.background,
    surface: theme.colors.surface,
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    accent: theme.colors.accent,
    text: theme.colors.text,
    textSecondary: theme.colors.textSecondary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    border: theme.colors.border,
  },

  gradients: theme.gradients,

  // Keep existing layout constants
  layout: {
    screenWidth,
    screenHeight,
    isSmallDevice: screenWidth < 375,
    isMediumDevice: screenWidth >= 375 && screenWidth < 414,
    isLargeDevice: screenWidth >= 414,
    isProMax: screenWidth >= 428,
    tabBarHeight: Platform.select({
      ios: screenWidth >= 428 ? 85 : 80,
      android: 70,
      default: 70,
    }),
    headerHeight: Platform.select({
      ios: 100,
      android: 80,
      default: 80,
    }),
    contentPadding: 24,
    cardPadding: 16,
    borderRadius: {
      small: 8,
      medium: 12,
      large: 16,
      xl: 20,
      full: 9999,
    },
  },

  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold' as const,
      color: theme.colors.text,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: theme.colors.text,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: theme.colors.text,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal' as const,
      color: theme.colors.text,
    },
    bodySecondary: {
      fontSize: 16,
      fontWeight: 'normal' as const,
      color: theme.colors.textSecondary,
    },
    caption: {
      fontSize: 14,
      fontWeight: 'normal' as const,
      color: theme.colors.textSecondary,
    },
    small: {
      fontSize: 12,
      fontWeight: 'normal' as const,
      color: theme.colors.textMuted,
    },
  },

  shadows: {
    small: theme.isDark
      ? {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.18,
          shadowRadius: 1.0,
          elevation: 1,
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 1.0,
          elevation: 1,
        },

    medium: theme.isDark
      ? {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.23,
          shadowRadius: 2.62,
          elevation: 4,
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 2.62,
          elevation: 4,
        },

    large: theme.isDark
      ? {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
          elevation: 8,
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 4.65,
          elevation: 8,
        },
  },

  // Common themed component styles
  components: {
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    button: {
      primary: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      secondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      text: {
        primary: {
          color: theme.isDark ? '#ffffff' : theme.colors.background,
          fontSize: 16,
          fontWeight: '600' as const,
        },
        secondary: {
          color: theme.colors.primary,
          fontSize: 16,
          fontWeight: '600' as const,
        },
      },
    },

    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      placeholderTextColor: theme.colors.textMuted,
    },

    modal: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
    },

    header: {
      backgroundColor: theme.colors.background,
      paddingTop: Platform.select({
        ios: 60,
        android: 40,
        default: 40,
      }),
      paddingBottom: 16,
      paddingHorizontal: 24,
    },
  },
})
