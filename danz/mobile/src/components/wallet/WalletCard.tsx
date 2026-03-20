/**
 * WalletCard Component
 * Displays a single wallet with balance, network, and actions
 */

import { Feather, Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'
import type { UnifiedWallet } from '@/types/wallet'
import { formatUsd, truncateAddress, WALLET_PROVIDERS } from '@/types/wallet'
import { ms } from '@/utils/responsive'

interface WalletCardProps {
  wallet: UnifiedWallet
  onPress?: () => void
  onSend?: () => void
  onReceive?: () => void
  onSetDefault?: () => void
  showActions?: boolean
  compact?: boolean
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  onPress,
  onSend,
  onReceive,
  onSetDefault,
  showActions = true,
  compact = false,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  const handleCopyAddress = useCallback(async () => {
    await Clipboard.setStringAsync(wallet.address)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Toast.show({
      type: 'success',
      text1: 'Address Copied',
      text2: truncateAddress(wallet.address, 6),
      visibilityTime: 2000,
    })
  }, [wallet.address])

  const getChainIcon = () => {
    if (wallet.chainType === 'ethereum') {
      return <Text style={styles.chainEmoji}>Ξ</Text>
    }
    return <Text style={styles.chainEmoji}>◎</Text>
  }

  const getChainColor = () => {
    return wallet.chainType === 'ethereum' ? '#0052FF' : '#9945FF'
  }

  const getProviderInfo = () => {
    return WALLET_PROVIDERS[wallet.walletClientType] || WALLET_PROVIDERS.unknown
  }

  const providerInfo = getProviderInfo()

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.compactCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.chainBadge, { backgroundColor: getChainColor() }]}>
            {getChainIcon()}
          </View>
          <View style={styles.compactInfo}>
            <Text style={styles.compactNetwork}>{wallet.network}</Text>
            <Text style={styles.compactAddress}>{truncateAddress(wallet.address, 4)}</Text>
          </View>
          <View style={styles.compactRight}>
            {wallet.isDefault && (
              <View style={styles.compactDefaultBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
              </View>
            )}
            <View style={styles.compactBalance}>
              <Text style={styles.compactAmount}>
                {wallet.balanceFormatted} {wallet.symbol}
              </Text>
              <Text style={styles.compactUsd}>{formatUsd(wallet.balanceUsd)}</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          style={styles.cardGradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.chainBadge, { backgroundColor: getChainColor() }]}>
                {getChainIcon()}
              </View>
              <View style={styles.networkInfo}>
                <Text style={styles.networkName}>{wallet.network}</Text>
                <View style={styles.providerRow}>
                  <Text style={[styles.providerName, { color: providerInfo.color }]}>
                    {providerInfo.name}
                  </Text>
                  {wallet.walletType === 'embedded' && (
                    <View style={styles.embeddedBadge}>
                      <Text style={styles.embeddedText}>Embedded</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            {wallet.isDefault && (
              <View style={styles.defaultIndicator}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
          </View>

          {/* Address */}
          <TouchableOpacity style={styles.addressRow} onPress={handleCopyAddress}>
            <Text style={styles.address}>{truncateAddress(wallet.address, 8)}</Text>
            <Feather name="copy" size={14} color="#888" />
          </TouchableOpacity>

          {/* Balance */}
          <View style={styles.balanceSection}>
            <Text style={styles.balance}>
              {wallet.balanceFormatted} {wallet.symbol}
            </Text>
            <Text style={styles.balanceUsd}>{formatUsd(wallet.balanceUsd)}</Text>
          </View>

          {/* Actions */}
          {showActions && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  onSend?.()
                }}
              >
                <Feather name="arrow-up-right" size={16} color="#FF6EC7" />
                <Text style={styles.actionText}>Send</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  onReceive?.()
                }}
              >
                <Feather name="arrow-down-left" size={16} color="#00FF88" />
                <Text style={styles.actionText}>Receive</Text>
              </TouchableOpacity>

              {!wallet.isDefault && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    onSetDefault?.()
                  }}
                >
                  <Feather name="star" size={16} color="#FFD700" />
                  <Text style={styles.actionText}>Default</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: ms(16),
    overflow: 'hidden',
    marginBottom: ms(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardGradient: {
    padding: ms(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(12),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainBadge: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(12),
  },
  chainEmoji: {
    fontSize: ms(20),
    color: '#fff',
  },
  networkInfo: {
    flex: 1,
  },
  networkName: {
    fontSize: ms(16),
    fontWeight: '600',
    color: '#fff',
    marginBottom: ms(2),
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  providerName: {
    fontSize: ms(12),
  },
  embeddedBadge: {
    backgroundColor: 'rgba(255,110,199,0.2)',
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(4),
  },
  embeddedText: {
    fontSize: ms(10),
    color: '#FF6EC7',
    fontWeight: '500',
  },
  defaultIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(8),
  },
  defaultText: {
    fontSize: ms(12),
    color: '#FFD700',
    fontWeight: '500',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    marginBottom: ms(16),
    paddingVertical: ms(8),
    paddingHorizontal: ms(12),
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: ms(8),
  },
  address: {
    fontSize: ms(13),
    color: '#888',
    fontFamily: 'monospace',
    flex: 1,
  },
  balanceSection: {
    marginBottom: ms(16),
  },
  balance: {
    fontSize: ms(24),
    fontWeight: '700',
    color: '#fff',
    marginBottom: ms(4),
  },
  balanceUsd: {
    fontSize: ms(14),
    color: '#888',
  },
  actions: {
    flexDirection: 'row',
    gap: ms(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: ms(12),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingVertical: ms(8),
    paddingHorizontal: ms(12),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(8),
  },
  actionText: {
    fontSize: ms(13),
    color: '#fff',
    fontWeight: '500',
  },

  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    marginBottom: ms(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  compactInfo: {
    flex: 1,
    marginLeft: ms(12),
  },
  compactNetwork: {
    fontSize: ms(14),
    fontWeight: '600',
    color: '#fff',
  },
  compactAddress: {
    fontSize: ms(12),
    color: '#888',
    fontFamily: 'monospace',
  },
  compactBalance: {
    alignItems: 'flex-end',
  },
  compactAmount: {
    fontSize: ms(14),
    fontWeight: '600',
    color: '#fff',
  },
  compactUsd: {
    fontSize: ms(12),
    color: '#888',
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  compactDefaultBadge: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default WalletCard
