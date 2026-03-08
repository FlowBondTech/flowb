/**
 * CreateLeadScreen
 *
 * Modal form for creating a new lead. Features two modes:
 *   - Quick Add: Single text input with natural language parsing
 *   - Full Form: Complete glass-styled form with all fields
 *
 * Uses GlassInput fields for name, company, email, phone, value, and
 * notes, with source selector chips and staggered entrance animations.
 * Submits via POST to the leads API endpoint.
 */

import React, { useState, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassPill } from '../../components/glass/GlassPill';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { glassStyle } from '../../theme/glass';
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';

// ── Types ────────────────────────────────────────────────────────────

type LeadSource = 'event' | 'referral' | 'cold' | 'website' | 'social' | 'other';

interface SourceOption {
  value: LeadSource;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// ── Constants ────────────────────────────────────────────────────────

const SOURCE_OPTIONS: SourceOption[] = [
  { value: 'event', label: 'Event', icon: 'calendar-outline', color: colors.accent.cyan },
  { value: 'referral', label: 'Referral', icon: 'people-outline', color: colors.accent.emerald },
  { value: 'cold', label: 'Cold', icon: 'snow-outline', color: colors.accent.secondary },
  { value: 'website', label: 'Website', icon: 'globe-outline', color: colors.accent.primary },
  { value: 'social', label: 'Social', icon: 'logo-twitter', color: colors.accent.amber },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: colors.text.secondary },
];

// ── Quick-Add Parser ─────────────────────────────────────────────────

function parseQuickLead(text: string): {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  notes?: string;
} {
  const result: {
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    notes?: string;
  } = { name: '' };
  let remaining = text.trim();

  // Extract email
  const emailMatch = remaining.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    result.email = emailMatch[0];
    remaining = remaining.replace(emailMatch[0], '').trim();
  }

  // Extract phone
  const phoneMatch = remaining.match(/[\+]?[\d\s\-\(\)]{7,}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0].trim();
    remaining = remaining.replace(phoneMatch[0], '').trim();
  }

  // Extract "from Company" or "at Company"
  const companyMatch = remaining.match(
    /(?:from|at|@)\s+(.+?)(?:\s+(?:phone|email|notes?)|$)/i,
  );
  if (companyMatch) {
    result.company = companyMatch[1].trim();
    remaining = remaining.replace(companyMatch[0], '').trim();
  }

  // Rest is name (first part) + notes
  const words = remaining.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    // Take first 1-3 words as name
    const nameWords = words.slice(0, Math.min(3, words.length));
    result.name = nameWords.join(' ');
    if (words.length > 3) {
      result.notes = words.slice(3).join(' ');
    }
  }

  return result;
}

// ── Component ────────────────────────────────────────────────────────

export function CreateLeadScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Mode toggle
  const [isQuickMode, setIsQuickMode] = useState(true);

  // Quick-add state
  const [quickText, setQuickText] = useState('');

  // Full-form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState<LeadSource>('event');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived state ────────────────────────────────────────────────

  const parsedQuick = quickText.trim() ? parseQuickLead(quickText) : null;

  const canSubmit = isQuickMode
    ? !!(parsedQuick && parsedQuick.name.trim())
    : !!name.trim();

  // ── Handlers ─────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleToggleMode = useCallback(() => {
    haptics.select();
    setIsQuickMode((prev) => {
      if (prev && parsedQuick) {
        // Moving from quick to full: populate fields from parsed data
        if (parsedQuick.name) setName(parsedQuick.name);
        if (parsedQuick.company) setCompany(parsedQuick.company);
        if (parsedQuick.email) setEmail(parsedQuick.email);
        if (parsedQuick.phone) setPhone(parsedQuick.phone);
        if (parsedQuick.notes) setNotes(parsedQuick.notes);
      }
      return !prev;
    });
  }, [parsedQuick]);

  const handleSourceSelect = useCallback((src: LeadSource) => {
    haptics.select();
    setSource(src);
  }, []);

  const resetForm = useCallback(() => {
    setQuickText('');
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setValue('');
    setNotes('');
    setSource('event');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    // Build payload
    const payload: {
      name: string;
      email?: string;
      phone?: string;
      company?: string;
      source?: string;
      value?: number;
      notes?: string;
    } = isQuickMode
      ? {
          name: parsedQuick!.name,
          ...(parsedQuick!.company && { company: parsedQuick!.company }),
          ...(parsedQuick!.email && { email: parsedQuick!.email }),
          ...(parsedQuick!.phone && { phone: parsedQuick!.phone }),
          ...(parsedQuick!.notes && { notes: parsedQuick!.notes }),
          source,
        }
      : {
          name: name.trim(),
          ...(company.trim() && { company: company.trim() }),
          ...(email.trim() && { email: email.trim() }),
          ...(phone.trim() && { phone: phone.trim() }),
          ...(value.trim() && { value: parseFloat(value.replace(/[^0-9.]/g, '')) || undefined }),
          ...(notes.trim() && { notes: notes.trim() }),
          source,
        };

    try {
      const data = await api.createLead(payload);
      haptics.success();

      Alert.alert('Lead Created', `${payload.name} has been added to your pipeline.`, [
        {
          text: 'View Lead',
          onPress: () => {
            navigation.goBack();
            if (data?.id) {
              // @ts-ignore -- navigation typing handled at integration
              navigation.navigate('LeadDetail', { leadId: data.id });
            }
          },
        },
        {
          text: 'Add Another',
          onPress: () => {
            resetForm();
          },
        },
        {
          text: 'Done',
          onPress: () => navigation.goBack(),
          style: 'cancel',
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create lead. Please try again.');
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    isSubmitting,
    isQuickMode,
    parsedQuick,
    name,
    company,
    email,
    phone,
    value,
    notes,
    source,
    navigation,
    resetForm,
  ]);

  // ── Quick-add preview ────────────────────────────────────────────

  const renderQuickPreview = () => {
    if (!parsedQuick || !parsedQuick.name) return null;

    return (
      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <GlassCard variant="subtle" noAnimation>
          <View style={styles.previewContent}>
            <View style={styles.previewHeader}>
              <Ionicons name="sparkles" size={16} color={colors.accent.amber} />
              <Text style={styles.previewTitle}>Parsed Preview</Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Name</Text>
              <Text style={styles.previewValue}>{parsedQuick.name}</Text>
            </View>

            {parsedQuick.company ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Company</Text>
                <Text style={styles.previewValue}>{parsedQuick.company}</Text>
              </View>
            ) : null}

            {parsedQuick.email ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Email</Text>
                <Text style={styles.previewValue}>{parsedQuick.email}</Text>
              </View>
            ) : null}

            {parsedQuick.phone ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Phone</Text>
                <Text style={styles.previewValue}>{parsedQuick.phone}</Text>
              </View>
            ) : null}

            {parsedQuick.notes ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Notes</Text>
                <Text style={styles.previewValue}>{parsedQuick.notes}</Text>
              </View>
            ) : null}
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="New Lead"
        rightAction={
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Mode toggle ──────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.duration(350).delay(50)}
            style={styles.modeToggleWrap}
          >
            <View style={styles.modeToggle}>
              <Pressable
                onPress={() => {
                  if (!isQuickMode) handleToggleMode();
                }}
                style={[
                  styles.modeTab,
                  isQuickMode && styles.modeTabActive,
                ]}
              >
                <Ionicons
                  name="flash-outline"
                  size={16}
                  color={isQuickMode ? colors.accent.primary : colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.modeTabLabel,
                    isQuickMode && styles.modeTabLabelActive,
                  ]}
                >
                  Quick Add
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (isQuickMode) handleToggleMode();
                }}
                style={[
                  styles.modeTab,
                  !isQuickMode && styles.modeTabActive,
                ]}
              >
                <Ionicons
                  name="list-outline"
                  size={16}
                  color={!isQuickMode ? colors.accent.primary : colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.modeTabLabel,
                    !isQuickMode && styles.modeTabLabelActive,
                  ]}
                >
                  Full Form
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {isQuickMode ? (
            /* ─── Quick Add Mode ─────────────────────────────── */
            <>
              <Animated.View
                entering={FadeInDown.duration(350).delay(100)}
                style={styles.field}
              >
                <Text style={styles.fieldLabel}>Type naturally</Text>
                <GlassInput
                  placeholder="Sarah from Acme 555-1234 sarah@acme.co"
                  value={quickText}
                  onChangeText={setQuickText}
                  autoCapitalize="words"
                  returnKeyType="done"
                  icon={
                    <Ionicons
                      name="flash"
                      size={18}
                      color={colors.accent.amber}
                    />
                  }
                />
                <Text style={styles.fieldHint}>
                  Include name, company, phone, or email -- we will parse it
                </Text>
              </Animated.View>

              {/* Parsed preview */}
              {parsedQuick && parsedQuick.name ? (
                <View style={styles.field}>{renderQuickPreview()}</View>
              ) : null}

              {/* Source selector (shared between modes) */}
              <Animated.View
                entering={FadeInDown.duration(350).delay(200)}
                style={styles.field}
              >
                <Text style={styles.fieldLabel}>Source</Text>
                <View style={styles.sourceRow}>
                  {SOURCE_OPTIONS.map((opt) => {
                    const isActive = opt.value === source;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => handleSourceSelect(opt.value)}
                        style={[
                          styles.sourceChip,
                          isActive && {
                            borderColor: opt.color,
                            borderWidth: 2,
                            backgroundColor: opt.color + '18',
                          },
                        ]}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={16}
                          color={isActive ? opt.color : colors.text.tertiary}
                        />
                        <Text
                          style={[
                            styles.sourceChipLabel,
                            isActive && { color: opt.color },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            </>
          ) : (
            /* ─── Full Form Mode ─────────────────────────────── */
            <>
              {/* Name (required) */}
              <Animated.View
                entering={FadeInDown.duration(350).delay(100)}
                style={styles.field}
              >
                <Text style={styles.fieldLabel}>
                  Name <Text style={styles.required}>*</Text>
                </Text>
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

              {/* Company */}
              <Animated.View
                entering={FadeInDown.duration(350).delay(150)}
                style={styles.field}
              >
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

              {/* Email */}
              <Animated.View
                entering={FadeInDown.duration(350).delay(200)}
                style={styles.field}
              >
                <Text style={styles.fieldLabel}>Email</Text>
                <GlassInput
                  placeholder="contact@company.com"
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

              {/* Phone */}
              <Animated.View
                entering={FadeInDown.duration(350).delay(250)}
                style={styles.field}
              >
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

              {/* Deal Value */}
              <Animated.View
                entering={FadeInDown.duration(350).delay(300)}
                style={styles.field}
              >
                <Text style={styles.fieldLabel}>Deal Value</Text>
                <GlassInput
                  placeholder="0"
                  value={value}
                  onChangeText={setValue}
                  keyboardType="numeric"
                  returnKeyType="next"
                  icon={
                    <Text style={styles.dollarIcon}>$</Text>
                  }
                />
              </Animated.View>

              {/* Source */}
              <Animated.View
                entering={FadeInDown.duration(350).delay(350)}
                style={styles.field}
              >
                <Text style={styles.fieldLabel}>Source</Text>
                <View style={styles.sourceRow}>
                  {SOURCE_OPTIONS.map((opt) => {
                    const isActive = opt.value === source;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => handleSourceSelect(opt.value)}
                        style={[
                          styles.sourceChip,
                          isActive && {
                            borderColor: opt.color,
                            borderWidth: 2,
                            backgroundColor: opt.color + '18',
                          },
                        ]}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={16}
                          color={isActive ? opt.color : colors.text.tertiary}
                        />
                        <Text
                          style={[
                            styles.sourceChipLabel,
                            isActive && { color: opt.color },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Notes */}
              <Animated.View
                entering={FadeInDown.duration(350).delay(400)}
                style={styles.field}
              >
                <Text style={styles.fieldLabel}>Notes</Text>
                <GlassInput
                  placeholder="Additional context, next steps..."
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
            </>
          )}

          {/* ── Submit ─────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.duration(350).delay(isQuickMode ? 300 : 450)}
          >
            <GlassButton
              title={isQuickMode ? 'Add Lead' : 'Create Lead'}
              variant="primary"
              size="lg"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={isSubmitting}
              icon={
                <Ionicons
                  name="person-add-outline"
                  size={20}
                  color={colors.white}
                />
              }
              style={styles.submitButton}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },

  // ── Mode toggle ─────────────────────────────────────────────────
  modeToggleWrap: {
    marginBottom: spacing.lg,
  },
  modeToggle: {
    flexDirection: 'row',
    ...glassStyle('subtle'),
    borderRadius: 12,
    padding: spacing.xs,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: colors.glass.medium,
    borderWidth: 1,
    borderColor: colors.border.bright,
  },
  modeTabLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  modeTabLabelActive: {
    color: colors.accent.primary,
    fontWeight: '600',
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
  fieldHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
    fontStyle: 'italic',
  },
  required: {
    color: colors.accent.rose,
    fontWeight: '600',
  },
  dollarIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent.emerald,
  },

  // ── Source selector ─────────────────────────────────────────────
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.glass.subtle,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sourceChipLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '500',
  },

  // ── Quick-add preview ───────────────────────────────────────────
  previewContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  previewTitle: {
    ...typography.micro,
    color: colors.accent.amber,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    minWidth: 70,
  },
  previewValue: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },

  // ── Submit ──────────────────────────────────────────────────────
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
