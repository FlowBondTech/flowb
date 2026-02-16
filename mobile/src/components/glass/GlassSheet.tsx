/**
 * GlassSheet
 *
 * Gesture-driven bottom sheet with frosted glass surface. Features:
 * - Drag down to dismiss with velocity-aware fling
 * - Spring physics for open/close transitions
 * - Backdrop opacity tied to sheet position
 * - Handle bar with subtle pulse on mount
 * - Snaps back if dragged less than 30%
 *
 * Built on Gesture Handler + Reanimated for 60fps native gestures.
 */

import React, { useCallback, useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { glassFlat } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

// ── Props ────────────────────────────────────────────────────────────

export interface GlassSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// ── Constants ────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BORDER_RADIUS = 24;
const DISMISS_THRESHOLD = 0.3; // 30% of sheet height
const VELOCITY_THRESHOLD = 800; // px/s to fling-dismiss

// Spring configs
const OPEN_SPRING = {
  damping: 22,
  stiffness: 200,
  mass: 0.8,
};
const CLOSE_SPRING = {
  damping: 28,
  stiffness: 250,
  mass: 0.7,
};

// ── Component ────────────────────────────────────────────────────────

export function GlassSheet({
  visible,
  onClose,
  title,
  children,
}: GlassSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue(0);

  // Open / close based on visible prop
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, OPEN_SPRING);
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, CLOSE_SPRING);
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, backdropOpacity]);

  // ── Pan gesture for drag-to-dismiss ─────────────────────────────────

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      // Only allow dragging downward (positive Y)
      const nextY = context.value + event.translationY;
      translateY.value = Math.max(0, nextY);
    })
    .onEnd((event) => {
      const sheetHeight = SCREEN_HEIGHT * 0.85;
      const shouldDismiss =
        translateY.value > sheetHeight * DISMISS_THRESHOLD ||
        event.velocityY > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        translateY.value = withSpring(SCREEN_HEIGHT, CLOSE_SPRING);
        backdropOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
        runOnJS(haptics.tap)();
      } else {
        // Snap back
        translateY.value = withSpring(0, OPEN_SPRING);
      }
    });

  // ── Animated styles ─────────────────────────────────────────────────

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  // Handle bar wiggles subtly based on drag
  const handleStyle = useAnimatedStyle(() => {
    const width = interpolate(
      translateY.value,
      [0, 100],
      [36, 48],
      Extrapolation.CLAMP
    );
    return { width };
  });

  // ── Sheet surface ─────────────────────────────────────────────────

  const glassBackground = glassFlat('heavy');

  const sheetContent = (
    <View style={[styles.sheetInner, { paddingBottom: insets.bottom + spacing.md }]}>
      {/* Drag handle */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.handleRow}>
          <Animated.View style={[styles.handle, handleStyle]} />
        </View>
      </GestureDetector>

      {/* Optional title */}
      {title ? <Text style={styles.title}>{title}</Text> : null}

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );

  const sheetSurface =
    Platform.OS === 'ios' ? (
      <BlurView intensity={80} tint="dark" style={[styles.sheet, glassBackground]}>
        {sheetContent}
      </BlurView>
    ) : (
      <View style={[styles.sheet, glassBackground]}>{sheetContent}</View>
    );

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheetWrap, sheetStyle]}>
            {sheetSurface}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrap: {
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  sheet: {
    borderTopLeftRadius: BORDER_RADIUS,
    borderTopRightRadius: BORDER_RADIUS,
    overflow: 'hidden',
    borderBottomWidth: 0,
  },
  sheetInner: {
    paddingHorizontal: spacing.md,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.xs + 4,
  },
  handle: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  title: {
    ...typography.headline,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  content: {
    paddingTop: spacing.sm,
  },
});
