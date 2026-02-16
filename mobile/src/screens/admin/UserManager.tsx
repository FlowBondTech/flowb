/**
 * UserManager
 *
 * Admin user management screen with search, expandable user cards for
 * awarding bonus points and changing user roles.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import {
  awardBonusPoints,
  changeUserRole,
  getAdminUsers,
} from '../../api/client';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassPill } from '../../components/glass/GlassPill';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatPoints } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';

// ── Types ─────────────────────────────────────────────────────────────

interface AdminUser {
  user_id: string;
  total_points?: number;
  current_streak?: number;
  role?: string;
}

const ROLES = ['user', 'admin', 'moderator'];

// ── Component ────────────────────────────────────────────────────────

export function UserManager() {
  const navigation = useNavigation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pointsInput, setPointsInput] = useState('');
  const [awarding, setAwarding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadUsers = useCallback(async (query?: string) => {
    try {
      const data = await getAdminUsers({
        limit: 50,
        search: query || undefined,
      });
      setUsers(data.users);
    } catch {
      // keep current state
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ── Debounced search ────────────────────────────────────────────────

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearch(text);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        loadUsers(text);
      }, 400);
    },
    [loadUsers],
  );

  // ── Expand / collapse ───────────────────────────────────────────────

  const handleToggleExpand = useCallback(
    (userId: string) => {
      haptics.tap();
      setExpandedId((prev) => (prev === userId ? null : userId));
      setPointsInput('');
    },
    [],
  );

  // ── Award points ────────────────────────────────────────────────────

  const handleAwardPoints = useCallback(
    async (userId: string) => {
      const pts = parseInt(pointsInput, 10);
      if (!pts || pts <= 0) {
        Alert.alert('Invalid', 'Enter a positive number of points.');
        return;
      }

      setAwarding(true);
      try {
        await awardBonusPoints(userId, pts, 'Admin bonus');
        haptics.success();

        // Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === userId
              ? { ...u, total_points: (u.total_points ?? 0) + pts }
              : u,
          ),
        );
        setPointsInput('');
      } catch {
        haptics.error();
        Alert.alert('Error', 'Failed to award points.');
      } finally {
        setAwarding(false);
      }
    },
    [pointsInput],
  );

  // ── Change role ─────────────────────────────────────────────────────

  const handleChangeRole = useCallback(
    async (userId: string, role: string) => {
      haptics.select();
      try {
        await changeUserRole(userId, role);

        setUsers((prev) =>
          prev.map((u) => (u.user_id === userId ? { ...u, role } : u)),
        );
      } catch {
        haptics.error();
        Alert.alert('Error', 'Failed to change role.');
      }
    },
    [],
  );

  // ── Render item ─────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: AdminUser }) => {
      const isExpanded = expandedId === item.user_id;

      return (
        <GlassCard
          variant="subtle"
          style={styles.card}
          onPress={() => handleToggleExpand(item.user_id)}
        >
          <View style={styles.cardContent}>
            {/* User summary */}
            <View style={styles.summaryRow}>
              <View style={styles.userInfo}>
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  color={colors.accent.primary}
                />
                <Text style={styles.userId} numberOfLines={1}>
                  {item.user_id}
                </Text>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.text.tertiary}
              />
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <Text style={styles.stat}>
                {formatPoints(item.total_points ?? 0)} pts
              </Text>
              <Text style={styles.statSep}>|</Text>
              <Text style={styles.stat}>
                {item.current_streak ?? 0} day streak
              </Text>
              {item.role && (
                <>
                  <Text style={styles.statSep}>|</Text>
                  <Text style={[styles.stat, { color: colors.accent.cyan }]}>
                    {item.role}
                  </Text>
                </>
              )}
            </View>

            {/* Expanded actions */}
            {isExpanded && (
              <View style={styles.expandedSection}>
                {/* Award points */}
                <Text style={styles.actionTitle}>Award Points</Text>
                <View style={styles.awardRow}>
                  <GlassInput
                    placeholder="Points amount"
                    value={pointsInput}
                    onChangeText={setPointsInput}
                    keyboardType="number-pad"
                    style={styles.awardInput}
                  />
                  <GlassButton
                    title="Award"
                    variant="primary"
                    size="sm"
                    loading={awarding}
                    onPress={() => handleAwardPoints(item.user_id)}
                  />
                </View>

                {/* Role selector */}
                <Text style={[styles.actionTitle, { marginTop: spacing.md }]}>
                  Change Role
                </Text>
                <View style={styles.rolesRow}>
                  {ROLES.map((role) => (
                    <GlassPill
                      key={role}
                      label={role}
                      active={item.role === role}
                      color={colors.accent.primary}
                      onPress={() => handleChangeRole(item.user_id, role)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        </GlassCard>
      );
    },
    [
      expandedId,
      pointsInput,
      awarding,
      handleToggleExpand,
      handleAwardPoints,
      handleChangeRole,
    ],
  );

  const keyExtractor = useCallback((item: AdminUser) => item.user_id, []);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Users"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchContainer}>
        <GlassInput
          placeholder="Search users..."
          value={search}
          onChangeText={handleSearchChange}
          icon={
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.text.tertiary}
            />
          }
        />
      </View>

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="people-outline"
              size={48}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  userId: {
    ...typography.headline,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stat: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  statSep: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  expandedSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  actionTitle: {
    ...typography.micro,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  awardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  awardInput: {
    flex: 1,
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
