/**
 * WalletLinkModal Component
 * Modal for linking external wallets (MetaMask, Phantom, etc.)
 */

import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import type { ChainType, WalletLinkState } from '@/types/wallet'
import { WALLET_PROVIDERS } from '@/types/wallet'
import { ms } from '@/utils/responsive'

interface WalletLinkModalProps {
  visible: boolean
  onClose: () => void
  linkState: WalletLinkState
  onLinkEthereum: () => Promise<void>
  onLinkSolana: () => Promise<void>
  onCancelLink: () => void
}

interface WalletOption {
  id: string
  name: string
  icon: string
  description: string
  chainType: ChainType
  color: string
  available: boolean
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Popular Ethereum wallet',
    chainType: 'ethereum',
    color: '#F6851B',
    available: true,
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    description: 'Leading Solana wallet',
    chainType: 'solana',
    color: '#AB9FF2',
    available: true,
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    description: 'Secure multi-chain wallet',
    chainType: 'ethereum',
    color: '#0052FF',
    available: true,
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Connect any mobile wallet',
    chainType: 'ethereum',
    color: '#3B99FC',
    available: true,
  },
]

export const WalletLinkModal: React.FC<WalletLinkModalProps> = ({
  visible,
  onClose,
  linkState,
  onLinkEthereum,
  onLinkSolana,
  onCancelLink,
}) => {
  const [selectedChain, setSelectedChain] = useState<ChainType>('ethereum')
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const slideAnim = React.useRef(new Animated.Value(300)).current

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      fadeAnim.setValue(0)
      slideAnim.setValue(300)
    }
  }, [visible, fadeAnim, slideAnim])

  const handleSelectWallet = async (wallet: WalletOption) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      if (wallet.chainType === 'ethereum') {
        await onLinkEthereum()
      } else {
        await onLinkSolana()
      }
    } catch (error) {
      console.error('Failed to link wallet:', error)
    }
  }

  const handleClose = () => {
    if (linkState.status === 'connecting' || linkState.status === 'signing') {
      onCancelLink()
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
  }

  const filteredWallets = WALLET_OPTIONS.filter(w => w.chainType === selectedChain)

  const isLinking = linkState.status === 'connecting' || linkState.status === 'signing'

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.modal}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Link Wallet</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Info Banner */}
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color="#00D9FF" />
                <Text style={styles.infoText}>
                  Link an external wallet to access your existing crypto assets within DANZ. Your
                  wallet remains fully under your control.
                </Text>
              </View>

              {/* Chain Selector */}
              <View style={styles.chainSelector}>
                <TouchableOpacity
                  style={[
                    styles.chainOption,
                    selectedChain === 'ethereum' && styles.chainOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setSelectedChain('ethereum')
                  }}
                  disabled={isLinking}
                >
                  <View style={[styles.chainIcon, { backgroundColor: '#0052FF' }]}>
                    <Text style={styles.chainEmoji}>Ξ</Text>
                  </View>
                  <View style={styles.chainInfo}>
                    <Text style={styles.chainName}>Ethereum / Base</Text>
                    <Text style={styles.chainDesc}>ERC-20 tokens</Text>
                  </View>
                  {selectedChain === 'ethereum' && (
                    <Ionicons name="checkmark-circle" size={20} color="#FF6EC7" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chainOption,
                    selectedChain === 'solana' && styles.chainOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setSelectedChain('solana')
                  }}
                  disabled={isLinking}
                >
                  <View style={[styles.chainIcon, { backgroundColor: '#9945FF' }]}>
                    <Text style={styles.chainEmoji}>◎</Text>
                  </View>
                  <View style={styles.chainInfo}>
                    <Text style={styles.chainName}>Solana</Text>
                    <Text style={styles.chainDesc}>SPL tokens</Text>
                  </View>
                  {selectedChain === 'solana' && (
                    <Ionicons name="checkmark-circle" size={20} color="#FF6EC7" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Wallet Options */}
              <Text style={styles.sectionTitle}>Select Wallet</Text>

              {filteredWallets.map(wallet => (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletOption,
                    !wallet.available && styles.walletOptionDisabled,
                    isLinking && styles.walletOptionDisabled,
                  ]}
                  onPress={() => handleSelectWallet(wallet)}
                  disabled={!wallet.available || isLinking}
                >
                  <View style={[styles.walletIcon, { backgroundColor: wallet.color }]}>
                    <Text style={styles.walletEmoji}>{wallet.icon}</Text>
                  </View>
                  <View style={styles.walletInfo}>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                    <Text style={styles.walletDesc}>{wallet.description}</Text>
                  </View>
                  {wallet.available ? (
                    <Feather name="chevron-right" size={20} color="#888" />
                  ) : (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Soon</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {/* Linking Status */}
              {isLinking && (
                <View style={styles.linkingStatus}>
                  <ActivityIndicator size="large" color="#FF6EC7" />
                  <Text style={styles.linkingText}>
                    {linkState.status === 'connecting'
                      ? 'Connecting to wallet...'
                      : 'Please sign the message in your wallet...'}
                  </Text>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                      onCancelLink()
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Error Display */}
              {linkState.status === 'error' && linkState.error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                  <Text style={styles.errorText}>{linkState.error}</Text>
                </View>
              )}

              {/* Security Note */}
              <View style={styles.securityNote}>
                <Ionicons name="shield-checkmark" size={18} color="#00FF88" />
                <Text style={styles.securityText}>
                  DANZ never has access to your private keys. All transactions require your
                  approval.
                </Text>
              </View>

              {/* Benefits Section */}
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>Why Link a Wallet?</Text>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="wallet" size={16} color="#FF6EC7" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitItemTitle}>Use Existing Assets</Text>
                    <Text style={styles.benefitItemDesc}>
                      Access your existing crypto without transferring
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="swap-horizontal" size={16} color="#00D9FF" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitItemTitle}>Seamless Transactions</Text>
                    <Text style={styles.benefitItemDesc}>
                      Send and receive from any connected wallet
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="lock-closed" size={16} color="#00FF88" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitItemTitle}>Full Control</Text>
                    <Text style={styles.benefitItemDesc}>Your keys, your crypto - always</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    maxHeight: '90%',
  },
  modal: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    paddingBottom: ms(40),
  },
  handleBar: {
    width: ms(40),
    height: ms(4),
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: ms(2),
    alignSelf: 'center',
    marginTop: ms(12),
    marginBottom: ms(8),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ms(20),
    paddingVertical: ms(16),
  },
  title: {
    fontSize: ms(24),
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: ms(8),
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(10),
    marginHorizontal: ms(20),
    padding: ms(16),
    backgroundColor: 'rgba(0,217,255,0.1)',
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.2)',
    marginBottom: ms(20),
  },
  infoText: {
    flex: 1,
    fontSize: ms(13),
    color: '#00D9FF',
    lineHeight: ms(18),
  },
  chainSelector: {
    paddingHorizontal: ms(20),
    gap: ms(12),
    marginBottom: ms(24),
  },
  chainOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(16),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    borderWidth: 2,
    borderColor: 'transparent',
    gap: ms(12),
  },
  chainOptionSelected: {
    borderColor: '#FF6EC7',
    backgroundColor: 'rgba(255,110,199,0.1)',
  },
  chainIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainEmoji: {
    fontSize: ms(20),
    color: '#fff',
  },
  chainInfo: {
    flex: 1,
  },
  chainName: {
    fontSize: ms(16),
    fontWeight: '600',
    color: '#fff',
  },
  chainDesc: {
    fontSize: ms(12),
    color: '#888',
    marginTop: ms(2),
  },
  sectionTitle: {
    fontSize: ms(14),
    fontWeight: '600',
    color: '#888',
    paddingHorizontal: ms(20),
    marginBottom: ms(12),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: ms(20),
    padding: ms(16),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    marginBottom: ms(10),
    gap: ms(12),
  },
  walletOptionDisabled: {
    opacity: 0.5,
  },
  walletIcon: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletEmoji: {
    fontSize: ms(22),
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: ms(16),
    fontWeight: '600',
    color: '#fff',
  },
  walletDesc: {
    fontSize: ms(12),
    color: '#888',
    marginTop: ms(2),
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(255,110,199,0.2)',
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(6),
  },
  comingSoonText: {
    fontSize: ms(11),
    color: '#FF6EC7',
    fontWeight: '500',
  },
  linkingStatus: {
    alignItems: 'center',
    padding: ms(24),
    marginHorizontal: ms(20),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(16),
    marginTop: ms(12),
    marginBottom: ms(20),
  },
  linkingText: {
    fontSize: ms(14),
    color: '#fff',
    marginTop: ms(16),
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: ms(16),
    paddingVertical: ms(10),
    paddingHorizontal: ms(24),
  },
  cancelButtonText: {
    fontSize: ms(14),
    color: '#888',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(10),
    marginHorizontal: ms(20),
    padding: ms(16),
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
    marginBottom: ms(16),
  },
  errorText: {
    flex: 1,
    fontSize: ms(13),
    color: '#FF6B6B',
    lineHeight: ms(18),
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    marginHorizontal: ms(20),
    marginTop: ms(16),
    marginBottom: ms(20),
  },
  securityText: {
    flex: 1,
    fontSize: ms(12),
    color: '#00FF88',
  },
  benefitsSection: {
    marginHorizontal: ms(20),
    padding: ms(16),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: ms(16),
    marginBottom: ms(20),
  },
  benefitsTitle: {
    fontSize: ms(16),
    fontWeight: '600',
    color: '#fff',
    marginBottom: ms(16),
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(12),
    marginBottom: ms(14),
  },
  benefitIcon: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitItemTitle: {
    fontSize: ms(14),
    fontWeight: '600',
    color: '#fff',
    marginBottom: ms(2),
  },
  benefitItemDesc: {
    fontSize: ms(12),
    color: '#888',
  },
})

export default WalletLinkModal
