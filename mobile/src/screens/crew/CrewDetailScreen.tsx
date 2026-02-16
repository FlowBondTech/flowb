/**
 * CrewDetailScreen
 *
 * Full crew view with member list, active check-ins, and a leaderboard.
 * Loads member and check-in data from the crew store and leaderboard
 * from the API. Provides a bottom check-in CTA.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { GlassButton } from '../../components/glass/GlassButton';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassPill } from '../../components/glass/GlassPill';
import * as api from '../../api/client';
import { useCrewStore } from '../../stores/useCrewStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatPoints, formatRelative } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import type { CrewCheckin, CrewMember, LeaderboardEntry } from '../../api/types';

// ── Types ────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList, 'CrewDetail'>;
type Route = RouteProp<RootStackParamList, 'CrewDetail'>;

// ── Status color mapping ─────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  here: colors.accent.emerald,
  heading: colors.accent.amber,
  leaving: colors.accent.rose,
};

// ── Component ────────────────────────────────────────────────────────

export function CrewDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { crewId, crewName, crewEmoji } = route.params;

  const getMembers = useCrewStore((s) => s.getMembers);

  const [members, setMembers] = useState<CrewMember[]>([]);
  const [checkins, setCheckins] = useState<CrewCheckin[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [memberData, lb] = await Promise.all([
        getMembers(crewId),
        api.getCrewLeaderboard(crewId),
      ]);
      setMembers(memberData.members);
      setCheckins(memberData.checkins);
      setLeaderboard(lb);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [crewId, getMembers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleCheckin = useCallback(() => {
    haptics.tap();
    navigation.navigate('Checkin', { crewId, crewName });
  }, [crewId, crewName, navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ── Render ──────────────────────────────────────────────────────────

  if (loading && members.length === 0) {
    return (
      <View style={styles.root}>
        <GlassHeader title={`${crewEmoji} ${crewName}`} onBack={handleBack} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  if (error && members.length === 0) {
    return (
      <View style={styles.root}>
        <GlassHeader title={`${crewEmoji} ${crewName}`} onBack={handleBack} />
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.errorTitle}>Couldn't load crew data</Text>
          <GlassButton
            title="Try Again"
            onPress={loadData}
            variant="secondary"
            size="sm"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GlassHeader
        title={`${crewEmoji} ${crewName}`}
        onBack={handleBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Members section ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>

          {members.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No members yet</Text>
          ) : (
            members.map((m) => (
              <GlassCard key={m.user_id} variant="subtle" style={styles.memberCard}>
                <View style={styles.memberContent}>
                  <View style={styles.memberInfo}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.memberId} numberOfLines={1}>
                      {m.user_id}
                    </Text>
                  </View>

                  <View style={styles.memberMeta}>
                    <GlassPill
                      label={m.role}
                      color={
                        m.role === 'captain'
                          ? colors.accent.primary
                          : colors.text.secondary
                      }
                      active={m.role === 'captain'}
                    />
                    <Text style={styles.joinedAt}>
                      {formatRelative(m.joined_at)}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))
          )}
        </View>

        {/* ── Active check-ins section ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Check-ins</Text>

          {checkins.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No active check-ins</Text>
          ) : (
            checkins.map((c, idx) => (
              <GlassCard
                key={`${c.user_id}-${idx}`}
                variant="subtle"
                style={styles.checkinCard}
              >
                <View style={styles.checkinContent}>
                  <View style={styles.checkinHeader}>
                    <Ionicons
                      name="location"
                      size={16}
                      color={STATUS_COLORS[c.status] ?? colors.text.secondary}
                    />
                    <Text style={styles.venueName} numberOfLines={1}>
                      {c.venue_name}
                    </Text>
                    <GlassPill
                      label={c.status}
                      color={STATUS_COLORS[c.status] ?? colors.text.secondary}
                      active
                    />
                  </View>

                  {c.message ? (
                    <Text style={styles.checkinMessage} numberOfLines={2}>
                      {c.message}
                    </Text>
                  ) : null}

                  <Text style={styles.checkinTime}>
                    {formatRelative(c.created_at)}
                  </Text>
                </View>
              </GlassCard>
            ))
          )}
        </View>

        {/* ── Leaderboard section ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>

          {leaderboard.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No points earned yet</Text>
          ) : (
            leaderboard.slice(0, 10).map((entry, idx) => (
              <GlassCard
                key={entry.user_id}
                variant="subtle"
                style={styles.leaderboardCard}
              >
                <View style={styles.leaderboardRow}>
                  <Text style={styles.rank}>#{idx + 1}</Text>
                  <Text style={styles.leaderUserId} numberOfLines={1}>
                    {entry.user_id}
                  </Text>
                  <View style={styles.leaderStats}>
                    <Text style={styles.leaderPoints}>
                      {formatPoints(entry.total_points)} pts
                    </Text>
                    {entry.current_streak > 0 ? (
                      <Text style={styles.streak}>
                        {entry.current_streak}d streak
                      </Text>
                    ) : null}
                  </View>
                </View>
              </GlassCard>
            ))
          )}
        </View>

        {/* Bottom spacer for the CTA */}
        <View style={styles.ctaSpacer} />
      </ScrollView>

      {/* ── Floating check-in CTA ────────────────────────────────────── */}
      <View style={styles.ctaWrap}>
        <GlassButton
          title="Check In"
          variant="primary"
          size="lg"
          onPress={handleCheckin}
          icon={
            <Ionicons name="location" size={20} color={colors.white} />
          }
        />
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  errorTitle: {
    ...typography.headline,
    color: colors.text.secondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.tertiary,
    paddingVertical: spacing.md,
  },

  // Members
  memberCard: {
    marginBottom: spacing.xs,
  },
  memberContent: {
    padding: spacing.sm + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  memberId: {
    ...typography.body,
    flex: 1,
  },
  memberMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  joinedAt: {
    ...typography.micro,
    color: colors.text.tertiary,
  },

  // Check-ins
  checkinCard: {
    marginBottom: spacing.xs,
  },
  checkinContent: {
    padding: spacing.sm + spacing.xs,
    gap: spacing.xs,
  },
  checkinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  venueName: {
    ...typography.headline,
    flex: 1,
  },
  checkinMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginLeft: spacing.lg + spacing.xs,
  },
  checkinTime: {
    ...typography.micro,
    color: colors.text.tertiary,
    marginLeft: spacing.lg + spacing.xs,
  },

  // Leaderboard
  leaderboardCard: {
    marginBottom: spacing.xs,
  },
  leaderboardRow: {
    padding: spacing.sm + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rank: {
    ...typography.headline,
    color: colors.accent.amber,
    width: 32,
  },
  leaderUserId: {
    ...typography.body,
    flex: 1,
  },
  leaderStats: {
    alignItems: 'flex-end',
  },
  leaderPoints: {
    ...typography.headline,
    color: colors.accent.primary,
  },
  streak: {
    ...typography.micro,
    color: colors.accent.emerald,
  },

  // CTA
  ctaSpacer: {
    height: 80,
  },
  ctaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    backgroundColor: colors.background.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
});
