import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { glassStyle, GlassVariant } from '../../theme/glass';
import { haptics } from '../../utils/haptics';

const blurIntensity: Record<GlassVariant, number> = {
  subtle: 20,
  medium: 40,
  heavy: 60,
  glow: 40,
};

const PRESS_SPRING = { damping: 20, stiffness: 300, mass: 0.6 };

export interface GlassCardProps {
  variant?: GlassVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function GlassCard({
  variant = 'medium',
  children,
  style,
  onPress,
}: GlassCardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, PRESS_SPRING);
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, [scale]);
  const handlePress = useCallback(() => {
    haptics.tap();
    onPress?.();
  }, [onPress]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyle = glassStyle(variant);

  const content =
    Platform.OS === 'ios' ? (
      <BlurView
        intensity={blurIntensity[variant]}
        tint="dark"
        style={[styles.blur, variantStyle, style]}>
        {children}
      </BlurView>
    ) : (
      <View style={[variantStyle, style]}>{children}</View>
    );

  if (onPress) {
    return (
      <Animated.View style={pressStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}>
          {content}
        </Pressable>
      </Animated.View>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  blur: { overflow: 'hidden' },
});
