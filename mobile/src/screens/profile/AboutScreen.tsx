import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { AnimatedHeader } from '../../components/glass/AnimatedHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const FAQ_ITEMS = [
  {
    q: 'What is FlowB?',
    a: 'FlowB is your ETHDenver companion app. We aggregate 100+ side events, hackathons, parties, and meetups into one place so you never miss what matters. Form crews with friends, earn points, and explore Denver together.',
  },
  {
    q: 'How do I earn points?',
    a: 'RSVP to events, check in at venues with your crew, invite friends, complete daily quests, and engage with the community. Points unlock milestones and leaderboard rankings.',
  },
  {
    q: 'What are crews?',
    a: 'Crews are groups of friends exploring ETHDenver together. Create or join a crew to coordinate schedules, check in together at events, and earn bonus crew points.',
  },
  {
    q: 'Is FlowB free?',
    a: 'Yes, completely free. No sign-up required to browse events. Create an account to RSVP, join crews, and earn points.',
  },
  {
    q: 'How do reminders work?',
    a: 'Set a reminder on any event and FlowB will notify you before it starts via push notification, Telegram DM, or Farcaster notification.',
  },
  {
    q: 'Where can I use FlowB?',
    a: 'FlowB is available here in the mobile app, on the web at flowb.me, as a Telegram mini app, and as a Farcaster mini app. Your account syncs across all platforms.',
  },
];

const PLATFORMS = [
  {
    name: 'Web App',
    desc: 'flowb.me',
    url: 'https://flowb.me',
    icon: 'globe-outline' as const,
  },
  {
    name: 'Telegram',
    desc: 'Bot + Mini App',
    url: 'https://t.me/Flow_b_bot',
    icon: 'paper-plane-outline' as const,
  },
  {
    name: 'Farcaster',
    desc: 'Mini app in Warpcast',
    url: 'https://warpcast.com/flowb',
    icon: 'logo-web-component' as const,
  },
  {
    name: 'Mobile App',
    desc: "You're here!",
    url: '',
    icon: 'phone-portrait-outline' as const,
  },
];

export function AboutScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollOffset = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const headerHeight = insets.top + 48 + 52;

  const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

  return (
    <View style={styles.safe}>
      <AnimatedHeader title="About" scrollOffset={scrollOffset} />

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scroll, { paddingTop: headerHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mission */}
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <Text style={styles.heroTitle}>FlowB</Text>
          <Text style={styles.heroSub}>
            Your companion for navigating ETHDenver. Discover events, form crews, earn points.
          </Text>

          <GlassCard variant="medium" style={styles.missionCard}>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.missionText}>
              ETHDenver is massive -- hundreds of side events spread across Denver. It's easy to miss the best ones or lose track of your friends.
            </Text>
            <Text style={[styles.missionText, { marginTop: spacing.sm }]}>
              FlowB aggregates every side event into one place, lets you form crews with friends, and rewards you for exploring. Built by the community, for the community.
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Platforms */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <Text style={styles.sectionTitle}>Get FlowB Everywhere</Text>
          <GlassCard variant="medium" style={styles.platformsCard}>
            {PLATFORMS.map((p, i) => (
              <React.Fragment key={p.name}>
                {i > 0 && <View style={styles.divider} />}
                <Pressable
                  style={[styles.platformRow, !p.url && styles.platformDisabled]}
                  onPress={() => p.url && Linking.openURL(p.url)}
                  disabled={!p.url}
                >
                  <Ionicons
                    name={p.icon}
                    size={22}
                    color={p.url ? colors.accent.primary : colors.text.tertiary}
                  />
                  <View style={styles.platformInfo}>
                    <Text style={styles.platformName}>{p.name}</Text>
                    <Text style={styles.platformDesc}>{p.desc}</Text>
                  </View>
                  {p.url ? (
                    <Ionicons name="open-outline" size={16} color={colors.text.tertiary} />
                  ) : null}
                </Pressable>
              </React.Fragment>
            ))}
          </GlassCard>
        </Animated.View>

        {/* FAQ */}
        <Animated.View entering={FadeInDown.delay(400).duration(400).springify()}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          {FAQ_ITEMS.map((item, i) => (
            <GlassCard key={i} variant="subtle" style={styles.faqCard}>
              <Pressable
                style={styles.faqQuestion}
                onPress={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <Text style={styles.faqQuestionText}>{item.q}</Text>
                <Ionicons
                  name={openFaq === i ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.text.tertiary}
                />
              </Pressable>
              {openFaq === i && (
                <Text style={styles.faqAnswer}>{item.a}</Text>
              )}
            </GlassCard>
          ))}
        </Animated.View>

        <View style={{ height: spacing.xxl + 80 }} />
      </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  scroll: {
    paddingHorizontal: spacing.md,
  },
  heroTitle: {
    ...typography.hero,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.headline,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  missionCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  missionText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  platformsCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + spacing.xs,
    gap: spacing.sm,
  },
  platformDisabled: {
    opacity: 0.5,
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    ...typography.body,
    fontWeight: '600',
  },
  platformDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  faqCard: {
    padding: 0,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  faqQuestionText: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  faqAnswer: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
