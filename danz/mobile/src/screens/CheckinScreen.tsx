import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { EventResult } from '../components/checkin/EventResult'
import { OrganizerQRView } from '../components/checkin/OrganizerQRView'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  useGetEventByCheckinCodeLazyQuery,
  useCheckInWithCodeMutation,
  useRegenerateCheckinCodeMutation,
  type GetEventByCheckinCodeQuery,
} from '../generated/graphql'
import { designSystem } from '../styles/designSystem'
import type { RootStackNavigationProp, RootStackRouteProp } from '../types/navigation'

type TabMode = 'scan' | 'code' | 'organizer'

type FoundEvent = NonNullable<GetEventByCheckinCodeQuery['eventByCheckinCode']>

export const CheckinScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Checkin'>>()
  const route = useRoute<RootStackRouteProp<'Checkin'>>()
  const { user } = useAuth()
  const { theme } = useTheme()
  const c = theme.colors

  const initialMode: TabMode = route.params?.mode === 'scan' ? 'scan' : 'code'
  const [activeTab, setActiveTab] = useState<TabMode>(initialMode)
  const [codeInput, setCodeInput] = useState('')
  const [foundEvent, setFoundEvent] = useState<FoundEvent | null>(null)
  const [checkinSuccess, setCheckinSuccess] = useState<boolean | null>(null)
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null)

  // Organizer state
  const [organizerCode, setOrganizerCode] = useState<string | null>(null)
  const [organizerEventTitle, setOrganizerEventTitle] = useState('')

  // GraphQL operations — codegen-generated typed hooks
  const [lookupEvent, { loading: lookupLoading }] = useGetEventByCheckinCodeLazyQuery({
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      const event = data?.eventByCheckinCode
      if (event) {
        setFoundEvent(event)
        // If user is the organizer, switch to organizer view
        if (event.facilitator?.privy_id === user?.privy_id && event.checkin_code) {
          setOrganizerCode(event.checkin_code)
          setOrganizerEventTitle(event.title)
          setActiveTab('organizer')
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        Toast.show({ type: 'error', text1: 'Not Found', text2: 'No event found with that code.' })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
  })

  const [checkinMutation, { loading: checkinLoading }] = useCheckInWithCodeMutation({
    onCompleted: (data) => {
      const result = data?.checkInWithCode
      setCheckinSuccess(result?.success ?? false)
      setCheckinMessage(result?.message ?? null)
      if (result?.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    },
    onError: (err) => {
      setCheckinSuccess(false)
      setCheckinMessage(err.message)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
  })

  const [regenerateMutation, { loading: regenerateLoading }] = useRegenerateCheckinCodeMutation({
    onCompleted: (data) => {
      const result = data?.regenerateCheckinCode
      if (result?.checkin_code) {
        setOrganizerCode(result.checkin_code)
        Toast.show({ type: 'success', text1: 'Code Regenerated', text2: 'New check-in code is active.' })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message })
    },
  })

  const handleLookup = useCallback(() => {
    const code = codeInput.trim()
    if (!code) {
      Toast.show({ type: 'error', text1: 'Enter a Code', text2: 'Please enter a check-in code.' })
      return
    }
    Keyboard.dismiss()
    lookupEvent({ variables: { code } })
  }, [codeInput, lookupEvent])

  const handleCheckin = useCallback(() => {
    const code = codeInput.trim()
    if (!code) return
    checkinMutation({ variables: { code } })
  }, [codeInput, checkinMutation])

  const handleRegenerate = useCallback(() => {
    if (!foundEvent?.id) return
    regenerateMutation({ variables: { eventId: foundEvent.id } })
  }, [foundEvent, regenerateMutation])

  const handleReset = useCallback(() => {
    setFoundEvent(null)
    setCheckinSuccess(null)
    setCheckinMessage(null)
    setCodeInput('')
  }, [])

  const tabs: { key: TabMode; label: string; icon: string }[] = [
    { key: 'scan', label: 'Scan', icon: 'qr-code-outline' },
    { key: 'code', label: 'Enter Code', icon: 'keypad-outline' },
  ]

  // Add organizer tab if they were detected as one
  if (activeTab === 'organizer') {
    tabs.push({ key: 'organizer', label: 'My Event', icon: 'megaphone-outline' })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={[c.background, c.surface]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Event Check-In</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: c.glassCard }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && [styles.tabActive, { backgroundColor: c.glassSurface }],
            ]}
            onPress={() => {
              setActiveTab(tab.key)
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? c.primary : c.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: c.textMuted },
                activeTab === tab.key && { color: c.primary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {foundEvent && activeTab !== 'organizer' ? (
          <EventResult
            event={foundEvent}
            checkinSuccess={checkinSuccess}
            checkinMessage={checkinMessage}
            isCheckingIn={checkinLoading}
            onCheckin={handleCheckin}
            onReset={handleReset}
          />
        ) : activeTab === 'organizer' && organizerCode ? (
          <OrganizerQRView
            checkinCode={organizerCode}
            eventTitle={organizerEventTitle}
            isRegenerating={regenerateLoading}
            onRegenerate={handleRegenerate}
          />
        ) : activeTab === 'scan' ? (
          <ScanPlaceholder onSwitchToCode={() => setActiveTab('code')} />
        ) : (
          <CodeEntryView
            code={codeInput}
            onChangeCode={setCodeInput}
            onSubmit={handleLookup}
            loading={lookupLoading}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// -- Inline sub-components to keep things organized --

const ScanPlaceholder: React.FC<{ onSwitchToCode: () => void }> = ({ onSwitchToCode }) => {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <View style={styles.scanContainer}>
      <View
        style={[
          styles.scanPlaceholder,
          {
            backgroundColor: c.glassCard,
            borderColor: c.glassBorder,
          },
        ]}
      >
        <Ionicons name="camera-outline" size={64} color={c.textMuted} />
        <Text style={[styles.scanTitle, { color: c.textSecondary }]}>QR Scanner</Text>
        <Text style={[styles.scanHint, { color: c.textMuted }]}>
          Camera scanning requires a development build with expo-camera installed.
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.fallbackButton, { borderColor: c.primary }]}
        onPress={onSwitchToCode}
      >
        <Ionicons name="keypad-outline" size={18} color={c.primary} />
        <Text style={[styles.fallbackText, { color: c.primary }]}>Enter code manually instead</Text>
      </TouchableOpacity>
    </View>
  )
}

interface CodeEntryViewProps {
  code: string
  onChangeCode: (v: string) => void
  onSubmit: () => void
  loading: boolean
}

const CodeEntryView: React.FC<CodeEntryViewProps> = ({ code, onChangeCode, onSubmit, loading }) => {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <View style={styles.codeContainer}>
      <Ionicons
        name="keypad-outline"
        size={48}
        color={c.primary}
        style={{ alignSelf: 'center', marginBottom: 16 }}
      />
      <Text style={[styles.codeTitle, { color: c.text }]}>Enter Check-In Code</Text>
      <Text style={[styles.codeHint, { color: c.textMuted }]}>
        Ask the event organizer for the check-in code
      </Text>

      <TextInput
        style={[
          styles.codeInput,
          {
            backgroundColor: c.glassCard,
            borderColor: c.glassBorder,
            color: c.text,
          },
        ]}
        value={code}
        onChangeText={onChangeCode}
        placeholder="e.g. DANZ-1234"
        placeholderTextColor={c.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <TouchableOpacity onPress={onSubmit} disabled={loading || !code.trim()} activeOpacity={0.8}>
        <LinearGradient
          colors={[...theme.gradients.primary] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.submitButton, (!code.trim() || loading) && styles.submitDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Look Up Event</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 8 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: { width: 40 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: designSystem.borderRadius.md,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: designSystem.borderRadius.sm,
  },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '500' },
  content: { flex: 1 },
  // Scan placeholder
  scanContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 48, alignItems: 'center' },
  scanPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 300,
    borderRadius: designSystem.borderRadius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    padding: 24,
  },
  scanTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  scanHint: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 1,
  },
  fallbackText: { fontSize: 14, fontWeight: '600' },
  // Code entry
  codeContainer: { paddingHorizontal: 20, paddingTop: 32 },
  codeTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  codeHint: { fontSize: 14, textAlign: 'center', marginBottom: 28 },
  codeInput: {
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: designSystem.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
})
