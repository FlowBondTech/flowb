/**
 * OnboardingScreen
 *
 * Multi-step onboarding flow:
 *   Step 1 - Attendance timing (single-select pills)
 *   Step 2 - Interest circles (multi-select chip grid)
 *   Step 3 - Crew invite code (optional)
 *
 * Saves preferences via the API then navigates into the main app.
 */

import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassPill } from '../../components/glass/GlassPill';
import { CIRCLES } from '../../utils/constants';
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import type { RootStackParamList } from '../../navigation/types';

// ── Types ────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TOTAL_STEPS = 3;

const ATTENDANCE_OPTIONS = [
  { id: 'already-here', label: 'Already here' },
  { id: 'full-week', label: 'Full week' },
  { id: 'few-days', label: 'Few days' },
  { id: 'virtual', label: 'Virtual' },
] as const;

// ── Component ────────────────────────────────────────────────────────

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuthStore();

  const [step, setStep] = useState(0);
  const [attendance, setAttendance] = useState<string | null>(null);
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Circle toggle ─────────────────────────────────────────────────

  const toggleCircle = useCallback((id: string) => {
    setSelectedCircles((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  // ── Navigation ────────────────────────────────────────────────────

  const canAdvance =
    step === 0
      ? attendance !== null
      : step === 1
        ? selectedCircles.length > 0
        : true;

  const handleNext = useCallback(async () => {
    if (step < TOTAL_STEPS - 1) {
      haptics.tap();
      setStep((s) => s + 1);
      return;
    }

    // Final step — save and proceed
    setIsSubmitting(true);
    setError(null);
    try {
      await api.updatePreferences({
        attendance,
        circles: selectedCircles,
        inviteCode: inviteCode.trim() || undefined,
      });

      if (inviteCode.trim()) {
        try {
          await api.joinCrew(inviteCode.trim());
        } catch {
          // Non-blocking: crew join failure should not block onboarding
        }
      }

      haptics.success();

      // If we already have a token the navigator will switch to
      // the authenticated stack; otherwise this was shown before auth
      // completed and the Login flow handles the transition.
      if (token) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [step, attendance, selectedCircles, inviteCode, token, navigation]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      haptics.tap();
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleSkip = useCallback(() => {
    haptics.tap();
    if (step === TOTAL_STEPS - 1) {
      // Skip invite code — save what we have
      handleNext();
    }
  }, [step, handleNext]);

  // ── Step renderers ────────────────────────────────────────────────

  const renderStep0 = () => (
    <GlassCard variant="subtle" style={styles.stepCard}>
      <Text style={styles.stepTitle}>When are you at EthDenver?</Text>
      <View style={styles.optionsColumn}>
        {ATTENDANCE_OPTIONS.map((opt) => (
          <GlassPill
            key={opt.id}
            label={opt.label}
            active={attendance === opt.id}
            onPress={() => {
              setAttendance(opt.id);
              haptics.select();
            }}
            style={styles.attendancePill}
          />
        ))}
      </View>
    </GlassCard>
  );

  const renderStep1 = () => (
    <GlassCard variant="subtle" style={styles.stepCard}>
      <Text style={styles.stepTitle}>What interests you?</Text>
      <View style={styles.circleGrid}>
        {CIRCLES.map((circle) => (
          <GlassPill
            key={circle.id}
            label={`${circle.emoji} ${circle.label}`}
            active={selectedCircles.includes(circle.id)}
            onPress={() => toggleCircle(circle.id)}
            style={styles.circlePill}
          />
        ))}
      </View>
    </GlassCard>
  );

  const renderStep2 = () => (
    <GlassCard variant="subtle" style={styles.stepCard}>
      <Text style={styles.stepTitle}>Find your crew</Text>
      <Text style={styles.stepDescription}>
        Have an invite code? Enter it below to join a crew.
      </Text>
      <GlassInput
        placeholder="Invite code"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="none"
        returnKeyType="done"
        icon={
          <Ionicons
            name="people-outline"
            size={18}
            color={colors.text.tertiary}
          />
        }
        style={styles.inviteInput}
      />
      <Pressable onPress={handleSkip} style={styles.skipButton}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </GlassCard>
  );

  const stepRenderers = [renderStep0, renderStep1, renderStep2];

  // ── Render ────────────────────────────────────────────────────────

  return (
    <LinearGradient
      colors={[colors.background.base, colors.background.depth2, colors.background.base]}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Header ────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={styles.heroTitle}>Welcome</Text>
              <Text style={styles.heroSubtitle}>
                Let us personalize your experience
              </Text>
            </View>

            {/* ── Active step ───────────────────────────────── */}
            {stepRenderers[step]()}

            {/* ── Error ─────────────────────────────────────── */}
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.accent.rose}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* ── Bottom bar: back + dots + button ─────────────── */}
          <View style={styles.bottomBar}>
            {/* Step indicator dots */}
            <View style={styles.dots}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === step ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.buttonRow}>
              {step > 0 ? (
                <GlassButton
                  title="Back"
                  onPress={handleBack}
                  variant="ghost"
                  size="lg"
                  style={styles.backButton}
                />
              ) : null}
              <GlassButton
                title={step === TOTAL_STEPS - 1 ? 'Get Started' : 'Next'}
                onPress={handleNext}
                variant="primary"
                size="lg"
                disabled={!canAdvance}
                loading={isSubmitting}
                style={styles.nextButton}
              />
            </View>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.xl,
    paddingBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
  },
  heroTitle: {
    ...typography.hero,
    color: colors.text.primary,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // ── Step cards ──────────────────────────────────────────────────
  stepCard: {
    padding: spacing.lg,
  },
  stepTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  stepDescription: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  optionsColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  attendancePill: {
    marginBottom: spacing.xs,
  },
  circleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  circlePill: {
    marginBottom: spacing.xs,
  },
  inviteInput: {
    marginBottom: spacing.md,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },

  // ── Error ─────────────────────────────────────────────────────
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.accent.rose,
    marginLeft: spacing.xs,
    flex: 1,
  },

  // ── Bottom bar ────────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.accent.primary,
  },
  dotInactive: {
    backgroundColor: colors.border.default,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backButton: {
    flex: 0,
    paddingHorizontal: spacing.md,
  },
  nextButton: {
    flex: 1,
  },
});
