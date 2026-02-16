/**
 * EventDetailScreen
 *
 * Full event detail view with RSVP actions. Fetches the event data and
 * social proof (going/maybe counts) from the API. Provides Going, Maybe,
 * and Cancel RSVP buttons with haptic feedback.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassPill } from '../../components/glass/GlassPill';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { useEventsStore } from '../../stores/useEventsStore';
import { formatEventDate, formatEventTime } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';
import type { EventResult, EventSocial } from '../../api/types';
import type { RootScreenProps } from '../../navigation/types';

// ── Types ────────────────────────────────────────────────────────────

type Props = RootScreenProps<'EventDetail'>;

type RsvpStatus = 'going' | 'maybe' | null;

// ── Component ────────────────────────────────────────────────────────

export function EventDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const { rsvp: storeRsvp, cancelRsvp: storeCancelRsvp } = useEventsStore();

  const [event, setEvent] = useState<EventResult | null>(null);
  const [social, setSocial] = useState<EventSocial | null>(null);
  const [myRsvp, setMyRsvp] = useState<RsvpStatus>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  // ── Fetch event and social data ───────────────────────────────────

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [eventData, socialData] = await Promise.all([
        api.getEvent(eventId),
        api.getEventSocial(eventId),
      ]);
      setEvent(eventData.event);
      setSocial(socialData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // ── RSVP handlers ─────────────────────────────────────────────────

  const handleRsvp = useCallback(
    async (status: 'going' | 'maybe') => {
      haptics.select();
      setRsvpLoading(true);
      try {
        await storeRsvp(eventId, status);
        setMyRsvp(status);
        haptics.success();

        // Refresh social counts
        try {
          const updated = await api.getEventSocial(eventId);
          setSocial(updated);
        } catch {
          // Non-critical
        }
      } catch {
        haptics.error();
      } finally {
        setRsvpLoading(false);
      }
    },
    [eventId, storeRsvp]
  );

  const handleCancelRsvp = useCallback(async () => {
    haptics.select();
    setRsvpLoading(true);
    try {
      await storeCancelRsvp(eventId);
      setMyRsvp(null);

      try {
        const updated = await api.getEventSocial(eventId);
        setSocial(updated);
      } catch {
        // Non-critical
      }
    } catch {
      haptics.error();
    } finally {
      setRsvpLoading(false);
    }
  }, [eventId, storeCancelRsvp]);

  const handleOpenUrl = useCallback(() => {
    if (event?.url) {
      haptics.tap();
      Linking.openURL(event.url);
    }
  }, [event?.url]);

  // ── Loading state ─────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <GlassHeader title="Event" onBack={() => navigation.goBack()} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────

  if (error || !event) {
    return (
      <View style={styles.loadingRoot}>
        <GlassHeader title="Event" onBack={() => navigation.goBack()} />
        <View style={styles.loadingCenter}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.errorTitle}>Couldn't load event</Text>
          <GlassButton
            title="Try Again"
            onPress={loadEvent}
            variant="secondary"
            size="sm"
          />
        </View>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  const goingCount = social?.goingCount ?? 0;
  const maybeCount = social?.maybeCount ?? 0;

  return (
    <View style={styles.root}>
      <GlassHeader title="Event" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* Date / time pills */}
          <View style={styles.pillRow}>
            <GlassPill
              label={formatEventDate(event.startTime)}
              icon={
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={colors.accent.primary}
                />
              }
              color={colors.accent.primary}
            />
            {event.endTime ? (
              <GlassPill
                label={formatEventTime(event.endTime)}
                icon={
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={colors.accent.cyan}
                  />
                }
                color={colors.accent.cyan}
              />
            ) : null}
          </View>

          {/* Location */}
          {event.locationName ? (
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.accent.emerald}
              />
              <Text style={styles.locationText}>{event.locationName}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Description ────────────────────────────────── */}
        {event.description ? (
          <GlassCard variant="subtle" style={styles.descriptionCard}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </GlassCard>
        ) : null}

        {/* ── Social proof ───────────────────────────────── */}
        <GlassCard variant="subtle" style={styles.socialCard}>
          <View style={styles.socialRow}>
            <View style={styles.socialBadge}>
              <Ionicons
                name="people"
                size={18}
                color={colors.accent.primary}
              />
              <Text style={styles.socialCount}>{goingCount}</Text>
              <Text style={styles.socialLabel}>going</Text>
            </View>
            {maybeCount > 0 ? (
              <View style={styles.socialBadge}>
                <Ionicons
                  name="help-circle-outline"
                  size={18}
                  color={colors.accent.amber}
                />
                <Text style={styles.socialCount}>{maybeCount}</Text>
                <Text style={styles.socialLabel}>maybe</Text>
              </View>
            ) : null}
          </View>
        </GlassCard>

        {/* ── External link ──────────────────────────────── */}
        {event.url ? (
          <GlassButton
            title="View on source"
            onPress={handleOpenUrl}
            variant="ghost"
            size="sm"
            icon={
              <Ionicons
                name="open-outline"
                size={16}
                color={colors.accent.primary}
              />
            }
            style={styles.linkButton}
          />
        ) : null}

        {/* Spacer for bottom buttons */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── RSVP actions ─────────────────────────────────── */}
      <View style={styles.actionBar}>
        {myRsvp ? (
          <>
            <GlassPill
              label={myRsvp === 'going' ? 'You\'re going!' : 'Marked as maybe'}
              active
              color={myRsvp === 'going' ? colors.accent.emerald : colors.accent.amber}
            />
            <GlassButton
              title="Cancel RSVP"
              onPress={handleCancelRsvp}
              variant="ghost"
              size="sm"
              loading={rsvpLoading}
              style={styles.cancelButton}
            />
          </>
        ) : (
          <>
            <GlassButton
              title="RSVP - Going"
              onPress={() => handleRsvp('going')}
              variant="primary"
              size="lg"
              loading={rsvpLoading}
              style={styles.goingButton}
            />
            <GlassButton
              title="Maybe"
              onPress={() => handleRsvp('maybe')}
              variant="secondary"
              size="md"
              loading={rsvpLoading}
              style={styles.maybeButton}
            />
          </>
        )}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ── Hero ──────────────────────────────────────────────────────
  heroSection: {
    marginBottom: spacing.lg,
  },
  eventTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },

  // ── Description ───────────────────────────────────────────────
  descriptionCard: {
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

  // ── Social ────────────────────────────────────────────────────
  socialCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  socialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  socialCount: {
    ...typography.headline,
    color: colors.text.primary,
  },
  socialLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  // ── Link ──────────────────────────────────────────────────────
  linkButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },

  bottomSpacer: {
    height: 120,
  },

  // ── Action bar ────────────────────────────────────────────────
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background.depth1,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: spacing.sm,
  },
  goingButton: {
    flex: 1,
  },
  maybeButton: {
    flex: 0,
  },
  cancelButton: {
    marginLeft: spacing.sm,
  },
});
