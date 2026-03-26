/**
 * LinkedAccountsScreen
 *
 * Shows connected platforms and allows linking Telegram from the mobile app.
 * Flow: tap "Connect Telegram" -> OIDC init -> WebBrowser auth session ->
 * Telegram OAuth -> callback merges accounts -> redirect back with result.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';

import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';
import { getLinkStatus, initTelegramLink, type LinkStatus } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';

type LinkingState = 'idle' | 'loading' | 'success' | 'error';

// ── Platform row ──────────────────────────────────────────────────

interface PlatformRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  connected: boolean;
  onConnect?: () => void;
  connecting?: boolean;
}

function PlatformRow({ icon, name, connected, onConnect, connecting }: PlatformRowProps) {
  return (
    <View style={styles.platformRow}>
      <Ionicons
        name={icon}
        size={24}
        color={connected ? colors.accent.primary : colors.text.tertiary}
      />
      <Text style={styles.platformName}>{name}</Text>
      <View style={styles.platformRight}>
        {connecting ? (
          <ActivityIndicator size="small" color={colors.accent.primary} />
        ) : connected ? (
          <View style={styles.connectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        ) : onConnect ? (
          <Pressable onPress={onConnect} style={styles.connectButton}>
            <Text style={styles.connectButtonText}>Connect</Text>
          </Pressable>
        ) : (
          <Text style={styles.notConnectedText}>Not connected</Text>
        )}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export function LinkedAccountsScreen() {
  const navigation = useNavigation();
  const { logout } = useAuthStore();

  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [linkingState, setLinkingState] = useState<LinkingState>('idle');
  const [rowsMerged, setRowsMerged] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch initial link status
  useEffect(() => {
    (async () => {
      try {
        const data = await getLinkStatus();
        setStatus(data);
      } catch {
        // Ignore — will show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConnectTelegram = useCallback(async () => {
    haptics.tap();
    setLinkingState('loading');

    try {
      // 1. Get the OIDC auth URL from backend
      const { authUrl } = await initTelegramLink();

      // 2. Open Telegram OAuth in an auth session (in-app browser)
      //    When Telegram redirects to flowb://link-result?..., the browser closes
      //    and we get the URL back.
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'flowb://link-result');

      if (result.type === 'success' && result.url) {
        // 3. Parse the redirect URL params
        const url = new URL(result.url);
        const success = url.searchParams.get('success') === 'true';
        const rows = parseInt(url.searchParams.get('rows') || '0', 10);
        const error = url.searchParams.get('error');

        if (success) {
          setRowsMerged(rows);
          setLinkingState('success');
          haptics.success();

          // Refresh status to show updated connections
          try {
            const updated = await getLinkStatus();
            setStatus(updated);
          } catch {
            // Non-critical
          }
        } else {
          setLinkingState('error');
          Alert.alert('Linking Failed', error || 'Could not link your Telegram account.');
        }
      } else {
        // User cancelled the browser session
        setLinkingState('idle');
      }
    } catch (err) {
      console.error('[LinkedAccounts] OIDC error:', err);
      setLinkingState('error');
      Alert.alert('Error', 'Could not start Telegram linking. Please try again.');
    }
  }, []);

  const handleReAuthenticate = useCallback(async () => {
    haptics.tap();
    Alert.alert(
      'Re-login Required',
      'To use your merged account, you need to sign out and sign back in. Your data has been merged and is safe.',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Sign Out & Re-login',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  }, [logout]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GlassHeader
        title="Linked Accounts"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        ) : (
          <>
            {/* Info card */}
            <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
              <GlassCard variant="subtle" style={styles.infoCard}>
                <Ionicons name="link" size={20} color={colors.accent.primary} />
                <Text style={styles.infoText}>
                  Link your accounts to share crews, points, and friends across platforms.
                </Text>
              </GlassCard>
            </Animated.View>

            {/* Platform list */}
            <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
              <GlassCard variant="medium" style={styles.platformCard}>
                <PlatformRow
                  icon="paper-plane-outline"
                  name="Telegram"
                  connected={status?.has_telegram ?? false}
                  onConnect={
                    !status?.has_telegram && linkingState === 'idle'
                      ? handleConnectTelegram
                      : undefined
                  }
                  connecting={linkingState === 'loading'}
                />
                <View style={styles.divider} />
                <PlatformRow
                  icon="globe-outline"
                  name="Farcaster"
                  connected={status?.has_farcaster ?? false}
                />
                <View style={styles.divider} />
                <PlatformRow
                  icon="phone-portrait-outline"
                  name="Mobile App"
                  connected={status?.has_web ?? true}
                />
              </GlassCard>
            </Animated.View>

            {/* Success state */}
            {linkingState === 'success' && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <GlassCard variant="subtle" style={styles.successCard}>
                  <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                  <Text style={styles.successText}>
                    Accounts linked successfully!
                  </Text>
                  <Text style={styles.successHint}>
                    {rowsMerged > 0
                      ? `${rowsMerged} records merged.`
                      : 'Your data has been merged.'}
                  </Text>
                  <GlassButton
                    title="Re-login to Activate"
                    onPress={handleReAuthenticate}
                    variant="primary"
                    size="sm"
                    style={styles.reloginButton}
                  />
                </GlassCard>
              </Animated.View>
            )}

            {/* Error state — allow retry */}
            {linkingState === 'error' && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <GlassCard variant="subtle" style={styles.errorCard}>
                  <Ionicons name="alert-circle" size={24} color={colors.accent.amber} />
                  <Text style={styles.errorText}>
                    Linking failed. Please try again.
                  </Text>
                  <GlassButton
                    title="Retry"
                    onPress={() => setLinkingState('idle')}
                    variant="secondary"
                    size="sm"
                    style={styles.retryButton}
                  />
                </GlassCard>
              </Animated.View>
            )}

            {/* Stats */}
            {status && status.total_linked > 1 && (
              <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
                <GlassCard variant="subtle" style={styles.statsCard}>
                  <Text style={styles.statsTitle}>Merged Identity</Text>
                  <Text style={styles.statsValue}>
                    {status.total_linked} platform{status.total_linked !== 1 ? 's' : ''} linked
                  </Text>
                  {status.merged_points > 0 && (
                    <Text style={styles.statsPoints}>
                      {status.merged_points.toLocaleString()} total points
                    </Text>
                  )}
                </GlassCard>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + 80,
  },
  loadingContainer: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },

  // Platform list
  platformCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + spacing.xs,
  },
  platformName: {
    ...typography.body,
    flex: 1,
    marginLeft: spacing.sm,
  },
  platformRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectedText: {
    ...typography.micro,
    color: '#22c55e',
    fontWeight: '600',
  },
  notConnectedText: {
    ...typography.micro,
    color: colors.text.tertiary,
  },
  connectButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 12,
  },
  connectButtonText: {
    ...typography.micro,
    color: colors.white,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
  },

  // Success
  successCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  successText: {
    ...typography.headline,
    color: '#22c55e',
    textAlign: 'center',
  },
  successHint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  reloginButton: {
    marginTop: spacing.sm,
  },

  // Error
  errorCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.accent.amber,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
  },

  // Stats
  statsCard: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statsTitle: {
    ...typography.micro,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsValue: {
    ...typography.headline,
    color: colors.text.primary,
  },
  statsPoints: {
    ...typography.caption,
    color: colors.accent.primary,
  },
});
