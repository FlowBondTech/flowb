/**
 * PointsScreen
 *
 * Displays the user's point total, streak, level, and stats in
 * a glassmorphism dark-themed layout. Pull-to-refresh triggers
 * a fresh fetch from the server.
 */

import React, { useEffect } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../../components/glass/GlassCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { usePointsStore } from '../../stores/usePointsStore';
import { formatPoints } from '../../utils/formatters';

// ── Stat card (small glass tile) ──────────────────────────────────

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
}

function StatTile({ icon, label, value, color }: StatTileProps) {
  return (
    <GlassCard variant="subtle" style={styles.statTile}>
      <Ionicons name={icon} size={18} color={color} style={styles.statIcon} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}

// ── Grid stat card (2x2 grid) ─────────────────────────────────────

interface GridStatProps {
  label: string;
  value: string | number;
}

function GridStat({ label, value }: GridStatProps) {
  return (
    <GlassCard variant="subtle" style={styles.gridCard}>
      <Text style={styles.gridValue}>{value}</Text>
      <Text style={styles.gridLabel}>{label}</Text>
    </GlassCard>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export function PointsScreen() {
  const { points, isLoading, fetchPoints } = usePointsStore();

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const total = points?.points ?? 0;
  const streak = points?.streak ?? 0;
  const longestStreak = points?.longestStreak ?? 0;
  const level = points?.level ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchPoints}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        {/* ── Hero section ──────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.heroPoints}>{formatPoints(total)}</Text>
          <Text style={styles.heroLabel}>points</Text>
        </View>

        {/* ── Quick stats row ───────────────────────────────────── */}
        <View style={styles.statRow}>
          <StatTile
            icon="flame"
            label="Streak"
            value={streak}
            color={colors.accent.amber}
          />
          <StatTile
            icon="star"
            label="Level"
            value={level}
            color={colors.accent.cyan}
          />
          <StatTile
            icon="trophy-outline"
            label="Best"
            value={longestStreak}
            color={colors.accent.emerald}
          />
        </View>

        {/* ── Level badge with glow ─────────────────────────────── */}
        {level > 0 && (
          <GlassCard variant="glow" style={styles.levelBadge}>
            <Ionicons
              name="shield-checkmark"
              size={22}
              color={colors.accent.primary}
            />
            <Text style={styles.levelBadgeText}>Level {level}</Text>
          </GlassCard>
        )}

        {/* ── Leaderboard section ──────────────────────────────── */}
        <Text style={styles.sectionTitle}>Leaderboard</Text>
        <Text style={styles.infoCaption}>
          Join a crew to see crew leaderboards
        </Text>

        {/* ── Stats grid (2x2) ─────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.grid}>
          <GridStat label="Events Attended" value={total > 0 ? Math.floor(total / 10) : 0} />
          <GridStat label="Current Streak" value={streak} />
          <GridStat label="Level" value={level} />
          <GridStat label="Longest Streak" value={longestStreak} />
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: spacing.xxl,
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
    flex: 1,
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

  // 2x2 Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCard: {
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '46%',
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
