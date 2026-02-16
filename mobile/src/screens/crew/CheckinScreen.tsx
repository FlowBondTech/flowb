/**
 * CheckinScreen
 *
 * Modal screen for checking in to a venue on behalf of a crew. Provides
 * venue name input, a three-option status selector, and an optional
 * message. On success, fires a haptic and pops back.
 */

import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { GlassButton } from '../../components/glass/GlassButton';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassPill } from '../../components/glass/GlassPill';
import { useCrewStore } from '../../stores/useCrewStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';

// ── Types ────────────────────────────────────────────────────────────

type Route = RouteProp<RootStackParamList, 'Checkin'>;

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

// ── Constants ────────────────────────────────────────────────────────

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'here', label: 'Here \uD83D\uDCCD', color: colors.accent.emerald },
  { value: 'heading', label: 'Heading \uD83D\uDEB6', color: colors.accent.amber },
  { value: 'leaving', label: 'Leaving \uD83D\uDC4B', color: colors.accent.rose },
];

// ── Component ────────────────────────────────────────────────────────

export function CheckinScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { crewId, crewName } = route.params;

  const checkin = useCrewStore((s) => s.checkin);

  const [venue, setVenue] = useState('');
  const [status, setStatus] = useState('here');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleStatusSelect = useCallback((value: string) => {
    haptics.select();
    setStatus(value);
  }, []);

  const handleCheckin = useCallback(async () => {
    if (!venue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await checkin(crewId, venue.trim(), {
        status,
        message: message.trim() || undefined,
      });
      haptics.success();
      navigation.goBack();
    } catch {
      setIsSubmitting(false);
    }
  }, [checkin, crewId, isSubmitting, message, navigation, status, venue]);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Check In"
        onBack={handleClose}
      />

      <View style={styles.content}>
        {/* Crew context */}
        <Text style={styles.subtitle}>{crewName}</Text>

        {/* Venue input */}
        <View style={styles.field}>
          <Text style={styles.label}>Venue</Text>
          <GlassInput
            placeholder="Where are you?"
            value={venue}
            onChangeText={setVenue}
            icon={
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.text.tertiary}
              />
            }
            autoCapitalize="words"
          />
        </View>

        {/* Status selector */}
        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <GlassPill
                key={opt.value}
                label={opt.label}
                color={opt.color}
                active={status === opt.value}
                onPress={() => handleStatusSelect(opt.value)}
              />
            ))}
          </View>
        </View>

        {/* Optional message */}
        <View style={styles.field}>
          <Text style={styles.label}>Message (optional)</Text>
          <GlassInput
            placeholder="Let your crew know..."
            value={message}
            onChangeText={setMessage}
            multiline
            autoCapitalize="sentences"
          />
        </View>

        {/* Submit */}
        <GlassButton
          title="Check In"
          variant="primary"
          size="lg"
          onPress={handleCheckin}
          disabled={!venue.trim()}
          loading={isSubmitting}
          icon={
            <Ionicons name="location" size={20} color={colors.white} />
          }
          style={styles.submitButton}
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  subtitle: {
    ...typography.title,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Fields
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },

  // Status pills
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },

  // Submit
  submitButton: {
    marginTop: 'auto' as any,
    marginBottom: spacing.xl,
  },
});
