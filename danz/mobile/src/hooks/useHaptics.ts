import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'soft'
  | 'rigid'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'

export const useHaptics = () => {
  const isSupported = Platform.OS === 'ios' || Platform.OS === 'android'

  const trigger = async (type: HapticType = 'medium') => {
    if (!isSupported) return

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          break
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          break
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          break
        case 'soft':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
          break
        case 'rigid':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
          break
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          break
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          break
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          break
        case 'selection':
          await Haptics.selectionAsync()
          break
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
    } catch (error) {
      // Silently fail - haptics are non-critical
      console.debug('[Haptics] Failed:', error)
    }
  }

  // Convenience methods for common actions
  const buttonPress = () => trigger('light')
  const cardPress = () => trigger('medium')
  const success = () => trigger('success')
  const error = () => trigger('error')
  const warning = () => trigger('warning')
  const selection = () => trigger('selection')
  const heavyImpact = () => trigger('heavy')

  return {
    trigger,
    buttonPress,
    cardPress,
    success,
    error,
    warning,
    selection,
    heavyImpact,
    isSupported,
  }
}

export default useHaptics
