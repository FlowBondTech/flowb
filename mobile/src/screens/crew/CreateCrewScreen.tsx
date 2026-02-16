/**
 * CreateCrewScreen
 *
 * Modal screen for creating a new crew. Provides a name input and a
 * horizontal emoji picker. On successful creation, triggers a success
 * haptic and navigates back.
 */

import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { GlassButton } from '../../components/glass/GlassButton';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassInput } from '../../components/glass/GlassInput';
import { useCrewStore } from '../../stores/useCrewStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

// ── Constants ────────────────────────────────────────────────────────

const EMOJIS = ['🔥', '⚡', '🌊', '🎯', '🚀', '💎', '🌟', '🎪', '🏔️', '🎵'];

// ── Component ────────────────────────────────────────────────────────

export function CreateCrewScreen() {
  const navigation = useNavigation();
  const createCrew = useCrewStore((s) => s.createCrew);

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🔥');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    haptics.select();
    setSelectedEmoji(emoji);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createCrew(name.trim(), selectedEmoji);
      haptics.success();
      navigation.goBack();
    } catch {
      setIsSubmitting(false);
    }
  }, [createCrew, isSubmitting, name, navigation, selectedEmoji]);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Create Crew"
        onBack={handleClose}
      />

      <View style={styles.content}>
        {/* Crew name */}
        <GlassInput
          placeholder="Crew name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="done"
        />

        {/* Emoji picker */}
        <View style={styles.emojiSection}>
          <Text style={styles.emojiLabel}>Choose an emoji</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiRow}
          >
            {EMOJIS.map((emoji) => {
              const isActive = emoji === selectedEmoji;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => handleEmojiSelect(emoji)}
                  style={[
                    styles.emojiCircle,
                    isActive && styles.emojiCircleActive,
                  ]}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
          <Text style={styles.previewName} numberOfLines={1}>
            {name.trim() || 'Your Crew'}
          </Text>
        </View>

        {/* Create button */}
        <GlassButton
          title="Create"
          variant="primary"
          size="lg"
          onPress={handleCreate}
          disabled={!name.trim()}
          loading={isSubmitting}
          style={styles.createButton}
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

  // Emoji picker
  emojiSection: {
    gap: spacing.sm,
  },
  emojiLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.glass.subtle,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCircleActive: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
    backgroundColor: colors.glass.light,
  },
  emojiText: {
    fontSize: 24,
  },

  // Preview
  preview: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  previewEmoji: {
    fontSize: 56,
  },
  previewName: {
    ...typography.title,
    color: colors.text.secondary,
  },

  // Button
  createButton: {
    marginTop: 'auto' as any,
    marginBottom: spacing.xl,
  },
});
