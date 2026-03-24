import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassSheet } from '../glass/GlassSheet';
import { colors } from '../../theme/colors';
import { glassStyle } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

interface Option {
  label: string;
  value: string;
}

export function GlassSelect({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: Option[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        style={[glassStyle('subtle'), styles.trigger]}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{selected?.label || value || 'Select...'}</Text>
      </Pressable>

      <GlassSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <ScrollView style={styles.list}>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                haptics.tap();
                onSelect(opt.value);
                setOpen(false);
              }}
              style={[styles.option, opt.value === value && styles.optionActive]}>
              <Text
                style={[
                  styles.optionLabel,
                  opt.value === value && styles.optionLabelActive,
                ]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </GlassSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: 12,
  },
  label: { ...typography.caption },
  value: { ...typography.body, color: colors.accent.primary },
  list: { maxHeight: 300 },
  option: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    marginBottom: 2,
  },
  optionActive: { backgroundColor: colors.accent.primary + '22' },
  optionLabel: { ...typography.body, color: colors.text.secondary },
  optionLabelActive: { color: colors.accent.primary },
});
