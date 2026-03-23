import { Feather } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type React from 'react'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { EventCard } from '@/components/events/EventCard'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileInfo } from '@/components/profile/ProfileInfo'
import { ProfileStats } from '@/components/profile/ProfileStats'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  useGetFreestyleStatsQuery,
  useGetMyDanceBondsQuery,
  useGetMyRegisteredEventsQuery,
  useGetOrganizerEventsQuery,
  useGetUserByIdQuery,
} from '@/generated/graphql'
import type { RootStackNavigationProp, RootStackRouteProp } from '@/types/navigation'
import { LinearGradientCompat as LinearGradient } from '@/utils/platformUtils'

export const UserProfileScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'UserProfile'>>()
  const route = useRoute<RootStackRouteProp<'UserProfile'>>()
  const { theme } = useTheme()
  const c = theme.colors
  const { user: currentUser } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  // Use GraphQL to fetch user profile
  const {
    data: userData,
    loading,
    refetch,
  } = useGetUserByIdQuery({
    variables: { id: route.params?.userId || '' },
    skip: !route.params?.userId || !!route.params?.user,
    fetchPolicy: 'cache-first',
  })

  // Use provided user or fetched user
  const profileUser = route.params?.user || userData?.user || null

  const isOwnProfile = currentUser?.privy_id === profileUser?.privy_id

  // Fetch user's joined events
  const { data: userEventsData, refetch: refetchUserEvents } = useGetMyRegisteredEventsQuery({
    skip: !isOwnProfile,
    fetchPolicy: 'cache-first',
  })

  // Fetch events created by organizer
  const { data: organizerEventsData, refetch: refetchOrganizerEvents } = useGetOrganizerEventsQuery(
    {
      variables: { organizerId: profileUser?.privy_id || '' },
      skip:
        !profileUser?.privy_id ||
        profileUser?.role !== 'organizer' ||
        profileUser?.is_organizer_approved !== true,
      fetchPolicy: 'cache-first',
    },
  )

  // Fetch freestyle stats for own profile
  const { data: freestyleStatsData, refetch: refetchFreestyleStats } = useGetFreestyleStatsQuery({
    skip: !isOwnProfile,
    fetchPolicy: 'cache-first',
  })

  // Fetch dance bonds for own profile
  const { data: danceBondsData, refetch: refetchDanceBonds } = useGetMyDanceBondsQuery({
    skip: !isOwnProfile,
    fetchPolicy: 'cache-first',
  })

  // Map freestyle stats to wallet data format
  const wallet = {
    balance: freestyleStatsData?.myFreestyleStats?.total_points || 0,
    streak: freestyleStatsData?.myFreestyleStats?.current_streak || 0,
    todayEarnings: 0, // Not available in freestyle stats
    weeklyEarnings: 0, // Not available in freestyle stats
    totalEarnings: freestyleStatsData?.myFreestyleStats?.total_points || 0,
    bestStreak: freestyleStatsData?.myFreestyleStats?.longest_streak || 0,
    lastActiveDate: freestyleStatsData?.myFreestyleStats?.last_session_date || new Date().toISOString(),
  }

  const totalSessions = freestyleStatsData?.myFreestyleStats?.total_sessions || 0

  // Map GraphQL dance bonds to the AppContext DanceBond format for ProfileStats
  const danceBonds: any[] = (danceBondsData?.myDanceBonds || []).map(bond => ({
    id: bond.id,
    partnerId: bond.user1_id === currentUser?.privy_id ? bond.user2_id : bond.user1_id,
    partnerName: bond.otherUser?.display_name || bond.otherUser?.username || 'Unknown',
    bondLevel: bond.bond_level,
    sharedSessions: bond.shared_sessions || 0,
    createdAt: bond.created_at,
  }))

  useEffect(() => {
    if (!route.params?.user && !route.params?.userId) {
      Alert.alert('Error', 'User information not provided')
      navigation.goBack()
    }
  }, [route.params])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // Refresh all queries with network-only to force fresh data
      await Promise.all([
        refetch(),
        isOwnProfile && refetchUserEvents ? refetchUserEvents() : Promise.resolve(),
        isOwnProfile && refetchFreestyleStats ? refetchFreestyleStats() : Promise.resolve(),
        isOwnProfile && refetchDanceBonds ? refetchDanceBonds() : Promise.resolve(),
        profileUser?.role === 'organizer' && refetchOrganizerEvents
          ? refetchOrganizerEvents()
          : Promise.resolve(),
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleEditProfile = () => {
    navigation.navigate('EditProfile')
  }

  const handleBack = () => {
    navigation.goBack()
  }

  if (loading) {
    return (
      <LinearGradient
        colors={[c.background, c.surface]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>
            Loading profile...
          </Text>
        </View>
      </LinearGradient>
    )
  }

  if (!profileUser) {
    return (
      <LinearGradient
        colors={[c.background, c.surface]}
        style={styles.container}
      >
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            User profile not found
          </Text>
        </View>
      </LinearGradient>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={[c.background, c.surface]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={c.primary}
          />
        }
      >
        <ProfileHeader
          user={profileUser}
          isOwnProfile={isOwnProfile}
          onEditProfilePress={handleEditProfile}
          onBackPress={handleBack}
        />

        <ProfileStats
          wallet={wallet}
          bonds={danceBonds}
          achievements={[]}
          totalSessions={totalSessions}
        />

        <ProfileInfo user={profileUser} />

        {/* Organizer Information Section */}
        {profileUser.role === 'organizer' && profileUser.is_organizer_approved && (
          <View style={styles.organizerSection}>
            <View style={[styles.organizerInfoCard, { backgroundColor: c.surface }]}>
              <View style={styles.organizerHeader}>
                <Feather name="award" size={24} color={c.primary} />
                <Text style={[styles.organizerTitle, { color: c.text }]}>
                  Verified Event Organizer
                </Text>
              </View>

              <View style={styles.organizerDetailsContainer}>
                {profileUser.company_name && (
                  <View style={styles.organizerDetail}>
                    <Feather name="briefcase" size={18} color={c.textSecondary} />
                    <Text style={[styles.organizerDetailText, { color: c.text }]}>
                      {profileUser.company_name}
                    </Text>
                  </View>
                )}

                {profileUser.organizer_bio && (
                  <View style={styles.organizerDetail}>
                    <View style={{ width: 18 }} />
                    <Text
                      style={[
                        styles.organizerDescription,
                        { color: c.textSecondary, flex: 1 },
                      ]}
                    >
                      {profileUser.organizer_bio}
                    </Text>
                  </View>
                )}

                {profileUser.website_url && (
                  <View style={styles.organizerDetail}>
                    <Feather name="globe" size={18} color={c.textSecondary} />
                    <Text style={[styles.organizerDetailText, { color: c.primary }]}>
                      {profileUser.website_url}
                    </Text>
                  </View>
                )}

                {profileUser.event_types && profileUser.event_types.length > 0 && (
                  <View style={[styles.organizerDetail, { marginBottom: 0 }]}>
                    <Feather name="calendar" size={18} color={c.textSecondary} />
                    <View style={styles.eventTypesContainer}>
                      {profileUser.event_types.map((eventType: string, index: number) => (
                        <View
                          key={index}
                          style={[
                            styles.eventTypeTag,
                            { backgroundColor: `${c.primary}20` },
                          ]}
                        >
                          <Text style={[styles.eventTypeTagText, { color: c.primary }]}>
                            {eventType}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={[styles.organizerStats, { borderTopColor: c.glassBorder, backgroundColor: c.glassCard }]}>
                <View style={styles.organizerStat}>
                  <Text style={[styles.organizerStatValue, { color: c.primary }]}>
                    {organizerEventsData?.events?.events?.length || 0}
                  </Text>
                  <Text style={[styles.organizerStatLabel, { color: c.textSecondary }]}>
                    Events Created
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: c.glassBorder }]} />
                <View style={styles.organizerStat}>
                  <Text style={[styles.organizerStatValue, { color: c.primary }]}>
                    {profileUser.total_sessions || 0}
                  </Text>
                  <Text style={[styles.organizerStatLabel, { color: c.textSecondary }]}>
                    Total Sessions
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Events Created by Organizer */}
        {profileUser?.role === 'organizer' &&
          profileUser?.is_organizer_approved &&
          organizerEventsData?.events?.events && (
            <View style={styles.eventsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>
                  Events by Organizer
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('OrganizerEvents', {
                      organizerId: profileUser.privy_id,
                      organizerName:
                        profileUser.display_name || profileUser.username || 'Organizer',
                    })
                  }
                >
                  <Text style={[styles.seeAllText, { color: c.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                horizontal
                data={organizerEventsData.events?.events?.slice(0, 5) || []}
                renderItem={({ item }) => (
                  <View style={styles.eventCardWrapper}>
                    <EventCard
                      event={item}
                      onPress={() =>
                        navigation.navigate('EventDetails', { eventId: item.id, event: item })
                      }
                    />
                  </View>
                )}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsListContent}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                    No events created yet
                  </Text>
                }
              />
            </View>
          )}

        {/* Joined Events Section - Only show for own profile */}
        {isOwnProfile &&
          userEventsData?.events?.events &&
          userEventsData.events.events.length > 0 && (
            <View style={styles.eventsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>Your Events</Text>
                <TouchableOpacity onPress={() => navigation.navigate('UserEvents')}>
                  <Text style={[styles.seeAllText, { color: c.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                horizontal
                data={userEventsData.events.events.slice(0, 5)}
                renderItem={({ item }) => (
                  <View style={styles.eventCardWrapper}>
                    <EventCard
                      event={item}
                      onPress={() =>
                        navigation.navigate('EventDetails', { eventId: item.id, event: item })
                      }
                      isAttending={true}
                    />
                  </View>
                )}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsListContent}
              />
            </View>
          )}

        {/* Add some bottom padding for better scrolling */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
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
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  followButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventCardWrapper: {
    width: 280,
    marginRight: 12,
  },
  eventsListContent: {
    paddingHorizontal: 20,
  },
  organizerSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  organizerInfoCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  organizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  organizerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  organizerDetailsContainer: {
    marginBottom: 0,
  },
  organizerDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 10,
  },
  organizerDetailText: {
    fontSize: 15,
    flex: 1,
  },
  organizerDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 0,
  },
  organizerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    paddingBottom: 4,
    borderTopWidth: 1,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  organizerStat: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  organizerStatValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  organizerStatLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTypesContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  eventTypeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
})
