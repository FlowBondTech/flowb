import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../glass/GlassCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { compactNumber } from '../../utils/formatters';

export function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color?: string;
  icon?: string;
}) {
  const display = typeof value === 'number' ? compactNumber(value) : value;

  return (
    <GlassCard variant="subtle" style={styles.card}>
      <View style={styles.inner}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.value, color ? { color } : undefined]}>{display}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 100 },
  inner: { padding: spacing.md, alignItems: 'center' },
  icon: { fontSize: 20, marginBottom: spacing.xs },
  value: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: 2,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
