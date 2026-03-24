import React, { useCallback } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "../stores/useAuthStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import {
  colors,
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryId,
} from "../utils/constants";
import type { NotificationPriority } from "../api/types";

const PRIORITY_OPTIONS: { value: NotificationPriority; label: string; description: string }[] = [
  {
    value: "p0",
    label: "Critical Only",
    description: "Only P0 critical alerts",
  },
  {
    value: "p1",
    label: "Important+",
    description: "P0 critical + P1 important",
  },
  {
    value: "p2",
    label: "All Notifications",
    description: "Show everything (P0 + P1 + P2)",
  },
];

export function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const {
    categories,
    minPriority,
    pushEnabled,
    toggleCategory,
    setMinPriority,
    setPushEnabled,
  } = useSettingsStore();

  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/onboarding");
        },
      },
    ]);
  }, [logout]);

  const openSystemSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={colors.accent} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>
                {user?.displayName || user?.username || "User"}
              </Text>
              <Text style={styles.accountDetail}>
                {user?.email || user?.id || ""}
              </Text>
            </View>
          </View>

          <Pressable style={styles.signOutRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {/* Notification Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATION CATEGORIES</Text>
        <View style={styles.card}>
          {NOTIFICATION_CATEGORIES.map((cat, idx) => (
            <View
              key={cat.id}
              style={[
                styles.settingRow,
                idx < NOTIFICATION_CATEGORIES.length - 1 && styles.settingRowBorder,
              ]}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name={cat.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={
                    categories[cat.id as NotificationCategoryId]
                      ? colors.accent
                      : colors.textTertiary
                  }
                />
                <Text style={styles.settingLabel}>{cat.label}</Text>
              </View>
              <Switch
                value={categories[cat.id as NotificationCategoryId]}
                onValueChange={() => toggleCategory(cat.id)}
                trackColor={{ false: "#333", true: colors.accentDim }}
                thumbColor={
                  categories[cat.id as NotificationCategoryId]
                    ? colors.accent
                    : "#666"
                }
              />
            </View>
          ))}
        </View>
      </View>

      {/* Priority Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PRIORITY FILTER</Text>
        <View style={styles.card}>
          {PRIORITY_OPTIONS.map((opt, idx) => {
            const isSelected = minPriority === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.priorityRow,
                  idx < PRIORITY_OPTIONS.length - 1 && styles.settingRowBorder,
                ]}
                onPress={() => setMinPriority(opt.value)}
              >
                <View style={styles.priorityContent}>
                  <Text
                    style={[
                      styles.priorityLabel,
                      isSelected && styles.priorityLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.priorityDescription}>
                    {opt.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Push Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PUSH NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={[styles.settingRow, styles.settingRowBorder]}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={pushEnabled ? colors.accent : colors.textTertiary}
              />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: "#333", true: colors.accentDim }}
              thumbColor={pushEnabled ? colors.accent : "#666"}
            />
          </View>

          <Pressable style={styles.settingRow} onPress={openSystemSettings}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="settings-outline"
                size={18}
                color={colors.textTertiary}
              />
              <Text style={styles.settingLabel}>System Settings</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textTertiary}
            />
          </Pressable>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },

  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: "hidden",
  },

  // Account
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  accountDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.danger,
  },

  // Setting rows
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    color: colors.text,
  },
  settingValue: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Priority
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  priorityContent: {
    flex: 1,
    marginRight: 12,
  },
  priorityLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  priorityLabelSelected: {
    color: colors.accent,
  },
  priorityDescription: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },

  footer: {
    height: 40,
  },
});
