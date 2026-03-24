import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function EmptyState({
  icon,
  message,
}: {
  icon?: string;
  message: string;
}) {
  return (
    <View style={styles.container}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxl },
  icon: { fontSize: 48, marginBottom: spacing.md },
  message: { ...typography.body, color: colors.text.tertiary, textAlign: 'center' },
});
