/**
 * SettingsEditor
 *
 * Read-only admin settings overview organized into sections: Server info,
 * Feature Flags, and Limits. Displays current configuration values with
 * clean section headers and info icons.
 */

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// ── Types ─────────────────────────────────────────────────────────────

interface SettingRow {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface FlagRow {
  label: string;
  value: boolean;
}

// ── Static config ─────────────────────────────────────────────────────

const SERVER_SETTINGS: SettingRow[] = [
  { label: 'API URL', value: 'https://flowb.me/api', icon: 'globe-outline' },
  { label: 'JWT Secret', value: 'Configured', icon: 'key-outline' },
];

const INITIAL_FLAGS: FlagRow[] = [
  { label: 'Show Virtual Events', value: true },
  { label: 'Enable Daily Digest', value: false },
  { label: 'Enable Social Proof', value: true },
];

const LIMIT_SETTINGS: SettingRow[] = [
  { label: 'Daily Notification Limit', value: '50 per user', icon: 'notifications-outline' },
  { label: 'Quiet Hours', value: '11 PM - 7 AM', icon: 'moon-outline' },
];

// ── Component ────────────────────────────────────────────────────────

export function SettingsEditor() {
  const navigation = useNavigation();
  const [flags, setFlags] = useState(INITIAL_FLAGS);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Settings"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Server section ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>SERVER</Text>
        <GlassCard variant="subtle">
          <View style={styles.sectionContent}>
            {SERVER_SETTINGS.map((row, idx) => (
              <View
                key={row.label}
                style={[
                  styles.settingRow,
                  idx < SERVER_SETTINGS.length - 1 && styles.settingBorder,
                ]}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name={row.icon} size={18} color={colors.text.tertiary} />
                  <Text style={styles.settingLabel}>{row.label}</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue} numberOfLines={1}>
                    {row.value}
                  </Text>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.text.tertiary}
                  />
                </View>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* ── Feature Flags section ──────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
          FEATURE FLAGS
        </Text>
        <GlassCard variant="subtle">
          <View style={styles.sectionContent}>
            {flags.map((flag, idx) => (
              <View
                key={flag.label}
                style={[
                  styles.settingRow,
                  idx < flags.length - 1 && styles.settingBorder,
                ]}
              >
                <Text style={[styles.settingLabel, { flex: 1 }]}>
                  {flag.label}
                </Text>
                <Switch
                  value={flag.value}
                  onValueChange={() => {
                    // Read-only placeholder — toggles local state only
                    setFlags((prev) =>
                      prev.map((f, i) =>
                        i === idx ? { ...f, value: !f.value } : f,
                      ),
                    );
                  }}
                  trackColor={{
                    false: colors.glass.medium,
                    true: colors.accent.primary,
                  }}
                  thumbColor={colors.white}
                />
              </View>
            ))}
          </View>
        </GlassCard>

        {/* ── Limits section ─────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
          LIMITS
        </Text>
        <GlassCard variant="subtle">
          <View style={styles.sectionContent}>
            {LIMIT_SETTINGS.map((row, idx) => (
              <View
                key={row.label}
                style={[
                  styles.settingRow,
                  idx < LIMIT_SETTINGS.length - 1 && styles.settingBorder,
                ]}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name={row.icon} size={18} color={colors.text.tertiary} />
                  <Text style={styles.settingLabel}>{row.label}</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>{row.value}</Text>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.text.tertiary}
                  />
                </View>
              </View>
            ))}
          </View>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionContent: {
    padding: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + spacing.xs,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  settingValue: {
    ...typography.caption,
    color: colors.text.secondary,
    maxWidth: 180,
  },
});
