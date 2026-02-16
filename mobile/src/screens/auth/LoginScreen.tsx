/**
 * LoginScreen
 *
 * Full-screen dark gradient entry point with glassmorphism inputs.
 * Handles username/password auth via the auth store. On successful
 * login the navigator reacts to the token change automatically.
 */

import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { useAuthStore } from '../../stores/useAuthStore';
import { haptics } from '../../utils/haptics';

// ── Component ────────────────────────────────────────────────────────

export function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();
    if (!username.trim() || !password.trim()) return;
    try {
      await login(username.trim(), password);
      haptics.success();
    } catch {
      haptics.error();
    }
  }, [username, password, login]);

  const isDisabled = !username.trim() || !password.trim() || isLoading;

  return (
    <LinearGradient
      colors={[colors.background.base, colors.background.depth2, colors.background.base]}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.inner} onPress={Keyboard.dismiss}>
          {/* ── Hero ────────────────────────────────────────── */}
          <View style={styles.heroSection}>
            <Text style={styles.logo}>FlowB</Text>
            <Text style={styles.subtitle}>Join the Flow</Text>
          </View>

          {/* ── Form ────────────────────────────────────────── */}
          <View style={styles.form}>
            <GlassInput
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              returnKeyType="next"
              icon={
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
              style={styles.inputGap}
            />

            <GlassInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="done"
              icon={
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
              style={styles.inputGap}
            />

            {/* ── Error message ──────────────────────────────── */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.accent.rose}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── Submit ─────────────────────────────────────── */}
            <GlassButton
              title="Sign In"
              onPress={handleLogin}
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={isDisabled}
              style={styles.button}
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
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    ...typography.hero,
    fontSize: 48,
    lineHeight: 56,
    color: colors.accent.primary,
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  form: {
    width: '100%',
  },
  inputGap: {
    marginBottom: spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 75, 85, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 85, 0.25)',
  },
  errorText: {
    ...typography.body,
    color: colors.accent.rose,
    marginLeft: spacing.sm,
    flex: 1,
  },
  button: {
    marginTop: spacing.sm,
  },
});
