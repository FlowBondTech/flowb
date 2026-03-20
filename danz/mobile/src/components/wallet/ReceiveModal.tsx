/**
 * ReceiveModal Component
 * Modal for receiving crypto with QR code and address display
 */

import { Feather, Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import {
  Animated,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Toast from 'react-native-toast-message'
import type { ChainType, UnifiedWallet } from '@/types/wallet'
import { NETWORKS, truncateAddress } from '@/types/wallet'
import { ms } from '@/utils/responsive'

interface ReceiveModalProps {
  visible: boolean
  onClose: () => void
  wallets: UnifiedWallet[]
  defaultChain?: ChainType
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  visible,
  onClose,
  wallets,
  defaultChain = 'ethereum',
}) => {
  const [selectedChain, setSelectedChain] = useState<ChainType>(defaultChain)
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

  // Get wallet for selected chain
  const selectedWallet =
    wallets.find(w => w.chainType === selectedChain && w.walletType === 'embedded') ||
    wallets.find(w => w.chainType === selectedChain)

  const network = selectedChain === 'ethereum' ? NETWORKS.base : NETWORKS.solana

  const handleCopyAddress = async () => {
    if (!selectedWallet) return
    await Clipboard.setStringAsync(selectedWallet.address)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Toast.show({
      type: 'success',
      text1: 'Address Copied',
      text2: 'Ready to receive crypto',
      visibilityTime: 2000,
    })
  }

  const handleShare = async () => {
    if (!selectedWallet) return
    try {
      await Share.share({
        message: `My ${network.name} wallet address: ${selectedWallet.address}`,
        title: `${network.name} Wallet Address`,
      })
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
  }

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
              <Text style={styles.title}>Receive</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                >
                  <View style={[styles.chainIcon, { backgroundColor: '#0052FF' }]}>
                    <Text style={styles.chainEmoji}>Ξ</Text>
                  </View>
                  <Text style={styles.chainName}>Base</Text>
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
                >
                  <View style={[styles.chainIcon, { backgroundColor: '#9945FF' }]}>
                    <Text style={styles.chainEmoji}>◎</Text>
                  </View>
                  <Text style={styles.chainName}>Solana</Text>
                  {selectedChain === 'solana' && (
                    <Ionicons name="checkmark-circle" size={20} color="#FF6EC7" />
                  )}
                </TouchableOpacity>
              </View>

              {/* QR Code */}
              {selectedWallet ? (
                <View style={styles.qrSection}>
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={selectedWallet.address}
                      size={ms(200)}
                      backgroundColor="#fff"
                      color="#1a1a2e"
                    />
                  </View>
                  <Text style={styles.qrHint}>
                    Scan to send {network.nativeSymbol} on {network.name}
                  </Text>
                </View>
              ) : (
                <View style={styles.noWalletSection}>
                  <Ionicons name="wallet-outline" size={48} color="#888" />
                  <Text style={styles.noWalletText}>
                    No {selectedChain === 'ethereum' ? 'Base' : 'Solana'} wallet found
                  </Text>
                </View>
              )}

              {/* Address */}
              {selectedWallet && (
                <View style={styles.addressSection}>
                  <Text style={styles.addressLabel}>Your {network.name} Address</Text>
                  <View style={styles.addressBox}>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {selectedWallet.address}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleCopyAddress}>
                      <Feather name="copy" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Copy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                      <Feather name="share" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Warning Banner */}
              <View style={styles.warningBanner}>
                <Ionicons name="information-circle" size={20} color="#FFE66D" />
                <Text style={styles.warningText}>
                  Only send {network.nativeSymbol} and{' '}
                  {selectedChain === 'ethereum' ? 'ERC-20' : 'SPL'} tokens on {network.name} to this
                  address. Sending other assets may result in permanent loss.
                </Text>
              </View>
            </ScrollView>

            {/* Done Button */}
            <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
              <LinearGradient
                colors={['#FF6EC7', '#B967FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneButtonGradient}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  chainSelector: {
    flexDirection: 'row',
    paddingHorizontal: ms(20),
    gap: ms(12),
    marginBottom: ms(24),
  },
  chainOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(16),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    borderWidth: 2,
    borderColor: 'transparent',
    gap: ms(10),
  },
  chainOptionSelected: {
    borderColor: '#FF6EC7',
    backgroundColor: 'rgba(255,110,199,0.1)',
  },
  chainIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainEmoji: {
    fontSize: ms(18),
    color: '#fff',
  },
  chainName: {
    flex: 1,
    fontSize: ms(16),
    fontWeight: '600',
    color: '#fff',
  },
  qrSection: {
    alignItems: 'center',
    paddingHorizontal: ms(20),
    marginBottom: ms(24),
  },
  qrContainer: {
    padding: ms(16),
    backgroundColor: '#fff',
    borderRadius: ms(16),
    marginBottom: ms(12),
  },
  qrHint: {
    fontSize: ms(14),
    color: '#888',
    textAlign: 'center',
  },
  noWalletSection: {
    alignItems: 'center',
    paddingVertical: ms(40),
    paddingHorizontal: ms(20),
  },
  noWalletText: {
    fontSize: ms(16),
    color: '#888',
    marginTop: ms(12),
    textAlign: 'center',
  },
  addressSection: {
    paddingHorizontal: ms(20),
    marginBottom: ms(24),
  },
  addressLabel: {
    fontSize: ms(14),
    color: '#888',
    marginBottom: ms(8),
  },
  addressBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: ms(16),
    borderRadius: ms(12),
    marginBottom: ms(16),
  },
  addressText: {
    fontSize: ms(13),
    color: '#fff',
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: ms(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
    paddingVertical: ms(14),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: ms(12),
  },
  actionButtonText: {
    fontSize: ms(15),
    fontWeight: '600',
    color: '#fff',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(10),
    marginHorizontal: ms(20),
    padding: ms(16),
    backgroundColor: 'rgba(255,230,109,0.1)',
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: 'rgba(255,230,109,0.2)',
    marginBottom: ms(24),
  },
  warningText: {
    flex: 1,
    fontSize: ms(13),
    color: '#FFE66D',
    lineHeight: ms(18),
  },
  doneButton: {
    marginHorizontal: ms(20),
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  doneButtonGradient: {
    paddingVertical: ms(16),
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: ms(17),
    fontWeight: '700',
    color: '#fff',
  },
})

export default ReceiveModal
