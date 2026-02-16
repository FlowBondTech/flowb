/**
 * FriendsScreen
 *
 * Shows the user's friends list, allows connecting by code, and
 * sharing an invite link. Uses GET /api/v1/flow/friends,
 * POST /api/v1/flow/connect, and GET /api/v1/flow/invite.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassInput } from '../../components/glass/GlassInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';
import type { RootScreenProps } from '../../navigation/types';

type Props = RootScreenProps<'Friends'>;

interface Friend {
  user_id: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  connected_at?: string;
}

// ── Friend row ──────────────────────────────────────────────────────

function FriendRow({ item }: { item: Friend }) {
  const name = item.displayName || item.username || item.user_id;
  const initial = name.charAt(0).toUpperCase();

  return (
    <GlassCard variant="subtle" style={styles.friendCard}>
      <View style={styles.friendRow}>
        <View style={styles.friendAvatar}>
          <Text style={styles.friendAvatarText}>{initial}</Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>
            {name}
          </Text>
          {item.username ? (
            <Text style={styles.friendUsername} numberOfLines={1}>
              @{item.username}
            </Text>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}

// ── Main screen ─────────────────────────────────────────────────────

export function FriendsScreen({ navigation }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectCode, setConnectCode] = useState('');
  const [connecting, setConnecting] = useState(false);

  // ── Load friends ────────────────────────────────────────────────────

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFriends();
      setFriends(data);
    } catch {
      // Keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // ── Connect by code ─────────────────────────────────────────────────

  const handleConnect = useCallback(async () => {
    const code = connectCode.trim();
    if (!code) return;

    haptics.select();
    setConnecting(true);
    try {
      await api.connectFriend(code);
      haptics.success();
      setConnectCode('');
      loadFriends();
    } catch {
      haptics.error();
      Alert.alert('Connection Failed', 'Invalid code or already connected.');
    } finally {
      setConnecting(false);
    }
  }, [connectCode, loadFriends]);

  // ── Share invite link ───────────────────────────────────────────────

  const handleShareInvite = useCallback(async () => {
    haptics.tap();
    try {
      const link = await api.getInviteLink();
      await Share.share({
        message: `Join me on FlowB for EthDenver! ${link}`,
      });
    } catch {
      Alert.alert('Error', 'Could not generate invite link.');
    }
  }, []);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader title="Friends" onBack={() => navigation.goBack()} />

      <FlatList
        data={friends}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => <FriendRow item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Connect by code ──────────────────────────── */}
            <GlassCard variant="medium" style={styles.connectCard}>
              <Text style={styles.connectTitle}>Connect with a friend</Text>
              <Text style={styles.connectCaption}>
                Enter their friend code to connect
              </Text>
              <View style={styles.connectRow}>
                <GlassInput
                  placeholder="Friend code"
                  value={connectCode}
                  onChangeText={setConnectCode}
                  autoCapitalize="none"
                  returnKeyType="done"
                  icon={
                    <Ionicons
                      name="person-add-outline"
                      size={18}
                      color={colors.text.tertiary}
                    />
                  }
                  style={styles.connectInput}
                />
                <GlassButton
                  title="Add"
                  onPress={handleConnect}
                  variant="primary"
                  size="sm"
                  loading={connecting}
                  disabled={!connectCode.trim()}
                />
              </View>
            </GlassCard>

            {/* ── Share invite ──────────────────────────────── */}
            <GlassButton
              title="Share Invite Link"
              onPress={handleShareInvite}
              variant="secondary"
              size="md"
              icon={
                <Ionicons
                  name="share-outline"
                  size={18}
                  color={colors.accent.primary}
                />
              }
              style={styles.shareButton}
            />

            {/* ── Friends header ────────────────────────────── */}
            <Text style={styles.sectionTitle}>
              Your Friends ({friends.length})
            </Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyCenter}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
          ) : (
            <View style={styles.emptyCenter}>
              <Ionicons
                name="people-outline"
                size={48}
                color={colors.text.tertiary}
              />
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptyHint}>
                Share your invite link or enter a friend code above
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Connect section
  connectCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  connectTitle: {
    ...typography.headline,
    marginBottom: spacing.xs,
  },
  connectCaption: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  connectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  connectInput: {
    flex: 1,
  },

  // Share
  shareButton: {
    marginBottom: spacing.lg,
  },

  // Section
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },

  // Friend card
  friendCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    ...typography.headline,
    color: colors.text.primary,
  },
  friendUsername: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Empty state
  emptyCenter: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.headline,
    color: colors.text.secondary,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    maxWidth: 240,
  },
});
