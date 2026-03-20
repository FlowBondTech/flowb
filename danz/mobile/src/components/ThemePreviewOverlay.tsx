import { Ionicons } from '@expo/vector-icons'
import { NavigationContext, useNavigation, useNavigationState } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import type React from 'react'
import { useContext, useEffect, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type ThemeName, useTheme } from '../contexts/ThemeContext'

// Inner component that uses navigation hooks
const ThemePreviewOverlayInner: React.FC = () => {
  const {
    isThemePreviewActive,
    previewTheme,
    availableThemes,
    setPreviewTheme,
    endThemePreview,
    theme,
    setTheme,
  } = useTheme()

  // Navigation hooks - safe to use here as we're inside NavigationContext
  const navigation = useNavigation<any>()
  const currentRouteName = useNavigationState(state => state?.routes[state.index]?.name)

  const [slideAnim] = useState(new Animated.Value(-100))
  const [currentIndex, setCurrentIndex] = useState(0)

  const themeNames = Object.keys(availableThemes) as ThemeName[]

  useEffect(() => {
    if (isThemePreviewActive) {
      // Find current theme index
      const index = previewTheme?.name ? themeNames.indexOf(previewTheme.name) : -1
      setCurrentIndex(index >= 0 ? index : 0)

      // Slide in animation
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start()
    } else {
      // Slide out animation
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [isThemePreviewActive, previewTheme, slideAnim, themeNames.indexOf])

  const handlePreviousTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const newIndex = currentIndex === 0 ? themeNames.length - 1 : currentIndex - 1
    setCurrentIndex(newIndex)
    setPreviewTheme(themeNames[newIndex])
  }

  const handleNextTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const newIndex = currentIndex === themeNames.length - 1 ? 0 : currentIndex + 1
    setCurrentIndex(newIndex)
    setPreviewTheme(themeNames[newIndex])
  }

  const handleUseTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Apply the currently previewed theme
    const selectedTheme = themeNames[currentIndex]
    setTheme(selectedTheme)
    endThemePreview()

    // Navigate back to Profile screen with Settings tab if navigation is available
    if (navigation && currentRouteName !== 'Profile') {
      navigation.navigate('Profile', {
        selectedTab: 'settings',
      })
    }
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    endThemePreview()

    // Navigate back to Profile screen with Settings tab if navigation is available
    if (navigation && currentRouteName !== 'Profile') {
      navigation.navigate('Profile', {
        selectedTab: 'settings',
      })
    }
  }

  if (!isThemePreviewActive) {
    return null
  }

  const currentTheme = availableThemes[themeNames[currentIndex]]

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <BlurView intensity={90} style={styles.blurContainer}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.content, { backgroundColor: `${theme.colors.surface}F0` }]}>
            <View style={styles.leftSection}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Try Themes</Text>
            </View>

            <View style={styles.centerSection}>
              <TouchableOpacity
                style={[styles.arrowButton, { backgroundColor: theme.colors.card }]}
                onPress={handlePreviousTheme}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>

              <View style={styles.themeInfo}>
                <View
                  style={[styles.themePreview, { backgroundColor: currentTheme.colors.background }]}
                >
                  <View style={styles.colorDots}>
                    <View
                      style={[styles.colorDot, { backgroundColor: currentTheme.colors.primary }]}
                    />
                    <View
                      style={[styles.colorDot, { backgroundColor: currentTheme.colors.secondary }]}
                    />
                    <View
                      style={[styles.colorDot, { backgroundColor: currentTheme.colors.accent }]}
                    />
                  </View>
                </View>
                <Text style={[styles.themeName, { color: theme.colors.text }]}>
                  {currentTheme.displayName}
                </Text>
                <Text style={[styles.themeCount, { color: theme.colors.textSecondary }]}>
                  {currentIndex + 1} of {themeNames.length}
                </Text>
                {theme.name === themeNames[currentIndex] && (
                  <Text style={[styles.currentTheme, { color: theme.colors.success }]}>
                    Current Theme
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.arrowButton, { backgroundColor: theme.colors.card }]}
                onPress={handleNextTheme}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.rightSection}>
              <TouchableOpacity
                style={[styles.useThemeButton, { backgroundColor: `${theme.colors.primary}20` }]}
                onPress={handleUseTheme}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: `${theme.colors.error}20` }]}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </BlurView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  blurContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  leftSection: {
    minWidth: 80,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  rightSection: {
    flexDirection: 'row',
    gap: 8,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeInfo: {
    alignItems: 'center',
    minWidth: 120,
  },
  themePreview: {
    width: 80,
    height: 50,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  colorDots: {
    flexDirection: 'row',
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeCount: {
    fontSize: 11,
  },
  currentTheme: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  useThemeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

// Wrapper component that checks for navigation context
export const ThemePreviewOverlay: React.FC = () => {
  const navigationContext = useContext(NavigationContext)
  const { isThemePreviewActive } = useTheme()

  // Only render the overlay if we're inside a navigation context and theme preview is active
  if (!navigationContext || !isThemePreviewActive) {
    return null
  }

  return <ThemePreviewOverlayInner />
}
