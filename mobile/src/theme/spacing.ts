/**
 * FlowB Spacing Scale
 *
 * 8pt grid system. Every spacing value is a multiple of 4 so we stay on
 * the grid at half-increments when needed (xs = 4).
 *
 * Usage:
 * ```tsx
 * <View style={{ padding: spacing.md, gap: spacing.sm }} />
 * ```
 */

export const spacing = {
  /** 4px — icon padding, tight inline gaps */
  xs: 4,
  /** 8px — default inline gap, compact list padding */
  sm: 8,
  /** 16px — standard padding, card insets */
  md: 16,
  /** 24px — section spacing, generous padding */
  lg: 24,
  /** 32px — major section breaks */
  xl: 32,
  /** 48px — screen-level vertical rhythm, hero spacing */
  xxl: 48,
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof Spacing;

/**
 * Convenience helper to create symmetric horizontal/vertical padding.
 */
export function inset(vertical: number, horizontal: number) {
  return {
    paddingVertical: vertical,
    paddingHorizontal: horizontal,
  };
}

/**
 * Creates consistent screen-level padding.
 * Horizontal: md (16), Vertical: lg (24).
 */
export const screenPadding = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
} as const;
