import React, { useEffect } from 'react';
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

export interface GlassSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BORDER_RADIUS = 24;
const DISMISS_THRESHOLD = 0.3;
const VELOCITY_THRESHOLD = 800;

const OPEN_SPRING = { damping: 22, stiffness: 200, mass: 0.8 };
const CLOSE_SPRING = { damping: 28, stiffness: 250, mass: 0.7 };

export function GlassSheet({ visible, onClose, title, children }: GlassSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, OPEN_SPRING);
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, CLOSE_SPRING);
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, backdropOpacity]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, context.value + event.translationY);
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
        translateY.value = withSpring(0, OPEN_SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const handleStyle = useAnimatedStyle(() => ({
    width: interpolate(
      translateY.value,
      [0, 100],
      [36, 48],
      Extrapolation.CLAMP,
    ),
  }));

  const glassBackground = glassFlat('heavy');

  const sheetContent = (
    <View style={[styles.sheetInner, { paddingBottom: insets.bottom + spacing.md }]}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.handleRow}>
          <Animated.View style={[styles.handle, handleStyle]} />
        </View>
      </GestureDetector>
      {title ? <Text style={styles.title}>{title}</Text> : null}
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
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheetWrap, sheetStyle]}>
            {sheetSurface}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrap: { maxHeight: SCREEN_HEIGHT * 0.85 },
  sheet: {
    borderTopLeftRadius: BORDER_RADIUS,
    borderTopRightRadius: BORDER_RADIUS,
    overflow: 'hidden',
    borderBottomWidth: 0,
  },
  sheetInner: { paddingHorizontal: spacing.md },
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
  content: { paddingTop: spacing.sm },
});
