import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../stores/useAuthStore';
import { GlassButton } from '../components/glass/GlassButton';
import { GlassInput } from '../components/glass/GlassInput';
import { GlassCard } from '../components/glass/GlassCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { sendOtp, verifyOtp, loading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');

  const handleSendOtp = async () => {
    await sendOtp(email.trim().toLowerCase());
    if (!useAuthStore.getState().error) {
      setStep('code');
    }
  };

  const handleVerify = async () => {
    await verifyOtp(email.trim().toLowerCase(), code.trim());
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + spacing.xxl }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>FlowB Admin</Text>
        <Text style={styles.subtitle}>Sign in with your admin email</Text>
      </View>

      <GlassCard variant="medium" style={styles.card}>
        <View style={styles.cardInner}>
          {step === 'email' ? (
            <>
              <GlassInput
                placeholder="admin@flowb.me"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="send"
                onSubmitEditing={handleSendOtp}
              />
              <GlassButton
                title="Send Code"
                onPress={handleSendOtp}
                loading={loading}
                disabled={!email.includes('@')}
                style={styles.btn}
              />
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                Enter the 6-digit code sent to {email}
              </Text>
              <GlassInput
                placeholder="000000"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />
              <GlassButton
                title="Verify & Login"
                onPress={handleVerify}
                loading={loading}
                disabled={code.length < 6}
                style={styles.btn}
              />
              <GlassButton
                title="Back"
                variant="ghost"
                onPress={() => {
                  setStep('email');
                  setCode('');
                }}
                style={styles.btn}
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </GlassCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
    paddingHorizontal: spacing.lg,
  },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  title: { ...typography.hero, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.text.secondary },
  card: { marginTop: spacing.md },
  cardInner: { padding: spacing.lg, gap: spacing.md },
  hint: { ...typography.caption, color: colors.text.secondary, textAlign: 'center' },
  btn: { marginTop: spacing.xs },
  error: {
    ...typography.caption,
    color: colors.semantic.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
