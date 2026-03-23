import { useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { useAccessibility } from '../contexts/AccessibilityContext'
import { useTheme } from '../contexts/ThemeContext'
import { createThemedDesignSystem } from '../styles/themedDesignSystem'

/**
 * Hook to get themed styles for components
 * Automatically updates when theme or accessibility settings change
 */
export const useThemedStyles = () => {
  const { theme } = useTheme()
  const { fontSizes, boldText, getLineHeight, spacing } = useAccessibility()

  const themedDesignSystem = useMemo(() => createThemedDesignSystem(theme), [theme])

  // Common dynamic styles that components can use
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        // Containers
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        screenContainer: {
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingHorizontal: themedDesignSystem.layout.contentPadding,
        },

        // Text styles
        text: {
          color: theme.colors.text,
        },
        textSecondary: {
          color: theme.colors.textSecondary,
        },
        textMuted: {
          color: theme.colors.textMuted,
        },
        textPrimary: {
          color: theme.colors.primary,
        },

        // Cards
        card: {
          backgroundColor: theme.colors.card,
          borderRadius: themedDesignSystem.layout.borderRadius.large,
          padding: themedDesignSystem.layout.cardPadding,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        cardWithShadow: {
          backgroundColor: theme.colors.card,
          borderRadius: themedDesignSystem.layout.borderRadius.large,
          padding: themedDesignSystem.layout.cardPadding,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...themedDesignSystem.shadows.medium,
        },

        // Buttons
        primaryButton: {
          backgroundColor: theme.colors.primary,
          borderRadius: themedDesignSystem.layout.borderRadius.medium,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
        },
        secondaryButton: {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.colors.primary,
          borderRadius: themedDesignSystem.layout.borderRadius.medium,
          paddingVertical: spacing.md - 2,
          paddingHorizontal: spacing.lg,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
        },
        buttonText: {
          color: theme.isDark ? '#ffffff' : theme.colors.background,
          fontSize: fontSizes.button,
          fontWeight: boldText ? ('700' as const) : ('600' as const),
        },
        secondaryButtonText: {
          color: theme.colors.primary,
          fontSize: fontSizes.button,
          fontWeight: boldText ? ('700' as const) : ('600' as const),
        },

        // Inputs
        input: {
          backgroundColor: theme.colors.card,
          borderRadius: themedDesignSystem.layout.borderRadius.medium,
          padding: spacing.md,
          fontSize: fontSizes.body,
          color: theme.colors.text,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },

        // Headers
        header: {
          backgroundColor: theme.colors.background,
          paddingTop: themedDesignSystem.layout.headerHeight - 20,
          paddingBottom: spacing.md,
          paddingHorizontal: themedDesignSystem.layout.contentPadding,
        },
        headerTitle: {
          fontSize: fontSizes.h1,
          fontWeight: boldText ? ('800' as const) : ('700' as const),
          color: theme.colors.text,
        },

        // Sections
        section: {
          marginBottom: spacing.lg,
        },
        sectionTitle: {
          fontSize: fontSizes.h2,
          fontWeight: boldText ? ('700' as const) : ('600' as const),
          color: theme.colors.text,
          marginBottom: spacing.md,
        },

        // List items
        listItem: {
          backgroundColor: theme.colors.card,
          borderRadius: themedDesignSystem.layout.borderRadius.medium,
          padding: spacing.md,
          marginBottom: spacing.sm,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
        },

        // Modals
        modalOverlay: {
          flex: 1,
          backgroundColor: theme.colors.overlay,
        },
        modalContent: {
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: themedDesignSystem.layout.borderRadius.xl,
          borderTopRightRadius: themedDesignSystem.layout.borderRadius.xl,
          padding: themedDesignSystem.layout.contentPadding,
        },

        // Badges
        badge: {
          backgroundColor: `${theme.colors.primary}20`,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: themedDesignSystem.layout.borderRadius.small,
        },
        badgeText: {
          color: theme.colors.primary,
          fontSize: fontSizes.caption,
          fontWeight: boldText ? ('700' as const) : ('600' as const),
        },

        // Dividers
        divider: {
          height: 1,
          backgroundColor: theme.colors.border,
          marginVertical: spacing.md,
        },

        // Status indicators
        successText: {
          color: theme.colors.success,
        },
        warningText: {
          color: theme.colors.warning,
        },
        errorText: {
          color: theme.colors.error,
        },
        infoText: {
          color: theme.colors.info,
        },

        // Typography styles (accessibility-aware)
        h1: {
          fontSize: fontSizes.h1,
          lineHeight: getLineHeight(fontSizes.h1),
          fontWeight: boldText ? ('800' as const) : ('700' as const),
          color: theme.colors.text,
        },
        h2: {
          fontSize: fontSizes.h2,
          lineHeight: getLineHeight(fontSizes.h2),
          fontWeight: boldText ? ('700' as const) : ('600' as const),
          color: theme.colors.text,
        },
        h3: {
          fontSize: fontSizes.h3,
          lineHeight: getLineHeight(fontSizes.h3),
          fontWeight: boldText ? ('600' as const) : ('500' as const),
          color: theme.colors.text,
        },
        body: {
          fontSize: fontSizes.body,
          lineHeight: getLineHeight(fontSizes.body),
          fontWeight: boldText ? ('500' as const) : ('400' as const),
          color: theme.colors.text,
        },
        bodySmall: {
          fontSize: fontSizes.bodySmall,
          lineHeight: getLineHeight(fontSizes.bodySmall),
          fontWeight: boldText ? ('500' as const) : ('400' as const),
          color: theme.colors.textSecondary,
        },
        caption: {
          fontSize: fontSizes.caption,
          lineHeight: getLineHeight(fontSizes.caption),
          fontWeight: boldText ? ('500' as const) : ('400' as const),
          color: theme.colors.textMuted,
        },
      }),
    [theme, themedDesignSystem, fontSizes, boldText, spacing, getLineHeight],
  )

  return {
    theme,
    themedDesignSystem,
    styles: dynamicStyles,
    colors: theme.colors,
    gradients: theme.gradients,
    // Accessibility-aware typography
    fontSizes,
    spacing,
    boldText,
    getLineHeight,
  }
}
