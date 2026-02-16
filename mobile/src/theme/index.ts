/**
 * FlowB Theme — Unified Export
 *
 * Import the whole theme:
 * ```tsx
 * import { theme } from '@/theme';
 * // theme.colors.accent.primary
 * // theme.spacing.md
 * // theme.typography.headline
 * ```
 *
 * Or import individual modules:
 * ```tsx
 * import { colors, spacing, glassStyle } from '@/theme';
 * ```
 */

// ── Individual module exports ────────────────────────────────────────

export { colors } from './colors';
export type { Colors } from './colors';

export { glassStyle, glassFlat, glassPill } from './glass';
export type { GlassVariant } from './glass';

export { typography } from './typography';
export type { Typography, TypographyVariant } from './typography';

export { spacing, inset, screenPadding } from './spacing';
export type { Spacing, SpacingKey } from './spacing';

export {
  springBouncy,
  springSmooth,
  springSnappy,
  staggerDelay,
  duration,
  withStagger,
  easings,
} from './animations';
export type { SpringConfig } from './animations';

export { shadows } from './shadows';
export type { Shadows } from './shadows';

// ── Unified theme object ─────────────────────────────────────────────

import { colors } from './colors';
import { typography } from './typography';
import { spacing, screenPadding } from './spacing';
import { shadows } from './shadows';
import {
  springBouncy,
  springSmooth,
  springSnappy,
  staggerDelay,
  duration,
  easings,
} from './animations';

export const theme = {
  colors,
  typography,
  spacing,
  screenPadding,
  shadows,
  animation: {
    springBouncy,
    springSmooth,
    springSnappy,
    staggerDelay,
    duration,
    easings,
  },
} as const;

export type Theme = typeof theme;

export default theme;
