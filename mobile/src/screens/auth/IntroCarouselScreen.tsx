/**
 * IntroCarouselScreen
 *
 * First-launch intro carousel with 4 slides:
 *   1. "Get in the Flow" — hero branding
 *   2. "Your AI Business Assistant" — biz features
 *   3. "Connect Your World" — social features
 *   4. "Ready?" — CTA to proceed
 *
 * Swipeable with dot indicators, Skip button, and "Get Started" on last slide.
 * Shows only on first launch (stored in AsyncStorage).
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GlassButton } from '../../components/glass/GlassButton';
import { haptics } from '../../utils/haptics';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  title: string;
  subtitle: string;
  icons: { name: string; color: string; label: string }[];
  gradient: [string, string];
}

const SLIDES: Slide[] = [
  {
    title: 'Get in the Flow',
    subtitle: 'Your all-in-one platform for events,\ncommunity, and business',
    icons: [
      { name: 'flash', color: colors.accent.primary, label: 'Flow' },
      { name: 'sparkles', color: colors.accent.amber, label: 'AI' },
      { name: 'globe', color: colors.accent.cyan, label: 'Connect' },
    ],
    gradient: [colors.accent.primary + '15', 'transparent'],
  },
  {
    title: 'Your AI Assistant',
    subtitle: 'Schedule meetings, manage leads,\nand automate your workflow',
    icons: [
      { name: 'calendar', color: colors.accent.amber, label: 'Meetings' },
      { name: 'people', color: colors.accent.cyan, label: 'Contacts' },
      { name: 'analytics', color: colors.accent.emerald, label: 'Pipeline' },
    ],
    gradient: [colors.accent.amber + '15', 'transparent'],
  },
  {
    title: 'Connect Your World',
    subtitle: 'Discover events, join crews,\nand earn points together',
    icons: [
      { name: 'compass', color: colors.accent.cyan, label: 'Events' },
      { name: 'shield', color: colors.accent.primary, label: 'Crews' },
      { name: 'trophy', color: colors.accent.amber, label: 'Points' },
    ],
    gradient: [colors.accent.cyan + '15', 'transparent'],
  },
  {
    title: 'Ready?',
    subtitle: "Let's personalize your experience\nand get you started",
    icons: [
      { name: 'rocket', color: colors.accent.emerald, label: 'Launch' },
      { name: 'heart', color: colors.accent.rose, label: 'Community' },
      { name: 'star', color: colors.accent.amber, label: 'Shine' },
    ],
    gradient: [colors.accent.emerald + '15', 'transparent'],
  },
];

export function IntroCarouselScreen() {
  const navigation = useNavigation<Nav>();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / SCREEN_WIDTH);
      setCurrentIndex(index);
    },
    [],
  );

  const handleNext = useCallback(() => {
    haptics.tap();
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      // Last slide — proceed to login
      navigation.navigate('Login');
    }
  }, [currentIndex, navigation]);

  const handleSkip = useCallback(() => {
    haptics.tap();
    navigation.navigate('Login');
  }, [navigation]);

  return (
    <LinearGradient
      colors={[colors.background.base, colors.background.depth2, colors.background.base]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      {/* Skip button */}
      <Animated.View entering={FadeIn.delay(500)} style={styles.skipContainer}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Animated.View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <LinearGradient
              colors={slide.gradient as any}
              style={styles.slideGradient}
            >
              {/* Icon row */}
              <View style={styles.iconRow}>
                {slide.icons.map((icon) => (
                  <View key={icon.label} style={styles.iconGroup}>
                    <View style={[styles.iconCircle, { backgroundColor: icon.color + '20', borderColor: icon.color + '40' }]}>
                      <Ionicons name={icon.name as any} size={28} color={icon.color} />
                    </View>
                    <Text style={[styles.iconLabel, { color: icon.color }]}>{icon.label}</Text>
                  </View>
                ))}
              </View>

              {/* Text */}
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      {/* Bottom: dots + button */}
      <View style={styles.bottomBar}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <GlassButton
          title={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="primary"
          size="lg"
          style={styles.nextButton}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 10,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  slideGradient: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    borderRadius: 32,
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  iconGroup: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconLabel: {
    ...typography.micro,
    fontSize: 10,
  },
  slideTitle: {
    ...typography.hero,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 20,
    paddingTop: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.accent.primary,
    width: 24,
  },
  dotInactive: {
    backgroundColor: colors.border.default,
  },
  nextButton: {
    width: '100%',
  },
});
