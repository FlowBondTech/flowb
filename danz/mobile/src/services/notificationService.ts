import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// Conditionally import expo-notifications only on mobile
let Notifications: any = null
let notificationsAvailable = false

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications')

    // Configure notification handler only on mobile
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
    notificationsAvailable = true
  } catch (error) {
    // Native module not available (e.g., in Expo Go without dev build)
    console.log('Notifications module not available:', error)
    Notifications = null
  }
}

// Spicy motivational messages
const DANZ_MESSAGES = [
  {
    title: '🔥 DANZ NOW to save the world!',
    body: 'Every move creates ripples of change. Be the revolution!',
  },
  {
    title: '⚡ Your body is calling!',
    body: 'The universe needs your energy. Time to DANZ!',
  },
  {
    title: '💃 Emergency: World needs more groove!',
    body: 'Only YOU can fix the vibe shortage. DANZ immediately!',
  },
  {
    title: '🌟 Breaking: Joy levels critical!',
    body: 'Inject pure happiness into reality. DANZ NOW!',
  },
  {
    title: '🚨 Alert: Your moves are needed!',
    body: 'The multiverse is watching. Show them what you got!',
  },
  {
    title: '🎯 Mission: Raise the frequency!',
    body: 'Your dance can shift timelines. Make it count!',
  },
  {
    title: '💥 Code Red: Boring alert!',
    body: 'Destroy monotony with your sick moves. DANZ!',
  },
  {
    title: '🌈 Urgent: Spread the DANZ virus!',
    body: 'Infect the world with unstoppable groove!',
  },
  {
    title: "⏰ Time's up! Move or lose!",
    body: 'Your future self is begging you to DANZ!',
  },
  {
    title: '🔮 Prophecy: You must DANZ today!',
    body: 'The oracle has spoken. Fulfill your destiny!',
  },
  {
    title: "🎪 Plot twist: You're the main character!",
    body: "This is your moment. DANZ like everyone's watching!",
  },
  {
    title: '🌍 Earth to you: DANZ required!',
    body: 'Reply with your best moves. Planet depends on it!',
  },
  {
    title: "🦸 Hero needed: That's you!",
    body: 'Save the day with your legendary DANZ skills!',
  },
  {
    title: '🎵 The beat is calling your name!',
    body: 'Answer with your whole body. DANZ NOW!',
  },
  {
    title: "💎 Rare opportunity: DANZ o'clock!",
    body: 'Limited time offer: Unlimited joy available now!',
  },
]

const NOTIFICATION_STORAGE_KEY = '@danz_notification_settings'

export interface NotificationSettings {
  enabled: boolean
  dailyReminders: boolean
  reminderTimes: string[] // Array of times in "HH:MM" format
  motivationalStyle: 'spicy' | 'gentle' | 'hardcore'
  lastNotificationDate?: string
}

const defaultSettings: NotificationSettings = {
  enabled: false,
  dailyReminders: false,
  reminderTimes: ['09:00', '15:00', '20:00'], // 9 AM, 3 PM, 8 PM
  motivationalStyle: 'spicy',
}

class NotificationService {
  private notificationListener: any = null
  private responseListener: any = null

  async initialize() {
    // Skip notification setup on web
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web')
      return false
    }

    if (!Notifications) {
      console.log('Notifications module not available')
      return false
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions')
      return false
    }

    // Set up listeners
    this.setupListeners()

    // Load settings and schedule notifications
    const settings = await this.getSettings()
    if (settings.enabled && settings.dailyReminders) {
      await this.scheduleDailyReminders()
    }

    return true
  }

  private setupListeners() {
    if (!Notifications || Platform.OS === 'web') {
      return
    }

    // This listener is fired whenever a notification is received while the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification: any) => {
        console.log('Notification received:', notification)
      },
    )

    // This listener is fired whenever a user taps on or interacts with a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        console.log('Notification response:', response)
        // Navigate to dance screen or appropriate action
      },
    )
  }

  async getSettings(): Promise<NotificationSettings> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY)
      return stored ? JSON.parse(stored) : defaultSettings
    } catch (error) {
      console.error('Error loading notification settings:', error)
      return defaultSettings
    }
  }

  async saveSettings(settings: NotificationSettings) {
    try {
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(settings))

      // Reschedule notifications based on new settings
      await this.cancelAllNotifications()
      if (settings.enabled && settings.dailyReminders) {
        await this.scheduleDailyReminders()
      }
    } catch (error) {
      console.error('Error saving notification settings:', error)
    }
  }

  async scheduleDailyReminders() {
    if (!Notifications || Platform.OS === 'web') {
      return
    }

    const settings = await this.getSettings()

    for (const time of settings.reminderTimes) {
      const [hours, minutes] = time.split(':').map(Number)

      // Get random message
      const message = this.getRandomMessage(settings.motivationalStyle)

      // Schedule repeating notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'daily_reminder' },
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      })
    }
  }

  async scheduleInstantReminder(delayInSeconds: number = 5) {
    if (!Notifications || Platform.OS === 'web') {
      return
    }

    const settings = await this.getSettings()
    const message = this.getRandomMessage(settings.motivationalStyle)

    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'instant_reminder' },
      },
      trigger: {
        seconds: delayInSeconds,
      },
    })
  }

  async scheduleStreakReminder() {
    if (!Notifications || Platform.OS === 'web') {
      return
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Your streak is at risk!',
        body: "Don't lose your momentum! DANZ now to keep the fire alive!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'streak_reminder' },
      },
      trigger: {
        hour: 21,
        minute: 0,
        repeats: true,
      },
    })
  }

  async scheduleEventReminder(eventName: string, eventTime: Date) {
    if (!Notifications || Platform.OS === 'web') {
      return
    }

    const reminderTime = new Date(eventTime.getTime() - 30 * 60000) // 30 minutes before

    if (reminderTime > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🎉 ${eventName} starting soon!`,
          body: 'Get ready to move! Your DANZ crew is waiting!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'event_reminder', eventName },
        },
        trigger: reminderTime,
      })
    }
  }

  private getRandomMessage(style: 'spicy' | 'gentle' | 'hardcore') {
    let messages = DANZ_MESSAGES

    if (style === 'gentle') {
      messages = [
        {
          title: '🌸 Time for your dance break',
          body: 'A little movement goes a long way!',
        },
        {
          title: '☀️ Ready to move?',
          body: 'Your body will thank you!',
        },
        {
          title: '🌊 Flow with DANZ',
          body: "Find your rhythm whenever you're ready",
        },
      ]
    } else if (style === 'hardcore') {
      messages = [
        {
          title: '💀 MOVE OR DIE OF BOREDOM!',
          body: 'NO EXCUSES! DANZ LIKE YOUR LIFE DEPENDS ON IT!',
        },
        {
          title: '🔥🔥🔥 GET UP NOW!!!',
          body: 'SITTING IS THE NEW SMOKING! DANZ OR PERISH!',
        },
        {
          title: '⚡⚡⚡ EMERGENCY DANZ PROTOCOL!',
          body: 'CODE RED! MAXIMUM GROOVE REQUIRED IMMEDIATELY!',
        },
      ]
    }

    return messages[Math.floor(Math.random() * messages.length)]
  }

  async cancelAllNotifications() {
    if (!Notifications || Platform.OS === 'web') {
      return
    }
    await Notifications.cancelAllScheduledNotificationsAsync()
  }

  async getScheduledNotifications() {
    if (!Notifications || Platform.OS === 'web') {
      return []
    }
    return await Notifications.getAllScheduledNotificationsAsync()
  }

  cleanup() {
    if (!Notifications || Platform.OS === 'web') {
      return
    }
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener)
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener)
    }
  }
}

export default new NotificationService()
