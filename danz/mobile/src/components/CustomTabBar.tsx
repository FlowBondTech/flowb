import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { Dimensions, Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { useHaptics } from '../hooks/useHaptics'
import { hexToRgba } from '../styles/designSystem'
import { theme as themeConfig } from '../styles/theme'
import { hs, ms, vs } from '../utils/responsive'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const { width: screenWidth } = Dimensions.get('window')

interface CustomTabBarProps {
  state: any
  navigation: any
  onDanzPress: () => void
}

export const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, navigation, onDanzPress }) => {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()
  const danzScale = useSharedValue(1)

  const danzButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: danzScale.value }],
  }))

  const handleDanzPress = () => {
    haptics.trigger('heavy')
    danzScale.value = withSpring(0.9, { damping: 15, stiffness: 400 })
    setTimeout(() => {
      danzScale.value = withSpring(1, { damping: 15, stiffness: 400 })
    }, 100)
    onDanzPress()
  }

  const getIconName = (routeName: string, focused: boolean) => {
    switch (routeName) {
      case 'Home':
        return focused ? 'home' : 'home-outline'
      case 'Events':
        return focused ? 'calendar' : 'calendar-outline'
      case 'Feed':
        return focused ? 'account-group' : 'account-group-outline'
      case 'Profile':
        return focused ? 'person' : 'person-outline'
      case 'Create':
        return focused ? 'add-circle' : 'add-circle-outline'
      default:
        return 'help-circle-outline'
    }
  }

  // Calculate proper spacing for icons around the center DANZ button
  const renderTabIcon = (route: any, index: number) => {
    const isFocused = state.index === index
    const iconName = getIconName(route.name, isFocused)
    const color = isFocused ? theme.colors.primary : theme.colors.textSecondary

    const onPress = () => {
      haptics.trigger('selection')
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      })

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name)
      }
    }

    return (
      <TouchableOpacity key={index} onPress={onPress} style={styles.tab}>
        <View style={styles.iconContainer}>
          {route.name === 'Feed' ? (
            <MaterialCommunityIcons name={iconName as any} size={ms(24)} color={color} />
          ) : route.name === 'Create' ? (
            <Ionicons name={iconName as any} size={ms(24)} color={color} />
          ) : (
            <Ionicons name={iconName as any} size={ms(24)} color={color} />
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {/* Left side tabs */}
      <View style={styles.leftTabs}>
        {state.routes.slice(0, 2).map((route: any, index: number) => renderTabIcon(route, index))}
      </View>

      {/* Center space for DANZ button */}
      <View style={styles.centerSpace} />

      {/* Right side tabs */}
      <View style={styles.rightTabs}>
        {state.routes.slice(2).map((route: any, index: number) => renderTabIcon(route, index + 2))}
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Glassmorphic tab bar with blur */}
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={80}
          tint={theme.glass.tint}
          style={[
            styles.tabBarContainer,
            { paddingBottom: insets.bottom, borderTopColor: theme.colors.glassBorder },
          ]}
        >
          <View
            style={[styles.blurOverlay, { backgroundColor: theme.colors.glassSurface }]}
          />
          {renderTabBar()}
        </BlurView>
      ) : (
        <View
          style={[
            styles.tabBarContainer,
            { paddingBottom: insets.bottom, borderTopColor: theme.colors.glassBorder, backgroundColor: theme.colors.glassOverlay },
          ]}
        >
          {renderTabBar()}
        </View>
      )}

      {/* Raised DANZ NOW Button with animation */}
      <AnimatedTouchable
        style={[
          styles.danzButtonContainer,
          danzButtonAnimatedStyle,
          { shadowColor: theme.colors.primary },
        ]}
        onPress={handleDanzPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary, theme.colors.accent]}
          style={styles.danzButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.danzButtonInner}>
            <Image
              source={require('../../assets/DANZ ICON WHITE.png')}
              style={styles.danzIcon}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* Glow effect */}
        <LinearGradient
          colors={[
            hexToRgba(theme.colors.primary, 0.3),
            hexToRgba(theme.colors.secondary, 0.3),
            'transparent',
          ]}
          style={styles.glowEffect}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </AnimatedTouchable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarContainer: {
    flexDirection: 'column',
    overflow: 'hidden',
    borderTopWidth: 1,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? vs(60) : vs(56),
    alignItems: 'center',
    paddingHorizontal: hs(10),
  },
  leftTabs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  rightTabs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  centerSpace: {
    width: hs(90), // Space for the DANZ button
  },
  tab: {
    flex: 1,
    height: '100%',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  danzButtonContainer: {
    position: 'absolute',
    top: vs(-25),
    left: screenWidth / 2 - hs(35),
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: ms(15),
    zIndex: 10,
  },
  danzButtonGradient: {
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
    padding: ms(3),
  },
  danzButtonInner: {
    flex: 1,
    backgroundColor: themeConfig.colors.modalBackground,
    borderRadius: ms(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  danzIcon: {
    width: ms(32),
    height: ms(32),
  },
  glowEffect: {
    position: 'absolute',
    top: 10,
    left: -10,
    right: -10,
    bottom: -20,
    borderRadius: ms(40),
    zIndex: -1,
  },
})
