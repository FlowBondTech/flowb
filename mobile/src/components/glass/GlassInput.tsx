/**
 * GlassInput
 *
 * Frosted text input that sits on a subtle glass background. Supports
 * left icon, focus ring, and error state. Designed for dark backgrounds.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { colors } from '../../theme/colors';
import { glassStyle } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// ── Props ────────────────────────────────────────────────────────────

export interface GlassInputProps
  extends Pick<TextInputProps, 'secureTextEntry' | 'autoCapitalize' | 'keyboardType' | 'returnKeyType' | 'multiline'> {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: React.ReactNode;
  error?: string;
  style?: StyleProp<ViewStyle>;
}

// ── Constants ────────────────────────────────────────────────────────

const INPUT_HEIGHT = 52;
const BORDER_RADIUS = 16;

// ── Component ────────────────────────────────────────────────────────

export function GlassInput({
  placeholder,
  value,
  onChangeText,
  icon,
  error,
  style,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  returnKeyType,
  multiline,
}: GlassInputProps) {
  const [focused, setFocused] = useState(false);

  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(() => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [borderAnim]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [borderAnim]);

  // Animate border color between default, focused, and error states
  const borderColor = error
    ? colors.accent.rose
    : borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border.subtle, 'rgba(124,108,240,0.5)'],
      });

  // ── Glass background ──────────────────────────────────────────────

  const baseGlass = glassStyle('subtle');

  const wrapperStyle: Animated.AnimatedProps<ViewStyle> = {
    ...baseGlass,
    borderColor,
    borderRadius: BORDER_RADIUS,
    minHeight: multiline ? INPUT_HEIGHT * 2 : INPUT_HEIGHT,
  };

  const innerContent = (
    <View style={styles.inner}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        multiline={multiline}
        style={[
          styles.input,
          icon ? styles.inputWithIcon : undefined,
          multiline && styles.multiline,
        ]}
        selectionColor={colors.accent.primary}
        keyboardAppearance="dark"
      />
    </View>
  );

  return (
    <View style={style}>
      <Animated.View style={wrapperStyle}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="dark" style={styles.blur}>
            {innerContent}
          </BlurView>
        ) : (
          innerContent
        )}
      </Animated.View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: INPUT_HEIGHT,
  },
  icon: {
    marginRight: spacing.sm,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: Platform.select({ ios: spacing.sm + 4, android: spacing.sm }),
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  multiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  error: {
    ...typography.caption,
    color: colors.accent.rose,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
