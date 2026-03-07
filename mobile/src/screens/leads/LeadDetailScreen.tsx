/**
 * LeadDetailScreen
 *
 * Full lead view with contact info, deal value, stage progress bar,
 * action buttons (advance stage, schedule meeting, edit, delete),
 * activity timeline, and notes section. Tappable email and phone
 * launch native compose / dialer.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
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
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatRelative } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import type { Lead, LeadStage } from './LeadListScreen';

// ── Constants ────────────────────────────────────────────────────────

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || 'https://flowb.fly.dev';

// ── Types ────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList, 'LeadDetail'>;
type Route = RouteProp<RootStackParamList, 'LeadDetail'>;

interface TimelineEntry {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user_id?: string;
}

// ── Stage config ─────────────────────────────────────────────────────

const STAGE_CONFIG: Record<LeadStage, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  new: { label: 'New', color: '#22d3ee', icon: 'sparkles-outline' },
  contacted: { label: 'Contacted', color: '#a78bfa', icon: 'chatbubble-outline' },
  qualified: { label: 'Qualified', color: '#fbbf24', icon: 'checkmark-circle-outline' },
  proposal: { label: 'Proposal', color: '#7c6cf0', icon: 'document-text-outline' },
  won: { label: 'Won', color: '#34d399', icon: 'trophy-outline' },
  lost: { label: 'Lost', color: '#fb7185', icon: 'close-circle-outline' },
};

const PIPELINE_STAGES: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'won',
];

// ── Timeline icon map ────────────────────────────────────────────────

const TIMELINE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  stage_change: 'swap-horizontal-outline',
  note: 'document-text-outline',
  email: 'mail-outline',
  call: 'call-outline',
  meeting: 'calendar-outline',
  created: 'add-circle-outline',
  default: 'ellipse-outline',
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString()}`;
}

function getNextStage(current: LeadStage): LeadStage | null {
  const idx = PIPELINE_STAGES.indexOf(current);
  if (idx === -1 || idx >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[idx + 1];
}

// ── Component ────────────────────────────────────────────────────────

export function LeadDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { leadId } = (route.params as any) ?? {};
  const token = useAuthStore((s) => s.token);

  const [lead, setLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/leads/${leadId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setLead(data.lead ?? data);
    } catch (err) {
      console.error('Failed to fetch lead:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId, token]);

  const fetchTimeline = useCallback(async () => {
    if (!leadId) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/leads/${leadId}/timeline`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) return;
      const data = await res.json();
      setTimeline(data.timeline ?? []);
    } catch {
      // Timeline is supplementary; silent fail
    }
  }, [leadId, token]);

  useEffect(() => {
    fetchLead();
    fetchTimeline();
  }, [fetchLead, fetchTimeline]);

  // ── Handlers ──────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEmail = useCallback(() => {
    if (!lead?.email) return;
    haptics.tap();
    Linking.openURL(`mailto:${lead.email}`);
  }, [lead]);

  const handlePhone = useCallback(() => {
    if (!lead?.phone) return;
    haptics.tap();
    Linking.openURL(`tel:${lead.phone}`);
  }, [lead]);

  const handleAdvanceStage = useCallback(async () => {
    if (!lead) return;
    const next = getNextStage(lead.stage);
    if (!next) {
      Alert.alert('Pipeline Complete', 'This lead has reached the final stage.');
      return;
    }

    haptics.select();
    setAdvancing(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ stage: next }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setLead(data.lead ?? { ...lead, stage: next });
      fetchTimeline();
      haptics.success();
    } catch (err) {
      console.error('Failed to advance stage:', err);
      haptics.error();
      Alert.alert('Error', 'Failed to advance the lead stage.');
    } finally {
      setAdvancing(false);
    }
  }, [lead, token, fetchTimeline]);

  const handleScheduleMeeting = useCallback(() => {
    haptics.tap();
    Alert.alert('Schedule Meeting', 'Meeting scheduler coming soon');
  }, []);

  const handleEdit = useCallback(() => {
    haptics.tap();
    Alert.alert('Edit Lead', 'Lead editor coming soon');
  }, []);

  const handleDelete = useCallback(() => {
    if (!lead) return;
    haptics.heavy();
    Alert.alert(
      'Delete Lead',
      `Are you sure you want to delete "${lead.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE}/api/v1/leads/${lead.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });
              haptics.success();
              navigation.goBack();
            } catch (err) {
              console.error('Failed to delete lead:', err);
              haptics.error();
              Alert.alert('Error', 'Failed to delete the lead.');
            }
          },
        },
      ],
    );
  }, [lead, token, navigation]);

  // ── Loading state ─────────────────────────────────────────────────

  if (loading && !lead) {
    return (
      <View style={styles.root}>
        <GlassHeader title="Lead" onBack={handleBack} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.root}>
        <GlassHeader title="Lead" onBack={handleBack} />
        <View style={styles.loader}>
          <Text style={styles.emptyText}>Lead not found</Text>
        </View>
      </View>
    );
  }

  const stageCfg = STAGE_CONFIG[lead.stage];
  const nextStage = getNextStage(lead.stage);
  const currentStageIdx = PIPELINE_STAGES.indexOf(lead.stage);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title={lead.name}
        onBack={handleBack}
        rightAction={
          <Pressable onPress={handleEdit} hitSlop={12}>
            <Ionicons
              name="pencil-outline"
              size={20}
              color={colors.text.primary}
            />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header card ──────────────────────────────────────────── */}
        <GlassCard variant="medium" style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>{lead.name}</Text>
                {lead.company ? (
                  <Text style={styles.headerCompany}>{lead.company}</Text>
                ) : null}
              </View>
              <GlassPill
                label={stageCfg.label}
                color={stageCfg.color}
                active
              />
            </View>
            <Text style={styles.dealValue}>
              {formatCurrency(lead.value)}
            </Text>
          </View>
        </GlassCard>

        {/* ── Stage progress bar ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pipeline Progress</Text>
          <GlassCard variant="subtle" style={styles.progressCard}>
            <View style={styles.progressContent}>
              <View style={styles.progressTrack}>
                {PIPELINE_STAGES.map((stage, idx) => {
                  const cfg = STAGE_CONFIG[stage];
                  const isReached =
                    lead.stage === 'lost'
                      ? false
                      : idx <= currentStageIdx;
                  const isCurrent = stage === lead.stage;

                  return (
                    <React.Fragment key={stage}>
                      {idx > 0 && (
                        <View
                          style={[
                            styles.progressLine,
                            isReached && { backgroundColor: cfg.color },
                          ]}
                        />
                      )}
                      <View style={styles.progressDotWrap}>
                        <View
                          style={[
                            styles.progressDot,
                            isReached && { backgroundColor: cfg.color },
                            isCurrent && styles.progressDotActive,
                            isCurrent && {
                              borderColor: cfg.color,
                              shadowColor: cfg.color,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.progressLabel,
                            isCurrent && { color: cfg.color },
                          ]}
                          numberOfLines={1}
                        >
                          {cfg.label}
                        </Text>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Lost indicator */}
              {lead.stage === 'lost' && (
                <View style={styles.lostBanner}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={STAGE_CONFIG.lost.color}
                  />
                  <Text style={styles.lostText}>Deal Lost</Text>
                </View>
              )}
            </View>
          </GlassCard>
        </View>

        {/* ── Contact info ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <GlassCard variant="subtle">
            <View style={styles.contactContent}>
              {lead.email ? (
                <Pressable
                  style={styles.contactRow}
                  onPress={handleEmail}
                >
                  <View style={styles.contactIcon}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={colors.accent.cyan}
                    />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>{lead.email}</Text>
                  </View>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.text.tertiary}
                  />
                </Pressable>
              ) : null}

              {lead.phone ? (
                <Pressable
                  style={[
                    styles.contactRow,
                    lead.email ? styles.contactRowBorder : undefined,
                  ]}
                  onPress={handlePhone}
                >
                  <View style={styles.contactIcon}>
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color={colors.accent.emerald}
                    />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>{lead.phone}</Text>
                  </View>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.text.tertiary}
                  />
                </Pressable>
              ) : null}

              {!lead.email && !lead.phone ? (
                <View style={styles.contactRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={colors.text.tertiary}
                  />
                  <Text style={styles.noContactText}>
                    No contact info added yet
                  </Text>
                </View>
              ) : null}
            </View>
          </GlassCard>
        </View>

        {/* ── Action buttons ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            {nextStage && lead.stage !== 'lost' ? (
              <GlassButton
                title={`Advance to ${STAGE_CONFIG[nextStage].label}`}
                variant="primary"
                size="md"
                onPress={handleAdvanceStage}
                loading={advancing}
                icon={
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.white}
                  />
                }
                style={styles.actionButton}
              />
            ) : null}

            <GlassButton
              title="Schedule Meeting"
              variant="secondary"
              size="md"
              onPress={handleScheduleMeeting}
              icon={
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.accent.primary}
                />
              }
              style={styles.actionButton}
            />

            <View style={styles.actionRow}>
              <GlassButton
                title="Edit"
                variant="secondary"
                size="sm"
                onPress={handleEdit}
                icon={
                  <Ionicons
                    name="pencil-outline"
                    size={16}
                    color={colors.accent.primary}
                  />
                }
                style={styles.actionHalf}
              />
              <GlassButton
                title="Delete"
                variant="ghost"
                size="sm"
                onPress={handleDelete}
                icon={
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.accent.rose}
                  />
                }
                style={styles.actionHalf}
              />
            </View>
          </View>
        </View>

        {/* ── Notes ────────────────────────────────────────────────── */}
        {lead.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <GlassCard variant="subtle">
              <View style={styles.notesContent}>
                <Text style={styles.notesText}>{lead.notes}</Text>
              </View>
            </GlassCard>
          </View>
        ) : null}

        {/* ── Activity timeline ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>

          {timeline.length === 0 ? (
            <Text style={styles.emptyText}>No activity recorded yet</Text>
          ) : (
            timeline.map((entry, idx) => {
              const iconName =
                TIMELINE_ICONS[entry.type] ?? TIMELINE_ICONS.default;
              const isLast = idx === timeline.length - 1;

              return (
                <View key={entry.id} style={styles.timelineItem}>
                  {/* Vertical line + dot */}
                  <View style={styles.timelineLeft}>
                    <View style={styles.timelineDot}>
                      <Ionicons
                        name={iconName}
                        size={14}
                        color={colors.accent.primary}
                      />
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>

                  {/* Content */}
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineDescription}>
                      {entry.description}
                    </Text>
                    <Text style={styles.timelineTime}>
                      {formatRelative(entry.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Loading
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header card
  headerCard: {
    marginBottom: spacing.lg,
  },
  headerContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  headerName: {
    ...typography.title,
  },
  headerCompany: {
    ...typography.body,
    color: colors.text.secondary,
  },
  dealValue: {
    ...typography.hero,
    color: colors.accent.emerald,
    fontSize: 28,
    lineHeight: 34,
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

  // Stage progress bar
  progressCard: {
    overflow: 'hidden',
  },
  progressContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  progressDotWrap: {
    alignItems: 'center',
    width: 52,
    gap: spacing.xs,
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.glass.medium,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  progressDotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.glass.light,
    marginTop: 7,
  },
  progressLabel: {
    ...typography.micro,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  lostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  lostText: {
    ...typography.caption,
    color: STAGE_CONFIG.lost.color,
    fontWeight: '600',
  },

  // Contact
  contactContent: {
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  contactRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
  },
  contactValue: {
    ...typography.body,
  },
  noContactText: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },

  // Actions
  actionsGrid: {
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },

  // Notes
  notesContent: {
    padding: spacing.md,
  },
  notesText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // Timeline
  timelineItem: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.glass.light,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
    gap: 2,
  },
  timelineDescription: {
    ...typography.body,
    color: colors.text.primary,
  },
  timelineTime: {
    ...typography.micro,
    color: colors.text.tertiary,
  },

  // Bottom
  bottomSpacer: {
    height: spacing.xxl,
  },
});
