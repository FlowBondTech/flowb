import type { Theme } from '../contexts/ThemeContext'

/**
 * Creates dynamic styles based on the current theme
 * Use this to replace hardcoded colors with theme-aware colors
 */
export const createThemedStyles = (theme: Theme) => {
  return {
    // Backgrounds
    background: {
      backgroundColor: theme.colors.background,
    },
    surface: {
      backgroundColor: theme.colors.surface,
    },
    card: {
      backgroundColor: theme.colors.card,
    },

    // Text colors
    text: {
      color: theme.colors.text,
    },
    textSecondary: {
      color: theme.colors.textSecondary,
    },
    textMuted: {
      color: theme.colors.textMuted,
    },

    // Borders
    border: {
      borderColor: theme.colors.border,
    },
    borderPrimary: {
      borderColor: theme.colors.primary,
    },

    // Status colors
    success: {
      color: theme.colors.success,
    },
    warning: {
      color: theme.colors.warning,
    },
    error: {
      color: theme.colors.error,
    },
    info: {
      color: theme.colors.info,
    },

    // Primary accent
    primaryText: {
      color: theme.colors.primary,
    },
    primaryBackground: {
      backgroundColor: theme.colors.primary,
    },
    primaryBorder: {
      borderColor: theme.colors.primary,
    },

    // Secondary accent
    secondaryText: {
      color: theme.colors.secondary,
    },
    secondaryBackground: {
      backgroundColor: theme.colors.secondary,
    },

    // Accent
    accentText: {
      color: theme.colors.accent,
    },
    accentBackground: {
      backgroundColor: theme.colors.accent,
    },

    // Common component styles
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    cardStyle: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    buttonText: {
      color: theme.isDark ? '#ffffff' : theme.colors.background,
      fontSize: 16,
      fontWeight: '600' as const,
    },

    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    overlay: {
      backgroundColor: theme.colors.overlay,
    },

    gradient: {
      colors: theme.gradients.primary,
    },

    // Shadow for dark themes
    shadow: theme.isDark
      ? {
          shadowColor: theme.colors.shadow,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }
      : {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3.84,
          elevation: 5,
        },
  }
}

/**
 * Helper to get theme-aware styles for common patterns
 */
export const getThemedStyles = (theme: Theme) => {
  const styles = createThemedStyles(theme)

  return {
    ...styles,

    // Screen container with safe background
    screenContainer: [styles.container, styles.background],

    // Card with shadow
    cardWithShadow: [styles.cardStyle, styles.shadow],

    // Primary button
    primaryButton: [styles.button, styles.primaryBackground],

    // Ghost button
    ghostButton: {
      ...styles.button,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },

    // Section header
    sectionHeader: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      color: theme.colors.text,
      marginBottom: 16,
    },

    // List item
    listItem: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
  }
}
