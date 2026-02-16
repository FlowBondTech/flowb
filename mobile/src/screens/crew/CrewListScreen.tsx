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
  const isLoading = useCrewStore((s) => s.isLoading);
  const fetchCrews = useCrewStore((s) => s.fetchCrews);

  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCrews();
  }, [fetchCrews]);

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
    [handleCrewPress],
  );

  const keyExtractor = useCallback((item: CrewInfo) => item.id, []);

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
});
