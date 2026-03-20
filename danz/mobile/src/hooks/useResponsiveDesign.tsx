import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native'
import { useAccessibility } from '../contexts/AccessibilityContext'
import { useTheme } from '../contexts/ThemeContext'

/**
 * Custom hook that combines theme and accessibility contexts
 * to provide fully responsive styles for components
 */
export const useResponsiveDesign = () => {
  const { theme } = useTheme()
  const { fontSizes, spacing, getScaledValue, boldText, getLineHeight } = useAccessibility()

  // Create responsive text styles
  const textStyles = StyleSheet.create({
    h1: {
      fontSize: fontSizes.h1,
      lineHeight: getLineHeight(fontSizes.h1),
      fontWeight: boldText ? '700' : '600',
      color: theme.colors.text,
    } as TextStyle,
    h2: {
      fontSize: fontSizes.h2,
      lineHeight: getLineHeight(fontSizes.h2),
      fontWeight: boldText ? '700' : '600',
      color: theme.colors.text,
    } as TextStyle,
    h3: {
      fontSize: fontSizes.h3,
      lineHeight: getLineHeight(fontSizes.h3),
      fontWeight: boldText ? '600' : '500',
      color: theme.colors.text,
    } as TextStyle,
    h4: {
      fontSize: fontSizes.h4,
      lineHeight: getLineHeight(fontSizes.h4),
      fontWeight: boldText ? '600' : '500',
      color: theme.colors.text,
    } as TextStyle,
    h5: {
      fontSize: fontSizes.h5,
      lineHeight: getLineHeight(fontSizes.h5),
      fontWeight: boldText ? '500' : '400',
      color: theme.colors.text,
    } as TextStyle,
    h6: {
      fontSize: fontSizes.h6,
      lineHeight: getLineHeight(fontSizes.h6),
      fontWeight: boldText ? '500' : '400',
      color: theme.colors.text,
    } as TextStyle,
    body: {
      fontSize: fontSizes.body,
      lineHeight: getLineHeight(fontSizes.body),
      fontWeight: boldText ? '500' : '400',
      color: theme.colors.text,
    } as TextStyle,
    bodyLarge: {
      fontSize: fontSizes.bodyLarge,
      lineHeight: getLineHeight(fontSizes.bodyLarge),
      fontWeight: boldText ? '500' : '400',
      color: theme.colors.text,
    } as TextStyle,
    bodySmall: {
      fontSize: fontSizes.bodySmall,
      lineHeight: getLineHeight(fontSizes.bodySmall),
      fontWeight: boldText ? '500' : '400',
      color: theme.colors.textSecondary,
    } as TextStyle,
    caption: {
      fontSize: fontSizes.caption,
      lineHeight: getLineHeight(fontSizes.caption),
      fontWeight: boldText ? '500' : '400',
      color: theme.colors.textSecondary,
    } as TextStyle,
    label: {
      fontSize: fontSizes.label,
      lineHeight: getLineHeight(fontSizes.label),
      fontWeight: boldText ? '600' : '500',
      color: theme.colors.text,
    } as TextStyle,
    button: {
      fontSize: fontSizes.button,
      lineHeight: getLineHeight(fontSizes.button),
      fontWeight: boldText ? '700' : '600',
      color: theme.colors.text,
    } as TextStyle,
    buttonSmall: {
      fontSize: fontSizes.buttonSmall,
      lineHeight: getLineHeight(fontSizes.buttonSmall),
      fontWeight: boldText ? '600' : '500',
      color: theme.colors.text,
    } as TextStyle,
    title: {
      fontSize: fontSizes.title,
      lineHeight: getLineHeight(fontSizes.title),
      fontWeight: boldText ? '700' : '600',
      color: theme.colors.text,
    } as TextStyle,
    subtitle: {
      fontSize: fontSizes.subtitle,
      lineHeight: getLineHeight(fontSizes.subtitle),
      fontWeight: boldText ? '500' : '400',
      color: theme.colors.textSecondary,
    } as TextStyle,
    micro: {
      fontSize: fontSizes.micro,
      lineHeight: getLineHeight(fontSizes.micro),
      fontWeight: boldText ? '500' : '400',
      color: theme.colors.textMuted,
    } as TextStyle,
  })

  // Create responsive spacing styles
  const spacingStyles = {
    paddingXS: spacing.xs,
    paddingSM: spacing.sm,
    paddingMD: spacing.md,
    paddingLG: spacing.lg,
    paddingXL: spacing.xl,
    paddingXXL: spacing.xxl,
    marginXS: spacing.xs,
    marginSM: spacing.sm,
    marginMD: spacing.md,
    marginLG: spacing.lg,
    marginXL: spacing.xl,
    marginXXL: spacing.xxl,
    gapXS: spacing.xs,
    gapSM: spacing.sm,
    gapMD: spacing.md,
    gapLG: spacing.lg,
    gapXL: spacing.xl,
    gapXXL: spacing.xxl,
  }

  // Container styles with responsive padding
  const containerStyles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    } as ViewStyle,
    scrollContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    } as ViewStyle,
    contentContainer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    } as ViewStyle,
    section: {
      marginBottom: spacing.lg,
    } as ViewStyle,
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: getScaledValue(12),
      padding: spacing.md,
      marginBottom: spacing.md,
    } as ViewStyle,
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    } as ViewStyle,
    spaceBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as ViewStyle,
  })

  // Button styles with responsive sizing
  const buttonStyles = StyleSheet.create({
    button: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: getScaledValue(12),
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    buttonPrimary: {
      backgroundColor: theme.colors.primary,
    } as ViewStyle,
    buttonSecondary: {
      backgroundColor: theme.colors.secondary,
    } as ViewStyle,
    buttonOutline: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: 'transparent',
    } as ViewStyle,
    buttonSmall: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: getScaledValue(8),
    } as ViewStyle,
    buttonLarge: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: getScaledValue(16),
    } as ViewStyle,
  })

  return {
    theme,
    textStyles,
    spacingStyles,
    containerStyles,
    buttonStyles,
    fontSizes,
    spacing,
    getScaledValue,
    boldText,
    getLineHeight,
  }
}
