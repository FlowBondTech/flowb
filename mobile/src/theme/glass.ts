/**
 * FlowB Glassmorphism Style Generators
 *
 * Produces ViewStyle objects for glass-panel effects. On iOS we rely on
 * BlurView wrappers for the actual backdrop blur; these styles provide the
 * tinted overlay, border, and border-radius that sit on top. On Android
 * (which lacks performant real-time blur) we use a slightly more opaque
 * solid background to approximate the frosted look.
 */

import { Platform, ViewStyle } from 'react-native';

import { colors } from './colors';

// ── Variant configurations ───────────────────────────────────────────

interface GlassConfig {
  backgroundIOS: string;
  backgroundAndroid: string;
  borderColor: string;
}

const variantMap: Record<GlassVariant, GlassConfig> = {
  subtle: {
    backgroundIOS: colors.glass.subtle,
    backgroundAndroid: 'rgba(10,10,26,0.85)',
    borderColor: colors.border.subtle,
  },
  medium: {
    backgroundIOS: colors.glass.medium,
    backgroundAndroid: 'rgba(18,18,42,0.88)',
    borderColor: colors.border.default,
  },
  heavy: {
    backgroundIOS: colors.glass.heavy,
    backgroundAndroid: 'rgba(18,18,42,0.92)',
    borderColor: colors.border.bright,
  },
  glow: {
    backgroundIOS: colors.glass.medium,
    backgroundAndroid: 'rgba(18,18,42,0.88)',
    borderColor: colors.accent.primary,
  },
};

// ── Public API ────────────────────────────────────────────────────────

export type GlassVariant = 'subtle' | 'medium' | 'heavy' | 'glow';

/**
 * Returns a `ViewStyle` for the requested glass variant.
 *
 * Usage:
 * ```tsx
 * <View style={[glassStyle('medium'), { padding: spacing.md }]}>
 *   ...
 * </View>
 * ```
 *
 * For iOS blur you still need to wrap content in `<BlurView>` from
 * `expo-blur`; this style provides the tint/border layer on top.
 */
export function glassStyle(variant: GlassVariant): ViewStyle {
  const cfg = variantMap[variant];

  const base: ViewStyle = {
    backgroundColor: Platform.select({
      ios: cfg.backgroundIOS,
      default: cfg.backgroundAndroid,
    }),
    borderWidth: 1,
    borderColor: cfg.borderColor,
    borderRadius: 16,
    overflow: 'hidden',
  };

  if (variant === 'glow') {
    return {
      ...base,
      ...Platform.select({
        ios: {
          shadowColor: colors.accent.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },
        android: {
          elevation: 8,
        },
        default: {},
      }),
    };
  }

  return base;
}

/**
 * Convenience: produces glass background + border without border-radius
 * so you can compose your own radius. Useful for bottom sheets, headers, etc.
 */
export function glassFlat(variant: GlassVariant): ViewStyle {
  const style = glassStyle(variant);
  return { ...style, borderRadius: 0 };
}

/**
 * A pill-shaped glass button style.
 */
export function glassPill(variant: GlassVariant): ViewStyle {
  const style = glassStyle(variant);
  return { ...style, borderRadius: 999 };
}
