/**
 * HomeScreen
 *
 * Event discovery screen with animated collapsing header, search bar,
 * horizontal filter chips, a buzz feed section, and event cards.
 * All content enters with staggered animations. Uses Reanimated scroll
 * handler for the collapsing glass header.
 */

import React, { useCallback, useEffect } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AnimatedHeader } from '../../components/glass/AnimatedHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassPill } from '../../components/glass/GlassPill';
import { SkeletonEventCard } from '../../components/feedback/Skeleton';
import { useEventsStore } from '../../stores/useEventsStore';
import { useFeedStore } from '../../stores/useFeedStore';
import { CIRCLES } from '../../utils/constants';
import { formatEventDate, formatRelative } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { EventResult, FeedCast } from '../../api/types';
import type { RootStackParamList } from '../../navigation/types';

// ── Types ────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ── Buzz cast card ──────────────────────────────────────────────────

function BuzzCard({ cast, index }: { cast: FeedCast; index: number }) {
  const authorName = cast.author.displayName || cast.author.username;
  const initial = authorName.charAt(0).toUpperCase();

  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400).springify()}>
      <GlassCard variant="subtle" style={buzzStyles.card}>
        <View style={buzzStyles.header}>
          <View style={buzzStyles.avatar}>
            <Text style={buzzStyles.avatarText}>{initial}</Text>
          </View>
          <View style={buzzStyles.authorInfo}>
            <Text style={buzzStyles.authorName} numberOfLines={1}>
              {authorName}
            </Text>
            <Text style={buzzStyles.time}>{formatRelative(cast.timestamp)}</Text>
          </View>
        </View>
        <Text style={buzzStyles.text} numberOfLines={3}>
          {cast.text}
        </Text>
        <View style={buzzStyles.reactions}>
          <View style={buzzStyles.reactionItem}>
            <Ionicons name="heart-outline" size={12} color={colors.text.tertiary} />
            <Text style={buzzStyles.reactionCount}>{cast.reactions.likes}</Text>
          </View>
          <View style={buzzStyles.reactionItem}>
            <Ionicons name="repeat-outline" size={12} color={colors.text.tertiary} />
            <Text style={buzzStyles.reactionCount}>{cast.reactions.recasts}</Text>
          </View>
          <View style={buzzStyles.reactionItem}>
            <Ionicons name="chatbubble-outline" size={12} color={colors.text.tertiary} />
            <Text style={buzzStyles.reactionCount}>{cast.replies.count}</Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ── Event card ──────────────────────────────────────────────────────

function EventCard({
  item,
  index,
  onPress,
}: {
  item: EventResult;
  index: number;
  onPress: () => void;
}) {
  const sourceBadgeColor = (source: string): string => {
    switch (source.toLowerCase()) {
      case 'luma':
        return colors.accent.cyan;
      case 'eventbrite':
        return colors.accent.amber;
      case 'partiful':
        return colors.accent.rose;
      default:
        return colors.accent.secondary;
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(400).springify()}>
      <GlassCard
        variant="subtle"
        onPress={onPress}
        style={styles.eventCard}
      >
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.metaText}>{formatEventDate(item.startTime)}</Text>
          </View>

          {item.locationName ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.locationName}
              </Text>
            </View>
          ) : null}

          <View style={styles.badgeRow}>
            <GlassPill label={item.source} color={sourceBadgeColor(item.source)} />
            {item.isFree ? (
              <GlassPill label="Free" color={colors.accent.emerald} />
            ) : null}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const {
    isLoading,
    selectedCategories,
    searchQuery,
    setCategories,
    setSearch,
    fetchEvents,
    filteredEvents,
  } = useEventsStore();
  const { casts, fetchFeed } = useFeedStore();

  // Scroll offset for animated header
  const scrollOffset = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  // ── Initial fetch ─────────────────────────────────────────────────

  useEffect(() => {
    fetchEvents();
    fetchFeed();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [selectedCategories]);

  // ── Handlers ──────────────────────────────────────────────────────

  const toggleCategory = useCallback(
    (id: string) => {
      const next = selectedCategories.includes(id)
        ? selectedCategories.filter((c) => c !== id)
        : [...selectedCategories, id];
      setCategories(next);
      haptics.select();
    },
    [selectedCategories, setCategories]
  );

  const handleEventPress = useCallback(
    (eventId: string) => {
      haptics.tap();
      navigation.navigate('EventDetail', { eventId });
    },
    [navigation]
  );

  const handleRefresh = useCallback(() => {
    fetchEvents();
    fetchFeed();
  }, [fetchEvents, fetchFeed]);

  const events = filteredEvents();

  // Header occupies space — push content below it
  // Large title height: safeArea + 48 collapsed + 52 large title = ~148
  const headerHeight = insets.top + 48 + 52;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Animated collapsing glass header */}
      <AnimatedHeader title="Discover" scrollOffset={scrollOffset} />

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
            progressBackgroundColor={colors.background.depth1}
            progressViewOffset={headerHeight}
          />
        }
      >
        {/* ── Search ───────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.searchWrap}
        >
          <GlassInput
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
            icon={
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.text.tertiary}
              />
            }
          />
        </Animated.View>

        {/* ── Filter chips ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}
          >
            {CIRCLES.map((circle) => (
              <GlassPill
                key={circle.id}
                label={`${circle.emoji} ${circle.label}`}
                active={selectedCategories.includes(circle.id)}
                onPress={() => toggleCategory(circle.id)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Buzz section ─────────────────────────────────── */}
        {casts.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(150).duration(400)}
            style={styles.buzzSection}
          >
            <View style={styles.buzzHeader}>
              <Ionicons name="radio-outline" size={18} color={colors.accent.cyan} />
              <Text style={styles.buzzTitle}>Buzz</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.buzzScroll}
            >
              {casts.map((cast, i) => (
                <BuzzCard key={cast.hash} cast={cast} index={i} />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Event list ───────────────────────────────────── */}
        {isLoading && events.length === 0 ? (
          // Skeleton loading state
          <View style={styles.skeletonWrap}>
            {[0, 1, 2, 3].map((i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.delay(i * 80).duration(400)}
              >
                <SkeletonEventCard />
              </Animated.View>
            ))}
          </View>
        ) : events.length > 0 ? (
          events.map((event, i) => (
            <EventCard
              key={event.id}
              item={event}
              index={i}
              onPress={() => handleEventPress(event.id)}
            />
          ))
        ) : (
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.emptyState}
          >
            <Ionicons name="calendar-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptyHint}>
              Try adjusting your filters or pull to refresh
            </Text>
          </Animated.View>
        )}
      </AnimatedScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + 80, // extra for tab bar
  },

  // Search
  searchWrap: {
    paddingTop: spacing.md,
  },

  // Chips
  chipScroll: {
    flexGrow: 0,
    marginTop: spacing.md,
    marginHorizontal: -spacing.md, // bleed to screen edges
  },
  chipRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },

  // Event cards
  eventCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventContent: {
    gap: spacing.xs + 2,
  },
  eventTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  // Buzz section
  buzzSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  buzzHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  buzzTitle: {
    ...typography.headline,
    color: colors.accent.cyan,
  },
  buzzScroll: {
    gap: spacing.sm,
  },

  // Skeleton loading
  skeletonWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
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

// ── Buzz card styles ───────────────────────────────────────────────

const BUZZ_CARD_WIDTH = 220;
const BUZZ_AVATAR_SIZE = 28;

const buzzStyles = StyleSheet.create({
  card: {
    width: BUZZ_CARD_WIDTH,
    padding: spacing.sm + spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: BUZZ_AVATAR_SIZE,
    height: BUZZ_AVATAR_SIZE,
    borderRadius: BUZZ_AVATAR_SIZE / 2,
    backgroundColor: colors.accent.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.primary,
  },
  time: {
    ...typography.micro,
    color: colors.text.tertiary,
    fontSize: 10,
    letterSpacing: 0,
    textTransform: 'none',
  },
  text: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  reactions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reactionCount: {
    ...typography.micro,
    color: colors.text.tertiary,
    fontSize: 10,
    letterSpacing: 0,
    textTransform: 'none',
  },
});
