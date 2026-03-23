import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import Constants from 'expo-constants'
import * as Haptics from 'expo-haptics'
import type React from 'react'
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useThemedStyles } from '../hooks/useThemedStyles'

interface SettingsItem {
  id: string
  title: string
  subtitle?: string
  icon: string
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons'
  screen?: string
  action?: () => void
  showArrow?: boolean
  destructive?: boolean
}

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { theme, themeName, setTheme, availableThemes, startThemePreview } = useTheme()
  const { colors, fontSizes, spacing, styles: themedStyles } = useThemedStyles()
  const { logout } = useAuth()

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout()
          } catch {
            Alert.alert('Error', 'Failed to sign out. Please try again.')
          }
        },
      },
    ])
  }

  const settingsSections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'Edit Profile',
          subtitle: 'Update your info and avatar',
          icon: 'person-outline',
          iconFamily: 'Ionicons',
          screen: 'EditProfile',
          showArrow: true,
        },
        {
          id: 'wallet',
          title: 'Wallet',
          subtitle: 'Manage your crypto wallets',
          icon: 'wallet-outline',
          iconFamily: 'Ionicons',
          screen: 'Wallet',
          showArrow: true,
        },
        {
          id: 'subscription',
          title: 'Subscription',
          subtitle: 'Manage your plan',
          icon: 'star-outline',
          iconFamily: 'Ionicons',
          screen: 'Subscription',
          showArrow: true,
        },
        {
          id: 'sessionHistory',
          title: 'Session History',
          subtitle: 'View your dance sessions',
          icon: 'time-outline',
          iconFamily: 'Ionicons',
          screen: 'SessionHistory',
          showArrow: true,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          title: 'Notifications',
          subtitle: 'Push and email preferences',
          icon: 'notifications-outline',
          iconFamily: 'Ionicons',
          screen: 'NotificationSettings',
          showArrow: true,
        },
        {
          id: 'privacy',
          title: 'Privacy',
          subtitle: 'Control who can see your info',
          icon: 'lock-closed-outline',
          iconFamily: 'Ionicons',
          screen: 'PrivacySettings',
          showArrow: true,
        },
        {
          id: 'accessibility',
          title: 'Accessibility',
          subtitle: 'Display and motion settings',
          icon: 'eye-outline',
          iconFamily: 'Ionicons',
          screen: 'AccessibilitySettings',
          showArrow: true,
        },
      ],
    },
    {
      title: 'Social',
      items: [
        {
          id: 'bondRequests',
          title: 'Bond Requests',
          subtitle: 'Manage incoming and sent bond requests',
          icon: 'people-outline',
          iconFamily: 'Ionicons',
          screen: 'BondRequests',
          showArrow: true,
        },
        {
          id: 'userDiscovery',
          title: 'Find Dancers',
          subtitle: 'Discover new dancers to bond with',
          icon: 'search-outline',
          iconFamily: 'Ionicons',
          screen: 'UserDiscovery',
          showArrow: true,
        },
      ],
    },
    {
      title: 'Community',
      items: [
        {
          id: 'referrals',
          title: 'Referrals',
          subtitle: 'Earn points by inviting friends',
          icon: 'gift-outline',
          iconFamily: 'Ionicons',
          screen: 'Referrals',
          showArrow: true,
        },
        {
          id: 'claimRewards',
          title: 'Claim Rewards',
          subtitle: 'Collect your $DANZ tokens and NFTs',
          icon: 'flash-outline',
          iconFamily: 'Ionicons',
          screen: 'ClaimRewards',
          showArrow: true,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help & FAQ',
          subtitle: 'Get answers to common questions',
          icon: 'help-circle-outline',
          iconFamily: 'Ionicons',
          action: () => Linking.openURL('https://danz.now/help'),
          showArrow: true,
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          subtitle: 'Help us improve DANZ',
          icon: 'chatbubble-outline',
          iconFamily: 'Ionicons',
          screen: 'Feedback',
          showArrow: true,
        },
      ],
    },
    {
      title: '',
      items: [
        {
          id: 'logout',
          title: 'Sign Out',
          icon: 'log-out-outline',
          iconFamily: 'Ionicons',
          action: handleLogout,
          destructive: true,
        },
      ],
    },
  ]

  const handlePress = (item: SettingsItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (item.screen) {
      navigation.navigate(item.screen)
    } else if (item.action) {
      item.action()
    }
  }

  const renderIcon = (item: SettingsItem) => {
    const iconColor = item.destructive ? colors.error : colors.primary

    if (item.iconFamily === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={item.icon as any} size={22} color={iconColor} />
    }
    return <Ionicons name={item.icon as any} size={22} color={iconColor} />
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: fontSizes.h2 }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: fontSizes.caption }]}>
            Theme
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.themeGrid}>
              {Object.values(availableThemes).map((t) => (
                <TouchableOpacity
                  key={t.name}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: t.colors.background,
                      borderColor: themeName === t.name ? colors.primary : colors.border,
                      borderWidth: themeName === t.name ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setTheme(t.name)
                  }}
                >
                  <View style={[styles.themeColorDot, { backgroundColor: t.colors.primary }]} />
                  <Text style={[styles.themeName, { color: t.colors.text, fontSize: fontSizes.caption }]} numberOfLines={1}>
                    {t.displayName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            {section.title && (
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: fontSizes.caption }]}>
                {section.title}
              </Text>
            )}
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingsItem,
                    itemIndex < section.items.length - 1 && [styles.settingsItemBorder, { borderBottomColor: colors.border }],
                  ]}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingsItemLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: `${colors.primary}20` },
                        item.destructive && { backgroundColor: `${colors.error}20` },
                      ]}
                    >
                      {renderIcon(item)}
                    </View>
                    <View style={styles.settingsItemText}>
                      <Text
                        style={[
                          styles.settingsItemTitle,
                          { color: colors.text, fontSize: fontSizes.body },
                          item.destructive && { color: colors.error },
                        ]}
                      >
                        {item.title}
                      </Text>
                      {item.subtitle && (
                        <Text style={[styles.settingsItemSubtitle, { color: colors.textSecondary, fontSize: fontSizes.bodySmall }]}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                  </View>
                  {item.showArrow && (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textSecondary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textSecondary, fontSize: fontSizes.caption }]}>
            DANZ v{Constants.expoConfig?.version || '1.0.0'} (b
            {Platform.OS === 'ios'
              ? Constants.expoConfig?.ios?.buildNumber
              : Constants.expoConfig?.android?.versionCode || '1'}
            )
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  themeOption: {
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  themeColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
  },
  themeName: {
    fontWeight: '500',
    textAlign: 'center',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemTitle: {
    fontWeight: '500',
  },
  settingsItemSubtitle: {
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {},
})
