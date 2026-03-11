/**
 * EditLeadScreen
 *
 * Modal form for editing an existing lead. Pre-fills all fields from the
 * current lead data fetched via the leads store, then PATCHes changes
 * on save. Uses glass-themed inputs, stage selector chips, a score
 * slider, and comma-separated tags input to match the app design system.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassPill } from '../../components/glass/GlassPill';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { glassStyle } from '../../theme/glass';
import { haptics } from '../../utils/haptics';
import { useLeadsStore, type LeadStage } from '../../stores/useLeadsStore';
import type { RootStackParamList } from '../../navigation/types';

// ── Constants ────────────────────────────────────────────────────────

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: colors.accent.cyan },
  { key: 'contacted', label: 'Contacted', color: colors.accent.primary },
  { key: 'qualified', label: 'Qualified', color: colors.accent.amber },
  { key: 'proposal', label: 'Proposal', color: colors.accent.secondary },
  { key: 'won', label: 'Won', color: colors.accent.emerald },
  { key: 'lost', label: 'Lost', color: colors.accent.rose },
];

const SCORE_MIN = 0;
const SCORE_MAX = 100;

// ── Types ────────────────────────────────────────────────────────────

type EditLeadRoute = RouteProp<RootStackParamList, 'EditLead'>;

// ── Component ────────────────────────────────────────────────────────

export function EditLeadScreen() {
  const navigation = useNavigation();
  const route = useRoute<EditLeadRoute>();
  const { leadId } = (route.params as { leadId: string }) ?? {};
  const insets = useSafeAreaInsets();

  const {
    selectedLead,
    isLoading,
    fetchLead,
    updateLead,
  } = useLeadsStore();

  // ── Form state ─────────────────────────────────────────────────────

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState<LeadStage>('new');
  const [tagsText, setTagsText] = useState('');
  const [score, setScore] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Load lead data ─────────────────────────────────────────────────

  useEffect(() => {
    if (leadId) {
      fetchLead(leadId);
    }
  }, [leadId, fetchLead]);

  // Pre-fill form when lead data arrives
  useEffect(() => {
    if (selectedLead && selectedLead.id === leadId) {
      setName(selectedLead.name ?? '');
      setCompany(selectedLead.company ?? '');
      setEmail(selectedLead.email ?? '');
      setPhone(selectedLead.phone ?? '');
      setValue(
        selectedLead.value != null ? String(selectedLead.value) : '',
      );
      setNotes(selectedLead.notes ?? '');
      setStage(selectedLead.stage ?? 'new');
      setTagsText(
        selectedLead.tags?.length ? selectedLead.tags.join(', ') : '',
      );
      setScore(
        selectedLead.score != null ? String(selectedLead.score) : '',
      );
    }
  }, [selectedLead, leadId]);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleStageSelect = useCallback((selected: LeadStage) => {
    haptics.select();
    setStage(selected);
  }, []);

  const handleScoreChange = useCallback((text: string) => {
    // Allow only digits
    const digits = text.replace(/[^0-9]/g, '');
    if (digits === '') {
      setScore('');
      return;
    }
    const num = Math.min(SCORE_MAX, Math.max(SCORE_MIN, parseInt(digits, 10)));
    setScore(String(num));
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Lead name is required.');
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    haptics.tap();

    try {
      // Parse tags from comma-separated text
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Parse numeric fields
      const parsedValue = value.trim() ? parseFloat(value) : undefined;
      const parsedScore = score.trim() ? parseInt(score, 10) : undefined;

      const payload: Record<string, any> = {
        name: name.trim(),
        company: company.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        value: parsedValue,
        notes: notes.trim() || undefined,
        stage,
        tags: tags.length > 0 ? tags : undefined,
        score: parsedScore,
      };

      const success = await updateLead(leadId, payload);

      if (success) {
        haptics.success();
        navigation.goBack();
      } else {
        haptics.error();
        Alert.alert('Error', 'Failed to update lead. Please try again.');
      }
    } catch {
      haptics.error();
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    company,
    email,
    phone,
    value,
    notes,
    stage,
    tagsText,
    score,
    leadId,
    isSaving,
    updateLead,
    navigation,
  ]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>

          <Text style={styles.headerTitle}>Edit Lead</Text>

          <Pressable
            onPress={handleSave}
            hitSlop={12}
            style={styles.headerBtn}
            disabled={isSaving}
          >
            <Ionicons
              name="checkmark"
              size={24}
              color={
                name.trim()
                  ? colors.accent.primary
                  : colors.text.tertiary
              }
            />
          </Pressable>
        </View>
      </View>

      {/* ── Form ───────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Name ────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.field}>
            <Text style={styles.fieldLabel}>Name *</Text>
            <GlassInput
              placeholder="Contact name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              icon={
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
            />
          </Animated.View>

          {/* ── Company ─────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.field}>
            <Text style={styles.fieldLabel}>Company</Text>
            <GlassInput
              placeholder="Company name"
              value={company}
              onChangeText={setCompany}
              autoCapitalize="words"
              returnKeyType="next"
              icon={
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
            />
          </Animated.View>

          {/* ── Email ───────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <GlassInput
              placeholder="email@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              icon={
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
            />
          </Animated.View>

          {/* ── Phone ───────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <GlassInput
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
              icon={
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
            />
          </Animated.View>

          {/* ── Deal Value ──────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.field}>
            <Text style={styles.fieldLabel}>Deal Value ($)</Text>
            <GlassInput
              placeholder="0"
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
              returnKeyType="next"
              icon={
                <Ionicons
                  name="cash-outline"
                  size={18}
                  color={colors.accent.emerald}
                />
              }
            />
          </Animated.View>

          {/* ── Stage Selector ──────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.field}>
            <Text style={styles.fieldLabel}>Stage</Text>
            <View style={styles.stageGrid}>
              {STAGES.map((s) => {
                const isActive = s.key === stage;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => handleStageSelect(s.key)}
                    style={[
                      styles.stageChip,
                      isActive && {
                        borderColor: s.color,
                        borderWidth: 2,
                        backgroundColor: s.color + '18',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stageDot,
                        { backgroundColor: isActive ? s.color : colors.text.tertiary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stageChipLabel,
                        isActive && { color: s.color, fontWeight: '600' },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* ── Score ───────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(350).duration(300)} style={styles.field}>
            <Text style={styles.fieldLabel}>Score (0-100)</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreInputWrap}>
                <GlassInput
                  placeholder="50"
                  value={score}
                  onChangeText={handleScoreChange}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  icon={
                    <Ionicons
                      name="speedometer-outline"
                      size={18}
                      color={colors.accent.amber}
                    />
                  }
                />
              </View>

              {/* Visual score indicator */}
              <View style={styles.scoreBarWrap}>
                <View style={styles.scoreBarTrack}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, parseInt(score, 10) || 0))}%`,
                        backgroundColor: getScoreColor(parseInt(score, 10) || 0),
                      },
                    ]}
                  />
                </View>
                <View style={styles.scoreLabels}>
                  <Text style={styles.scoreLabelText}>Cold</Text>
                  <Text style={styles.scoreLabelText}>Warm</Text>
                  <Text style={styles.scoreLabelText}>Hot</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ── Tags ────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(400).duration(300)} style={styles.field}>
            <Text style={styles.fieldLabel}>Tags (comma-separated)</Text>
            <GlassInput
              placeholder="vip, enterprise, referral"
              value={tagsText}
              onChangeText={setTagsText}
              autoCapitalize="none"
              returnKeyType="next"
              icon={
                <Ionicons
                  name="pricetags-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
            />
            {/* Tag preview chips */}
            {tagsText.trim().length > 0 ? (
              <View style={styles.tagPreview}>
                {tagsText
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((tag, idx) => (
                    <View key={`${tag}-${idx}`} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                    </View>
                  ))}
              </View>
            ) : null}
          </Animated.View>

          {/* ── Notes ───────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(450).duration(300)} style={styles.field}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <GlassInput
              placeholder="Additional notes about this lead..."
              value={notes}
              onChangeText={setNotes}
              autoCapitalize="sentences"
              multiline
              icon={
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
            />
          </Animated.View>

          {/* ── Save Button ─────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(500).duration(300)}>
            <GlassButton
              title="Save Changes"
              variant="primary"
              size="lg"
              onPress={handleSave}
              disabled={!name.trim()}
              loading={isSaving}
              icon={
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={colors.white}
                />
              }
              style={styles.submitButton}
            />
          </Animated.View>

          {/* Bottom spacer for keyboard clearance */}
          <View style={{ height: insets.bottom + spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 70) return colors.accent.emerald;
  if (score >= 40) return colors.accent.amber;
  return colors.accent.rose;
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  flex: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    ...glassStyle('medium'),
    borderRadius: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },

  // ── Scroll ──────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ── Fields ──────────────────────────────────────────────────────
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // ── Stage selector ─────────────────────────────────────────────
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: colors.glass.subtle,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageChipLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '500',
  },

  // ── Score ──────────────────────────────────────────────────────
  scoreRow: {
    gap: spacing.sm,
  },
  scoreInputWrap: {
    // Input takes full width
  },
  scoreBarWrap: {
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  scoreBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glass.light,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreLabelText: {
    ...typography.micro,
    fontSize: 9,
    color: colors.text.tertiary,
  },

  // ── Tags ───────────────────────────────────────────────────────
  tagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.accent.primaryGlow,
    borderWidth: 1,
    borderColor: colors.accent.primary + '40',
  },
  tagChipText: {
    ...typography.micro,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.accent.primary,
    textTransform: 'none',
  },

  // ── Submit ─────────────────────────────────────────────────────
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
