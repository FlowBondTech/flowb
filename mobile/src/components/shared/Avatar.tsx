import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
  showStatus?: boolean;
  statusColor?: string;
}

export function Avatar({
  name,
  size = 40,
  color = colors.accent.primary,
  showStatus,
  statusColor = colors.accent.emerald,
}: AvatarProps) {
  const letter = (name || "?")[0].toUpperCase();
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + "33",
        },
      ]}
    >
      <Text
        style={[
          styles.letter,
          { fontSize: size * 0.4, color },
        ]}
      >
        {letter}
      </Text>
      {showStatus && (
        <View
          style={[
            styles.status,
            {
              backgroundColor: statusColor,
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              right: 0,
              bottom: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  letter: {
    fontWeight: "700",
  },
  status: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.bg.base,
  },
});
