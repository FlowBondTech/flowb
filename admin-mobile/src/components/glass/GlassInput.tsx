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

export interface GlassInputProps
  extends Pick<
    TextInputProps,
    | 'secureTextEntry'
    | 'autoCapitalize'
    | 'keyboardType'
    | 'returnKeyType'
    | 'multiline'
    | 'onSubmitEditing'
  > {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: React.ReactNode;
  error?: string;
  style?: StyleProp<ViewStyle>;
}

const INPUT_HEIGHT = 52;
const BORDER_RADIUS = 16;

export function GlassInput({
  placeholder,
  value,
  onChangeText,
  icon,
  error,
  style,
  ...rest
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

  const borderColor = error
    ? colors.accent.rose
    : borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border.subtle, 'rgba(124,108,240,0.5)'],
      });

  const baseGlass = glassStyle('subtle');
  const wrapperStyle: any = {
    ...baseGlass,
    borderColor,
    borderRadius: BORDER_RADIUS,
    minHeight: rest.multiline ? INPUT_HEIGHT * 2 : INPUT_HEIGHT,
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
        style={[
          styles.input,
          icon ? styles.inputWithIcon : undefined,
          rest.multiline && styles.multiline,
        ]}
        selectionColor={colors.accent.primary}
        keyboardAppearance="dark"
        {...rest}
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blur: { overflow: 'hidden', borderRadius: BORDER_RADIUS },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: INPUT_HEIGHT,
  },
  icon: { marginRight: spacing.sm, opacity: 0.7 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: Platform.select({ ios: spacing.sm + 4, android: spacing.sm }),
  },
  inputWithIcon: { paddingLeft: 0 },
  multiline: { textAlignVertical: 'top', minHeight: 80 },
  error: {
    ...typography.caption,
    color: colors.accent.rose,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
