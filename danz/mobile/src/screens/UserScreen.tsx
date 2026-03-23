import { useNavigation } from '@react-navigation/native'
import type React from 'react'
import { useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ProfileActions } from '../components/profile/ProfileActions'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfileInfo } from '../components/profile/ProfileInfo'
import { ProfileStats } from '../components/profile/ProfileStats'
import type { DanceBond, WalletData } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useGetFreestyleStatsQuery, useGetMyDanceBondsQuery } from '../generated/graphql'
import { LinearGradientCompat as LinearGradient } from '../utils/platformUtils'

export const UserScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { theme } = useTheme()
  const { user, logout, refreshUser } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  // Fetch real stats from backend
  const { data: statsData, refetch: refetchStats } = useGetFreestyleStatsQuery()
  const { data: bondsData, refetch: refetchBonds } = useGetMyDanceBondsQuery()

  // Map stats to wallet data structure
  const freestyleStats = statsData?.myFreestyleStats
  const wallet: WalletData = {
    balance: freestyleStats?.total_points || 0,
    streak: freestyleStats?.current_streak || 0,
    todayEarnings: 0, // Would need a separate query for today's earnings
    weeklyEarnings: 0, // Would need a separate query
    totalEarnings: freestyleStats?.total_points || 0,
    bestStreak: freestyleStats?.longest_streak || 0,
    lastActiveDate: freestyleStats?.last_session_date || new Date().toISOString(),
  }

  // Map dance bonds to expected format
  const danceBonds: DanceBond[] = (bondsData?.myDanceBonds || []).map(bond => ({
    id: bond.id,
    partnerId: bond.user1_id === user?.privy_id ? bond.user2_id : bond.user1_id,
    partnerName: bond.otherUser?.display_name || bond.otherUser?.username || 'Unknown',
    partnerAvatar: bond.otherUser?.avatar_url || undefined,
    level: bond.bond_level || 1,
    sharedSessions: bond.shared_sessions || 0,
    createdAt: new Date(bond.created_at),
  }))

  const totalSessions = freestyleStats?.total_sessions || 0

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // Refresh all data in parallel
      await Promise.all([refreshUser(), refetchStats(), refetchBonds()])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleEditProfile = () => {
    navigation.navigate('EditProfile')
  }

  const handleSettings = () => {
    navigation.navigate('Settings')
  }

  const handleWallet = () => {
    navigation.navigate('Wallet')
  }

  const handleSignOut = async () => {
    try {
      await logout()
    } catch {
      Alert.alert('Error', 'Failed to sign out. Please try again.')
    }
  }

  const handleViewProfile = () => {
    if (user) {
      navigation.navigate('UserProfile', { userId: user.privy_id, user })
    }
  }

  const handleAchievements = () => {
    navigation.navigate('Achievements')
  }

  if (!user) {
    return (
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Please sign in to view your profile
          </Text>
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <ProfileHeader user={user} isOwnProfile={true} onEditProfilePress={handleEditProfile} />

        <ProfileStats
          wallet={wallet}
          bonds={danceBonds}
          achievements={[]}
          totalSessions={totalSessions}
          onAchievementsPress={handleAchievements}
        />

        <ProfileInfo user={user} />

        <ProfileActions
          isOwnProfile={true}
          onViewProfile={handleViewProfile}
          onEditProfile={handleEditProfile}
          onSettings={handleSettings}
          onWallet={handleWallet}
          onSignOut={handleSignOut}
        />
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
})
