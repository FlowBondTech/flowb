/**
 * PointsScreen
 *
 * Displays the user's point total, streak, level, and stats with
 * animated collapsing header and staggered entrance animations.
 * Skeleton loaders shown while data fetches.
 */

import React, { useEffect } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { AnimatedHeader } from '../../components/glass/AnimatedHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { SkeletonPointsHero, SkeletonStatRow } from '../../components/feedback/Skeleton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { usePointsStore } from '../../stores/usePointsStore';
import { formatPoints } from '../../utils/formatters';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ── Stat card (small glass tile) ──────────────────────────────────

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
  index: number;
}

function StatTile({ icon, label, value, color, index }: StatTileProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 80).duration(400).springify()}
      style={{ flex: 1 }}
    >
      <GlassCard variant="subtle" style={styles.statTile}>
        <Ionicons name={icon} size={18} color={color} style={styles.statIcon} />
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </GlassCard>
    </Animated.View>
  );
}

// ── Grid stat card (2x2 grid) ─────────────────────────────────────

interface GridStatProps {
  label: string;
  value: string | number;
  index: number;
}

function GridStat({ label, value, index }: GridStatProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(500 + index * 60).duration(400).springify()}
      style={styles.gridCard}
    >
      <GlassCard variant="subtle" style={styles.gridCardInner}>
        <Text style={styles.gridValue}>{value}</Text>
        <Text style={styles.gridLabel}>{label}</Text>
      </GlassCard>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export function PointsScreen() {
  const insets = useSafeAreaInsets();
  const { points, isLoading, fetchPoints, globalLeaderboard, fetchGlobalLeaderboard } =
    usePointsStore();

  const scrollOffset = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    fetchPoints();
    fetchGlobalLeaderboard();
  }, [fetchPoints, fetchGlobalLeaderboard]);

  const total = points?.points ?? 0;
  const streak = points?.streak ?? 0;
  const longestStreak = points?.longestStreak ?? 0;
  const level = points?.level ?? 0;
  const headerHeight = insets.top + 48 + 52;
  const showSkeleton = isLoading && !points;

  return (
    <View style={styles.safe}>
      <AnimatedHeader title="Points" scrollOffset={scrollOffset} />

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scroll, { paddingTop: headerHeight }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchPoints}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
            progressViewOffset={headerHeight}
          />
        }
      >
        {showSkeleton ? (
          <>
            <SkeletonPointsHero />
            <SkeletonStatRow />
          </>
        ) : (
          <>
            {/* ── Hero section ──────────────────────────────────────── */}
            <Animated.View
              entering={FadeInUp.duration(500).springify()}
              style={styles.hero}
            >
              <Text style={styles.heroPoints}>{formatPoints(total)}</Text>
              <Text style={styles.heroLabel}>points</Text>
            </Animated.View>

            {/* ── Quick stats row ───────────────────────────────────── */}
            <View style={styles.statRow}>
              <StatTile icon="flame" label="Streak" value={streak} color={colors.accent.amber} index={0} />
              <StatTile icon="star" label="Level" value={level} color={colors.accent.cyan} index={1} />
              <StatTile icon="trophy-outline" label="Best" value={longestStreak} color={colors.accent.emerald} index={2} />
            </View>

            {/* ── Level badge with glow ─────────────────────────────── */}
            {level > 0 && (
              <Animated.View entering={FadeInDown.delay(400).duration(400).springify()}>
                <GlassCard variant="glow" style={styles.levelBadge}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.accent.primary} />
                  <Text style={styles.levelBadgeText}>Level {level}</Text>
                </GlassCard>
              </Animated.View>
            )}

            {/* ── Leaderboard section ──────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(450).duration(400)}>
              <Text style={styles.sectionTitle}>Crew Rankings</Text>
            </Animated.View>
            {globalLeaderboard.length > 0 ? (
              globalLeaderboard.map((crew, idx) => (
                <Animated.View
                  key={crew.crew_id}
                  entering={FadeInDown.delay(500 + idx * 60).duration(400).springify()}
                >
                  <GlassCard variant="subtle" style={styles.lbRow}>
                    <Text style={styles.lbRank}>{idx + 1}</Text>
                    <Text style={styles.lbEmoji}>{crew.crew_emoji}</Text>
                    <View style={styles.lbInfo}>
                      <Text style={styles.lbName} numberOfLines={1}>{crew.crew_name}</Text>
                      <Text style={styles.lbMeta}>{crew.member_count} members</Text>
                    </View>
                    <Text style={styles.lbPoints}>{formatPoints(crew.total_points)}</Text>
                  </GlassCard>
                </Animated.View>
              ))
            ) : (
              <Text style={styles.infoCaption}>Join a crew to see crew leaderboards</Text>
            )}

            {/* ── Stats grid (2x2) ─────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(550).duration(400)}>
              <Text style={styles.sectionTitle}>Your Stats</Text>
            </Animated.View>
            <View style={styles.grid}>
              <GridStat label="Events Attended" value={total > 0 ? Math.floor(total / 10) : 0} index={0} />
              <GridStat label="Current Streak" value={streak} index={1} />
              <GridStat label="Level" value={level} index={2} />
              <GridStat label="Longest Streak" value={longestStreak} index={3} />
            </View>
          </>
        )}
      </AnimatedScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + 80,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroPoints: {
    ...typography.hero,
    fontSize: 56,
    lineHeight: 64,
    color: colors.accent.primary,
  },
  heroLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Quick stat row
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statTile: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statIcon: {
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.headline,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
  },

  // Level badge
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  levelBadgeText: {
    ...typography.headline,
    color: colors.accent.primary,
  },

  // Sections
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  infoCaption: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },

  // Leaderboard rows
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lbRank: {
    ...typography.headline,
    color: colors.accent.amber,
    width: 28,
    textAlign: 'center',
  },
  lbEmoji: {
    fontSize: 22,
    marginHorizontal: spacing.sm,
  },
  lbInfo: {
    flex: 1,
  },
  lbName: {
    ...typography.headline,
    color: colors.text.primary,
  },
  lbMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  lbPoints: {
    ...typography.headline,
    color: colors.accent.primary,
  },

  // 2x2 Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCard: {
    flexGrow: 1,
    flexBasis: '46%',
  },
  gridCardInner: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  gridValue: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  gridLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
