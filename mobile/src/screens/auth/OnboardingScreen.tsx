/**
 * OnboardingScreen
 *
 * Multi-step onboarding flow:
 *   Step 1 - Attendance timing (single-select pills)
 *   Step 2 - Interest circles (multi-select chip grid)
 *   Step 3 - Main locations (up to 10 cities)
 *   Step 4 - Flow purpose (Fun / Biz / Both)
 *   Step 5 - Crew invite code (optional)
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
  TextInput,
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

interface LocationEntry {
  city: string;
  country: string;
}

const TOTAL_STEPS = 5;

const ATTENDANCE_OPTIONS = [
  { id: 'already-here', label: 'Already here' },
  { id: 'full-week', label: 'Full week' },
  { id: 'few-days', label: 'Few days' },
  { id: 'virtual', label: 'Virtual' },
] as const;

const FLOW_PURPOSE_OPTIONS = [
  {
    id: 'fun',
    label: 'Flow for Fun',
    emoji: '🎉',
    description: 'Events, parties, social connections',
  },
  {
    id: 'biz',
    label: 'Flow into Biz',
    emoji: '💼',
    description: 'Networking, enterprise, clients',
  },
  {
    id: 'both',
    label: 'Both',
    emoji: '✨',
    description: 'The best of both worlds',
  },
] as const;

// Popular cities for quick selection
const POPULAR_CITIES: LocationEntry[] = [
  { city: 'Denver', country: 'USA' },
  { city: 'Austin', country: 'USA' },
  { city: 'Miami', country: 'USA' },
  { city: 'New York', country: 'USA' },
  { city: 'San Francisco', country: 'USA' },
  { city: 'Los Angeles', country: 'USA' },
  { city: 'Tulum', country: 'Mexico' },
  { city: 'Mexico City', country: 'Mexico' },
  { city: 'Lisbon', country: 'Portugal' },
  { city: 'Berlin', country: 'Germany' },
  { city: 'London', country: 'UK' },
  { city: 'Singapore', country: 'Singapore' },
  { city: 'Dubai', country: 'UAE' },
  { city: 'Bangkok', country: 'Thailand' },
  { city: 'Buenos Aires', country: 'Argentina' },
];

// ── Component ────────────────────────────────────────────────────────

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuthStore();

  const [step, setStep] = useState(0);
  const [attendance, setAttendance] = useState<string | null>(null);
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [customCity, setCustomCity] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [flowPurpose, setFlowPurpose] = useState<'fun' | 'biz' | 'both' | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Circle toggle ─────────────────────────────────────────────────

  const toggleCircle = useCallback((id: string) => {
    setSelectedCircles((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  // ── Location management ────────────────────────────────────────────

  const addLocation = useCallback((loc: LocationEntry) => {
    if (locations.length >= 10) return;
    const exists = locations.some(
      (l) => l.city === loc.city && l.country === loc.country
    );
    if (!exists) {
      setLocations((prev) => [...prev, loc]);
      haptics.select();
    }
  }, [locations]);

  const removeLocation = useCallback((index: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== index));
    haptics.tap();
  }, []);

  const addCustomLocation = useCallback(() => {
    if (customCity.trim() && customCountry.trim()) {
      addLocation({ city: customCity.trim(), country: customCountry.trim() });
      setCustomCity('');
      setCustomCountry('');
    }
  }, [customCity, customCountry, addLocation]);

  // ── Navigation ────────────────────────────────────────────────────

  const canAdvance =
    step === 0
      ? attendance !== null
      : step === 1
        ? selectedCircles.length > 0
        : step === 2
          ? locations.length > 0
          : step === 3
            ? flowPurpose !== null
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
      // Save preferences
      await api.updatePreferences({
        attendance,
        circles: selectedCircles,
        inviteCode: inviteCode.trim() || undefined,
      });

      // Save onboarding data (locations + flow purpose)
      await api.updateOnboarding({
        flowPurpose: flowPurpose!,
        locations: locations.map((l, i) => ({
          city: l.city,
          country: l.country,
          isPrimary: i === 0,
        })),
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
  }, [step, attendance, selectedCircles, locations, flowPurpose, inviteCode, token, navigation]);

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
      <Text style={styles.stepTitle}>Your main locations</Text>
      <Text style={styles.stepDescription}>
        Where do you spend most of your time? Add up to 10 cities.
      </Text>

      {/* Selected locations */}
      {locations.length > 0 && (
        <View style={styles.selectedLocations}>
          {locations.map((loc, index) => (
            <View key={`${loc.city}-${loc.country}`} style={styles.locationTag}>
              <Text style={styles.locationTagText}>
                {index === 0 && '📍 '}
                {loc.city}, {loc.country}
              </Text>
              <Pressable onPress={() => removeLocation(index)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Popular cities */}
      {locations.length < 10 && (
        <>
          <Text style={styles.sectionLabel}>Popular cities</Text>
          <View style={styles.popularCities}>
            {POPULAR_CITIES.filter(
              (c) => !locations.some((l) => l.city === c.city && l.country === c.country)
            )
              .slice(0, 8)
              .map((city) => (
                <GlassPill
                  key={`${city.city}-${city.country}`}
                  label={`${city.city}, ${city.country}`}
                  onPress={() => addLocation(city)}
                  style={styles.cityPill}
                />
              ))}
          </View>

          {/* Custom location input */}
          <Text style={styles.sectionLabel}>Add custom location</Text>
          <View style={styles.customLocationRow}>
            <TextInput
              style={[styles.customInput, styles.cityInput]}
              placeholder="City"
              placeholderTextColor={colors.text.tertiary}
              value={customCity}
              onChangeText={setCustomCity}
            />
            <TextInput
              style={[styles.customInput, styles.countryInput]}
              placeholder="Country"
              placeholderTextColor={colors.text.tertiary}
              value={customCountry}
              onChangeText={setCustomCountry}
            />
            <Pressable
              style={[
                styles.addButton,
                (!customCity.trim() || !customCountry.trim()) && styles.addButtonDisabled,
              ]}
              onPress={addCustomLocation}
              disabled={!customCity.trim() || !customCountry.trim()}
            >
              <Ionicons name="add" size={20} color={colors.text.primary} />
            </Pressable>
          </View>
        </>
      )}

      <Text style={styles.locationCount}>
        {locations.length}/10 locations added
        {locations.length === 0 && ' (add at least 1)'}
      </Text>
    </GlassCard>
  );

  const renderStep3 = () => (
    <GlassCard variant="subtle" style={styles.stepCard}>
      <Text style={styles.stepTitle}>How will you Flow?</Text>
      <Text style={styles.stepDescription}>
        This helps us personalize your experience.
      </Text>
      <View style={styles.purposeOptions}>
        {FLOW_PURPOSE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            style={[
              styles.purposeCard,
              flowPurpose === opt.id && styles.purposeCardActive,
            ]}
            onPress={() => {
              setFlowPurpose(opt.id);
              haptics.select();
            }}
          >
            <Text style={styles.purposeEmoji}>{opt.emoji}</Text>
            <Text style={styles.purposeLabel}>{opt.label}</Text>
            <Text style={styles.purposeDescription}>{opt.description}</Text>
            {flowPurpose === opt.id && (
              <View style={styles.purposeCheck}>
                <Ionicons name="checkmark-circle" size={24} color={colors.accent.primary} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </GlassCard>
  );

  const renderStep4 = () => (
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

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

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

          {/* ── Bottom bar: dots + button ────────────────────── */}
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

  // ── Location step ──────────────────────────────────────────────
  selectedLocations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.depth1,
    borderRadius: 20,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  locationTagText: {
    ...typography.caption,
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  popularCities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cityPill: {
    marginBottom: spacing.xs,
  },
  customLocationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  customInput: {
    flex: 1,
    backgroundColor: colors.background.depth1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...typography.body,
    color: colors.text.primary,
  },
  cityInput: {
    flex: 2,
  },
  countryInput: {
    flex: 1.5,
  },
  addButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  locationCount: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // ── Flow purpose step ──────────────────────────────────────────
  purposeOptions: {
    gap: spacing.md,
  },
  purposeCard: {
    backgroundColor: colors.background.depth1,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
    position: 'relative',
  },
  purposeCardActive: {
    borderColor: colors.accent.primary,
    backgroundColor: `${colors.accent.primary}15`,
  },
  purposeEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  purposeLabel: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  purposeDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  purposeCheck: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
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
  nextButton: {
    width: '100%',
  },
});
