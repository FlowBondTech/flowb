import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { EventCard } from '../components/events/EventCard'
import { useTheme } from '../contexts/ThemeContext'
import {
  EventSortBy,
  EventStatus,
  useGetEventsQuery,
  useGetFreestyleStatsQuery,
} from '../generated/graphql'
import { hexToRgba } from '../styles/designSystem'
import { fs, hs, ms, vs } from '../utils/responsive'

// Move AnimatedCard component outside to avoid recreation on every render
const AnimatedCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const cardAnim = useRef(new Animated.Value(0)).current
  const cardSlide = useRef(new Animated.Value(30)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(cardSlide, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start()
    }, delay)

    return () => clearTimeout(timer)
  }, [cardAnim, cardSlide, delay])

  return (
    <Animated.View
      style={{
        opacity: cardAnim,
        transform: [{ translateY: cardSlide }],
      }}
    >
      {children}
    </Animated.View>
  )
}

export const HomeScreen = () => {
  const navigation = useNavigation<any>()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { theme } = useTheme()
  const c = theme.colors
  const isSmallScreen = width < 350
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  // Fetch upcoming events (includes both upcoming and ongoing - events that haven't ended)
  const { data: eventsData, loading: eventsLoading } = useGetEventsQuery({
    variables: {
      filter: {
        status: EventStatus.Upcoming, // Backend now returns all events that haven't ended
      },
      sortBy: EventSortBy.DateAsc, // Sort by date ascending to get soonest events first
    },
  })

  // Fetch freestyle stats (streak, points, sessions)
  const { data: statsData } = useGetFreestyleStatsQuery()

  const upcomingEvents = eventsData?.events?.events || []

  // Use real stats from database
  const freestyleStats = statsData?.myFreestyleStats
  const completedToday = statsData?.completedFreestyleToday ?? false
  const todayMinutes = freestyleStats ? Math.round(freestyleStats.total_duration_seconds / 60) : 0
  const totalPoints = freestyleStats?.total_points ?? 0
  const sessionsThisWeek = freestyleStats?.sessions_this_week ?? 0
  const streak = freestyleStats?.current_streak ?? 0

  // Animation for daily reminder
  const reminderPulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!completedToday) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(reminderPulse, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(reminderPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    }
  }, [completedToday, reminderPulse])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, slideAnim])

  const handleDanceNow = () => {
    navigation.navigate('FreestyleSession')
  }

  // Glass card wrapper: BlurView on native, plain View on web
  const GlassCard = ({
    children,
    style,
  }: {
    children: React.ReactNode
    style?: any
  }) => {
    if (Platform.OS !== 'web') {
      return (
        <View style={[{ borderRadius: ms(22), overflow: 'hidden' }, style]}>
          <BlurView intensity={theme.glass.blur} tint={theme.glass.tint}>
            {children}
          </BlurView>
        </View>
      )
    }
    return <View style={style}>{children}</View>
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />
      <LinearGradient
        colors={[c.background, c.surface, c.background]}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.headerTop}>
              <Image
                source={require('../../assets/DANZ LOGO.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={() => navigation.navigate('Notifications' as never)}
                >
                  <Ionicons name="notifications-outline" size={ms(24)} color={c.text} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Progress Card */}
          <AnimatedCard delay={200}>
            <GlassCard
              style={{
                marginHorizontal: hs(20),
                marginBottom: vs(20),
              }}
            >
              <View
                style={[
                  styles.progressCard,
                  {
                    backgroundColor: c.glassCard,
                    borderColor: c.glassBorder,
                  },
                ]}
              >
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressTitle, { color: c.textSecondary }]}>
                    Your Journey
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                    <MaterialCommunityIcons
                      name="trophy-outline"
                      size={ms(20)}
                      color={c.secondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.mainStreak}>
                  <MaterialCommunityIcons name="fire" size={ms(40)} color={c.primary} />
                  <Text style={[styles.streakAmount, { color: c.text }]}>{streak}</Text>
                  <Text style={[styles.streakText, { color: c.textSecondary }]}>Day Streak</Text>
                </View>

                <View style={styles.progressStats}>
                  <View style={styles.progressStat}>
                    <Text
                      style={[styles.progressStatLabel, { color: c.textMuted }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {isSmallScreen ? 'Sessions' : 'This Week'}
                    </Text>
                    <Text
                      style={[styles.progressStatValue, { color: c.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {sessionsThisWeek}
                    </Text>
                  </View>
                  <View
                    style={[styles.progressStatDivider, { backgroundColor: c.glassBorder }]}
                  />
                  <View style={styles.progressStat}>
                    <Text
                      style={[styles.progressStatLabel, { color: c.textMuted }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {isSmallScreen ? 'Pts' : 'Total Points'}
                    </Text>
                    <Text
                      style={[styles.progressStatValue, { color: c.secondary }]}
                      numberOfLines={1}
                    >
                      {totalPoints.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </AnimatedCard>

          {/* Daily Reminder Banner - show when user hasn't danced today */}
          {!completedToday && (
            <AnimatedCard delay={250}>
              <Animated.View style={{ transform: [{ scale: reminderPulse }] }}>
                <TouchableOpacity onPress={handleDanceNow} activeOpacity={0.9}>
                  <LinearGradient
                    colors={[c.primary, c.secondary, c.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.reminderBanner, { borderColor: c.glassBorder }]}
                  >
                    <View style={styles.reminderContent}>
                      <MaterialCommunityIcons name="fire" size={ms(32)} color="white" />
                      <View style={styles.reminderTextContainer}>
                        <Text style={styles.reminderTitle}>Time to Danz!</Text>
                        <Text style={styles.reminderSubtitle}>
                          {streak > 0
                            ? `Keep your ${streak}-day streak alive!`
                            : 'Start your streak today!'}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={ms(24)} color="white" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </AnimatedCard>
          )}

          {/* Quick Actions */}
          <AnimatedCard delay={300}>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleDanceNow}>
                <LinearGradient
                  colors={[c.primary, c.secondary]}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons name="fire" size={ms(28)} color="white" />
                  <Text style={styles.actionText}>Danz Now!</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('FindEventsNearYou')}
              >
                <LinearGradient
                  colors={[c.secondary, c.primary]}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons name="map-marker" size={ms(28)} color="white" />
                  <Text style={styles.actionText}>Find Events</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {/* Explore Section */}
          <AnimatedCard delay={350}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Explore</Text>
              <View style={styles.exploreGrid}>
                <TouchableOpacity
                  style={[
                    styles.exploreItem,
                    { backgroundColor: c.glassCard, borderColor: c.glassBorder },
                  ]}
                  onPress={() => navigation.navigate('Leaderboard')}
                >
                  <View
                    style={[
                      styles.exploreIcon,
                      { backgroundColor: hexToRgba(c.accent, 0.12) },
                    ]}
                  >
                    <Ionicons name="trophy" size={ms(22)} color={c.accent} />
                  </View>
                  <Text style={[styles.exploreLabel, { color: c.text }]}>Leaderboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.exploreItem,
                    { backgroundColor: c.glassCard, borderColor: c.glassBorder },
                  ]}
                  onPress={() => navigation.navigate('Challenges')}
                >
                  <View
                    style={[
                      styles.exploreIcon,
                      { backgroundColor: hexToRgba(c.success, 0.12) },
                    ]}
                  >
                    <Ionicons name="flash" size={ms(22)} color={c.success} />
                  </View>
                  <Text style={[styles.exploreLabel, { color: c.text }]}>Challenges</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.exploreItem,
                    { backgroundColor: c.glassCard, borderColor: c.glassBorder },
                  ]}
                  onPress={() => navigation.navigate('Gigs')}
                >
                  <View
                    style={[
                      styles.exploreIcon,
                      { backgroundColor: hexToRgba(c.secondary, 0.12) },
                    ]}
                  >
                    <Ionicons name="briefcase" size={ms(22)} color={c.secondary} />
                  </View>
                  <Text style={[styles.exploreLabel, { color: c.text }]}>Gigs</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.exploreItem,
                    { backgroundColor: c.glassCard, borderColor: c.glassBorder },
                  ]}
                  onPress={() => navigation.navigate('Checkin')}
                >
                  <View
                    style={[
                      styles.exploreIcon,
                      { backgroundColor: hexToRgba(c.info, 0.12) },
                    ]}
                  >
                    <Ionicons name="qr-code" size={ms(22)} color={c.info} />
                  </View>
                  <Text style={[styles.exploreLabel, { color: c.text }]}>Check In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedCard>

          {/* Today's Activity */}
          <AnimatedCard delay={400}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Today's Activity</Text>

              <View
                style={[
                  styles.activityCard,
                  { backgroundColor: c.glassCard, borderColor: c.glassBorder },
                ]}
              >
                <View style={styles.activityRow}>
                  <View style={styles.activityItem}>
                    <MaterialCommunityIcons name="fire" size={ms(24)} color={c.primary} />
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityValue, { color: c.text }]} numberOfLines={1}>
                        {todayMinutes}
                      </Text>
                      <Text
                        style={[styles.activityLabel, { color: c.textMuted }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {isSmallScreen ? 'Min' : 'Minutes'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.activityItem}>
                    <MaterialCommunityIcons name="star" size={ms(24)} color={c.accent} />
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityValue, { color: c.text }]} numberOfLines={1}>
                        {totalPoints}
                      </Text>
                      <Text
                        style={[styles.activityLabel, { color: c.textMuted }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {isSmallScreen ? 'Pts' : 'Points'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.activityItem}>
                    <MaterialCommunityIcons
                      name="playlist-check"
                      size={ms(24)}
                      color={c.secondary}
                    />
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityValue, { color: c.text }]} numberOfLines={1}>
                        {freestyleStats?.total_sessions ?? 0}
                      </Text>
                      <Text
                        style={[styles.activityLabel, { color: c.textMuted }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        Sessions
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </AnimatedCard>

          {/* Upcoming Events Section */}
          <AnimatedCard delay={500}>
            <View style={styles.eventsSection}>
              <View style={styles.eventsSectionHeader}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>Upcoming Events</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Events')}>
                  <Text style={[styles.seeAll, { color: c.secondary }]}>See All</Text>
                </TouchableOpacity>
              </View>

              {eventsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={c.secondary} />
                </View>
              ) : upcomingEvents.length > 0 ? (
                <FlatList
                  horizontal
                  data={upcomingEvents.slice(0, 5)}
                  renderItem={({ item }) => (
                    <View style={styles.eventCardWrapper}>
                      <EventCard
                        event={item}
                        onPress={() =>
                          navigation.navigate('EventDetails', { eventId: item.id, event: item })
                        }
                        isAttending={!!item?.is_registered}
                      />
                    </View>
                  )}
                  keyExtractor={item => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventsListContent}
                />
              ) : (
                <View
                  style={[
                    styles.emptyEventsContainer,
                    { backgroundColor: c.glassCard, borderColor: c.glassBorder },
                  ]}
                >
                  <Text style={[styles.emptyEventsText, { color: c.textMuted }]}>
                    No upcoming events
                  </Text>
                  <TouchableOpacity
                    style={[styles.exploreButton, { backgroundColor: c.secondary }]}
                    onPress={() => navigation.navigate('Events')}
                  >
                    <Text style={[styles.exploreButtonText, { color: c.text }]}>
                      Explore Events
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </AnimatedCard>

        </ScrollView>
      </LinearGradient>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: vs(100),
  },
  header: {
    paddingHorizontal: hs(20),
    paddingTop: vs(20),
    paddingBottom: vs(20),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  logoImage: {
    width: vs(45),
    height: vs(40),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(8),
  },
  notificationButton: {
    padding: hs(8),
  },
  progressCard: {
    padding: hs(20),
    borderRadius: ms(22),
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  progressTitle: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  mainStreak: {
    alignItems: 'center',
    marginVertical: vs(16),
  },
  streakAmount: {
    fontSize: fs(42),
    fontWeight: 'bold',
    marginBottom: vs(16),
  },
  streakText: {
    fontSize: fs(14),
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStat: {
    flex: 1,
  },
  progressStatLabel: {
    fontSize: fs(12),
    marginBottom: vs(4),
  },
  progressStatValue: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  progressStatDivider: {
    width: 1,
    height: vs(30),
    marginHorizontal: hs(16),
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: hs(20),
    marginBottom: vs(24),
    gap: hs(12),
  },
  actionButton: {
    flex: 1,
    height: vs(100),
  },
  actionGradient: {
    flex: 1,
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    gap: vs(8),
  },
  actionText: {
    fontSize: fs(14),
    color: 'white',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: hs(20),
    marginBottom: vs(24),
  },
  sectionTitle: {
    fontSize: fs(20),
    fontWeight: 'bold',
    marginBottom: vs(16),
  },
  seeAll: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  activityCard: {
    borderRadius: ms(16),
    padding: hs(20),
    borderWidth: 1,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  activityItem: {
    flex: 1,
    alignItems: 'center',
    gap: vs(8),
  },
  activityInfo: {
    alignItems: 'center',
  },
  activityValue: {
    fontSize: fs(24),
    fontWeight: 'bold',
  },
  activityLabel: {
    fontSize: fs(12),
    marginTop: vs(2),
  },
  eventCardWrapper: {
    width: hs(280),
    marginRight: hs(12),
  },
  eventsSection: {
    marginBottom: vs(20),
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: hs(20),
    marginBottom: vs(16),
  },
  eventsListContent: {
    paddingHorizontal: hs(20),
  },
  loadingContainer: {
    height: vs(200),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEventsContainer: {
    height: vs(150),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ms(16),
    borderWidth: 1,
    marginHorizontal: hs(20),
  },
  emptyEventsText: {
    fontSize: fs(16),
    marginBottom: vs(16),
  },
  exploreButton: {
    paddingHorizontal: hs(24),
    paddingVertical: vs(10),
    borderRadius: ms(20),
  },
  exploreButtonText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  reminderBanner: {
    marginHorizontal: hs(20),
    marginBottom: vs(16),
    padding: hs(16),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(12),
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: fs(18),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: vs(2),
  },
  reminderSubtitle: {
    fontSize: fs(13),
    color: 'rgba(255, 255, 255, 0.9)',
  },
  exploreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: hs(12),
  },
  exploreItem: {
    width: '47%',
    borderRadius: ms(16),
    padding: hs(16),
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(12),
  },
  exploreIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  exploreLabel: {
    fontSize: fs(14),
    fontWeight: '600',
    flex: 1,
  },
})
