/**
 * CrewListScreen
 *
 * Displays all crews the user belongs to with search filtering, pull-to-
 * refresh, and navigation to crew detail / create screens. Each crew card
 * shows the emoji, name, description, and the user's role badge.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassPill } from '../../components/glass/GlassPill';
import { useCrewStore } from '../../stores/useCrewStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { CrewInfo } from '../../api/types';

// ── Types ────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Component ────────────────────────────────────────────────────────

export function CrewListScreen() {
  const navigation = useNavigation<Nav>();
  const crews = useCrewStore((s) => s.crews);
  const discoveredCrews = useCrewStore((s) => s.discoveredCrews);
  const isLoading = useCrewStore((s) => s.isLoading);
  const isDiscoverLoading = useCrewStore((s) => s.isDiscoverLoading);
  const fetchCrews = useCrewStore((s) => s.fetchCrews);
  const fetchDiscoverCrews = useCrewStore((s) => s.fetchDiscoverCrews);
  const joinCrewAction = useCrewStore((s) => s.joinCrew);

  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCrews();
    fetchDiscoverCrews();
  }, [fetchCrews, fetchDiscoverCrews]);

  // ── Filtered list ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return crews;
    const q = search.toLowerCase();
    return crews.filter((c) => c.name.toLowerCase().includes(q));
  }, [crews, search]);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleCrewPress = useCallback(
    (crew: CrewInfo) => {
      haptics.tap();
      navigation.navigate('CrewDetail', {
        crewId: crew.id,
        crewName: crew.name,
        crewEmoji: crew.emoji,
      });
    },
    [navigation],
  );

  const handleBizPress = useCallback(
    (crew: CrewInfo) => {
      haptics.tap();
      navigation.navigate('CrewBiz', {
        crewId: crew.id,
        crewName: crew.name,
        crewEmoji: crew.emoji,
      });
    },
    [navigation],
  );

  const handleCreate = useCallback(() => {
    haptics.tap();
    navigation.navigate('CreateCrew');
  }, [navigation]);

  // ── Renderers ───────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: CrewInfo }) => (
      <GlassCard
        variant="medium"
        style={styles.card}
        onPress={() => handleCrewPress(item)}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.crewName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => handleBizPress(item)}
              style={styles.bizButton}
              hitSlop={8}
            >
              <Ionicons name="briefcase-outline" size={16} color={colors.accent.primary} />
            </Pressable>
          </View>

          <GlassPill
            label={item.role}
            color={
              item.role === 'captain'
                ? colors.accent.primary
                : colors.text.secondary
            }
            active={item.role === 'captain'}
          />
        </View>
      </GlassCard>
    ),
    [handleCrewPress, handleBizPress],
  );

  const keyExtractor = useCallback((item: CrewInfo) => item.id, []);

  // Discovered crews that user hasn't joined yet
  const availableCrews = useMemo(() => {
    const myIds = new Set(crews.map((c) => c.id));
    return discoveredCrews.filter((dc) => !myIds.has(dc.id));
  }, [crews, discoveredCrews]);

  const handleJoinDiscovered = useCallback(
    async (joinCode: string) => {
      haptics.tap();
      try {
        await joinCrewAction(joinCode);
        fetchDiscoverCrews();
      } catch (err) {
        console.error('Join failed:', err);
      }
    },
    [joinCrewAction, fetchDiscoverCrews],
  );

  const renderFooter = useCallback(() => {
    if (availableCrews.length === 0 && !isDiscoverLoading) return null;
    return (
      <View style={styles.discoverSection}>
        <Text style={styles.discoverTitle}>Discover Crews</Text>
        {isDiscoverLoading ? (
          <Text style={styles.discoverLoading}>Loading...</Text>
        ) : (
          availableCrews.map((dc) => (
            <GlassCard key={dc.id} variant="medium" style={styles.card}>
              <View style={styles.discoverRow}>
                <Text style={styles.emoji}>{dc.emoji}</Text>
                <View style={styles.discoverInfo}>
                  <Text style={styles.crewName} numberOfLines={1}>
                    {dc.name}
                  </Text>
                  <Text style={styles.description} numberOfLines={1}>
                    {dc.member_count} member{dc.member_count !== 1 ? 's' : ''}
                    {dc.description ? ` - ${dc.description}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleJoinDiscovered(dc.join_code || dc.id)}
                  style={styles.joinButton}
                >
                  <Text style={styles.joinText}>Join</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))
        )}
      </View>
    );
  }, [availableCrews, isDiscoverLoading, handleJoinDiscovered]);

  const renderEmpty = useCallback(
    () =>
      !isLoading ? (
        <View style={styles.empty}>
          <Ionicons
            name="people-outline"
            size={56}
            color={colors.text.tertiary}
          />
          <Text style={styles.emptyTitle}>Join or create a crew</Text>
          <Text style={styles.emptySubtitle}>
            Crews let you coordinate with friends and earn points together
          </Text>
        </View>
      ) : null,
    [isLoading],
  );

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={styles.hero}>Crews</Text>
        <Pressable
          onPress={handleCreate}
          hitSlop={12}
          style={styles.addButton}
        >
          <Ionicons
            name="add-circle"
            size={32}
            color={colors.accent.primary}
          />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <GlassInput
          placeholder="Search crews..."
          value={search}
          onChangeText={setSearch}
          icon={
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.text.tertiary}
            />
          }
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchCrews}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
            progressBackgroundColor={colors.background.depth1}
          />
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  hero: {
    ...typography.hero,
  },
  addButton: {
    padding: spacing.xs,
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 32,
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  crewName: {
    ...typography.headline,
  },
  description: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  bizButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.subtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  discoverSection: {
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  discoverTitle: {
    ...typography.headline,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  discoverLoading: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  discoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  discoverInfo: {
    flex: 1,
    gap: 2,
  },
  joinButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  joinText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
