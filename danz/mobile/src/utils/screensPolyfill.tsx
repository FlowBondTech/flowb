import React from 'react'
import { View } from 'react-native'

// Polyfill for react-native-screens on web
// These components are used by React Navigation but not needed on web

export const Screen = View
export const ScreenContainer = View
export const NativeScreenContainer = View
export const ScreenStack = View
export const ScreenStackHeaderConfig = View
export const ScreenStackHeaderBackButtonImage = View
export const ScreenStackHeaderCenterView = View
export const ScreenStackHeaderLeftView = View
export const ScreenStackHeaderRightView = View
export const ScreenStackHeaderSearchBarView = View
export const SearchBar = View
export const FullWindowOverlay = View

// Required for React Navigation's MaybeScreenContainer
export const shouldUseActivityState = false

export const enableScreens = () => {
  // No-op on web
}

export const enableFreeze = () => {
  // No-op on web
}

export const screensEnabled = () => {
  return false // Screens are not enabled on web
}

// Export any enum types that might be used
export const ScreenStackAnimation = {
  default: 'default',
  fade: 'fade',
  flip: 'flip',
  none: 'none',
  simple_push: 'simple_push',
  slide_from_right: 'slide_from_right',
  slide_from_left: 'slide_from_left',
  slide_from_bottom: 'slide_from_bottom',
  fade_from_bottom: 'fade_from_bottom',
}

export const ScreenStackHeaderSubviewType = {
  back: 'back',
  center: 'center',
  left: 'left',
  right: 'right',
  searchBar: 'searchBar',
}

export const ScreenReplaceTypes = {
  push: 'push',
  pop: 'pop',
}

export const ScreenOrientation = {
  default: 'default',
  all: 'all',
  portrait: 'portrait',
  portrait_up: 'portrait_up',
  portrait_down: 'portrait_down',
  landscape: 'landscape',
  landscape_left: 'landscape_left',
  landscape_right: 'landscape_right',
}

// Additional exports that might be needed
export const ScreenStackItem = View
export const ScreenFooter = View
export const ScreenContentWrapper = View
export const InnerScreen = View
export const ScreenStackHeaderSubview = View

// Context
export const ScreenContext = React.createContext(null)

// Additional functions
export const freezeEnabled = () => false
export const isSearchBarAvailableForCurrentPlatform = () => false
export const executeNativeBackPress = () => false

// Compatibility flags
export const compatibilityFlags = {
  isNewBackTitleImplementation: false,
}

// Hooks
export const useTransitionProgress = () => ({
  progress: { value: 1 },
  closing: { value: 0 },
  goingForward: { value: 0 },
})

// Export default as named exports too for compatibility
export default Screen
