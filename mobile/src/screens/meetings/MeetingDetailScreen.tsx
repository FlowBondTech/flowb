/**
 * MeetingDetailScreen
 *
 * Full meeting detail view with attendee avatars, action buttons
 * (Complete, Get Briefing, Draft Follow-up), notes section, and share
 * functionality. Fetches meeting data from the API with auth token.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassButton } from '../../components/glass/GlassButton';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassPill } from '../../components/glass/GlassPill';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatEventDate } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { RootScreenProps } from '../../navigation/types';

// ── Constants ────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://flowb.fly.dev';

// ── Types ────────────────────────────────────────────────────────────

interface MeetingAttendee {
  user_id: string;
  display_name?: string;
  photo_url?: string;
  role: 'organizer' | 'attendee';
}

interface MeetingDetail {
  id: string;
  title: string;
  description?: string;
  meeting_type: 'call' | 'coffee' | 'lunch' | 'virtual' | 'office';
  scheduled_at: string;
  duration_minutes: number;
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  attendees: MeetingAttendee[];
  share_code?: string;
  created_at: string;
}

const MEETING_TYPE_LABELS: Record<MeetingDetail['meeting_type'], string> = {
  call: 'Phone Call',
  coffee: 'Coffee Chat',
  lunch: 'Lunch Meeting',
  virtual: 'Virtual Meeting',
  office: 'Office Meeting',
};

const MEETING_TYPE_ICONS: Record<MeetingDetail['meeting_type'], keyof typeof Ionicons.glyphMap> = {
  call: 'call-outline',
  coffee: 'cafe-outline',
  lunch: 'restaurant-outline',
  virtual: 'videocam-outline',
  office: 'business-outline',
};

const MEETING_TYPE_COLORS: Record<MeetingDetail['meeting_type'], string> = {
  call: colors.accent.cyan,
  coffee: colors.accent.amber,
  lunch: colors.accent.emerald,
  virtual: colors.accent.primary,
  office: colors.accent.secondary,
};

type Props = RootScreenProps<'MeetingDetail'>;

// ── Component ────────────────────────────────────────────────────────

export function MeetingDetailScreen({ route, navigation }: Props) {
  const { meetingId } = route.params;
  const token = useAuthStore((s) => s.token);

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Fetch meeting ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/meetings/${meetingId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setMeeting(data.meeting ?? data);
        }
      } catch {
        // Silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [meetingId, token]);

  // ── Action handlers ──────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    haptics.select();
    setActionLoading('complete');
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/meetings/${meetingId}/complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (res.ok) {
        setMeeting((prev) => (prev ? { ...prev, status: 'completed' } : prev));
        haptics.success();
      }
    } catch {
      haptics.error();
    } finally {
      setActionLoading(null);
    }
  }, [meetingId, token]);

  const handleBriefing = useCallback(async () => {
    haptics.select();
    setActionLoading('briefing');
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/meetings/${meetingId}/briefing`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        Alert.alert('Meeting Briefing', data.briefing ?? 'Briefing generated.');
        haptics.success();
      }
    } catch {
      haptics.error();
    } finally {
      setActionLoading(null);
    }
  }, [meetingId, token]);

  const handleFollowUp = useCallback(async () => {
    haptics.select();
    setActionLoading('followup');
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/meetings/${meetingId}/follow-up`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        Alert.alert('Follow-up Draft', data.draft ?? 'Follow-up drafted.');
        haptics.success();
      }
    } catch {
      haptics.error();
    } finally {
      setActionLoading(null);
    }
  }, [meetingId, token]);

  const handleShare = useCallback(async () => {
    haptics.tap();
    const shareCode = meeting?.share_code ?? meeting?.id;
    const shareUrl = `https://flowb.me/m/${shareCode}`;
    try {
      await Share.share({
        message: `${meeting?.title ?? 'Meeting'} - ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // User cancelled
    }
  }, [meeting]);

  // ── Loading state ────────────────────────────────────────────────

  if (loading || !meeting) {
    return (
      <View style={styles.loadingRoot}>
        <GlassHeader title="Meeting" onBack={() => navigation.goBack()} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  // ── Derived values ───────────────────────────────────────────────

  const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type];
  const typeIcon = MEETING_TYPE_ICONS[meeting.meeting_type];
  const typeColor = MEETING_TYPE_COLORS[meeting.meeting_type];
  const isCompleted = meeting.status === 'completed';

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Meeting"
        onBack={() => navigation.goBack()}
        rightAction={
          <GlassButton
            title="Share"
            variant="ghost"
            size="sm"
            onPress={handleShare}
            icon={
              <Ionicons
                name="share-outline"
                size={16}
                color={colors.accent.primary}
              />
            }
          />
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text style={styles.meetingTitle}>{meeting.title}</Text>

          {/* Pills: type, date, duration */}
          <View style={styles.pillRow}>
            <GlassPill
              label={typeLabel}
              icon={
                <Ionicons name={typeIcon} size={14} color={typeColor} />
              }
              color={typeColor}
            />
            <GlassPill
              label={formatEventDate(meeting.scheduled_at)}
              icon={
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={colors.accent.primary}
                />
              }
              color={colors.accent.primary}
            />
            <GlassPill
              label={`${meeting.duration_minutes} min`}
              icon={
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.accent.cyan}
                />
              }
              color={colors.accent.cyan}
            />
          </View>

          {/* Status pill */}
          {isCompleted ? (
            <GlassPill
              label="Completed"
              active
              color={colors.accent.emerald}
            />
          ) : null}

          {/* Location */}
          {meeting.location ? (
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.accent.emerald}
              />
              <Text style={styles.locationText}>{meeting.location}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Description ──────────────────────────────────── */}
        {meeting.description ? (
          <GlassCard variant="subtle" style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.descriptionText}>{meeting.description}</Text>
          </GlassCard>
        ) : null}

        {/* ── Attendees ────────────────────────────────────── */}
        {meeting.attendees && meeting.attendees.length > 0 ? (
          <GlassCard variant="subtle" style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>
              Attendees ({meeting.attendees.length})
            </Text>
            <View style={styles.attendeeList}>
              {meeting.attendees.map((attendee) => (
                <View key={attendee.user_id} style={styles.attendeeItem}>
                  <View
                    style={[
                      styles.avatar,
                      attendee.role === 'organizer' && styles.avatarOrganizer,
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {(attendee.display_name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.attendeeInfo}>
                    <Text style={styles.attendeeName} numberOfLines={1}>
                      {attendee.display_name ?? 'Unknown'}
                    </Text>
                    {attendee.role === 'organizer' ? (
                      <Text style={styles.attendeeRole}>Organizer</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>
        ) : null}

        {/* ── Notes ────────────────────────────────────────── */}
        {meeting.notes ? (
          <GlassCard variant="subtle" style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notesText}>{meeting.notes}</Text>
          </GlassCard>
        ) : null}

        {/* Bottom spacer for action bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Action bar ─────────────────────────────────────── */}
      <View style={styles.actionBar}>
        {!isCompleted ? (
          <GlassButton
            title="Complete"
            onPress={handleComplete}
            variant="primary"
            size="md"
            loading={actionLoading === 'complete'}
            disabled={actionLoading !== null}
            icon={
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={colors.white}
              />
            }
            style={styles.actionButton}
          />
        ) : null}

        <GlassButton
          title="Briefing"
          onPress={handleBriefing}
          variant="secondary"
          size="md"
          loading={actionLoading === 'briefing'}
          disabled={actionLoading !== null}
          icon={
            <Ionicons
              name="document-text-outline"
              size={16}
              color={colors.accent.primary}
            />
          }
          style={styles.actionButton}
        />

        <GlassButton
          title="Follow-up"
          onPress={handleFollowUp}
          variant="secondary"
          size="md"
          loading={actionLoading === 'followup'}
          disabled={actionLoading !== null}
          icon={
            <Ionicons
              name="mail-outline"
              size={16}
              color={colors.accent.primary}
            />
          }
          style={styles.actionButton}
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
  loadingRoot: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ── Hero ────────────────────────────────────────────────────
  heroSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  meetingTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  locationText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },

  // ── Sections ────────────────────────────────────────────────
  sectionCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },

  // ── Attendees ───────────────────────────────────────────────
  attendeeList: {
    gap: spacing.sm,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.medium,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOrganizer: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
  },
  avatarText: {
    ...typography.headline,
    color: colors.text.primary,
    fontSize: 16,
  },
  attendeeInfo: {
    flex: 1,
    gap: 2,
  },
  attendeeName: {
    ...typography.body,
    color: colors.text.primary,
  },
  attendeeRole: {
    ...typography.micro,
    color: colors.accent.primary,
    letterSpacing: 1,
  },

  // ── Notes ───────────────────────────────────────────────────
  notesText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },

  bottomSpacer: {
    height: 120,
  },

  // ── Action bar ──────────────────────────────────────────────
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background.depth1,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
