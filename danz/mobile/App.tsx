import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'

const Tab = createBottomTabNavigator()

import { StatusBar } from 'expo-status-bar'
import React from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { LinearGradientCompat as LinearGradient } from './src/utils/platformUtils'

const VideoView = Platform.OS === 'web' ? View : require('expo-video').VideoView
const useVideoPlayer = Platform.OS === 'web' ? () => null : require('expo-video').useVideoPlayer

import { usePrivy } from '@privy-io/expo'
import { AccessibilityProvider } from './src/contexts/AccessibilityContext'
// Context Providers
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { LocationProvider } from './src/contexts/LocationContext'
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext'
import { ApolloProvider } from './src/providers/ApolloProvider'
// Context Providers
import { PrivyProviderWrapper } from './src/providers/PrivyProvider'

// import { StripeProviderWrapper } from './src/config/stripe';

import { CustomTabBar } from './src/components/CustomTabBar'
import { DanceStartModal } from './src/components/DanceStartModal'
import ErrorBoundary from './src/components/ErrorBoundary'
import { ThemePreviewOverlay } from './src/components/ThemePreviewOverlay'
import { AppProvider } from './src/contexts/AppContext'
import { AccessibilitySettingsScreen } from './src/screens/AccessibilitySettingsScreen'
import { AuthScreen } from './src/screens/AuthScreen'
import BondRequestsScreen from './src/screens/BondRequestsScreen'
import { ClaimRewardsScreen } from './src/screens/ClaimRewardsScreen'
import { CreateEventScreen } from './src/screens/CreateEventScreen'
import { DanceScreen } from './src/screens/DanceScreen'
import { EditEventScreen } from './src/screens/EditEventScreen'
import { EditProfileScreen } from './src/screens/EditProfileScreen'
import { EventDetailsScreen } from './src/screens/EventDetailsScreen'
import { EventsScreen } from './src/screens/EventsScreen'
import { FeedbackScreen } from './src/screens/FeedbackScreen'
// import { StripeSubscriptionScreen } from './src/screens/StripeSubscriptionScreen'; // Disabled for Expo Go
import { FeedScreen } from './src/screens/FeedScreen'
import { FindEventsNearYouScreen } from './src/screens/FindEventsNearYouScreen'
import { FreestyleSessionScreen } from './src/screens/FreestyleSessionScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { NotificationScreen } from './src/screens/NotificationScreen'
import { NotificationSettingsScreen } from './src/screens/NotificationSettingsScreen'
import { OnboardingScreen } from './src/screens/OnboardingScreen'
import { OrganizerEventsScreen } from './src/screens/OrganizerEventsScreen'
import { PrivacySettingsScreen } from './src/screens/PrivacySettingsScreen'
import { ReferralScreen } from './src/screens/ReferralScreen'
import { SessionHistoryScreen } from './src/screens/SessionHistoryScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { SubscriptionScreen } from './src/screens/SubscriptionScreen'
import { UserEventsScreen } from './src/screens/UserEventsScreen'
import { UserProfileScreen } from './src/screens/UserProfileScreen'
import { UserScreen } from './src/screens/UserScreen'
import { WalletScreen } from './src/screens/WalletScreen'
import { AchievementsScreen } from './src/screens/AchievementsScreen'
import { ChallengesScreen } from './src/screens/ChallengesScreen'
import { CheckinScreen } from './src/screens/CheckinScreen'
import { GigManagerScreen } from './src/screens/GigManagerScreen'
import { GigsScreen } from './src/screens/GigsScreen'
import { LeaderboardScreen } from './src/screens/LeaderboardScreen'

const Stack = createStackNavigator()

function MainTabs() {
  const [showDanceModal, setShowDanceModal] = React.useState(false)

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
        tabBar={props => <CustomTabBar {...props} onDanzPress={() => setShowDanceModal(true)} />}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Events" component={EventsScreen} />
        <Tab.Screen name="Feed" component={FeedScreen} />
        <Tab.Screen name="Profile" component={UserScreen} />
      </Tab.Navigator>
      <DanceStartModal visible={showDanceModal} onClose={() => setShowDanceModal(false)} />
    </>
  )
}

function MainApp() {
  const { user } = usePrivy()
  const { user: authUser, isLoading } = useAuth()
  const isAuthenticated = !!user

  // Show login only if Privy says user is not authenticated
  const shouldShowLogin = !isAuthenticated
  // Show onboarding if authenticated but no username (or no backend profile yet)
  const needsOnboarding = isAuthenticated && !isLoading && (!authUser || !authUser.username)

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        presentation: 'modal',
        animation: 'fade_from_bottom',
      }}
    >
      {shouldShowLogin ? (
        <Stack.Screen name="Login" component={AuthScreen} />
      ) : needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Screen name="TabNavigator" component={MainTabs} />
      )}
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="EditEvent" component={EditEventScreen} />
      {/* Temporarily disabled for Expo Go compatibility
      <Stack.Screen
        name="Subscription"
        component={StripeSubscriptionScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
      */}

      <Stack.Screen name="AccessibilitySettings" component={AccessibilitySettingsScreen} />
      <Stack.Screen name="DanceScreen">
        {() => (
          <ErrorBoundary screenName="DanceScreen">
            <DanceScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="FreestyleSession">
        {() => (
          <ErrorBoundary screenName="FreestyleSession">
            <FreestyleSessionScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="OrganizerEvents" component={OrganizerEventsScreen} />
      <Stack.Screen name="UserEvents" component={UserEventsScreen} />
      <Stack.Screen name="FindEventsNearYou" component={FindEventsNearYouScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Referrals" component={ReferralScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="ClaimRewards" component={ClaimRewardsScreen} />
      <Stack.Screen name="BondRequests" component={BondRequestsScreen} />
      <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Checkin" component={CheckinScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Challenges" component={ChallengesScreen} />
      <Stack.Screen name="Gigs" component={GigsScreen} />
      <Stack.Screen name="GigManager" component={GigManagerScreen} />
    </Stack.Navigator>
  )
}

function AppContent() {
  const { isLoading } = useAuth()
  const { theme } = useTheme()
  const [showSplash, setShowSplash] = React.useState(true)
  const [loadingTimedOut, setLoadingTimedOut] = React.useState(false)

  // Initialize video player for splash screen (mobile only)
  interface VideoPlayer {
    loop: boolean
    muted: boolean
    play: () => void
  }

  type UseVideoPlayer = (source: any, onReady: (player: VideoPlayer) => void) => VideoPlayer | null

  // Always call the hook to maintain hook order, but handle errors gracefully
  let videoPlayer: VideoPlayer | null = null

  if (Platform.OS !== 'web') {
    try {
      videoPlayer = (useVideoPlayer as UseVideoPlayer)(
        require('./assets/DancingDanz.mp4'),
        (player: VideoPlayer) => {
          if (player && showSplash) {
            try {
              player.loop = true
              player.muted = true
              player.play()
            } catch {
              // Silently handle play errors
            }
          }
        },
      )
    } catch {
      // Silently handle video player creation errors
      videoPlayer = null
    }
  }

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500)
    // Safety timeout: don't hang on loading screen forever if backend/Privy is unreachable
    const loadingTimer = setTimeout(() => setLoadingTimedOut(true), 8000)

    return () => {
      clearTimeout(timer)
      clearTimeout(loadingTimer)
    }
  }, [])

  // Removed streak checking - can be added back if needed

  // Show splash screen
  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        {Platform.OS === 'web' || !videoPlayer ? (
          <View style={StyleSheet.absoluteFill} />
        ) : (
          <VideoView player={videoPlayer} style={StyleSheet.absoluteFill} contentFit="cover" />
        )}
        <LinearGradient
          colors={['rgba(26, 0, 51, 0.7)', 'rgba(45, 27, 105, 0.8)', 'rgba(10, 0, 51, 0.9)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loading}>
          <Image
            source={require('./assets/DANZ LOGO.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
          <Text
            style={[styles.tagline, { color: '#ffffff' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            Move. Connect. Earn.
          </Text>
          <View style={[styles.pulseDot, { backgroundColor: theme.colors.primary }]} />
        </View>
      </View>
    )
  }

  // Show loading state (but skip if timed out — let user through to login)
  if (isLoading && !loadingTimedOut) {
    return (
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <StatusBar style="light" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Loading your dance journey...
          </Text>
        </View>
      </LinearGradient>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <MainApp />
      <ThemePreviewOverlay />
      {/* Streak modal removed - can be added back if needed */}
    </NavigationContainer>
  )
}

const { width: screenWidth } = Dimensions.get('window')

export default function App() {
  return (
    <SafeAreaProvider>
      <PrivyProviderWrapper>
        <ApolloProvider>
          <ThemeProvider>
            <AccessibilityProvider>
              <AuthProvider>
                <LocationProvider>
                  {/* this app provider is temp, will be removed soon */}
                  <AppProvider>
                    <AppContent />
                  </AppProvider>
                </LocationProvider>
              </AuthProvider>
            </AccessibilityProvider>
          </ThemeProvider>
        </ApolloProvider>
      </PrivyProviderWrapper>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  splashLogo: {
    width: Math.min(screenWidth * 0.6, 250),
    height: Math.min(screenWidth * 0.6, 250),
    marginBottom: 32,
  },
  tagline: {
    fontSize: 22,
    marginTop: 24,
    fontWeight: '500',
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 32,
    opacity: 0.8,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 20,
    fontWeight: '400',
  },
})
