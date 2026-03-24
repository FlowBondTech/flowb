import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { glassFlat } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

export interface GlassHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const HEADER_HEIGHT = 56;

function BackChevron() {
  return <Text style={styles.chevron}>{'\u2039'}</Text>;
}

export function GlassHeader({ title, onBack, rightAction, style }: GlassHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = useCallback(() => {
    haptics.tap();
    onBack?.();
  }, [onBack]);

  const inner = (
    <View style={[styles.row, { paddingTop: insets.top }]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
            <BackChevron />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={[styles.side, styles.rightSide]}>{rightAction ?? null}</View>
    </View>
  );

  const glassBackground = glassFlat('medium');

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={60}
        tint="dark"
        style={[styles.container, glassBackground, style]}>
        {inner}
      </BlurView>
    );
  }
  return <View style={[styles.container, glassBackground, style]}>{inner}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  side: { width: 48, alignItems: 'flex-start', justifyContent: 'center' },
  rightSide: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  title: { ...typography.headline, color: colors.text.primary },
  backButton: { padding: spacing.xs },
  chevron: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.text.primary,
    lineHeight: 32,
  },
});
