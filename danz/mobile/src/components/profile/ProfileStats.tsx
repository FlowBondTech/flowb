import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import type React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { Achievement, DanceBond, WalletData } from '../../contexts/AppContext'
import { useTheme } from '../../contexts/ThemeContext'

interface ProfileStatsProps {
  wallet?: WalletData | null
  bonds?: DanceBond[]
  achievements?: Achievement[]
  totalSessions?: number
  onAchievementsPress?: () => void
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  wallet,
  bonds = [],
  achievements = [],
  totalSessions = 0,
  onAchievementsPress,
}) => {
  const { theme } = useTheme()

  const stats = [
    {
      id: 'streak',
      icon: 'fire',
      iconType: 'material',
      label: 'Streak',
      value: wallet?.streak || 0,
      suffix: 'days',
      color: '#FF6B6B',
    },
    {
      id: 'danz',
      icon: 'cash',
      iconType: 'material',
      label: 'DANZ',
      value: wallet?.balance || 0,
      suffix: '',
      color: '#FFD93D',
    },
    {
      id: 'bonds',
      icon: 'people',
      iconType: 'ionicons',
      label: 'Bonds',
      value: bonds.length,
      suffix: '',
      color: '#6BCF7F',
    },
    {
      id: 'achievements',
      icon: 'medal',
      iconType: 'ionicons',
      label: 'Achievements',
      value: achievements.filter(a => a.unlockedAt).length,
      suffix: '',
      color: '#A78BFA',
      onPress: onAchievementsPress,
    },
  ]

  return (
    <View style={styles.container}>
      <View style={[styles.statsGrid, { backgroundColor: theme.colors.surface }]}>
        {stats.map((stat, index) => {
          const StatContent = (
            <>
              <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
                {stat.iconType === 'material' ? (
                  <MaterialCommunityIcons name={stat.icon as any} size={24} color={stat.color} />
                ) : (
                  <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                )}
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {stat.value.toLocaleString()}
                  {stat.suffix && (
                    <Text style={[styles.statSuffix, { color: theme.colors.textSecondary }]}>
                      {' '}
                      {stat.suffix}
                    </Text>
                  )}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  {stat.label}
                  {stat.onPress && ' →'}
                </Text>
              </View>
            </>
          )

          if (stat.onPress) {
            return (
              <TouchableOpacity key={stat.id} style={styles.statItem} onPress={stat.onPress}>
                {StatContent}
              </TouchableOpacity>
            )
          }

          return (
            <View key={stat.id} style={styles.statItem}>
              {StatContent}
            </View>
          )
        })}
      </View>

      <View style={[styles.additionalStats, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.additionalStatItem}>
          <Text style={[styles.additionalStatValue, { color: theme.colors.primary }]}>
            {totalSessions}
          </Text>
          <Text style={[styles.additionalStatLabel, { color: theme.colors.textSecondary }]}>
            Total Sessions
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.additionalStatItem}>
          <Text style={[styles.additionalStatValue, { color: theme.colors.primary }]}>
            {wallet?.totalEarnings || 0}
          </Text>
          <Text style={[styles.additionalStatLabel, { color: theme.colors.textSecondary }]}>
            Total Earned
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.additionalStatItem}>
          <Text style={[styles.additionalStatValue, { color: theme.colors.primary }]}>
            {wallet?.bestStreak || 0}
          </Text>
          <Text style={[styles.additionalStatLabel, { color: theme.colors.textSecondary }]}>
            Best Streak
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statSuffix: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  additionalStats: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  additionalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  additionalStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  additionalStatLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 8,
  },
})
