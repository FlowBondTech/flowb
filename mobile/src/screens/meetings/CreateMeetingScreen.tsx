/**
 * CreateMeetingScreen
 *
 * Modal form for scheduling a new meeting. Uses GlassInput fields for
 * title, description, and location, with date/time pickers and a type
 * selector. Submits via POST to the meetings API endpoint.
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { GlassButton } from '../../components/glass/GlassButton';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassInput } from '../../components/glass/GlassInput';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

// ── Constants ────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://flowb.fly.dev';

// ── Types ────────────────────────────────────────────────────────────

type MeetingType = 'call' | 'coffee' | 'lunch' | 'virtual' | 'office';

interface MeetingTypeOption {
  value: MeetingType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MEETING_TYPES: MeetingTypeOption[] = [
  { value: 'call', label: 'Call', icon: 'call-outline', color: colors.accent.cyan },
  { value: 'coffee', label: 'Coffee', icon: 'cafe-outline', color: colors.accent.amber },
  { value: 'lunch', label: 'Lunch', icon: 'restaurant-outline', color: colors.accent.emerald },
  { value: 'virtual', label: 'Virtual', icon: 'videocam-outline', color: colors.accent.primary },
  { value: 'office', label: 'Office', icon: 'business-outline', color: colors.accent.secondary },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// ── Component ────────────────────────────────────────────────────────

export function CreateMeetingScreen() {
  const navigation = useNavigation();
  const token = useAuthStore((s) => s.token);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('virtual');
  const [duration, setDuration] = useState(30);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTypeSelect = useCallback((type: MeetingType) => {
    haptics.select();
    setMeetingType(type);
  }, []);

  const handleDurationSelect = useCallback((mins: number) => {
    haptics.select();
    setDuration(mins);
  }, []);

  const handleDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowDatePicker(false);
      if (selectedDate) {
        setDate((prev) => {
          const next = new Date(selectedDate);
          next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
          return next;
        });
      }
    },
    [],
  );

  const handleTimeChange = useCallback(
    (_event: DateTimePickerEvent, selectedTime?: Date) => {
      if (Platform.OS === 'android') setShowTimePicker(false);
      if (selectedTime) {
        setDate((prev) => {
          const next = new Date(prev);
          next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
          return next;
        });
      }
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/meetings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          meeting_type: meetingType,
          scheduled_at: date.toISOString(),
          duration_minutes: duration,
          location: location.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        haptics.success();
        Alert.alert('Meeting Created', 'Your meeting has been scheduled.', [
          {
            text: 'View Details',
            onPress: () => {
              navigation.goBack();
              if (data.meeting?.id) {
                // @ts-ignore — navigation typing handled at integration
                navigation.navigate('MeetingDetail', {
                  meetingId: data.meeting.id,
                });
              }
            },
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        const err = await res.json().catch(() => null);
        Alert.alert('Error', err?.error ?? 'Failed to create meeting.');
        haptics.error();
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, meetingType, date, duration, location, token, navigation, isSubmitting]);

  // ── Formatters ───────────────────────────────────────────────────

  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="New Meeting"
        rightAction={
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Title ──────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Title</Text>
          <GlassInput
            placeholder="Meeting title"
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            returnKeyType="next"
            icon={
              <Ionicons
                name="text-outline"
                size={18}
                color={colors.text.tertiary}
              />
            }
          />
        </View>

        {/* ── Description ────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <GlassInput
            placeholder="What is this meeting about?"
            value={description}
            onChangeText={setDescription}
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
        </View>

        {/* ── Meeting type selector ──────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
          >
            {MEETING_TYPES.map((opt) => {
              const isActive = opt.value === meetingType;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleTypeSelect(opt.value)}
                  style={[
                    styles.typeChip,
                    isActive && {
                      borderColor: opt.color,
                      borderWidth: 2,
                      backgroundColor: opt.color + '18',
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isActive ? opt.color : colors.text.tertiary}
                  />
                  <Text
                    style={[
                      styles.typeChipLabel,
                      isActive && { color: opt.color },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Date & Time ────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date & Time</Text>
          <View style={styles.dateTimeRow}>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={styles.dateTimePicker}
            >
              <GlassCard variant="subtle" noAnimation>
                <View style={styles.dateTimeInner}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.accent.primary}
                  />
                  <Text style={styles.dateTimeText}>{formattedDate}</Text>
                </View>
              </GlassCard>
            </Pressable>

            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={styles.dateTimePicker}
            >
              <GlassCard variant="subtle" noAnimation>
                <View style={styles.dateTimeInner}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.accent.cyan}
                  />
                  <Text style={styles.dateTimeText}>{formattedTime}</Text>
                </View>
              </GlassCard>
            </Pressable>
          </View>

          {/* Native pickers */}
          {showDatePicker ? (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              themeVariant="dark"
            />
          ) : null}
          {showTimePicker ? (
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              minuteInterval={5}
              themeVariant="dark"
            />
          ) : null}
        </View>

        {/* ── Duration ───────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Duration</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.durationRow}
          >
            {DURATION_OPTIONS.map((mins) => {
              const isActive = mins === duration;
              const label =
                mins >= 60
                  ? `${mins / 60}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
                  : `${mins} min`;

              return (
                <Pressable
                  key={mins}
                  onPress={() => handleDurationSelect(mins)}
                  style={[
                    styles.durationChip,
                    isActive && styles.durationChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      isActive && styles.durationChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Location ───────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Location (optional)</Text>
          <GlassInput
            placeholder="Where is the meeting?"
            value={location}
            onChangeText={setLocation}
            autoCapitalize="sentences"
            returnKeyType="done"
            icon={
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.text.tertiary}
              />
            }
          />
        </View>

        {/* ── Submit ─────────────────────────────────────────── */}
        <GlassButton
          title="Schedule Meeting"
          variant="primary"
          size="lg"
          onPress={handleSubmit}
          disabled={!title.trim()}
          loading={isSubmitting}
          icon={
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.white}
            />
          }
          style={styles.submitButton}
        />
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
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ── Fields ──────────────────────────────────────────────────
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // ── Type selector ───────────────────────────────────────────
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: colors.glass.subtle,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  typeChipLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '500',
  },

  // ── Date & Time ─────────────────────────────────────────────
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateTimePicker: {
    flex: 1,
  },
  dateTimeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  dateTimeText: {
    ...typography.body,
    color: colors.text.primary,
  },

  // ── Duration ────────────────────────────────────────────────
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  durationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: colors.glass.subtle,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  durationChipActive: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
    backgroundColor: colors.accent.primaryGlow,
  },
  durationChipText: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  durationChipTextActive: {
    color: colors.accent.primary,
  },

  // ── Submit ──────────────────────────────────────────────────
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
