import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNavigation } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import notificationService, { type NotificationSettings } from '../services/notificationService'
import { fs, hs, ms, vs } from '../utils/responsive'

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation()
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    dailyReminders: true,
    reminderTimes: ['09:00', '15:00', '20:00'],
    motivationalStyle: 'spicy',
  })
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null)
  const [tempTime, setTempTime] = useState(new Date())

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const loaded = await notificationService.getSettings()
    setSettings(loaded)
  }

  const updateSetting = async (key: keyof NotificationSettings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    await notificationService.saveSettings(newSettings)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const testNotification = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await notificationService.scheduleInstantReminder(3)
    Alert.alert('Test Scheduled!', "You'll receive a notification in 3 seconds! 🔥")
  }

  const addReminderTime = () => {
    if (settings.reminderTimes.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 reminder times allowed')
      return
    }
    setEditingTimeIndex(settings.reminderTimes.length)
    setShowTimePicker(true)
  }

  const editReminderTime = (index: number) => {
    const [hours, minutes] = settings.reminderTimes[index].split(':').map(Number)
    const date = new Date()
    date.setHours(hours)
    date.setMinutes(minutes)
    setTempTime(date)
    setEditingTimeIndex(index)
    setShowTimePicker(true)
  }

  const removeReminderTime = (index: number) => {
    const newTimes = settings.reminderTimes.filter((_, i) => i !== index)
    updateSetting('reminderTimes', newTimes)
  }

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(false)
    if (selectedDate && editingTimeIndex !== null) {
      const hours = selectedDate.getHours().toString().padStart(2, '0')
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0')
      const timeString = `${hours}:${minutes}`

      const newTimes = [...settings.reminderTimes]
      if (editingTimeIndex >= newTimes.length) {
        newTimes.push(timeString)
      } else {
        newTimes[editingTimeIndex] = timeString
      }

      updateSetting('reminderTimes', newTimes)
    }
    setEditingTimeIndex(null)
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Notification Settings</Text>
      <View style={styles.backButton} />
    </View>
  )

  const renderStyleOption = (
    style: 'spicy' | 'gentle' | 'hardcore',
    icon: string,
    label: string,
    description: string,
  ) => (
    <TouchableOpacity
      style={[styles.styleOption, settings.motivationalStyle === style && styles.styleOptionActive]}
      onPress={() => updateSetting('motivationalStyle', style)}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={24}
        color={settings.motivationalStyle === style ? '#FF1493' : 'rgba(255,255,255,0.5)'}
      />
      <View style={styles.styleInfo}>
        <Text
          style={[
            styles.styleLabel,
            settings.motivationalStyle === style && styles.styleLabelActive,
          ]}
        >
          {label}
        </Text>
        <Text style={styles.styleDescription}>{description}</Text>
      </View>
      {settings.motivationalStyle === style && (
        <Ionicons name="checkmark-circle" size={20} color="#FF1493" />
      )}
    </TouchableOpacity>
  )

  return (
    <LinearGradient colors={['#1A0033', '#2D1B69', '#0A0033']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Main Toggle */}
          <BlurView intensity={20} tint="dark" style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Enable Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get motivated to DANZ and save the world!
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={value => updateSetting('enabled', value)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#FF1493' }}
                thumbColor={settings.enabled ? '#B967FF' : '#f4f3f4'}
              />
            </View>
          </BlurView>

          {/* Daily Reminders */}
          <BlurView intensity={20} tint="dark" style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Daily Reminders</Text>
                <Text style={styles.settingDescription}>Regular nudges to keep you moving</Text>
              </View>
              <Switch
                value={settings.dailyReminders}
                onValueChange={value => updateSetting('dailyReminders', value)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#FF1493' }}
                thumbColor={settings.dailyReminders ? '#B967FF' : '#f4f3f4'}
                disabled={!settings.enabled}
              />
            </View>

            {settings.dailyReminders && (
              <View style={styles.timesContainer}>
                <Text style={styles.timesTitle}>Reminder Times</Text>
                {settings.reminderTimes.map((time, index) => (
                  <View key={index} style={styles.timeRow}>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => editReminderTime(index)}
                    >
                      <Ionicons name="time-outline" size={20} color="#FF1493" />
                      <Text style={styles.timeText}>{time}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeReminderTime(index)}>
                      <Ionicons name="trash-outline" size={20} color="rgba(255,107,107,0.8)" />
                    </TouchableOpacity>
                  </View>
                ))}
                {settings.reminderTimes.length < 5 && (
                  <TouchableOpacity style={styles.addTimeButton} onPress={addReminderTime}>
                    <Ionicons name="add-circle-outline" size={20} color="#B967FF" />
                    <Text style={styles.addTimeText}>Add Reminder Time</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </BlurView>

          {/* Motivational Style */}
          <BlurView intensity={20} tint="dark" style={styles.section}>
            <Text style={styles.sectionTitle}>Motivational Style</Text>
            <Text style={styles.sectionDescription}>
              Choose your vibe for notification messages
            </Text>

            {renderStyleOption(
              'gentle',
              'flower',
              'Gentle',
              'Soft encouragement and positive vibes',
            )}
            {renderStyleOption(
              'spicy',
              'fire',
              'Spicy 🔥',
              'Fun, energetic, world-saving urgency!',
            )}
            {renderStyleOption(
              'hardcore',
              'lightning-bolt',
              'HARDCORE',
              'MAXIMUM INTENSITY! NO EXCUSES!',
            )}
          </BlurView>

          {/* Test Notification */}
          <TouchableOpacity style={styles.testButton} onPress={testNotification}>
            <LinearGradient
              colors={['#FF6B6B', '#FF1493', '#B967FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.testButtonGradient}
            >
              <MaterialCommunityIcons name="bell-ring" size={24} color="white" />
              <Text style={styles.testButtonText}>Test Notification</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="rgba(255,255,255,0.4)" />
            <Text style={styles.infoText}>
              Notifications work in Expo Go for testing. Push notifications will be fully enabled in
              the production app.
            </Text>
          </View>
        </ScrollView>

        {showTimePicker && (
          <DateTimePicker
            value={tempTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: hs(20),
    paddingVertical: vs(16),
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fs(20),
    fontWeight: '700',
    color: 'white',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: hs(20),
  },
  section: {
    borderRadius: ms(16),
    padding: ms(20),
    marginBottom: vs(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: hs(16),
  },
  settingTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: 'white',
    marginBottom: vs(4),
  },
  settingDescription: {
    fontSize: fs(13),
    color: 'rgba(255,255,255,0.6)',
  },
  timesContainer: {
    marginTop: vs(16),
    paddingTop: vs(16),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  timesTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: vs(12),
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: hs(16),
    paddingVertical: vs(10),
    borderRadius: ms(12),
    flex: 1,
    marginRight: hs(12),
  },
  timeText: {
    fontSize: fs(16),
    fontWeight: '500',
    color: 'white',
    marginLeft: hs(8),
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(12),
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: 'rgba(185,103,255,0.3)',
    borderStyle: 'dashed',
  },
  addTimeText: {
    fontSize: fs(14),
    color: '#B967FF',
    marginLeft: hs(8),
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: 'white',
    marginBottom: vs(4),
  },
  sectionDescription: {
    fontSize: fs(13),
    color: 'rgba(255,255,255,0.6)',
    marginBottom: vs(16),
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(16),
    borderRadius: ms(12),
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: vs(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  styleOptionActive: {
    backgroundColor: 'rgba(255,20,147,0.1)',
    borderColor: 'rgba(255,20,147,0.3)',
  },
  styleInfo: {
    flex: 1,
    marginLeft: hs(12),
  },
  styleLabel: {
    fontSize: fs(15),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: vs(2),
  },
  styleLabelActive: {
    color: 'white',
  },
  styleDescription: {
    fontSize: fs(12),
    color: 'rgba(255,255,255,0.5)',
  },
  testButton: {
    marginVertical: vs(24),
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  testButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(16),
    gap: hs(8),
  },
  testButtonText: {
    fontSize: fs(16),
    fontWeight: '700',
    color: 'white',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    padding: ms(16),
    marginBottom: vs(24),
  },
  infoText: {
    flex: 1,
    fontSize: fs(12),
    color: 'rgba(255,255,255,0.5)',
    marginLeft: hs(8),
    lineHeight: fs(18),
  },
})
