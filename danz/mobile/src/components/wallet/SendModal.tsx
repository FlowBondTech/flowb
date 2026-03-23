/**
 * SendModal Component
 * Modal for sending crypto with wallet selection, amount input, and confirmation
 */

import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import type { ChainType, UnifiedWallet } from '@/types/wallet'
import { formatUsd, NETWORKS, truncateAddress } from '@/types/wallet'
import { ms } from '@/utils/responsive'

interface SendModalProps {
  visible: boolean
  onClose: () => void
  wallets: UnifiedWallet[]
  defaultWallet?: UnifiedWallet | null
  onSend?: (params: {
    fromWallet: UnifiedWallet
    toAddress: string
    amount: string
  }) => Promise<void>
}

// Prices for USD conversion (TODO: integrate real price feed)
const PRICES: Record<string, number> = {
  ETH: 3500,
  SOL: 200,
}

export const SendModal: React.FC<SendModalProps> = ({
  visible,
  onClose,
  wallets,
  defaultWallet,
  onSend,
}) => {
  const [selectedWallet, setSelectedWallet] = useState<UnifiedWallet | null>(
    defaultWallet || wallets[0] || null,
  )
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [showWalletPicker, setShowWalletPicker] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [step, setStep] = useState<'input' | 'confirm'>('input')

  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const slideAnim = React.useRef(new Animated.Value(300)).current

  React.useEffect(() => {
    if (visible) {
      // Reset state when opening
      setStep('input')
      setToAddress('')
      setAmount('')
      setIsSending(false)
      setSelectedWallet(
        defaultWallet || wallets.find(w => w.walletType === 'embedded') || wallets[0],
      )

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
  }, [visible, fadeAnim, slideAnim, wallets, defaultWallet])

  // Calculate USD value of amount
  const amountUsd = useMemo(() => {
    if (!amount || !selectedWallet) return '0.00'
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount)) return '0.00'
    const price = PRICES[selectedWallet.symbol] || 0
    return (numAmount * price).toFixed(2)
  }, [amount, selectedWallet])

  // Estimated gas fee (placeholder)
  const estimatedGas = useMemo(() => {
    if (!selectedWallet) return { fee: '0', feeUsd: '0.00' }
    if (selectedWallet.chainType === 'ethereum') {
      return { fee: '0.0003', feeUsd: '1.05' }
    }
    return { fee: '0.00001', feeUsd: '0.002' }
  }, [selectedWallet])

  // Validate address format
  const isValidAddress = useCallback((address: string, chain: ChainType): boolean => {
    if (!address) return false
    if (chain === 'ethereum') {
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    }
    // Basic Solana address validation
    return address.length >= 32 && address.length <= 44
  }, [])

  // Check if form is valid
  const isValid = useMemo(() => {
    if (!selectedWallet || !toAddress || !amount) return false
    if (!isValidAddress(toAddress, selectedWallet.chainType)) return false
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return false
    const balance = parseFloat(selectedWallet.balanceFormatted)
    if (numAmount > balance) return false
    return true
  }, [selectedWallet, toAddress, amount, isValidAddress])

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
  }

  const handleQuickAmount = (percent: number) => {
    if (!selectedWallet) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const balance = parseFloat(selectedWallet.balanceFormatted)
    const newAmount = (balance * percent).toFixed(6)
    setAmount(newAmount)
  }

  const handleReview = () => {
    if (!isValid) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setStep('confirm')
  }

  const handleSend = async () => {
    if (!selectedWallet || !isValid) return

    setIsSending(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

    try {
      if (onSend) {
        await onSend({
          fromWallet: selectedWallet,
          toAddress,
          amount,
        })
        Toast.show({
          type: 'success',
          text1: 'Transaction Sent!',
          text2: `${amount} ${selectedWallet.symbol} sent successfully`,
        })
        onClose()
      } else {
        // Transaction signing requires development build with Privy embedded wallet provider
        Alert.alert(
          'Development Build Required',
          `Sending ${amount} ${selectedWallet.symbol} to ${truncateAddress(toAddress)} requires a development build with transaction signing enabled.\n\nThis feature is available in production builds!`,
          [{ text: 'OK', onPress: () => setStep('input') }],
        )
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Transaction Failed',
        text2: error.message || 'Please try again',
      })
    } finally {
      setIsSending(false)
    }
  }

  const renderWalletPicker = () => (
    <View style={styles.walletPicker}>
      {wallets.map(wallet => (
        <TouchableOpacity
          key={wallet.id}
          style={[
            styles.walletOption,
            selectedWallet?.id === wallet.id && styles.walletOptionSelected,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            setSelectedWallet(wallet)
            setShowWalletPicker(false)
          }}
        >
          <View
            style={[
              styles.walletIcon,
              {
                backgroundColor: wallet.chainType === 'ethereum' ? '#0052FF' : '#9945FF',
              },
            ]}
          >
            <Text style={styles.walletEmoji}>{wallet.chainType === 'ethereum' ? 'Ξ' : '◎'}</Text>
          </View>
          <View style={styles.walletOptionInfo}>
            <Text style={styles.walletOptionNetwork}>{wallet.network}</Text>
            <Text style={styles.walletOptionBalance}>
              {wallet.balanceFormatted} {wallet.symbol}
            </Text>
          </View>
          {selectedWallet?.id === wallet.id && (
            <Ionicons name="checkmark-circle" size={24} color="#FF6EC7" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderInputStep = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* From Wallet */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>From</Text>
        <TouchableOpacity
          style={styles.walletSelector}
          onPress={() => setShowWalletPicker(!showWalletPicker)}
        >
          {selectedWallet ? (
            <View style={styles.selectedWallet}>
              <View
                style={[
                  styles.walletIcon,
                  {
                    backgroundColor:
                      selectedWallet.chainType === 'ethereum' ? '#0052FF' : '#9945FF',
                  },
                ]}
              >
                <Text style={styles.walletEmoji}>
                  {selectedWallet.chainType === 'ethereum' ? 'Ξ' : '◎'}
                </Text>
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletNetwork}>{selectedWallet.network}</Text>
                <Text style={styles.walletBalance}>
                  {selectedWallet.balanceFormatted} {selectedWallet.symbol} available
                </Text>
              </View>
              <Feather name="chevron-down" size={20} color="#888" />
            </View>
          ) : (
            <Text style={styles.placeholderText}>Select wallet</Text>
          )}
        </TouchableOpacity>
        {showWalletPicker && renderWalletPicker()}
      </View>

      {/* To Address */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>To</Text>
        <View style={styles.addressInput}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter wallet address"
            placeholderTextColor="#666"
            value={toAddress}
            onChangeText={setToAddress}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.inputIcon}>
            <Feather name="clipboard" size={20} color="#888" />
          </TouchableOpacity>
        </View>
        {toAddress && selectedWallet && !isValidAddress(toAddress, selectedWallet.chainType) && (
          <Text style={styles.errorText}>Invalid {selectedWallet.chainType} address</Text>
        )}
      </View>

      {/* Amount */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Amount</Text>
        <View style={styles.amountContainer}>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#666"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <Text style={styles.amountSymbol}>{selectedWallet?.symbol || 'ETH'}</Text>
        </View>
        <Text style={styles.amountUsd}>≈ ${amountUsd} USD</Text>

        {/* Quick Amount Buttons */}
        <View style={styles.quickAmounts}>
          {[0.25, 0.5, 0.75, 1].map(percent => (
            <TouchableOpacity
              key={percent}
              style={styles.quickAmountButton}
              onPress={() => handleQuickAmount(percent)}
            >
              <Text style={styles.quickAmountText}>
                {percent === 1 ? 'Max' : `${percent * 100}%`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gas Estimation */}
      <View style={styles.gasSection}>
        <View style={styles.gasRow}>
          <Text style={styles.gasLabel}>
            <Feather name="zap" size={14} color="#888" /> Network Fee
          </Text>
          <Text style={styles.gasValue}>
            ~{estimatedGas.fee} {selectedWallet?.symbol} (${estimatedGas.feeUsd})
          </Text>
        </View>
      </View>
    </ScrollView>
  )

  const renderConfirmStep = () => (
    <View style={styles.confirmContent}>
      <View style={styles.confirmIcon}>
        <Feather name="arrow-up-right" size={40} color="#FF6EC7" />
      </View>

      <Text style={styles.confirmTitle}>Confirm Send</Text>

      <View style={styles.confirmDetails}>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Amount</Text>
          <Text style={styles.confirmValue}>
            {amount} {selectedWallet?.symbol}
          </Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>USD Value</Text>
          <Text style={styles.confirmValue}>${amountUsd}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>To</Text>
          <Text style={styles.confirmValue}>{truncateAddress(toAddress, 8)}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Network</Text>
          <Text style={styles.confirmValue}>{selectedWallet?.network}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Network Fee</Text>
          <Text style={styles.confirmValue}>~${estimatedGas.feeUsd}</Text>
        </View>
        <View style={[styles.confirmRow, styles.confirmTotal]}>
          <Text style={styles.confirmTotalLabel}>Total</Text>
          <Text style={styles.confirmTotalValue}>
            ${(parseFloat(amountUsd) + parseFloat(estimatedGas.feeUsd)).toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          setStep('input')
        }}
      >
        <Feather name="arrow-left" size={16} color="#888" />
        <Text style={styles.backButtonText}>Back to edit</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

            <Animated.View
              style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}
            >
              <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.modal}>
                {/* Handle bar */}
                <View style={styles.handleBar} />

                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>Send</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Feather name="x" size={24} color="#888" />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.content}>
                  {step === 'input' ? renderInputStep() : renderConfirmStep()}
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    !isValid && step === 'input' && styles.actionButtonDisabled,
                  ]}
                  onPress={step === 'input' ? handleReview : handleSend}
                  disabled={(step === 'input' && !isValid) || isSending}
                >
                  <LinearGradient
                    colors={
                      isValid || step === 'confirm' ? ['#FF6EC7', '#B967FF'] : ['#444', '#333']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButtonGradient}
                  >
                    {isSending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>
                        {step === 'input' ? 'Review' : 'Confirm Send'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    maxHeight: '92%',
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
  content: {
    paddingHorizontal: ms(20),
    maxHeight: ms(400),
  },
  section: {
    marginBottom: ms(20),
  },
  sectionLabel: {
    fontSize: ms(14),
    color: '#888',
    marginBottom: ms(8),
  },
  walletSelector: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    padding: ms(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedWallet: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(12),
  },
  walletEmoji: {
    fontSize: ms(18),
    color: '#fff',
  },
  walletInfo: {
    flex: 1,
  },
  walletNetwork: {
    fontSize: ms(16),
    fontWeight: '600',
    color: '#fff',
  },
  walletBalance: {
    fontSize: ms(13),
    color: '#888',
    marginTop: ms(2),
  },
  placeholderText: {
    color: '#666',
    fontSize: ms(16),
  },
  walletPicker: {
    marginTop: ms(8),
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: ms(12),
    overflow: 'hidden',
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  walletOptionSelected: {
    backgroundColor: 'rgba(255,110,199,0.1)',
  },
  walletOptionInfo: {
    flex: 1,
    marginLeft: ms(12),
  },
  walletOptionNetwork: {
    fontSize: ms(14),
    fontWeight: '600',
    color: '#fff',
  },
  walletOptionBalance: {
    fontSize: ms(12),
    color: '#888',
  },
  addressInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInput: {
    flex: 1,
    padding: ms(16),
    color: '#fff',
    fontSize: ms(14),
  },
  inputIcon: {
    padding: ms(16),
  },
  errorText: {
    color: '#FF4757',
    fontSize: ms(12),
    marginTop: ms(4),
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  amountInput: {
    flex: 1,
    padding: ms(16),
    color: '#fff',
    fontSize: ms(24),
    fontWeight: '700',
  },
  amountSymbol: {
    fontSize: ms(18),
    fontWeight: '600',
    color: '#888',
    paddingRight: ms(16),
  },
  amountUsd: {
    fontSize: ms(14),
    color: '#888',
    marginTop: ms(8),
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: ms(8),
    marginTop: ms(12),
  },
  quickAmountButton: {
    paddingVertical: ms(8),
    paddingHorizontal: ms(16),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(8),
  },
  quickAmountText: {
    fontSize: ms(13),
    color: '#fff',
  },
  gasSection: {
    padding: ms(16),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: ms(12),
    marginBottom: ms(20),
  },
  gasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gasLabel: {
    fontSize: ms(14),
    color: '#888',
  },
  gasValue: {
    fontSize: ms(14),
    color: '#fff',
  },
  actionButton: {
    marginHorizontal: ms(20),
    borderRadius: ms(16),
    overflow: 'hidden',
    marginTop: ms(8),
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonGradient: {
    paddingVertical: ms(16),
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: ms(17),
    fontWeight: '700',
    color: '#fff',
  },
  // Confirm step styles
  confirmContent: {
    alignItems: 'center',
    paddingVertical: ms(20),
  },
  confirmIcon: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    backgroundColor: 'rgba(255,110,199,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(20),
  },
  confirmTitle: {
    fontSize: ms(24),
    fontWeight: '700',
    color: '#fff',
    marginBottom: ms(24),
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(16),
    padding: ms(16),
    marginBottom: ms(20),
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: ms(10),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  confirmTotal: {
    borderBottomWidth: 0,
    paddingTop: ms(16),
    marginTop: ms(8),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  confirmLabel: {
    fontSize: ms(14),
    color: '#888',
  },
  confirmValue: {
    fontSize: ms(14),
    color: '#fff',
    fontWeight: '500',
  },
  confirmTotalLabel: {
    fontSize: ms(16),
    fontWeight: '600',
    color: '#fff',
  },
  confirmTotalValue: {
    fontSize: ms(18),
    fontWeight: '700',
    color: '#FF6EC7',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  backButtonText: {
    fontSize: ms(14),
    color: '#888',
  },
})

export default SendModal
