import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useGetMyReferralStatsQuery, useGetMyReferralsQuery } from '@/generated/graphql'

export const ReferralScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { theme } = useTheme()
  const c = theme.colors
  const { user } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Fetch referral stats and code from GraphQL
  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useGetMyReferralStatsQuery()

  // Fetch referrals list from GraphQL
  const {
    data: referralsData,
    loading: referralsLoading,
    refetch: refetchReferrals,
  } = useGetMyReferralsQuery({
    variables: { limit: 50 },
  })

  // Extract data from queries
  const referralCode = statsData?.myReferralCode?.referral_code || user?.username || 'loading...'
  const shareUrl = statsData?.myReferralCode?.share_url || `https://danz.now/i/${referralCode}`

  const stats = {
    totalSignups: statsData?.myReferralStats?.total_signups || 0,
    totalCompleted: statsData?.myReferralStats?.total_completed || 0,
    totalPointsEarned: statsData?.myReferralStats?.total_points_earned || 0,
    conversionRate: statsData?.myReferralStats?.conversion_rate || 0,
  }

  const referrals = referralsData?.myReferrals || []
  const loading = statsLoading || referralsLoading

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchStats(), refetchReferrals()])
    setRefreshing(false)
  }

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    await Clipboard.setStringAsync(text)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    if (type === 'code') {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } else {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on DANZ! Dance your way to fitness and earn rewards.\n\nUse my referral link: ${shareUrl}`,
        title: 'Join DANZ',
      })
    } catch (error) {
      console.error('Share error:', error)
    }
  }

  const handleWhatsAppShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const message = encodeURIComponent(
      `Join me on DANZ! Dance your way to fitness and earn rewards.\n\nUse my referral link: ${shareUrl}`,
    )
    const url = `whatsapp://send?text=${message}`
    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      await Linking.openURL(url)
    } else {
      Alert.alert('WhatsApp not available', 'Install WhatsApp to share directly')
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>Referral Program</Text>
          <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
            Earn 20 points for each friend who joins!
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: c.glassCard, borderColor: c.glassBorder },
            ]}
          >
            <MaterialCommunityIcons name="account-group" size={24} color={c.primary} />
            <Text style={[styles.statValue, { color: c.text }]}>{stats.totalSignups}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Signups</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: c.glassCard, borderColor: c.glassBorder },
            ]}
          >
            <MaterialCommunityIcons name="check-circle" size={24} color={c.success} />
            <Text style={[styles.statValue, { color: c.text }]}>{stats.totalCompleted}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Completed</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: c.glassCard, borderColor: c.glassBorder },
            ]}
          >
            <MaterialCommunityIcons name="star" size={24} color={c.warning} />
            <Text style={[styles.statValue, { color: c.text }]}>{stats.totalPointsEarned}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Points Earned</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: c.glassCard, borderColor: c.glassBorder },
            ]}
          >
            <MaterialCommunityIcons name="trending-up" size={24} color={c.accent} />
            <Text style={[styles.statValue, { color: c.text }]}>{stats.conversionRate}%</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Rate</Text>
          </View>
        </View>

        {/* Referral Code Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Your Referral Code</Text>
          <View
            style={[
              styles.codeCard,
              { backgroundColor: c.glassCard, borderColor: c.glassBorder },
            ]}
          >
            <View style={styles.codeContainer}>
              <Text style={[styles.codeText, { color: c.primary }]}>{referralCode}</Text>
              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: `${c.primary}1A` }]}
                onPress={() => copyToClipboard(referralCode, 'code')}
              >
                {copiedCode ? (
                  <MaterialCommunityIcons name="check" size={20} color={c.success} />
                ) : (
                  <MaterialCommunityIcons name="content-copy" size={20} color={c.primary} />
                )}
                <Text
                  style={[
                    styles.copyButtonText,
                    { color: c.primary },
                    copiedCode && { color: c.success },
                  ]}
                >
                  {copiedCode ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.linkContainer, { borderTopColor: c.glassBorder }]}>
              <Text style={[styles.linkLabel, { color: c.textSecondary }]}>Referral Link</Text>
              <View style={styles.linkRow}>
                <Text style={[styles.linkText, { color: c.text }]} numberOfLines={1}>
                  {shareUrl}
                </Text>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: `${c.primary}1A` }]}
                  onPress={() => copyToClipboard(shareUrl, 'link')}
                >
                  {copiedLink ? (
                    <MaterialCommunityIcons name="check" size={20} color={c.success} />
                  ) : (
                    <MaterialCommunityIcons name="content-copy" size={20} color={c.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Share Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Share Via</Text>
          <View style={styles.shareOptions}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <LinearGradient
                colors={[c.primary, c.accent]}
                style={styles.shareButtonGradient}
              >
                <Ionicons name="share-social" size={24} color="white" />
                <Text style={styles.shareButtonText}>Share Link</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.shareButtonOutline,
                { borderColor: c.glassBorder, backgroundColor: c.glassCard },
              ]}
              onPress={handleWhatsAppShare}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={[styles.shareButtonOutlineText, { color: c.text }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>How Points Work</Text>
          <View
            style={[
              styles.howItWorksCard,
              { backgroundColor: c.glassCard, borderColor: c.glassBorder },
            ]}
          >
            <View style={styles.pointsRow}>
              <View style={[styles.pointsBadge, { backgroundColor: `${c.success}33` }]}>
                <Text style={[styles.pointsValue, { color: c.success }]}>+20</Text>
              </View>
              <Text style={[styles.pointsLabel, { color: c.text }]}>Each completed referral</Text>
            </View>
            <View style={styles.pointsRow}>
              <View style={[styles.pointsBadge, { backgroundColor: `${c.accent}33` }]}>
                <Text style={[styles.pointsValue, { color: c.accent }]}>+5</Text>
              </View>
              <Text style={[styles.pointsLabel, { color: c.text }]}>Daily login bonus</Text>
            </View>
            <View style={styles.pointsRow}>
              <View style={[styles.pointsBadge, { backgroundColor: `${c.primary}33` }]}>
                <Text style={[styles.pointsValue, { color: c.primary }]}>+10</Text>
              </View>
              <Text style={[styles.pointsLabel, { color: c.text }]}>Completing a dance session</Text>
            </View>
            <View style={styles.pointsRow}>
              <View style={[styles.pointsBadge, { backgroundColor: `${c.warning}33` }]}>
                <Text style={[styles.pointsValue, { color: c.warning }]}>+50</Text>
              </View>
              <Text style={[styles.pointsLabel, { color: c.text }]}>Attending an event</Text>
            </View>
          </View>
        </View>

        {/* Steps */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>How Referrals Work</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <LinearGradient colors={[c.primary, c.accent]} style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </LinearGradient>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: c.text }]}>Share Your Link</Text>
                <Text style={[styles.stepDescription, { color: c.textSecondary }]}>
                  Send your unique referral link to friends
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <LinearGradient colors={[c.primary, c.accent]} style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </LinearGradient>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: c.text }]}>Friend Joins</Text>
                <Text style={[styles.stepDescription, { color: c.textSecondary }]}>
                  Your friend downloads DANZ and signs up
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <LinearGradient colors={[c.primary, c.accent]} style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </LinearGradient>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: c.text }]}>Earn Points</Text>
                <Text style={[styles.stepDescription, { color: c.textSecondary }]}>
                  You earn 20 points when they complete their first session!
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Referrals */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Recent Referrals</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
          ) : referrals.length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                { backgroundColor: c.glassCard, borderColor: c.glassBorder },
              ]}
            >
              <MaterialCommunityIcons
                name="account-group-outline"
                size={48}
                color={c.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: c.text }]}>No referrals yet</Text>
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                Share your link to start earning points!
              </Text>
            </View>
          ) : (
            <View style={styles.referralsList}>
              {referrals.map(referral => (
                <View
                  key={referral.id}
                  style={[
                    styles.referralItem,
                    { backgroundColor: c.glassCard, borderColor: c.glassBorder },
                  ]}
                >
                  <View
                    style={[styles.referralAvatar, { backgroundColor: `${c.primary}33` }]}
                  >
                    <Text style={[styles.referralAvatarText, { color: c.primary }]}>
                      {referral.referee?.display_name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.referralInfo}>
                    <Text style={[styles.referralName, { color: c.text }]}>
                      {referral.referee?.display_name || 'Anonymous'}
                    </Text>
                    <Text style={[styles.referralDate, { color: c.textSecondary }]}>
                      Joined{' '}
                      {referral.signed_up_at
                        ? new Date(referral.signed_up_at).toLocaleDateString()
                        : 'Pending'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.referralStatus,
                      referral.status === 'completed'
                        ? { backgroundColor: `${c.success}33` }
                        : { backgroundColor: `${c.accent}33` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.referralStatusText,
                        referral.status === 'completed'
                          ? { color: c.success }
                          : { color: c.accent },
                      ]}
                    >
                      {referral.status === 'completed' ? 'Completed' : 'Signed Up'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  codeCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  linkContainer: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  linkLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  shareOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  shareButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareButtonOutlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
  howItWorksCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pointsLabel: {
    fontSize: 14,
  },
  stepsContainer: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  referralsList: {
    gap: 12,
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  referralAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  referralAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 16,
    fontWeight: '500',
  },
  referralDate: {
    fontSize: 13,
    marginTop: 2,
  },
  referralStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  referralStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 100,
  },
})
