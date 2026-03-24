import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const platformColors: Record<string, string> = {
  telegram: '#229ED9',
  farcaster: '#8A63D2',
  web: colors.accent.cyan,
};

export function Badge({
  label,
  color,
  small,
}: {
  label: string;
  color?: string;
  small?: boolean;
}) {
  const bg = color ?? platformColors[label.toLowerCase()] ?? colors.glass.medium;
  return (
    <View style={[styles.badge, small && styles.small, { backgroundColor: bg + '33', borderColor: bg }]}>
      <Text style={[small ? styles.microText : styles.text, { color: bg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: 4,
  },
  text: { ...typography.micro, fontSize: 10 },
  microText: { ...typography.micro, fontSize: 9 },
});
