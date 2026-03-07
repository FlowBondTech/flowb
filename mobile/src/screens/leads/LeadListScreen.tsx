/**
 * LeadListScreen
 *
 * Pipeline-driven lead list with horizontal stage filter chips, search,
 * pull-to-refresh, and a floating action button to create new leads.
 * Each lead card shows the contact name, company, color-coded stage
 * badge, deal value, and last-updated timestamp.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassPill } from '../../components/glass/GlassPill';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';
import { formatRelative } from '../../utils/formatters';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

// ── Constants ────────────────────────────────────────────────────────

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || 'https://flowb.fly.dev';

// ── Types ────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList>;

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'won'
  | 'lost';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  stage: LeadStage;
  value: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── Stage config ─────────────────────────────────────────────────────

const STAGE_CONFIG: Record<LeadStage, { label: string; color: string }> = {
  new: { label: 'New', color: '#22d3ee' },
  contacted: { label: 'Contacted', color: '#a78bfa' },
  qualified: { label: 'Qualified', color: '#fbbf24' },
  proposal: { label: 'Proposal', color: '#7c6cf0' },
  won: { label: 'Won', color: '#34d399' },
  lost: { label: 'Lost', color: '#fb7185' },
};

const STAGES = Object.keys(STAGE_CONFIG) as LeadStage[];

// ── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString()}`;
}

// ── Component ────────────────────────────────────────────────────────

export function LeadListScreen() {
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStage, setActiveStage] = useState<LeadStage | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/leads`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ── Pipeline counts ───────────────────────────────────────────────

  const stageCounts = useMemo(() => {
    const counts: Record<LeadStage, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      won: 0,
      lost: 0,
    };
    for (const lead of leads) {
      if (counts[lead.stage] !== undefined) {
        counts[lead.stage]++;
      }
    }
    return counts;
  }, [leads]);

  // ── Filtered list ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = leads;

    if (activeStage) {
      result = result.filter((l) => l.stage === activeStage);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q),
      );
    }

    return result;
  }, [leads, activeStage, search]);

  // ── Handlers ──────────────────────────────────────────────────────

  const handleLeadPress = useCallback(
    (lead: Lead) => {
      haptics.tap();
      (navigation as any).navigate('LeadDetail', { leadId: lead.id });
    },
    [navigation],
  );

  const handleStageFilter = useCallback(
    (stage: LeadStage) => {
      haptics.tap();
      setActiveStage((prev) => (prev === stage ? null : stage));
    },
    [],
  );

  const handleAddLead = useCallback(() => {
    haptics.tap();
    Alert.alert('New Lead', 'Lead creation coming soon');
  }, []);

  // ── Renderers ─────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => {
      const cfg = STAGE_CONFIG[item.stage];

      return (
        <GlassCard
          variant="medium"
          style={styles.card}
          onPress={() => handleLeadPress(item)}
        >
          <View style={styles.cardContent}>
            {/* Top row: name + stage badge */}
            <View style={styles.cardTopRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.leadName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.company ? (
                  <Text style={styles.company} numberOfLines={1}>
                    {item.company}
                  </Text>
                ) : null}
              </View>
              <GlassPill
                label={cfg.label}
                color={cfg.color}
                active
              />
            </View>

            {/* Bottom row: value + last updated */}
            <View style={styles.cardBottomRow}>
              <Text style={styles.value}>
                {formatCurrency(item.value)}
              </Text>
              <Text style={styles.updated}>
                {formatRelative(item.updated_at)}
              </Text>
            </View>
          </View>
        </GlassCard>
      );
    },
    [handleLeadPress],
  );

  const keyExtractor = useCallback((item: Lead) => item.id, []);

  const renderEmpty = useCallback(
    () =>
      !isLoading ? (
        <View style={styles.empty}>
          <Ionicons
            name="briefcase-outline"
            size={56}
            color={colors.text.tertiary}
          />
          <Text style={styles.emptyTitle}>
            {activeStage
              ? `No ${STAGE_CONFIG[activeStage].label.toLowerCase()} leads`
              : 'No leads yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to add your first lead
          </Text>
        </View>
      ) : null,
    [isLoading, activeStage],
  );

  // ── Render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={styles.hero}>Leads</Text>
        <Pressable
          onPress={handleAddLead}
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

      {/* Pipeline stage chips */}
      <View style={styles.pipelineWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pipelineContent}
        >
          {STAGES.map((stage) => {
            const cfg = STAGE_CONFIG[stage];
            const isActive = activeStage === stage;
            const count = stageCounts[stage];

            return (
              <GlassPill
                key={stage}
                label={`${cfg.label} ${count}`}
                color={cfg.color}
                active={isActive}
                onPress={() => handleStageFilter(stage)}
                style={styles.pipelinePill}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <GlassInput
          placeholder="Search leads..."
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

      {/* Loading indicator */}
      {isLoading && leads.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        /* Lead list */
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
              onRefresh={fetchLeads}
              tintColor={colors.accent.primary}
              colors={[colors.accent.primary]}
              progressBackgroundColor={colors.background.depth1}
            />
          }
        />
      )}

      {/* FAB */}
      <Pressable style={styles.fab} onPress={handleAddLead}>
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
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

  // Pipeline chips
  pipelineWrap: {
    paddingBottom: spacing.sm,
  },
  pipelineContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  pipelinePill: {
    marginRight: 0,
  },

  // Search
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },

  // List
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
    flexGrow: 1,
  },

  // Loading
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cards
  card: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  leadName: {
    ...typography.headline,
  },
  company: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    ...typography.headline,
    color: colors.accent.emerald,
  },
  updated: {
    ...typography.micro,
    color: colors.text.tertiary,
  },

  // Empty
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

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
