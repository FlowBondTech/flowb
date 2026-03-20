import { Platform } from 'react-native'

// Platform-specific imports and polyfills for web compatibility

// BlurView wrapper for web
export const BlurViewCompat =
  Platform.OS === 'web'
    ? ({ children, intensity, style, tint }: any) => (
        <div
          style={{
            ...style,
            backgroundColor: tint === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
            backdropFilter: `blur(${intensity}px)`,
            WebkitBackdropFilter: `blur(${intensity}px)`,
          }}
        >
          {children}
        </div>
      )
    : require('expo-blur').BlurView

// Linear Gradient wrapper for web
export const LinearGradientCompat =
  Platform.OS === 'web'
    ? require('react-native-web-linear-gradient').default
    : require('expo-linear-gradient').LinearGradient

// Haptics wrapper for web
export const HapticsCompat = {
  impactAsync:
    Platform.OS === 'web'
      ? async (_style?: any) => {
          /* No-op on web */
        }
      : require('expo-haptics').impactAsync,

  notificationAsync:
    Platform.OS === 'web'
      ? async (_type?: any) => {
          /* No-op on web */
        }
      : require('expo-haptics').notificationAsync,

  selectionAsync:
    Platform.OS === 'web'
      ? async () => {
          /* No-op on web */
        }
      : require('expo-haptics').selectionAsync,

  ImpactFeedbackStyle:
    Platform.OS === 'web'
      ? {
          Light: 'Light',
          Medium: 'Medium',
          Heavy: 'Heavy',
          Soft: 'Soft',
          Rigid: 'Rigid',
        }
      : require('expo-haptics').ImpactFeedbackStyle,

  NotificationFeedbackType:
    Platform.OS === 'web'
      ? {
          Success: 'Success',
          Warning: 'Warning',
          Error: 'Error',
        }
      : require('expo-haptics').NotificationFeedbackType,
}

// Video wrapper for web
export const VideoViewCompat =
  Platform.OS === 'web'
    ? ({ source, style, ...props }: any) => (
        <video
          src={typeof source === 'object' ? source.uri : source}
          style={style}
          autoPlay
          muted
          loop
          playsInline
          {...props}
        />
      )
    : require('expo-video').VideoView

// KeepAwake wrapper for web
export const KeepAwakeCompat =
  Platform.OS === 'web'
    ? ({ children }: any) => children || null
    : require('expo-keep-awake').default

// Location wrapper for web
export const LocationCompat = {
  requestForegroundPermissionsAsync:
    Platform.OS === 'web'
      ? async () => ({ status: 'granted' })
      : require('expo-location').requestForegroundPermissionsAsync,

  getCurrentPositionAsync:
    Platform.OS === 'web'
      ? async () => ({
          coords: {
            latitude: 37.7749, // Default to SF
            longitude: -122.4194,
            altitude: 0,
            accuracy: 100,
            altitudeAccuracy: 0,
            heading: 0,
            speed: 0,
          },
          timestamp: Date.now(),
        })
      : require('expo-location').getCurrentPositionAsync,
}

// Sensors wrapper for web
export const AccelerometerCompat =
  Platform.OS === 'web'
    ? {
        addListener: (callback: any) => {
          // Simulate accelerometer data for web
          const interval = setInterval(() => {
            callback({
              x: Math.random() * 0.1 - 0.05,
              y: Math.random() * 0.1 - 0.05,
              z: Math.random() * 0.1 - 0.05,
            })
          }, 100)

          return {
            remove: () => clearInterval(interval),
          }
        },
        setUpdateInterval: (_interval: number) => {
          /* No-op on web */
        },
      }
    : require('expo-sensors').Accelerometer

// ImagePicker wrapper for web
export const ImagePickerCompat =
  Platform.OS === 'web'
    ? {
        launchImageLibraryAsync: async (_options: any) => {
          return new Promise(resolve => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'

            input.onchange = (e: any) => {
              const file = e.target.files[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = event => {
                  resolve({
                    canceled: false,
                    assets: [
                      {
                        uri: event.target?.result,
                        width: 1000,
                        height: 1000,
                      },
                    ],
                  })
                }
                reader.readAsDataURL(file)
              } else {
                resolve({ canceled: true, assets: [] })
              }
            }

            input.click()
          })
        },

        launchCameraAsync: async (options: any) => {
          // Web doesn't have direct camera access like mobile
          // Fallback to file picker
          return ImagePickerCompat.launchImageLibraryAsync(options)
        },

        MediaTypeOptions: {
          Images: 'Images',
          Videos: 'Videos',
          All: 'All',
        },
      }
    : require('expo-image-picker')

// Notifications wrapper for web and fallback for missing native module
const webNotificationsFallback = {
  getExpoPushTokenAsync: async () => ({ data: 'unavailable' }),
  getPermissionsAsync: async () => ({ status: 'undetermined' }),
  requestPermissionsAsync: async () => ({ status: 'denied' }),
  scheduleNotificationAsync: async (_content: any) => 'unavailable',
  cancelScheduledNotificationAsync: async (_id: string) => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  getAllScheduledNotificationsAsync: async () => [],
  setNotificationHandler: (_handler: any) => {},
  addNotificationReceivedListener: (_callback: any) => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: (_callback: any) => ({ remove: () => {} }),
  removeNotificationSubscription: (_subscription: any) => {},
  AndroidNotificationPriority: { HIGH: 'high', DEFAULT: 'default', LOW: 'low' },
}

let NotificationsCompat: any = webNotificationsFallback

if (Platform.OS === 'web') {
  NotificationsCompat = {
    ...webNotificationsFallback,
    scheduleNotificationAsync: async (content: any) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(content.content.title, {
          body: content.content.body,
          icon: '/icon.png',
        })
      }
      return 'web-notification-id'
    },
  }
} else {
  // Try to load native notifications, fallback if unavailable
  try {
    NotificationsCompat = require('expo-notifications')
  } catch (error) {
    console.log('expo-notifications native module not available, using fallback')
    NotificationsCompat = webNotificationsFallback
  }
}

export { NotificationsCompat }

// Export platform check utilities
export const isWeb = Platform.OS === 'web'
export const isMobile = Platform.OS === 'ios' || Platform.OS === 'android'
export const isIOS = Platform.OS === 'ios'
export const isAndroid = Platform.OS === 'android'
