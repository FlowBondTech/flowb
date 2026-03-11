/**
 * KanbanScreen
 *
 * Horizontal-scrolling pipeline board with six stage columns. Each column
 * is a vertical scroll of lead cards grouped by stage. Column headers show
 * stage name, count, and total deal value. Designed for the FlowB dark
 * glassmorphism theme with premium card treatments and staggered entrance
 * animations.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { GlassCard } from '../../components/glass/GlassCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { glassStyle } from '../../theme/glass';
import { haptics } from '../../utils/haptics';
import { formatRelative } from '../../utils/formatters';
import { useLeadsStore, type Lead, type LeadStage } from '../../stores/useLeadsStore';
import type { RootStackParamList } from '../../navigation/types';

// ── Constants ────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.75;
const COLUMN_GAP = spacing.sm;

// ── Stage config ─────────────────────────────────────────────────────

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: colors.accent.cyan },
  { key: 'contacted', label: 'Contacted', color: colors.accent.primary },
  { key: 'qualified', label: 'Qualified', color: colors.accent.amber },
  { key: 'proposal', label: 'Proposal', color: colors.accent.secondary },
  { key: 'won', label: 'Won', color: colors.accent.emerald },
  { key: 'lost', label: 'Lost', color: colors.accent.rose },
];

// ── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString()}`;
}

function stageColorAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Lead Card ────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead;
  stageColor: string;
  index: number;
  onPress: (lead: Lead) => void;
}

const LeadCard = React.memo(function LeadCard({
  lead,
  stageColor,
  index,
  onPress,
}: LeadCardProps) {
  const value = lead.value ?? 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <GlassCard
        variant="subtle"
        style={styles.leadCard}
        onPress={() => onPress(lead)}
      >
        <View style={styles.leadCardContent}>
          {/* Left accent strip */}
          <View
            style={[
              styles.leadAccent,
              { backgroundColor: stageColor },
            ]}
          />

          <View style={styles.leadCardBody}>
            {/* Name + company */}
            <Text style={styles.leadName} numberOfLines={1}>
              {lead.name}
            </Text>
            {lead.company ? (
              <Text style={styles.leadCompany} numberOfLines={1}>
                {lead.company}
              </Text>
            ) : null}

            {/* Bottom row: value pill + time */}
            <View style={styles.leadBottomRow}>
              {value > 0 ? (
                <View
                  style={[
                    styles.valuePill,
                    { backgroundColor: stageColorAlpha(stageColor, 0.15) },
                  ]}
                >
                  <Text
                    style={[styles.valuePillText, { color: stageColor }]}
                  >
                    {formatCurrency(value)}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              <Text style={styles.leadTime}>
                {formatRelative(lead.updated_at)}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
});

// ── Column Header ────────────────────────────────────────────────────

interface ColumnHeaderProps {
  label: string;
  color: string;
  count: number;
  totalValue: number;
}

function ColumnHeader({ label, color, count, totalValue }: ColumnHeaderProps) {
  return (
    <View style={[styles.columnHeader, glassStyle('medium')]}>
      {/* Top accent line */}
      <View style={[styles.columnAccentLine, { backgroundColor: color }]} />

      <View style={styles.columnHeaderContent}>
        {/* Title row */}
        <View style={styles.columnTitleRow}>
          <Text style={styles.columnTitle}>{label}</Text>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: stageColorAlpha(color, 0.2) },
            ]}
          >
            <Text style={[styles.countBadgeText, { color }]}>{count}</Text>
          </View>
        </View>

        {/* Total value */}
        {totalValue > 0 ? (
          <Text style={[styles.columnValue, { color }]}>
            {formatCurrency(totalValue)}
          </Text>
        ) : (
          <Text style={styles.columnValueEmpty}>No deals</Text>
        )}
      </View>
    </View>
  );
}

// ── Empty Column ─────────────────────────────────────────────────────

function EmptyColumn({ stageColor }: { stageColor: string }) {
  return (
    <View style={styles.emptyColumn}>
      <Ionicons
        name="file-tray-outline"
        size={32}
        color={stageColorAlpha(stageColor, 0.3)}
      />
      <Text style={styles.emptyText}>No leads</Text>
    </View>
  );
}

// ── Kanban Column ────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: { key: LeadStage; label: string; color: string };
  leads: Lead[];
  columnIndex: number;
  onLeadPress: (lead: Lead) => void;
}

const KanbanColumn = React.memo(function KanbanColumn({
  stage,
  leads,
  columnIndex,
  onLeadPress,
}: KanbanColumnProps) {
  const totalValue = leads.reduce((sum, l) => sum + (l.value ?? 0), 0);

  return (
    <Animated.View
      entering={FadeInRight.delay(columnIndex * 80).duration(400)}
      style={styles.column}
    >
      <ColumnHeader
        label={stage.label}
        color={stage.color}
        count={leads.length}
        totalValue={totalValue}
      />

      {leads.length === 0 ? (
        <EmptyColumn stageColor={stage.color} />
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <LeadCard
              lead={item}
              stageColor={stage.color}
              index={index}
              onPress={onLeadPress}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.columnList}
        />
      )}
    </Animated.View>
  );
});

// ── Main Screen ──────────────────────────────────────────────────────

export function KanbanScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const leads = useLeadsStore((s) => s.leads);
  const isLoading = useLeadsStore((s) => s.isLoading);
  const fetchLeads = useLeadsStore((s) => s.fetchLeads);

  // ── Data fetching ──────────────────────────────────────────────────

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleRefresh = useCallback(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ── Group leads by stage ───────────────────────────────────────────

  const groupedLeads = useMemo(() => {
    const groups: Record<LeadStage, Lead[]> = {
      new: [],
      contacted: [],
      qualified: [],
      proposal: [],
      won: [],
      lost: [],
    };

    for (const lead of leads) {
      if (groups[lead.stage]) {
        groups[lead.stage].push(lead);
      }
    }

    // Sort each group by updated_at (most recent first)
    for (const stage of Object.keys(groups) as LeadStage[]) {
      groups[stage].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    }

    return groups;
  }, [leads]);

  // ── Pipeline summary ───────────────────────────────────────────────

  const pipelineTotal = useMemo(() => {
    return leads.reduce((sum, l) => sum + (l.value ?? 0), 0);
  }, [leads]);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleLeadPress = useCallback(
    (lead: Lead) => {
      haptics.tap();
      (navigation as any).navigate('LeadDetail', { leadId: lead.id });
    },
    [navigation],
  );

  const handleAddLead = useCallback(() => {
    haptics.tap();
    Alert.alert('New Lead', 'Lead creation coming soon');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.hero}>Pipeline</Text>
          <Text style={styles.headerSub}>
            {leads.length} lead{leads.length !== 1 ? 's' : ''}{' '}
            {pipelineTotal > 0 ? `\u00B7 ${formatCurrency(pipelineTotal)}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={handleAddLead}
          hitSlop={12}
          style={styles.headerAction}
        >
          <Ionicons
            name="swap-horizontal"
            size={22}
            color={colors.text.secondary}
          />
        </Pressable>
      </View>

      {/* Loading state */}
      {isLoading && leads.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loaderText}>Loading pipeline...</Text>
        </View>
      ) : (
        /* Horizontal board */
        <ScrollView
          horizontal
          pagingEnabled={false}
          decelerationRate="fast"
          snapToInterval={COLUMN_WIDTH + COLUMN_GAP}
          snapToAlignment="start"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.boardContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.accent.primary}
              colors={[colors.accent.primary]}
              progressBackgroundColor={colors.background.depth1}
            />
          }
        >
          {STAGES.map((stage, idx) => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              leads={groupedLeads[stage.key]}
              columnIndex={idx}
              onLeadPress={handleLeadPress}
            />
          ))}
        </ScrollView>
      )}

      {/* Floating action button */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={handleAddLead}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  hero: {
    ...typography.hero,
  },
  headerSub: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Board ─────────────────────────────────────────────────────────
  boardContent: {
    paddingHorizontal: spacing.md,
    gap: COLUMN_GAP,
  },

  // ── Column ────────────────────────────────────────────────────────
  column: {
    width: COLUMN_WIDTH,
    flex: 1,
  },
  columnHeader: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  columnAccentLine: {
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  columnHeaderContent: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  columnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  columnTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  columnValue: {
    ...typography.caption,
    fontWeight: '600',
  },
  columnValueEmpty: {
    ...typography.caption,
    color: colors.text.tertiary,
  },

  // ── Column list ───────────────────────────────────────────────────
  columnList: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },

  // ── Empty column ──────────────────────────────────────────────────
  emptyColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },

  // ── Lead card ─────────────────────────────────────────────────────
  leadCard: {
    borderRadius: 12,
  },
  leadCardContent: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  leadAccent: {
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  leadCardBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  leadName: {
    ...typography.headline,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text.primary,
  },
  leadCompany: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },
  leadBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },

  // ── Value pill ────────────────────────────────────────────────────
  valuePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  valuePillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Time ──────────────────────────────────────────────────────────
  leadTime: {
    ...typography.micro,
    color: colors.text.tertiary,
    fontSize: 10,
    textTransform: 'lowercase',
    letterSpacing: 0,
  },

  // ── Loading ───────────────────────────────────────────────────────
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loaderText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },

  // ── FAB ───────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: spacing.md,
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
