import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useState } from 'react'
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useApp } from '../contexts/AppContext'
import { theme as themeConfig } from '../styles/theme'
import { fs, hs, ms, vs } from '../utils/responsive'

const { height: screenHeight } = Dimensions.get('window')

interface DanceStartModalProps {
  visible: boolean
  onClose: () => void
}

type ModalView = 'main' | 'code' | 'scanner'

export const DanceStartModal: React.FC<DanceStartModalProps> = ({ visible, onClose }) => {
  const navigation = useNavigation()
  const { startDancing } = useApp()
  const [currentView, setCurrentView] = useState<ModalView>('main')
  const [eventCode, setEventCode] = useState('')
  const [mockScannerActive, setMockScannerActive] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentView('main')
      setEventCode('')
      setMockScannerActive(false)
    }
  }, [visible])

  const handleScanQR = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setCurrentView('scanner')
    setMockScannerActive(true)

    // Simulate QR code scanning after 2 seconds
    setTimeout(() => {
      if (mockScannerActive) {
        handleMockQRCodeScanned()
      }
    }, 2000)
  }

  const handleMockQRCodeScanned = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    Alert.alert('Event Found! 🎉', "You've joined the DANZ Community Event", [
      {
        text: 'Start Dancing',
        onPress: () => {
          startDancing()
          navigation.navigate('DanceScreen' as never)
          onClose()
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {
          setMockScannerActive(false)
        },
      },
    ])
  }

  const handleEnterCode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentView('code')
  }

  const handleCodeSubmit = () => {
    if (eventCode.length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid event code')
      return
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    Alert.alert('Event Joined! 🎉', `You've joined the event with code: ${eventCode}`, [
      {
        text: 'Start Dancing',
        onPress: () => {
          startDancing()
          navigation.navigate('DanceScreen' as never)
          onClose()
        },
      },
    ])
  }

  const handleDanceSolo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate('FreestyleSession' as never)
    onClose()
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentView('main')
    setEventCode('')
    setMockScannerActive(false)
  }

  const renderMainOptions = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.title}>How would you like to DANZ?</Text>
      <Text style={styles.subtitle}>Join an event or DANZ NOW</Text>

      <View style={styles.optionsContainer}>
        {/* Scan QR Code Option */}
        <TouchableOpacity style={styles.optionCard} onPress={handleScanQR} activeOpacity={0.9}>
          <LinearGradient
            colors={['rgba(255, 107, 107, 0.15)', 'rgba(255, 20, 147, 0.15)']}
            style={styles.optionGradient}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="qrcode-scan" size={ms(32)} color="#FF6B6B" />
            </View>
            <Text style={styles.optionTitle}>Scan QR Code</Text>
            <Text style={styles.optionDescription}>Scan event QR to join & earn bonus rewards</Text>
            <View style={styles.bonusTag}>
              <Text style={styles.bonusText}>+50 $DANZ Bonus</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Enter Code Option */}
        <TouchableOpacity style={styles.optionCard} onPress={handleEnterCode} activeOpacity={0.9}>
          <LinearGradient
            colors={['rgba(185, 103, 255, 0.15)', 'rgba(255, 20, 147, 0.15)']}
            style={styles.optionGradient}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="numeric" size={ms(32)} color="#B967FF" />
            </View>
            <Text style={styles.optionTitle}>Enter Code</Text>
            <Text style={styles.optionDescription}>Have an event code? Enter it manually</Text>
            <View style={styles.bonusTag}>
              <Text style={styles.bonusText}>+25 $DANZ Bonus</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* DANZ NOW Option */}
        <TouchableOpacity style={styles.optionCard} onPress={handleDanceSolo} activeOpacity={0.9}>
          <LinearGradient
            colors={['rgba(5, 255, 161, 0.15)', 'rgba(1, 255, 247, 0.15)']}
            style={styles.optionGradient}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="account" size={ms(32)} color="#05FFA1" />
            </View>
            <Text style={styles.optionTitle}>Freestyle Session</Text>
            <Text style={styles.optionDescription}>10-min max • Earn points by moving</Text>
            <View style={styles.standardTag}>
              <Text style={styles.standardText}>Up to 20 Points</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderCodeInput = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={ms(24)} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Enter Event Code</Text>
      <Text style={styles.subtitle}>Join your friends and earn bonus rewards</Text>

      <View style={styles.codeInputContainer}>
        <TextInput
          style={styles.codeInput}
          value={eventCode}
          onChangeText={setEventCode}
          placeholder="Enter 4-8 digit code"
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          keyboardType="default"
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, eventCode.length < 4 && styles.submitButtonDisabled]}
        onPress={handleCodeSubmit}
        disabled={eventCode.length < 4}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={
            eventCode.length >= 4 ? ['#FF6B6B', '#FF1493', '#B967FF'] : ['#333', '#444', '#333']
          }
          style={styles.submitGradient}
        >
          <Text style={styles.submitText}>Join Event</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.codeHint}>
        Event codes are shared by facilitators at the start of each session
      </Text>
    </ScrollView>
  )

  const renderMockScanner = () => {
    return (
      <View style={styles.scannerContainer}>
        {/* Mock camera view with gradient background */}
        <LinearGradient
          colors={['#1a0033', '#2d1b69', '#1a0033']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.scannerOverlay}>
          <TouchableOpacity style={styles.scannerBackButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={ms(28)} color="white" />
          </TouchableOpacity>

          <View style={styles.scannerFrame}>
            <View style={[styles.scannerCorner, styles.scannerCornerTL]} />
            <View style={[styles.scannerCorner, styles.scannerCornerTR]} />
            <View style={[styles.scannerCorner, styles.scannerCornerBL]} />
            <View style={[styles.scannerCorner, styles.scannerCornerBR]} />

            {/* Animated scanning line */}
            <View style={styles.scanLine} />
          </View>

          <Text style={styles.scannerText}>
            {mockScannerActive ? 'Scanning for QR code...' : 'Point camera at event QR code'}
          </Text>

          <TouchableOpacity style={styles.mockScanButton} onPress={handleMockQRCodeScanned}>
            <LinearGradient
              colors={['#FF6B6B', '#FF1493', '#B967FF']}
              style={styles.mockScanGradient}
            >
              <Text style={styles.mockScanText}>Simulate QR Scan</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -100 : 0}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View
          style={[
            styles.modalContent,
            currentView === 'scanner' && styles.modalContentFullScreen,
            currentView === 'code' && styles.modalContentKeyboard,
          ]}
        >
          {currentView === 'scanner' ? (
            renderMockScanner()
          ) : (
            <View style={styles.contentWrapper}>
              <View style={styles.handle} />

              {currentView === 'main' && renderMainOptions()}
              {currentView === 'code' && renderCodeInput()}

              {currentView !== 'code' && (
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: themeConfig.colors.modalBackground,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    overflow: 'hidden',
    minHeight: screenHeight * 0.65,
  },
  modalContentFullScreen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: screenHeight,
    height: screenHeight,
  },
  modalContentKeyboard: {
    minHeight: screenHeight * 0.5,
  },
  contentWrapper: {
    padding: hs(24),
    paddingBottom: vs(40),
    minHeight: screenHeight * 0.65,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: vs(20),
  },
  contentContainer: {
    flex: 1,
  },
  handle: {
    width: hs(40),
    height: vs(4),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: ms(2),
    alignSelf: 'center',
    marginBottom: vs(24),
  },
  title: {
    fontSize: fs(24),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: vs(8),
  },
  subtitle: {
    fontSize: fs(14),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: vs(32),
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  optionGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  optionDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    position: 'absolute',
    bottom: 20,
    left: 84,
  },
  bonusTag: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bonusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  standardTag: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(5, 255, 161, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  standardText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#05FFA1',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  codeInputContainer: {
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 4,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  codeHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 8,
  },
  closeButton: {
    marginTop: 24,
    paddingVertical: 12,
  },
  closeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontWeight: '500',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    zIndex: 10,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderColor: '#FF1493',
    borderWidth: 4,
  },
  scannerCornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  scannerCornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  scannerCornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  scannerCornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scannerText: {
    color: 'white',
    fontSize: 16,
    marginTop: 30,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#FF1493',
    top: '50%',
    opacity: 0.7,
  },
  mockScanButton: {
    position: 'absolute',
    bottom: 100,
    borderRadius: 25,
    overflow: 'hidden',
  },
  mockScanGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  mockScanText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
