/**
 * FlowB Typography Scale
 *
 * Uses SF Pro on iOS (system default) and Roboto on Android (system default).
 * The scale follows the iOS Human Interface Guidelines sizing with custom
 * letter-spacing for the glassmorphism aesthetic.
 *
 * Every preset returns a full TextStyle so you can spread it directly:
 * ```tsx
 * <Text style={[typography.headline, { color: colors.text.secondary }]}>
 * ```
 */

import { Platform, TextStyle } from 'react-native';

import { colors } from './colors';

// ── Helpers ──────────────────────────────────────────────────────────

type FontWeight = TextStyle['fontWeight'];

/**
 * React Native requires fontWeight as a string on both platforms.
 * We keep a helper so weight values are defined in one place.
 */
function weight(value: '400' | '500' | '600' | '700'): FontWeight {
  return Platform.select<FontWeight>({
    ios: value,
    default: value,
  });
}

const systemFont = Platform.select({
  ios: 'System',
  default: undefined, // Android uses Roboto by default
});

// ── Scale ────────────────────────────────────────────────────────────

export const typography = {
  /** Large display text — onboarding, feature intros */
  hero: {
    fontFamily: systemFont,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: weight('700'),
    letterSpacing: -0.5,
    color: colors.text.primary,
  } satisfies TextStyle,

  /** Screen titles */
  title: {
    fontFamily: systemFont,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: weight('600'),
    letterSpacing: 0,
    color: colors.text.primary,
  } satisfies TextStyle,

  /** Section headings, emphasized labels */
  headline: {
    fontFamily: systemFont,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: weight('600'),
    letterSpacing: 0,
    color: colors.text.primary,
  } satisfies TextStyle,

  /** Default body text */
  body: {
    fontFamily: systemFont,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: weight('400'),
    letterSpacing: 0,
    color: colors.text.primary,
  } satisfies TextStyle,

  /** Supporting text, timestamps, metadata */
  caption: {
    fontFamily: systemFont,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: weight('400'),
    letterSpacing: 0,
    color: colors.text.secondary,
  } satisfies TextStyle,

  /** Badges, labels, tiny indicators */
  micro: {
    fontFamily: systemFont,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: weight('500'),
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: colors.text.secondary,
  } satisfies TextStyle,
} as const;

export type Typography = typeof typography;
export type TypographyVariant = keyof Typography;
