import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef } from 'react'
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native'
import { theme } from '../styles/theme'

const { width, height } = Dimensions.get('window')

export const LoadingScreen = () => {
  const navigation = useNavigation()
  const spinAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Spin animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ).start()

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()

    // Navigate after 3 seconds
    const timer = setTimeout(() => {
      navigation.navigate('Waitlist' as never)
    }, 3000)

    return () => clearTimeout(timer)
  }, [navigation, fadeAnim, pulseAnim, spinAnim])

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <LinearGradient colors={[theme.colors.background, '#0f0f1e']} style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Outer spinning ring */}
        <Animated.View
          style={[
            styles.outerRing,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientRing}
          />
        </Animated.View>

        {/* Inner circle with $DANZ */}
        <View style={styles.innerCircle}>
          <Text style={styles.currencySymbol}>$</Text>
          <Text style={styles.danzText}>DANZ</Text>
        </View>

        {/* Glow effect */}
        <View style={styles.glowEffect} />
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.tagline}>Move. Connect. Earn.</Text>
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.loadingDots}>
        {[0, 1, 2].map(index => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [0, -5],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  outerRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    padding: 3,
  },
  gradientRing: {
    flex: 1,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  innerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  currencySymbol: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginBottom: -5,
  },
  danzText: {
    fontSize: 28,
    color: theme.colors.text,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  glowEffect: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: theme.colors.primary,
    opacity: 0.1,
  },
  tagline: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginBottom: 40,
    letterSpacing: 1,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
})
