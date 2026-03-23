import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { useGetFreestyleSessionsQuery, useGetFreestyleStatsQuery } from '../generated/graphql'
import { designSystem } from '../styles/designSystem'

interface SessionItemProps {
  session: {
    id: string
    duration_seconds: number
    movement_score: number
    points_awarded: number
    session_date: string
    completed: boolean
  }
}

const SessionItem: React.FC<SessionItemProps> = ({ session }) => {
  const date = new Date(session.session_date)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const minutes = Math.floor(session.duration_seconds / 60)
  const seconds = session.duration_seconds % 60

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.timeText}>{formattedTime}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            session.completed ? styles.completedBadge : styles.incompleteBadge,
          ]}
        >
          <Text style={styles.statusText}>{session.completed ? 'Completed' : 'Incomplete'}</Text>
        </View>
      </View>

      <View style={styles.sessionStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="timer-outline" size={20} color="#B967FF" />
          <Text style={styles.statValue}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>

        <View style={styles.statItem}>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD700" />
          <Text style={styles.statValue}>{Math.round(session.movement_score)}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>

        <View style={styles.statItem}>
          <MaterialCommunityIcons name="star" size={20} color="#FF6B6B" />
          <Text style={styles.statValue}>+{session.points_awarded}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>
    </View>
  )
}

export const SessionHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { theme } = useTheme()

  const {
    data: sessionsData,
    loading,
    refetch,
    fetchMore,
  } = useGetFreestyleSessionsQuery({
    variables: { limit: 20, offset: 0 },
  })

  const { data: statsData } = useGetFreestyleStatsQuery()

  const sessions = sessionsData?.myFreestyleSessions || []
  const stats = statsData?.myFreestyleStats

  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch({ limit: 20, offset: 0 })
    setRefreshing(false)
  }

  const handleLoadMore = () => {
    if (sessions.length >= 20) {
      fetchMore({
        variables: { limit: 20, offset: sessions.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          return {
            myFreestyleSessions: [
              ...prev.myFreestyleSessions,
              ...fetchMoreResult.myFreestyleSessions,
            ],
          }
        },
      })
    }
  }

  const renderHeader = () => (
    <View style={styles.summaryCard}>
      <LinearGradient
        colors={['rgba(185, 103, 255, 0.2)', 'rgba(255, 20, 147, 0.1)']}
        style={styles.summaryGradient}
      >
        <Text style={styles.summaryTitle}>Your Dance Journey</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats?.total_sessions || 0}</Text>
            <Text style={styles.summaryLabel}>Sessions</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {Math.floor((stats?.total_duration_seconds || 0) / 60)}
            </Text>
            <Text style={styles.summaryLabel}>Minutes</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats?.total_points || 0}</Text>
            <Text style={styles.summaryLabel}>Points</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="dance-ballroom" size={64} color="rgba(255,255,255,0.3)" />
      <Text style={styles.emptyTitle}>No Sessions Yet</Text>
      <Text style={styles.emptyText}>Start dancing to see your session history here!</Text>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: designSystem.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            navigation.goBack()
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !sessions.length ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B967FF" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <SessionItem session={item} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#B967FF" />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: designSystem.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(185, 103, 255, 0.3)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: designSystem.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#B967FF',
  },
  summaryLabel: {
    fontSize: 12,
    color: designSystem.colors.textSecondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: designSystem.colors.text,
  },
  timeText: {
    fontSize: 14,
    color: designSystem.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  incompleteBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4ADE80',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: designSystem.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: designSystem.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: designSystem.colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: designSystem.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
})
