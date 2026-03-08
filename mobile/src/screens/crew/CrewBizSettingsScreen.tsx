/**
 * CrewBizSettingsScreen
 *
 * Admin settings for controlling which business features are
 * shared within a crew. Toggle sharing of locations, leads,
 * meetings, pipeline view, referrals, and notification preferences.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassPill } from '../../components/glass/GlassPill';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';
import { API_URL } from '../../utils/constants';
import { useAuthStore } from '../../stores/useAuthStore';
import type { RootStackParamList } from '../../navigation/types';

// ── Types ──────────────────────────────────────────────────────────────

interface BizSettings {
  biz_enabled: boolean;
  share_locations: boolean;
  share_leads: boolean;
  share_meetings: boolean;
  share_referrals: boolean;
  share_earnings: boolean;
  share_pipeline: boolean;
  notify_lead_updates: boolean;
  notify_meeting_updates: boolean;
  notify_checkins: boolean;
  notify_wins: boolean;
}

interface MemberSettings {
  share_my_location: boolean;
  share_my_leads: boolean;
  share_my_meetings: boolean;
  mute_notifications: boolean;
}

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: BizSettings = {
  biz_enabled: false,
  share_locations: true,
  share_leads: false,
  share_meetings: true,
  share_referrals: false,
  share_earnings: false,
  share_pipeline: false,
  notify_lead_updates: true,
  notify_meeting_updates: true,
  notify_checkins: true,
  notify_wins: true,
};

const DEFAULT_MEMBER: MemberSettings = {
  share_my_location: true,
  share_my_leads: true,
  share_my_meetings: true,
  mute_notifications: false,
};

// ── Setting Row ────────────────────────────────────────────────────────

function SettingRow({
  icon,
  label,
  description,
  value,
  onToggle,
  disabled,
  index,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
      <View style={[styles.settingRow, disabled && styles.settingDisabled]}>
        <View style={styles.settingLeft}>
          <Ionicons
            name={icon}
            size={20}
            color={disabled ? colors.text.tertiary : colors.accent.primary}
          />
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, disabled && { color: colors.text.tertiary }]}>
              {label}
            </Text>
            <Text style={styles.settingDesc}>{description}</Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: colors.glass.medium, true: colors.accent.primary + '60' }}
          thumbColor={value ? colors.accent.primary : colors.text.tertiary}
        />
      </View>
    </Animated.View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────

export function CrewBizSettingsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CrewBizSettings'>>();
  const { crewId } = route.params;
  const token = useAuthStore((s) => s.token);
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<BizSettings>(DEFAULT_SETTINGS);
  const [memberSettings, setMemberSettings] = useState<MemberSettings>(DEFAULT_MEMBER);
  const [role, setRole] = useState<string>('member');

  const isAdmin = role === 'admin' || role === 'creator';

  // ── Fetch ────────────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/flow/crews/${crewId}/biz-settings`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      if (data.memberSettings) setMemberSettings({ ...DEFAULT_MEMBER, ...data.memberSettings });
      if (data.role) setRole(data.role);
    } catch {
      // silent — defaults are fine on first load
    }
  }, [crewId, token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Mutations ────────────────────────────────────────────────────────

  const updateCrewSetting = async (key: keyof BizSettings, value: boolean) => {
    haptics.tap();
    setSettings((s) => ({ ...s, [key]: value }));
    try {
      await fetch(`${API_URL}/api/v1/flow/crews/${crewId}/biz-settings`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      setSettings((s) => ({ ...s, [key]: !value }));
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const updateMySettings = async (key: keyof MemberSettings, value: boolean) => {
    haptics.tap();
    setMemberSettings((s) => ({ ...s, [key]: value }));
    try {
      await fetch(`${API_URL}/api/v1/flow/crews/${crewId}/my-settings`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      setMemberSettings((s) => ({ ...s, [key]: !value }));
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Biz Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Master toggle */}
        <GlassCard variant="medium" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Business Mode</Text>
            {!isAdmin && <GlassPill label="Admin only" color={colors.accent.rose} />}
          </View>
          <SettingRow
            icon="briefcase"
            label="Enable Biz Mode"
            description="Turn on business features for this crew"
            value={settings.biz_enabled}
            onToggle={(v) => updateCrewSetting('biz_enabled', v)}
            disabled={!isAdmin}
            index={0}
          />
        </GlassCard>

        {/* Sharing settings (admin only) */}
        {isAdmin && settings.biz_enabled && (
          <GlassCard variant="subtle" style={styles.section}>
            <Text style={styles.sectionTitle}>Team Sharing</Text>
            <Text style={styles.sectionSubtitle}>Control what's visible to crew members</Text>
            <SettingRow icon="location" label="Locations" description="Share check-ins and locations" value={settings.share_locations} onToggle={(v) => updateCrewSetting('share_locations', v)} index={1} />
            <SettingRow icon="people" label="Leads" description="Share lead contacts with team" value={settings.share_leads} onToggle={(v) => updateCrewSetting('share_leads', v)} index={2} />
            <SettingRow icon="calendar" label="Meetings" description="Share meeting schedules" value={settings.share_meetings} onToggle={(v) => updateCrewSetting('share_meetings', v)} index={3} />
            <SettingRow icon="grid" label="Pipeline View" description="Show team-wide sales pipeline" value={settings.share_pipeline} onToggle={(v) => updateCrewSetting('share_pipeline', v)} index={4} />
            <SettingRow icon="link" label="Referrals" description="Share referral activity" value={settings.share_referrals} onToggle={(v) => updateCrewSetting('share_referrals', v)} index={5} />
            <SettingRow icon="cash" label="Earnings" description="Show referral earnings to team" value={settings.share_earnings} onToggle={(v) => updateCrewSetting('share_earnings', v)} index={6} />
          </GlassCard>
        )}

        {/* Notification settings (admin only) */}
        {isAdmin && settings.biz_enabled && (
          <GlassCard variant="subtle" style={styles.section}>
            <Text style={styles.sectionTitle}>Team Notifications</Text>
            <Text style={styles.sectionSubtitle}>What triggers crew-wide notifications</Text>
            <SettingRow icon="pulse" label="Lead Updates" description="New leads and stage changes" value={settings.notify_lead_updates} onToggle={(v) => updateCrewSetting('notify_lead_updates', v)} index={7} />
            <SettingRow icon="calendar-outline" label="Meeting Updates" description="Scheduled and completed meetings" value={settings.notify_meeting_updates} onToggle={(v) => updateCrewSetting('notify_meeting_updates', v)} index={8} />
            <SettingRow icon="location-outline" label="Check-ins" description="Member check-in notifications" value={settings.notify_checkins} onToggle={(v) => updateCrewSetting('notify_checkins', v)} index={9} />
            <SettingRow icon="trophy" label="Wins" description="Celebrate when deals are won" value={settings.notify_wins} onToggle={(v) => updateCrewSetting('notify_wins', v)} index={10} />
          </GlassCard>
        )}

        {/* Personal settings (all members) */}
        {settings.biz_enabled && (
          <GlassCard variant="subtle" style={styles.section}>
            <Text style={styles.sectionTitle}>My Preferences</Text>
            <Text style={styles.sectionSubtitle}>Control what you share with this crew</Text>
            <SettingRow icon="navigate" label="My Location" description="Share your check-ins with crew" value={memberSettings.share_my_location} onToggle={(v) => updateMySettings('share_my_location', v)} index={11} />
            <SettingRow icon="person" label="My Leads" description="Allow crew to see your leads" value={memberSettings.share_my_leads} onToggle={(v) => updateMySettings('share_my_leads', v)} index={12} />
            <SettingRow icon="calendar" label="My Meetings" description="Share your meeting schedule" value={memberSettings.share_my_meetings} onToggle={(v) => updateMySettings('share_my_meetings', v)} index={13} />
            <SettingRow icon="notifications-off" label="Mute Notifications" description="Silence biz notifications from this crew" value={memberSettings.mute_notifications} onToggle={(v) => updateMySettings('mute_notifications', v)} index={14} />
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  settingDesc: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 1,
  },
});
