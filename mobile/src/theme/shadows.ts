/**
 * FlowB Shadow Presets
 *
 * Platform-specific shadow/elevation definitions. iOS uses the native
 * shadow properties; Android uses `elevation`. Every preset returns a
 * full ViewStyle so you can spread it directly.
 *
 * Usage:
 * ```tsx
 * <View style={[glassStyle('medium'), shadows.medium, { padding: spacing.md }]} />
 * ```
 */

import { Platform, ViewStyle } from 'react-native';

import { colors } from './colors';

// ── Types ────────────────────────────────────────────────────────────

interface ShadowPreset {
  ios: ViewStyle;
  android: ViewStyle;
}

function platformShadow(preset: ShadowPreset): ViewStyle {
  return Platform.select({
    ios: preset.ios,
    default: preset.android,
  }) as ViewStyle;
}

// ── Presets ──────────────────────────────────────────────────────────

/** Barely-there lift for flat surfaces */
const subtle: ViewStyle = platformShadow({
  ios: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  android: {
    elevation: 2,
  },
});

/** Default card shadow */
const medium: ViewStyle = platformShadow({
  ios: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  android: {
    elevation: 6,
  },
});

/** Heavy lift for modals, overlays */
const heavy: ViewStyle = platformShadow({
  ios: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
  },
  android: {
    elevation: 12,
  },
});

/**
 * Colored glow shadow — used for CTAs and highlighted elements.
 *
 * @param color - The glow color (defaults to primary accent)
 *
 * ```tsx
 * <Pressable style={[glassPill('glow'), shadows.glow(colors.accent.cyan)]} />
 * ```
 */
function glow(color: string = colors.accent.primary): ViewStyle {
  return platformShadow({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  });
}

// ── Export ────────────────────────────────────────────────────────────

export const shadows = {
  subtle,
  medium,
  heavy,
  glow,
} as const;

export type Shadows = typeof shadows;
