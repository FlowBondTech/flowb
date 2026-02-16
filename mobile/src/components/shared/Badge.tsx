import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

interface BadgeProps {
  count?: number;
  label?: string;
  color?: string;
  size?: "sm" | "md";
}

export function Badge({
  count,
  label,
  color = colors.accent.primary,
  size = "sm",
}: BadgeProps) {
  const text = label || String(count ?? 0);
  const sz = size === "sm" ? 18 : 24;

  return (
    <View style={[styles.badge, { backgroundColor: color, minWidth: sz, height: sz, borderRadius: sz / 2 }]}>
      <Text style={[styles.text, { fontSize: size === "sm" ? 10 : 12 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  text: {
    color: colors.text.primary,
    fontWeight: "700",
  },
});
