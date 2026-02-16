/**
 * CastComposer
 *
 * Compose and preview a Farcaster cast. Shows a multi-line input with
 * character count (max 320) and a post button. Actual posting is handled
 * server-side; this screen shows a success alert on submit.
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { GlassButton } from '../../components/glass/GlassButton';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassInput } from '../../components/glass/GlassInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

// ── Constants ────────────────────────────────────────────────────────

const MAX_CHARS = 320;

// ── Component ────────────────────────────────────────────────────────

export function CastComposer() {
  const navigation = useNavigation();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = text.trim().length === 0;
  const isDisabled = isEmpty || isOverLimit || posting;

  // ── Handlers ────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    haptics.tap();
    navigation.goBack();
  }, [navigation]);

  const handlePost = useCallback(async () => {
    if (isDisabled) return;

    setPosting(true);
    haptics.tap();

    // Simulate server-side posting (actual implementation is server-side)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      haptics.success();
      Alert.alert(
        'Cast Queued',
        'Your cast has been queued for posting.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      haptics.error();
      Alert.alert('Error', 'Failed to queue cast. Please try again.');
    } finally {
      setPosting(false);
    }
  }, [isDisabled, navigation]);

  // ── Character count color ───────────────────────────────────────────

  const countColor = isOverLimit
    ? colors.accent.rose
    : charCount > MAX_CHARS * 0.9
      ? colors.accent.amber
      : colors.text.tertiary;

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Compose Cast"
        rightAction={
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={styles.inputSection}>
          <GlassInput
            placeholder="What's happening in the flow?"
            value={text}
            onChangeText={setText}
            multiline
            style={styles.textInput}
          />

          {/* Character count */}
          <View style={styles.countRow}>
            <Text style={[styles.count, { color: countColor }]}>
              {charCount}/{MAX_CHARS}
            </Text>
          </View>
        </View>

        {/* Post button */}
        <View style={styles.footer}>
          <GlassButton
            title="Post Cast"
            variant="primary"
            size="lg"
            disabled={isDisabled}
            loading={posting}
            icon={
              <Ionicons
                name="paper-plane-outline"
                size={18}
                color={isDisabled ? colors.text.tertiary : colors.white}
              />
            }
            onPress={handlePost}
            style={styles.postButton}
          />
        </View>
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
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  inputSection: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  textInput: {
    minHeight: 120,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingRight: spacing.xs,
  },
  count: {
    ...typography.caption,
  },
  footer: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  postButton: {
    width: '100%',
  },
});
