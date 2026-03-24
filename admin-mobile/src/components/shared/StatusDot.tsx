import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';

type Status = 'ok' | 'warning' | 'error' | 'disabled';

const statusColors: Record<Status, string> = {
  ok: colors.semantic.success,
  warning: colors.semantic.warning,
  error: colors.semantic.error,
  disabled: colors.text.tertiary,
};

export function StatusDot({ status = 'ok', pulse = false }: { status?: Status; pulse?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse && status === 'ok') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.6, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
  }, [pulse, status, scale, opacity]);

  const color = statusColors[status];

  return (
    <View style={styles.container}>
      {pulse && status === 'ok' && (
        <Animated.View
          style={[styles.pulse, { backgroundColor: color, transform: [{ scale }], opacity }]}
        />
      )}
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pulse: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
});
