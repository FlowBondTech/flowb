/**
 * GlassSheet
 *
 * Bottom sheet overlay with a blurred glass surface. Slides up from the
 * bottom with a spring animation. Tapping the backdrop (dark overlay)
 * dismisses the sheet. Ideal for contextual actions and confirmations.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
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

import { colors } from '../../theme/colors';
import { glassFlat } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

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

// ── Component ────────────────────────────────────────────────────────

export function GlassSheet({
  visible,
  onClose,
  title,
  children,
}: GlassSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Slide in / out when `visible` changes
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
          mass: 0.8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const handleBackdropPress = useCallback(() => {
    onClose();
  }, [onClose]);

  // ── Sheet surface ─────────────────────────────────────────────────

  const sheetContent = (
    <View style={[styles.sheetInner, { paddingBottom: insets.bottom + spacing.md }]}>
      {/* Handle bar */}
      <View style={styles.handleRow}>
        <View style={styles.handle} />
      </View>

      {/* Optional title */}
      {title ? (
        <Text style={styles.title}>{title}</Text>
      ) : null}

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );

  const glassBackground = glassFlat('heavy');

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
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[styles.sheetWrap, { transform: [{ translateY }] }]}
        >
          {sheetSurface}
        </Animated.View>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.bright,
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
