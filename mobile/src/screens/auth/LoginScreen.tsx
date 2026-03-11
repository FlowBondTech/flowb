/**
 * LoginScreen (FlowB Passport)
 *
 * Auth options via Supabase Auth:
 *   - Email (Magic Link / OTP)
 *   - Email + Password
 *   - Google OAuth
 *   - Apple OAuth
 *   - Fallback to username/password (legacy app auth)
 *
 * Uses Supabase JS client for auth flows.
 * After Supabase session is established, exchanges for FlowB JWT via /api/v1/auth/passport.
 *
 * Glass-styled, matching existing design language.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { getSupabaseClient } from '../../utils/supabase-client';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type AuthMode = 'menu' | 'email' | 'email-otp' | 'email-password' | 'password';

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login, loginWithPassport } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('menu');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  // Listen for OAuth deep link callback
  useEffect(() => {
    const sub = Linking.addEventListener('url', async (event) => {
      // Handle OAuth callback: me.flowb.app://auth/callback#access_token=...
      if (event.url.includes('auth/callback')) {
        await WebBrowser.dismissBrowser();
        const supabase = getSupabaseClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (session && !sessionError) {
          await handleSupabaseSession(session);
        }
      }
    });
    return () => sub.remove();
  }, []);

  // -- Core: Exchange Supabase session for FlowB JWT --

  const handleSupabaseSession = useCallback(async (session: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const flowbRes = await api.authPassport(
        session.access_token,
        session.user?.user_metadata?.full_name || email.split('@')[0],
      );

      await loginWithPassport(flowbRes.token, flowbRes.user);
      haptics.success();
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with FlowB');
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  }, [email, loginWithPassport, navigation]);

  // -- Email Magic Link (OTP) Flow --

  const handleEmailSubmit = useCallback(async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
      });

      if (otpError) throw otpError;

      haptics.success();
      setMode('email-otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handleOtpSubmit = useCallback(async () => {
    if (!otp.trim() || otp.length < 6) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email',
      });

      if (verifyError) throw verifyError;
      if (!data.session) throw new Error('No session after OTP verification');

      await handleSupabaseSession(data.session);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  }, [email, otp, handleSupabaseSession]);

  // -- Email + Password Flow --

  const handleEmailPasswordSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
      }

      if (result.error) throw result.error;

      if (isSignUp && !result.data.session) {
        // Email confirmation required
        haptics.success();
        setError('Check your email to confirm your account, then sign in.');
        setIsSignUp(false);
        return;
      }

      if (!result.data.session) throw new Error('No session received');

      await handleSupabaseSession(result.data.session);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  }, [email, password, isSignUp, handleSupabaseSession]);

  // -- Username/Password fallback (legacy app auth) --

  const handlePasswordLogin = useCallback(async () => {
    if (!username.trim() || !password.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      await login(username.trim(), password.trim());
      haptics.success();
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  }, [username, password, login, navigation]);

  // -- Render modes --

  const renderMenu = () => (
    <>
      {/* Email login */}
      <GlassCard variant="subtle" style={styles.card}>
        <GlassButton
          title="Continue with Email"
          onPress={() => { haptics.tap(); setMode('email'); setError(null); }}
          variant="primary"
          size="lg"
          style={styles.socialButton}
          icon={<Ionicons name="mail-outline" size={20} color={colors.text.primary} />}
        />
      </GlassCard>

      {/* Email + password option */}
      <Pressable
        style={styles.fallbackButton}
        onPress={() => { haptics.tap(); setMode('email-password'); setError(null); }}
      >
        <Text style={styles.fallbackText}>Sign in with email & password</Text>
      </Pressable>

      {/* Legacy username/password fallback */}
      <Pressable
        style={styles.fallbackButton}
        onPress={() => { haptics.tap(); setMode('password'); setError(null); }}
      >
        <Text style={styles.fallbackText}>Login with username & password</Text>
      </Pressable>
    </>
  );

  const renderEmailInput = () => (
    <GlassCard variant="subtle" style={styles.card}>
      <Text style={styles.cardTitle}>Enter your email</Text>
      <Text style={styles.cardDescription}>
        We'll send you a verification code
      </Text>
      <GlassInput
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="go"
        icon={<Ionicons name="mail-outline" size={18} color={colors.text.tertiary} />}
      />
      <GlassButton
        title="Send Code"
        onPress={handleEmailSubmit}
        variant="primary"
        size="lg"
        loading={isLoading}
        disabled={!email.trim() || isLoading}
        style={styles.submitButton}
      />
      <Pressable onPress={() => { setMode('menu'); setError(null); }} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </GlassCard>
  );

  const renderOtpInput = () => (
    <GlassCard variant="subtle" style={styles.card}>
      <Text style={styles.cardTitle}>Enter verification code</Text>
      <Text style={styles.cardDescription}>
        Sent to {email}
      </Text>
      <GlassInput
        placeholder="000000"
        value={otp}
        onChangeText={(text) => setOtp(text.slice(0, 6))}
        keyboardType="number-pad"
        returnKeyType="go"
        icon={<Ionicons name="keypad-outline" size={18} color={colors.text.tertiary} />}
      />
      <GlassButton
        title="Verify"
        onPress={handleOtpSubmit}
        variant="primary"
        size="lg"
        loading={isLoading}
        disabled={otp.length < 6 || isLoading}
        style={styles.submitButton}
      />
      <Pressable onPress={() => { setMode('email'); setError(null); setOtp(''); }} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </GlassCard>
  );

  const renderEmailPasswordLogin = () => (
    <GlassCard variant="subtle" style={styles.card}>
      <Text style={styles.cardTitle}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
      <GlassInput
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        icon={<Ionicons name="mail-outline" size={18} color={colors.text.tertiary} />}
      />
      <View style={{ height: spacing.sm }} />
      <GlassInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        returnKeyType="go"
        icon={<Ionicons name="lock-closed-outline" size={18} color={colors.text.tertiary} />}
      />
      <GlassButton
        title={isSignUp ? 'Sign Up' : 'Sign In'}
        onPress={handleEmailPasswordSubmit}
        variant="primary"
        size="lg"
        loading={isLoading}
        disabled={!email.trim() || !password.trim() || isLoading}
        style={styles.submitButton}
      />
      <Pressable onPress={() => setIsSignUp(!isSignUp)} style={styles.backButton}>
        <Text style={styles.backText}>
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </Text>
      </Pressable>
      <Pressable onPress={() => { setMode('menu'); setError(null); setPassword(''); }} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </GlassCard>
  );

  const renderPasswordLogin = () => (
    <GlassCard variant="subtle" style={styles.card}>
      <Text style={styles.cardTitle}>Login with credentials</Text>
      <GlassInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        returnKeyType="next"
        icon={<Ionicons name="person-outline" size={18} color={colors.text.tertiary} />}
      />
      <View style={{ height: spacing.sm }} />
      <GlassInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        returnKeyType="go"
        icon={<Ionicons name="lock-closed-outline" size={18} color={colors.text.tertiary} />}
      />
      <GlassButton
        title="Login"
        onPress={handlePasswordLogin}
        variant="primary"
        size="lg"
        loading={isLoading}
        disabled={!username.trim() || !password.trim() || isLoading}
        style={styles.submitButton}
      />
      <Pressable onPress={() => { setMode('menu'); setError(null); }} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </GlassCard>
  );

  const modeRenderers: Record<AuthMode, () => React.ReactElement> = {
    menu: renderMenu,
    email: renderEmailInput,
    'email-otp': renderOtpInput,
    'email-password': renderEmailPasswordLogin,
    password: renderPasswordLogin,
  };

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
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logoText}>FlowB</Text>
              <Text style={styles.heroSubtitle}>
                {mode === 'menu' ? 'Welcome back' : 'Sign in to continue'}
              </Text>
            </View>

            {/* Active mode */}
            {modeRenderers[mode]()}

            {/* Error */}
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.accent.rose} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.accent.primary,
    letterSpacing: -1,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },

  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 20,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },

  socialButton: {
    width: '100%',
  },
  submitButton: {
    width: '100%',
    marginTop: spacing.md,
  },
  backButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  backText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },

  fallbackButton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  fallbackText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.accent.rose,
    marginLeft: spacing.xs,
    flex: 1,
  },
});
