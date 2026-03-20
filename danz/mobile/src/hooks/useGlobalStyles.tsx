import { useMemo } from 'react'
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native'
import { useAccessibility } from '../contexts/AccessibilityContext'
import { useTheme } from '../contexts/ThemeContext'

/**
 * Create static style structure without colors
 * This is created once and never recreated during renders
 */
const createStaticStyles = () =>
  StyleSheet.create({
    // Headers
    h1: {
      // fontSize, lineHeight, and fontWeight will be added dynamically
    } as TextStyle,
    h2: {} as TextStyle,
    h3: {} as TextStyle,
    h4: {} as TextStyle,
    h5: {} as TextStyle,
    h6: {} as TextStyle,

    // Body text
    text: {} as TextStyle,
    textLarge: {} as TextStyle,
    textSmall: {} as TextStyle,
    textTiny: {} as TextStyle,

    // Special text
    title: {} as TextStyle,
    subtitle: {} as TextStyle,
    label: {} as TextStyle,
    caption: {} as TextStyle,
    micro: {} as TextStyle,

    // Button text
    buttonText: {} as TextStyle,
    buttonTextSmall: {} as TextStyle,

    // Colored text variants
    textPrimary: {} as TextStyle,
    textSecondary: {} as TextStyle,
    textAccent: {} as TextStyle,
    textSuccess: {} as TextStyle,
    textError: {} as TextStyle,
    textWarning: {} as TextStyle,

    // Container styles with responsive spacing
    container: {
      flex: 1,
    } as ViewStyle,
    content: {} as ViewStyle,
    section: {} as ViewStyle,
    card: {
      borderRadius: 12,
    } as ViewStyle,
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    spaceBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as ViewStyle,

    // Spacing helpers
    marginXS: {} as ViewStyle,
    marginSM: {} as ViewStyle,
    marginMD: {} as ViewStyle,
    marginLG: {} as ViewStyle,
    marginXL: {} as ViewStyle,
    paddingXS: {} as ViewStyle,
    paddingSM: {} as ViewStyle,
    paddingMD: {} as ViewStyle,
    paddingLG: {} as ViewStyle,
    paddingXL: {} as ViewStyle,
  })

// Create static styles once
const staticStyles = createStaticStyles()

/**
 * Global styles hook that automatically applies theme and accessibility settings
 * This should be used in all screens for consistent text sizing
 */
export const useGlobalStyles = () => {
  const { theme } = useTheme()
  const { fontSizes, spacing, getLineHeight, boldText, highContrast } = useAccessibility()

  // Memoize dynamic styles to prevent unnecessary re-renders
  const styles = useMemo(() => {
    // Apply high contrast adjustments if enabled
    const textColor = highContrast ? theme.colors.text : theme.colors.text
    const textSecondaryColor = highContrast ? `${theme.colors.text}CC` : theme.colors.textSecondary

    // Create a new object with dynamic values applied to static styles
    return {
      // Headers
      h1: {
        ...staticStyles.h1,
        fontSize: fontSizes.h1,
        lineHeight: getLineHeight(fontSizes.h1),
        fontWeight: boldText ? '700' : '600',
        color: textColor,
      } as TextStyle,
      h2: {
        ...staticStyles.h2,
        fontSize: fontSizes.h2,
        lineHeight: getLineHeight(fontSizes.h2),
        fontWeight: boldText ? '700' : '600',
        color: textColor,
      } as TextStyle,
      h3: {
        ...staticStyles.h3,
        fontSize: fontSizes.h3,
        lineHeight: getLineHeight(fontSizes.h3),
        fontWeight: boldText ? '600' : '500',
        color: textColor,
      } as TextStyle,
      h4: {
        ...staticStyles.h4,
        fontSize: fontSizes.h4,
        lineHeight: getLineHeight(fontSizes.h4),
        fontWeight: boldText ? '600' : '500',
        color: textColor,
      } as TextStyle,
      h5: {
        ...staticStyles.h5,
        fontSize: fontSizes.h5,
        lineHeight: getLineHeight(fontSizes.h5),
        fontWeight: boldText ? '500' : '400',
        color: textColor,
      } as TextStyle,
      h6: {
        ...staticStyles.h6,
        fontSize: fontSizes.h6,
        lineHeight: getLineHeight(fontSizes.h6),
        fontWeight: boldText ? '500' : '400',
        color: textColor,
      } as TextStyle,

      // Body text
      text: {
        ...staticStyles.text,
        fontSize: fontSizes.body,
        lineHeight: getLineHeight(fontSizes.body),
        fontWeight: boldText ? '500' : '400',
        color: textColor,
      } as TextStyle,
      textLarge: {
        ...staticStyles.textLarge,
        fontSize: fontSizes.bodyLarge,
        lineHeight: getLineHeight(fontSizes.bodyLarge),
        fontWeight: boldText ? '500' : '400',
        color: textColor,
      } as TextStyle,
      textSmall: {
        ...staticStyles.textSmall,
        fontSize: fontSizes.bodySmall,
        lineHeight: getLineHeight(fontSizes.bodySmall),
        fontWeight: boldText ? '500' : '400',
        color: textSecondaryColor,
      } as TextStyle,
      textTiny: {
        ...staticStyles.textTiny,
        fontSize: fontSizes.caption,
        lineHeight: getLineHeight(fontSizes.caption),
        fontWeight: boldText ? '500' : '400',
        color: textSecondaryColor,
      } as TextStyle,

      // Special text
      title: {
        ...staticStyles.title,
        fontSize: fontSizes.title,
        lineHeight: getLineHeight(fontSizes.title),
        fontWeight: boldText ? '700' : '600',
        color: textColor,
      } as TextStyle,
      subtitle: {
        ...staticStyles.subtitle,
        fontSize: fontSizes.subtitle,
        lineHeight: getLineHeight(fontSizes.subtitle),
        fontWeight: boldText ? '500' : '400',
        color: textSecondaryColor,
      } as TextStyle,
      label: {
        ...staticStyles.label,
        fontSize: fontSizes.label,
        lineHeight: getLineHeight(fontSizes.label),
        fontWeight: boldText ? '600' : '500',
        color: textColor,
      } as TextStyle,
      caption: {
        ...staticStyles.caption,
        fontSize: fontSizes.caption,
        lineHeight: getLineHeight(fontSizes.caption),
        fontWeight: boldText ? '500' : '400',
        color: textSecondaryColor,
      } as TextStyle,
      micro: {
        ...staticStyles.micro,
        fontSize: fontSizes.micro,
        lineHeight: getLineHeight(fontSizes.micro),
        fontWeight: boldText ? '500' : '400',
        color: theme.colors.textMuted,
      } as TextStyle,

      // Button text
      buttonText: {
        ...staticStyles.buttonText,
        fontSize: fontSizes.button,
        lineHeight: getLineHeight(fontSizes.button),
        fontWeight: boldText ? '700' : '600',
        color: 'white',
      } as TextStyle,
      buttonTextSmall: {
        ...staticStyles.buttonTextSmall,
        fontSize: fontSizes.buttonSmall,
        lineHeight: getLineHeight(fontSizes.buttonSmall),
        fontWeight: boldText ? '600' : '500',
        color: 'white',
      } as TextStyle,

      // Colored text variants
      textPrimary: {
        ...staticStyles.textPrimary,
        fontSize: fontSizes.body,
        lineHeight: getLineHeight(fontSizes.body),
        fontWeight: boldText ? '600' : '500',
        color: theme.colors.primary,
      } as TextStyle,
      textSecondary: {
        ...staticStyles.textSecondary,
        fontSize: fontSizes.body,
        lineHeight: getLineHeight(fontSizes.body),
        fontWeight: boldText ? '500' : '400',
        color: textSecondaryColor,
      } as TextStyle,
      textAccent: {
        ...staticStyles.textAccent,
        fontSize: fontSizes.body,
        lineHeight: getLineHeight(fontSizes.body),
        fontWeight: boldText ? '600' : '500',
        color: theme.colors.accent,
      } as TextStyle,
      textSuccess: {
        ...staticStyles.textSuccess,
        fontSize: fontSizes.body,
        lineHeight: getLineHeight(fontSizes.body),
        fontWeight: boldText ? '500' : '400',
        color: theme.colors.success,
      } as TextStyle,
      textError: {
        ...staticStyles.textError,
        fontSize: fontSizes.body,
        lineHeight: getLineHeight(fontSizes.body),
        fontWeight: boldText ? '500' : '400',
        color: theme.colors.error,
      } as TextStyle,
      textWarning: {
        ...staticStyles.textWarning,
        fontSize: fontSizes.body,
        lineHeight: getLineHeight(fontSizes.body),
        fontWeight: boldText ? '500' : '400',
        color: theme.colors.warning,
      } as TextStyle,

      // Container styles with responsive spacing
      container: {
        ...staticStyles.container,
        backgroundColor: theme.colors.background,
      } as ViewStyle,
      content: {
        ...staticStyles.content,
        padding: spacing.md,
      } as ViewStyle,
      section: {
        ...staticStyles.section,
        marginBottom: spacing.lg,
      } as ViewStyle,
      card: {
        ...staticStyles.card,
        backgroundColor: theme.colors.card,
        padding: spacing.md,
        marginBottom: spacing.md,
      } as ViewStyle,
      row: staticStyles.row,
      spaceBetween: staticStyles.spaceBetween,

      // Spacing helpers
      marginXS: { ...staticStyles.marginXS, margin: spacing.xs } as ViewStyle,
      marginSM: { ...staticStyles.marginSM, margin: spacing.sm } as ViewStyle,
      marginMD: { ...staticStyles.marginMD, margin: spacing.md } as ViewStyle,
      marginLG: { ...staticStyles.marginLG, margin: spacing.lg } as ViewStyle,
      marginXL: { ...staticStyles.marginXL, margin: spacing.xl } as ViewStyle,
      paddingXS: { ...staticStyles.paddingXS, padding: spacing.xs } as ViewStyle,
      paddingSM: { ...staticStyles.paddingSM, padding: spacing.sm } as ViewStyle,
      paddingMD: { ...staticStyles.paddingMD, padding: spacing.md } as ViewStyle,
      paddingLG: { ...staticStyles.paddingLG, padding: spacing.lg } as ViewStyle,
      paddingXL: { ...staticStyles.paddingXL, padding: spacing.xl } as ViewStyle,
    }
  }, [theme, fontSizes, spacing, getLineHeight, boldText, highContrast])

  return {
    styles,
    theme,
    fontSizes,
    spacing,
  }
}

// Export a helper to get specific text style with color override
export const getTextStyle = (
  styles: ReturnType<typeof useGlobalStyles>['styles'],
  styleName: keyof ReturnType<typeof useGlobalStyles>['styles'],
  color?: string,
): TextStyle => {
  const baseStyle = styles[styleName] as TextStyle
  return color ? { ...baseStyle, color } : baseStyle
}
