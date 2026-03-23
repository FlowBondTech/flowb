import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { ReceiveModal, SendModal, WalletCard, WalletLinkModal } from '@/components/wallet'
import { useAccessibleFontSize } from '@/contexts/AccessibilityContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  TransactionType as GqlTransactionType,
  TransactionStatus as GqlTransactionStatus,
  useGetUserTransactionsQuery,
  useGetFreestyleStatsQuery,
} from '@/generated/graphql'
import { useWalletManager } from '@/hooks/useWalletManager'
import { fs, hs, ms, vs } from '@/utils/responsive'
import type { ChainType, UnifiedWallet } from '@/types/wallet'

interface Transaction {
  id: string
  type: 'earned' | 'spent' | 'received' | 'sent' | 'reward' | 'bonus'
  amount: number
  description: string
  timestamp: Date
  status: 'completed' | 'pending' | 'failed'
  icon?: string
  color?: string
}

// Map GraphQL transaction type to UI type
const mapTransactionType = (
  gqlType: GqlTransactionType,
  amount: number
): Transaction['type'] => {
  switch (gqlType) {
    case GqlTransactionType.Earn:
      return 'earned'
    case GqlTransactionType.Spend:
      return 'spent'
    case GqlTransactionType.Bonus:
      return 'bonus'
    case GqlTransactionType.Adjustment:
      return amount >= 0 ? 'received' : 'sent'
    case GqlTransactionType.Refund:
      return 'received'
    case GqlTransactionType.Penalty:
      return 'spent'
    default:
      return amount >= 0 ? 'earned' : 'spent'
  }
}

// Map GraphQL status to UI status
const mapTransactionStatus = (gqlStatus: GqlTransactionStatus): Transaction['status'] => {
  switch (gqlStatus) {
    case GqlTransactionStatus.Completed:
      return 'completed'
    case GqlTransactionStatus.Pending:
      return 'pending'
    case GqlTransactionStatus.Failed:
    case GqlTransactionStatus.Reversed:
      return 'failed'
    default:
      return 'completed'
  }
}

// Get icon and color based on transaction type/action
const getTransactionVisuals = (
  type: Transaction['type'],
  actionName?: string | null
): { icon: string; color: string } => {
  // Check for specific action names first
  if (actionName) {
    const lowerAction = actionName.toLowerCase()
    if (lowerAction.includes('dance') || lowerAction.includes('session')) {
      return { icon: 'music', color: '#B967FF' }
    }
    if (lowerAction.includes('streak')) {
      return { icon: 'fire', color: '#FF6B6B' }
    }
    if (lowerAction.includes('challenge') || lowerAction.includes('trophy')) {
      return { icon: 'trophy', color: '#05FFA1' }
    }
    if (lowerAction.includes('welcome') || lowerAction.includes('bonus')) {
      return { icon: 'gift', color: '#FFD700' }
    }
    if (lowerAction.includes('event') || lowerAction.includes('ticket')) {
      return { icon: 'ticket-outline', color: '#FF1493' }
    }
    if (lowerAction.includes('referral')) {
      return { icon: 'account-plus', color: '#00D4FF' }
    }
  }

  // Fall back to type-based icons
  switch (type) {
    case 'earned':
      return { icon: 'music', color: '#B967FF' }
    case 'spent':
      return { icon: 'cart-outline', color: '#FF1493' }
    case 'reward':
      return { icon: 'star', color: '#FFD700' }
    case 'bonus':
      return { icon: 'gift', color: '#FFD700' }
    case 'received':
      return { icon: 'arrow-down-circle', color: '#05FFA1' }
    case 'sent':
      return { icon: 'arrow-up-circle', color: '#FF6B6B' }
    default:
      return { icon: 'circle', color: '#888' }
  }
}

export const WalletScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { user } = useAuth()
  const { theme } = useTheme()
  const c = theme.colors

  // Accessibility-aware font sizing
  const { afs } = useAccessibleFontSize()

  // Freestyle stats from GraphQL (replaces mock danzWallet data)
  const {
    data: freestyleData,
    refetch: refetchFreestyleStats,
  } = useGetFreestyleStatsQuery({
    fetchPolicy: 'cache-and-network',
  })

  const freestyleStats = freestyleData

  // Wallet Manager Hook
  const {
    wallets,
    isLoading: walletsLoading,
    totalBalanceUsd,
    linkState,
    startLinkEthereum,
    startLinkSolana,
    cancelLink,
    getDefaultWallet,
    setDefaultWallet,
    refetch: refetchWallets,
  } = useWalletManager()

  // Fetch user transactions from GraphQL
  const {
    data: transactionsData,
    loading: transactionsLoading,
    refetch: refetchTransactions,
  } = useGetUserTransactionsQuery({
    variables: {
      user_id: user?.privy_id || '',
      limit: 50,
    },
    skip: !user?.privy_id,
    fetchPolicy: 'cache-and-network',
  })

  // Transform GraphQL transactions to UI format
  const transactions: Transaction[] = useMemo(() => {
    if (!transactionsData?.getUserTransactions?.transactions) return []

    return transactionsData.getUserTransactions.transactions.map(tx => {
      const type = mapTransactionType(tx.transaction_type, tx.points_amount)
      const status = mapTransactionStatus(tx.status)
      const visuals = getTransactionVisuals(type, tx.action?.action_name)

      return {
        id: tx.id,
        type,
        amount: tx.points_amount,
        description: tx.action?.description || tx.action?.action_name || tx.action_key,
        timestamp: new Date(tx.created_at),
        status,
        icon: visuals.icon,
        color: visuals.color,
      }
    })
  }, [transactionsData])

  // Compute today's earnings from real transaction data
  const todayEarnings = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return transactions
      .filter(t => t.timestamp >= today && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
  }, [transactions])

  // Compute weekly earnings from real transaction data
  const weeklyEarnings = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return transactions
      .filter(t => t.timestamp >= weekAgo && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
  }, [transactions])

  // Derived values from freestyle stats
  const totalBalance = freestyleStats?.myFreestyleStats?.total_points ?? 0
  const currentStreak = freestyleStats?.myFreestyleStats?.current_streak ?? 0

  // Modal States
  const [showSendModal, setShowSendModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedWalletForAction, setSelectedWalletForAction] = useState<UnifiedWallet | null>(null)
  const [selectedChainForReceive, setSelectedChainForReceive] = useState<ChainType>('ethereum')

  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [refreshing, setRefreshing] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  // Dynamic font styles based on accessibility settings
  const fontStyles = {
    headerTitle: { fontSize: afs(20) },
    balanceLabel: { fontSize: afs(14) },
    streakText: { fontSize: afs(12) },
    balanceAmount: { fontSize: afs(48) },
    balanceCurrency: { fontSize: afs(16) },
    balanceStatLabel: { fontSize: afs(12) },
    balanceStatValue: { fontSize: afs(18) },
    actionText: { fontSize: afs(12) },
    sectionTitle: { fontSize: afs(18) },
    linkWalletText: { fontSize: afs(13) },
    totalCryptoLabel: { fontSize: afs(12) },
    totalCryptoValue: { fontSize: afs(28) },
    walletGroupTitle: { fontSize: afs(14) },
    walletGroupBadgeText: { fontSize: afs(10) },
    walletGroupDesc: { fontSize: afs(12) },
    emptyWalletsTitle: { fontSize: afs(16) },
    emptyWalletsDesc: { fontSize: afs(13) },
    emptyLinkButtonText: { fontSize: afs(14) },
    loadingText: { fontSize: afs(12) },
    periodButtonText: { fontSize: afs(14) },
    analyticsValue: { fontSize: afs(20) },
    analyticsLabel: { fontSize: afs(12) },
    seeAllButton: { fontSize: afs(14) },
    transactionDescription: { fontSize: afs(14) },
    transactionTime: { fontSize: afs(12) },
    transactionAmount: { fontSize: afs(16) },
    pendingLabel: { fontSize: afs(10) },
    emptyTitle: { fontSize: afs(16) },
    emptyDescription: { fontSize: afs(14) },
  }


  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, scaleAnim, slideAnim])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchWallets(),
        refetchFreestyleStats(),
        user?.privy_id ? refetchTransactions() : Promise.resolve(),
      ])
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to refresh wallet data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Wallet Actions
  const handleSend = (wallet?: UnifiedWallet) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (wallet) {
      setSelectedWalletForAction(wallet)
    }
    setShowSendModal(true)
  }

  const handleReceive = (wallet?: UnifiedWallet) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (wallet) {
      setSelectedChainForReceive(wallet.chainType)
    }
    setShowReceiveModal(true)
  }

  const handleLinkWallet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowLinkModal(true)
  }

  const handleSetDefault = async (wallet: UnifiedWallet) => {
    try {
      await setDefaultWallet(wallet.id, wallet.chainType)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Toast.show({
        type: 'success',
        text1: 'Default Wallet Set',
        text2: `${wallet.network} wallet is now your default`,
        visibilityTime: 2000,
      })
      await refetchWallets()
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to set default wallet',
        visibilityTime: 2000,
      })
    }
  }

  const getFilteredTransactions = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    switch (selectedPeriod) {
      case 'today':
        return transactions.filter(t => t.timestamp >= today)
      case 'week':
        return transactions.filter(t => t.timestamp >= weekAgo)
      case 'month':
        return transactions.filter(t => t.timestamp >= monthAgo)
      default:
        return transactions
    }
  }

  const calculatePeriodEarnings = () => {
    const filtered = getFilteredTransactions()
    return filtered.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  }

  const calculatePeriodSpending = () => {
    const filtered = getFilteredTransactions()
    return Math.abs(filtered.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
  }

  const renderTransaction = (transaction: Transaction) => {
    const isPositive = transaction.amount > 0

    return (
      <TouchableOpacity
        key={transaction.id}
        style={[
          styles.transactionItem,
          { backgroundColor: c.glassCard, borderColor: c.glassBorder, borderWidth: 1 },
        ]}
        activeOpacity={0.7}
      >
        <View style={[styles.transactionIcon, { backgroundColor: `${transaction.color}20` }]}>
          <MaterialCommunityIcons
            name={transaction.icon as any}
            size={ms(20)}
            color={transaction.color}
          />
        </View>

        <View style={styles.transactionDetails}>
          <Text style={[styles.transactionDescription, { fontSize: afs(14), color: c.text }]}>
            {transaction.description}
          </Text>
          <Text style={[styles.transactionTime, { fontSize: afs(12), color: c.textSecondary }]}>
            {transaction.timestamp.toLocaleDateString()} •{' '}
            {transaction.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.transactionAmountContainer}>
          <Text
            style={[
              styles.transactionAmount,
              { fontSize: afs(16), color: isPositive ? '#05FFA1' : '#FF6B6B' },
            ]}
          >
            {isPositive ? '+' : ''}
            {transaction.amount} $DANZ
          </Text>
          {transaction.status === 'pending' && (
            <Text style={[styles.pendingLabel, { fontSize: afs(10), color: c.warning }]}>
              Pending
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // Get default wallets with isDefault flag
  const walletsWithDefaults = wallets.map(w => ({
    ...w,
    isDefault: getDefaultWallet(w.chainType)?.id === w.id,
  }))

  // Group wallets by type
  const embeddedWallets = walletsWithDefaults.filter(w => w.walletType === 'embedded')
  const externalWallets = walletsWithDefaults.filter(w => w.walletType === 'linked')

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />
      <LinearGradient
        colors={[c.background, theme.gradients.primary[1] + '33', c.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={ms(24)} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, fontStyles.headerTitle, { color: c.text }]}>
          My Wallet
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            navigation.navigate('Settings')
          }}
        >
          <Ionicons name="settings-outline" size={ms(24)} color={c.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={c.primary}
          />
        }
      >
        {/* $DANZ Balance Card */}
        <Animated.View
          style={[
            styles.balanceCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[`${c.primary}33`, `${c.secondary}33`]}
            style={[
              styles.balanceGradient,
              { borderColor: c.glassBorder },
            ]}
          >
            <View style={styles.balanceHeader}>
              <Text style={[styles.balanceLabel, fontStyles.balanceLabel, { color: c.textSecondary }]}>
                $DANZ Balance
              </Text>
              <View style={styles.streakBadge}>
                <MaterialCommunityIcons name="fire" size={ms(16)} color="#FF6B6B" />
                <Text style={[styles.streakText, fontStyles.streakText]}>
                  {currentStreak} day streak
                </Text>
              </View>
            </View>

            <Text style={[styles.balanceAmount, fontStyles.balanceAmount, { color: c.text }]}>
              {totalBalance.toFixed(2)}
            </Text>
            <Text style={[styles.balanceCurrency, fontStyles.balanceCurrency, { color: c.primary }]}>
              $DANZ
            </Text>

            <View style={[styles.balanceStats, { backgroundColor: c.glassCard }]}>
              <View style={styles.balanceStat}>
                <Text
                  style={[styles.balanceStatLabel, fontStyles.balanceStatLabel, { color: c.textSecondary }]}
                >
                  Today's Earnings
                </Text>
                <Text style={[styles.balanceStatValue, fontStyles.balanceStatValue]}>
                  +{todayEarnings}
                </Text>
              </View>
              <View style={[styles.balanceStatDivider, { backgroundColor: c.glassBorder }]} />
              <View style={styles.balanceStat}>
                <Text
                  style={[styles.balanceStatLabel, fontStyles.balanceStatLabel, { color: c.textSecondary }]}
                >
                  This Week
                </Text>
                <Text style={[styles.balanceStatValue, fontStyles.balanceStatValue]}>
                  +{weeklyEarnings}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleSend()}>
            <LinearGradient
              colors={[c.primary, c.secondary]}
              style={styles.actionGradient}
            >
              <Ionicons name="arrow-up" size={ms(24)} color="white" />
              <Text style={[styles.actionText, fontStyles.actionText]}>Send</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleReceive()}>
            <View style={[styles.actionOutline, { borderColor: c.primary, backgroundColor: `${c.primary}0D` }]}>
              <Ionicons name="arrow-down" size={ms(24)} color={c.primary} />
              <Text
                style={[
                  styles.actionText,
                  fontStyles.actionText,
                  { color: c.primary },
                ]}
              >
                Receive
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Crypto Wallets Section */}
        <View style={styles.cryptoWalletsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, fontStyles.sectionTitle, { color: c.text }]}>
              Crypto Wallets
            </Text>
            <TouchableOpacity
              style={[styles.linkWalletButton, { backgroundColor: `${c.primary}1A` }]}
              onPress={handleLinkWallet}
            >
              <Feather name="plus" size={ms(16)} color={c.primary} />
              <Text style={[styles.linkWalletText, fontStyles.linkWalletText, { color: c.primary }]}>
                Link Wallet
              </Text>
            </TouchableOpacity>
          </View>

          {/* Total Crypto Balance */}
          {wallets.length > 0 && (
            <View style={[styles.totalCryptoBalance, { backgroundColor: c.glassCard, borderColor: c.glassBorder, borderWidth: 1 }]}>
              <Text style={[styles.totalCryptoLabel, fontStyles.totalCryptoLabel, { color: c.textSecondary }]}>
                Total Crypto Value
              </Text>
              <Text style={[styles.totalCryptoValue, fontStyles.totalCryptoValue, { color: c.text }]}>
                ${totalBalanceUsd}
              </Text>
            </View>
          )}

          {/* Wallet Cards - Grouped by Type */}
          {walletsWithDefaults.length > 0 ? (
            <View style={styles.walletCardsList}>
              {/* Embedded Wallets Section */}
              {embeddedWallets.length > 0 && (
                <View style={styles.walletGroup}>
                  <View style={styles.walletGroupHeader}>
                    <Ionicons name="shield-checkmark" size={ms(16)} color={c.primary} />
                    <Text style={[styles.walletGroupTitle, fontStyles.walletGroupTitle, { color: c.text }]}>
                      Embedded Wallets
                    </Text>
                    <View style={[styles.walletGroupBadge, { backgroundColor: `${c.primary}26` }]}>
                      <Text style={[styles.walletGroupBadgeText, fontStyles.walletGroupBadgeText, { color: c.primary }]}>
                        Secure
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.walletGroupDesc, fontStyles.walletGroupDesc, { color: c.textSecondary }]}>
                    Created and secured by DANZ
                  </Text>
                  {embeddedWallets.map(wallet => (
                    <WalletCard
                      key={wallet.id}
                      wallet={wallet}
                      onSend={() => handleSend(wallet)}
                      onReceive={() => handleReceive(wallet)}
                      onSetDefault={() => handleSetDefault(wallet)}
                      showActions={true}
                    />
                  ))}
                </View>
              )}

              {/* External Wallets Section */}
              {externalWallets.length > 0 && (
                <View style={styles.walletGroup}>
                  <View style={styles.walletGroupHeader}>
                    <Ionicons name="link" size={ms(16)} color={c.secondary} />
                    <Text style={[styles.walletGroupTitle, fontStyles.walletGroupTitle, { color: c.text }]}>
                      Connected Wallets
                    </Text>
                  </View>
                  <Text style={[styles.walletGroupDesc, fontStyles.walletGroupDesc, { color: c.textSecondary }]}>
                    External wallets you've linked
                  </Text>
                  {externalWallets.map(wallet => (
                    <WalletCard
                      key={wallet.id}
                      wallet={wallet}
                      onSend={() => handleSend(wallet)}
                      onReceive={() => handleReceive(wallet)}
                      onSetDefault={() => handleSetDefault(wallet)}
                      showActions={true}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.emptyWallets,
                { backgroundColor: c.glassCard, borderColor: c.glassBorder },
              ]}
            >
              <Ionicons name="wallet-outline" size={ms(48)} color={c.textMuted} />
              <Text style={[styles.emptyWalletsTitle, fontStyles.emptyWalletsTitle, { color: c.text }]}>
                No Wallets Connected
              </Text>
              <Text style={[styles.emptyWalletsDesc, fontStyles.emptyWalletsDesc, { color: c.textMuted }]}>
                Your embedded wallet will appear here once created, or link an external wallet.
              </Text>
              <TouchableOpacity style={styles.emptyLinkButton} onPress={handleLinkWallet}>
                <LinearGradient
                  colors={[theme.gradients.primary[0], theme.gradients.primary[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyLinkButtonGradient}
                >
                  <Feather name="link" size={ms(16)} color="#fff" />
                  <Text style={[styles.emptyLinkButtonText, fontStyles.emptyLinkButtonText]}>
                    Link External Wallet
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {walletsLoading && (
            <Text style={[styles.loadingText, fontStyles.loadingText, { color: c.textSecondary }]}>
              Updating wallets...
            </Text>
          )}
        </View>

        {/* Analytics Section */}
        <View
          style={[
            styles.analyticsCard,
            { backgroundColor: c.glassCard, borderColor: c.glassBorder, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.sectionTitle, fontStyles.sectionTitle, { color: c.text }]}>
            $DANZ Analytics
          </Text>

          <View style={[styles.periodSelector, { backgroundColor: c.glassSurface }]}>
            {(['today', 'week', 'month', 'all'] as const).map(period => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && { backgroundColor: c.primary },
                ]}
                onPress={() => {
                  setSelectedPeriod(period)
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    fontStyles.periodButtonText,
                    { color: c.textSecondary },
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.analyticsStats}>
            <View style={styles.analyticsStat}>
              <View style={[styles.analyticsIconContainer, { backgroundColor: c.glassCard }]}>
                <MaterialCommunityIcons name="trending-up" size={ms(20)} color="#05FFA1" />
              </View>
              <Text style={[styles.analyticsValue, fontStyles.analyticsValue, { color: c.text }]}>
                +{calculatePeriodEarnings()}
              </Text>
              <Text style={[styles.analyticsLabel, fontStyles.analyticsLabel, { color: c.textSecondary }]}>
                Earned
              </Text>
            </View>

            <View style={[styles.analyticsDivider, { backgroundColor: c.glassBorder }]} />

            <View style={styles.analyticsStat}>
              <View style={[styles.analyticsIconContainer, { backgroundColor: c.glassCard }]}>
                <MaterialCommunityIcons name="trending-down" size={ms(20)} color="#FF6B6B" />
              </View>
              <Text style={[styles.analyticsValue, fontStyles.analyticsValue, { color: c.text }]}>
                -{calculatePeriodSpending()}
              </Text>
              <Text style={[styles.analyticsLabel, fontStyles.analyticsLabel, { color: c.textSecondary }]}>
                Spent
              </Text>
            </View>

            <View style={[styles.analyticsDivider, { backgroundColor: c.glassBorder }]} />

            <View style={styles.analyticsStat}>
              <View style={[styles.analyticsIconContainer, { backgroundColor: c.glassCard }]}>
                <MaterialCommunityIcons name="chart-line" size={ms(20)} color="#B967FF" />
              </View>
              <Text style={[styles.analyticsValue, fontStyles.analyticsValue, { color: c.text }]}>
                {calculatePeriodEarnings() - calculatePeriodSpending()}
              </Text>
              <Text style={[styles.analyticsLabel, fontStyles.analyticsLabel, { color: c.textSecondary }]}>
                Net
              </Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={[styles.sectionTitle, fontStyles.sectionTitle, { color: c.text }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllButton, fontStyles.seeAllButton, { color: c.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsList}>
            {transactionsLoading && !transactionsData ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={[styles.emptyTitle, fontStyles.emptyTitle, { color: c.text }]}>
                  Loading transactions...
                </Text>
              </View>
            ) : getFilteredTransactions().length > 0 ? (
              getFilteredTransactions().map(renderTransaction)
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="script-text-outline"
                  size={ms(48)}
                  color={c.textSecondary}
                />
                <Text style={[styles.emptyTitle, fontStyles.emptyTitle, { color: c.text }]}>
                  No transactions
                </Text>
                <Text style={[styles.emptyDescription, fontStyles.emptyDescription, { color: c.textSecondary }]}>
                  Start dancing to earn your first $DANZ!
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: vs(100) }} />
      </ScrollView>

      {/* Modals */}
      <SendModal
        visible={showSendModal}
        onClose={() => {
          setShowSendModal(false)
          setSelectedWalletForAction(null)
        }}
        wallets={wallets}
        defaultWallet={selectedWalletForAction || getDefaultWallet('ethereum') || undefined}
      />

      <ReceiveModal
        visible={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        wallets={wallets}
        defaultChain={selectedChainForReceive}
      />

      <WalletLinkModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        linkState={linkState}
        onLinkEthereum={startLinkEthereum}
        onLinkSolana={startLinkSolana}
        onCancelLink={cancelLink}
      />
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
    paddingHorizontal: hs(24),
    paddingVertical: vs(16),
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fs(20),
    fontWeight: '600',
  },
  settingsButton: {
    width: ms(40),
    height: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    marginHorizontal: hs(24),
    marginTop: vs(16),
    borderRadius: ms(20),
    overflow: 'hidden',
  },
  balanceGradient: {
    padding: ms(24),
    borderWidth: 1,
    borderRadius: ms(20),
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  balanceLabel: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: hs(12),
    paddingVertical: vs(4),
    borderRadius: ms(12),
    gap: hs(4),
  },
  streakText: {
    fontSize: fs(12),
    color: '#FF6B6B',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: fs(48),
    fontWeight: 'bold',
    marginBottom: vs(4),
  },
  balanceCurrency: {
    fontSize: fs(16),
    fontWeight: '600',
    marginBottom: vs(24),
  },
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(12),
    padding: ms(16),
  },
  balanceStat: {
    flex: 1,
    alignItems: 'center',
  },
  balanceStatLabel: {
    fontSize: fs(12),
    marginBottom: vs(4),
  },
  balanceStatValue: {
    fontSize: fs(18),
    fontWeight: '600',
    color: '#05FFA1',
  },
  balanceStatDivider: {
    width: 1,
    height: vs(30),
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: hs(24),
    marginTop: vs(24),
    gap: hs(12),
  },
  actionButton: {
    flex: 1,
  },
  actionGradient: {
    alignItems: 'center',
    paddingVertical: vs(12),
    borderRadius: ms(12),
    gap: vs(4),
  },
  actionOutline: {
    alignItems: 'center',
    paddingVertical: vs(12),
    borderRadius: ms(12),
    borderWidth: 1,
    gap: vs(4),
  },
  actionText: {
    fontSize: fs(12),
    fontWeight: '600',
    color: 'white',
  },
  // Crypto Wallets Section
  cryptoWalletsSection: {
    marginHorizontal: hs(24),
    marginTop: vs(32),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  sectionTitle: {
    fontSize: fs(18),
    fontWeight: '600',
  },
  linkWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(6),
    paddingHorizontal: hs(12),
    paddingVertical: vs(6),
    borderRadius: ms(8),
  },
  linkWalletText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  totalCryptoBalance: {
    borderRadius: ms(12),
    padding: ms(16),
    marginBottom: vs(16),
    alignItems: 'center',
  },
  totalCryptoLabel: {
    fontSize: fs(12),
    marginBottom: vs(4),
  },
  totalCryptoValue: {
    fontSize: fs(28),
    fontWeight: '700',
  },
  walletCardsList: {
    gap: vs(20),
  },
  walletGroup: {
    marginBottom: vs(4),
  },
  walletGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(8),
    marginBottom: vs(4),
  },
  walletGroupTitle: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  walletGroupBadge: {
    paddingHorizontal: hs(8),
    paddingVertical: vs(2),
    borderRadius: ms(4),
  },
  walletGroupBadgeText: {
    fontSize: fs(10),
    fontWeight: '600',
  },
  walletGroupDesc: {
    fontSize: fs(12),
    marginBottom: vs(12),
  },
  emptyWallets: {
    alignItems: 'center',
    padding: ms(32),
    borderRadius: ms(16),
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyWalletsTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    marginTop: vs(16),
    marginBottom: vs(8),
  },
  emptyWalletsDesc: {
    fontSize: fs(13),
    textAlign: 'center',
    marginBottom: vs(20),
  },
  emptyLinkButton: {
    borderRadius: ms(12),
    overflow: 'hidden',
  },
  emptyLinkButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(8),
    paddingVertical: vs(12),
    paddingHorizontal: hs(20),
  },
  emptyLinkButtonText: {
    fontSize: fs(14),
    fontWeight: '600',
    color: '#fff',
  },
  loadingText: {
    fontSize: fs(12),
    textAlign: 'center',
    marginTop: vs(12),
  },
  // Analytics Section
  analyticsCard: {
    marginHorizontal: hs(24),
    marginTop: vs(32),
    borderRadius: ms(16),
    padding: ms(20),
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: ms(8),
    padding: ms(4),
    marginBottom: vs(20),
    marginTop: vs(8),
  },
  periodButton: {
    flex: 1,
    paddingVertical: vs(8),
    alignItems: 'center',
    borderRadius: ms(6),
  },
  periodButtonText: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  analyticsStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsStat: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsIconContainer: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(8),
  },
  analyticsValue: {
    fontSize: fs(20),
    fontWeight: 'bold',
    marginBottom: vs(4),
  },
  analyticsLabel: {
    fontSize: fs(12),
  },
  analyticsDivider: {
    width: 1,
    height: vs(60),
  },
  // Transaction Section
  transactionsSection: {
    marginTop: vs(32),
    paddingHorizontal: hs(24),
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  seeAllButton: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  transactionsList: {
    gap: vs(12),
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(12),
    padding: ms(16),
    gap: hs(12),
  },
  transactionIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: fs(14),
    fontWeight: '500',
    marginBottom: vs(4),
  },
  transactionTime: {
    fontSize: fs(12),
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  pendingLabel: {
    fontSize: fs(10),
    marginTop: vs(2),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: vs(40),
  },
  emptyTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    marginTop: vs(16),
    marginBottom: vs(8),
  },
  emptyDescription: {
    fontSize: fs(14),
    textAlign: 'center',
  },
})
