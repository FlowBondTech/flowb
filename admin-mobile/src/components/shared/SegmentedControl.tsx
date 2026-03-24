import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { haptics } from '../../utils/haptics';

interface Segment {
  label: string;
  value: string;
}

export function SegmentedControl({
  segments,
  selected,
  onSelect,
}: {
  segments: Segment[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.row}>
      {segments.map((seg) => {
        const active = seg.value === selected;
        return (
          <Pressable
            key={seg.value}
            onPress={() => {
              haptics.tap();
              onSelect(seg.value);
            }}
            style={[styles.segment, active && styles.active]}>
            <Text style={[styles.label, active && styles.activeLabel]}>
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.glass.subtle,
    borderRadius: 12,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  active: {
    backgroundColor: colors.accent.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeLabel: {
    color: colors.white,
  },
});
