import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { AppNavigator } from "./src/navigation/AppNavigator";

// Keep the splash screen visible while we load
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const contentOpacity = useSharedValue(0);

  const finishSplash = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    // Hide the native splash and show our animated one
    async function prepare() {
      await SplashScreen.hideAsync();
      setAppReady(true);
    }
    prepare();
  }, []);

  useEffect(() => {
    if (!appReady) return;

    // Animate: logo fades in + scales up, then crossfade to app content
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });

    // After 1.2s, fade out logo and fade in content
    logoOpacity.value = withDelay(1200, withTiming(0, { duration: 300 }));
    logoScale.value = withDelay(1200, withTiming(1.1, { duration: 300 }));
    contentOpacity.value = withDelay(
      1200,
      withTiming(1, { duration: 300 }, (finished) => {
        if (finished) runOnJS(finishSplash)();
      }),
    );
  }, [appReady]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!appReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* App content layer (underneath splash during animation) */}
      <Animated.View style={[StyleSheet.absoluteFill, contentStyle]}>
        <AppNavigator />
      </Animated.View>

      {/* Splash overlay */}
      {!splashDone && (
        <Animated.View style={[styles.splashOverlay, logoStyle]} pointerEvents="none">
          <Text style={styles.logoText}>FlowB</Text>
          <Text style={styles.tagline}>Get in the Flow</Text>
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#050510",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#7c6cf0",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: "#8888aa",
    marginTop: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
