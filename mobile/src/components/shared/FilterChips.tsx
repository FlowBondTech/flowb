import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { GlassPill } from "../glass/GlassPill";
import { spacing } from "../../theme/spacing";
import { haptics } from "../../utils/haptics";

interface Chip {
  id: string;
  label: string;
  emoji?: string;
}

interface FilterChipsProps {
  chips: Chip[];
  selected: string[];
  onToggle: (id: string) => void;
}

export function FilterChips({ chips, selected, onToggle }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => (
        <GlassPill
          key={chip.id}
          label={chip.emoji ? `${chip.emoji} ${chip.label}` : chip.label}
          active={selected.includes(chip.id)}
          onPress={() => {
            haptics.tap();
            onToggle(chip.id);
          }}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
});
