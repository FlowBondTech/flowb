/**
 * FlowB Animation Configurations
 *
 * Spring presets for react-native-reanimated. Each config is designed for
 * a specific feel:
 *
 * - **bouncy**  — playful, attention-grabbing (modals, toasts)
 * - **smooth**  — natural, relaxed (page transitions, fades)
 * - **snappy**  — crisp, responsive (buttons, toggles, micro-interactions)
 *
 * Requires `react-native-reanimated` >= 3.x in the project.
 *
 * Usage:
 * ```tsx
 * import { withSpring, withDelay } from 'react-native-reanimated';
 * import { springBouncy, withStagger } from '@/theme/animations';
 *
 * const entering = () => {
 *   'worklet';
 *   return { initialValues: { opacity: 0 }, animations: { opacity: withSpring(1, springBouncy) } };
 * };
 * ```
 */

// ── Spring configs ───────────────────────────────────────────────────

export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
}

/** Playful bounce — modals, toasts, celebratory moments */
export const springBouncy: SpringConfig = {
  damping: 10,
  stiffness: 150,
};

/** Natural, relaxed motion — screen transitions, expanding panels */
export const springSmooth: SpringConfig = {
  damping: 20,
  stiffness: 200,
};

/** Crisp, immediate feel — button presses, toggles, tab switches */
export const springSnappy: SpringConfig = {
  damping: 25,
  stiffness: 300,
};

// ── Timing helpers ───────────────────────────────────────────────────

/** Base delay between staggered items (ms) */
export const staggerDelay = 50;

/** Duration presets for timing-based animations */
export const duration = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// ── Stagger utility ──────────────────────────────────────────────────

/**
 * Wraps an animation in `withDelay` using a stagger offset.
 *
 * Designed for use inside Reanimated worklets when animating list items.
 *
 * ```tsx
 * // In a FlatList renderItem:
 * const animatedStyle = useAnimatedStyle(() => ({
 *   opacity: withStagger(index, withSpring(1, springSmooth)),
 * }));
 * ```
 *
 * NOTE: This function calls `withDelay` from react-native-reanimated.
 * Import it at the call-site so the worklet runtime can resolve it.
 * We re-export a factory here to keep the delay math centralized.
 */
export function withStagger(index: number, animation: any): any {
  // Dynamic import guard: callers must have reanimated installed.
  // We use a lazy require so this module can still be imported in
  // environments where reanimated isn't available (e.g., tests).
  try {
    const { withDelay } = require('react-native-reanimated');
    return withDelay(index * staggerDelay, animation);
  } catch {
    // Fallback: return the animation without delay if reanimated
    // is not available (unit test environments, etc.)
    return animation;
  }
}

// ── Easing curves (for non-spring timing animations) ─────────────────

/**
 * Common easing curves as cubic bezier control points.
 * Use with `Easing.bezier()` from react-native-reanimated or RN Animated.
 */
export const easings = {
  /** Smooth deceleration — good for entrances */
  easeOut: [0.16, 1, 0.3, 1] as const,
  /** Smooth acceleration — good for exits */
  easeIn: [0.55, 0.055, 0.675, 0.19] as const,
  /** Symmetric ease — general purpose */
  easeInOut: [0.42, 0, 0.58, 1] as const,
  /** Expressive overshoot — playful entrances */
  overshoot: [0.34, 1.56, 0.64, 1] as const,
} as const;
