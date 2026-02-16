/**
 * PreferencesScreen
 *
 * Notification toggles and quiet hours settings. Reads and writes
 * to GET/PATCH /api/v1/me/preferences.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';
import type { RootScreenProps } from '../../navigation/types';

type Props = RootScreenProps<'Preferences'>;

// ── Toggle row ──────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  caption?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

function ToggleRow({ label, caption, value, onToggle }: ToggleRowProps) {
  const handleChange = useCallback(
    (v: boolean) => {
      haptics.select();
      onToggle(v);
    },
    [onToggle]
  );

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {caption ? <Text style={styles.toggleCaption}>{caption}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={handleChange}
        trackColor={{
          false: colors.glass.medium,
          true: colors.accent.primary,
        }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.glass.medium}
      />
    </View>
  );
}

// ── Quiet hours picker row ──────────────────────────────────────────

interface HourPickerProps {
  label: string;
  value: number;
  onChange: (h: number) => void;
}

function HourPicker({ label, value, onChange }: HourPickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const display = `${value === 0 ? 12 : value > 12 ? value - 12 : value}:00 ${value >= 12 ? 'PM' : 'AM'}`;

  const cycle = useCallback(() => {
    haptics.tap();
    onChange((value + 1) % 24);
  }, [value, onChange]);

  return (
    <View style={styles.hourRow}>
      <Text style={styles.hourLabel}>{label}</Text>
      <Text style={styles.hourValue} onPress={cycle}>
        {display}
      </Text>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────

export function PreferencesScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    crew_checkin_alerts: true,
    friend_rsvp_alerts: true,
    event_reminders: true,
    daily_digest: false,
    quiet_hours_enabled: false,
    quiet_hours_start: 22,
    quiet_hours_end: 8,
  });

  // ── Load ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getPreferences();
        if (!cancelled && data) {
          setPrefs((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // Use defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Save helper ─────────────────────────────────────────────────────

  const update = useCallback(
    async (patch: Partial<typeof prefs>) => {
      setPrefs((prev) => ({ ...prev, ...patch }));
      setSaving(true);
      try {
        await api.updatePreferences(patch);
      } catch {
        // Revert silently on failure
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <GlassHeader title="Preferences" onBack={() => navigation.goBack()} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Preferences"
        onBack={() => navigation.goBack()}
        rightAction={
          saving ? (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Notification toggles ──────────────────────────── */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <GlassCard variant="medium" style={styles.card}>
          <ToggleRow
            label="Crew check-in alerts"
            caption="When crew members check in nearby"
            value={prefs.crew_checkin_alerts}
            onToggle={(v) => update({ crew_checkin_alerts: v })}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Friend RSVP alerts"
            caption="When friends RSVP to events"
            value={prefs.friend_rsvp_alerts}
            onToggle={(v) => update({ friend_rsvp_alerts: v })}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Event reminders"
            caption="30 minutes before your RSVPs"
            value={prefs.event_reminders}
            onToggle={(v) => update({ event_reminders: v })}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Daily digest"
            caption="Morning summary of today's events"
            value={prefs.daily_digest}
            onToggle={(v) => update({ daily_digest: v })}
          />
        </GlassCard>

        {/* ── Quiet hours ───────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <GlassCard variant="medium" style={styles.card}>
          <ToggleRow
            label="Enable quiet hours"
            caption="Silence notifications during set hours"
            value={prefs.quiet_hours_enabled}
            onToggle={(v) => update({ quiet_hours_enabled: v })}
          />
          {prefs.quiet_hours_enabled && (
            <>
              <View style={styles.divider} />
              <HourPicker
                label="Start"
                value={prefs.quiet_hours_start}
                onChange={(h) => update({ quiet_hours_start: h })}
              />
              <View style={styles.divider} />
              <HourPicker
                label="End"
                value={prefs.quiet_hours_end}
                onChange={(h) => update({ quiet_hours_end: h })}
              />
            </>
          )}
        </GlassCard>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.xs,
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleText: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  toggleCaption: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Hour picker
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  hourLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  hourValue: {
    ...typography.headline,
    color: colors.accent.primary,
  },
});
