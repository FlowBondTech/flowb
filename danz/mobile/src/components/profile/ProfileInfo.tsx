import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import type React from 'react'
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import type { User } from '../../generated/graphql'

interface ProfileInfoProps {
  user: User | null
}

export const ProfileInfo: React.FC<ProfileInfoProps> = ({ user }) => {
  const { theme } = useTheme()

  if (!user) return null

  const openLink = (url: string) => {
    if (url && !url.startsWith('http')) {
      url = `https://${url}`
    }
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err))
  }

  const openSocial = (platform: string, handle?: string) => {
    if (!handle) return

    const urls: { [key: string]: string } = {
      instagram: `https://instagram.com/${handle}`,
      tiktok: `https://tiktok.com/@${handle}`,
      youtube: `https://youtube.com/@${handle}`,
      twitter: `https://twitter.com/${handle}`,
    }

    openLink(urls[platform])
  }

  const infoItems = [
    {
      icon: 'calendar-outline',
      iconType: 'ionicons',
      label: 'Member Since',
      value: user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        : null,
      onPress: null,
    },
    {
      icon: 'location',
      iconType: 'ionicons',
      label: 'Location',
      value: user.city || user.location,
      onPress: null,
    },
    {
      icon: 'globe-outline',
      iconType: 'ionicons',
      label: 'Website',
      value: user.website,
      onPress: () => user.website && openLink(user.website),
    },
    // Note: Email is stored in Privy, not in our database
    // Uncomment if email becomes available from Privy
    // {
    //   icon: 'mail-outline',
    //   iconType: 'ionicons',
    //   label: 'Email',
    //   value: user.email,
    //   onPress: () => user.email && openLink(`mailto:${user.email}`),
    // },
    {
      icon: 'account-music',
      iconType: 'material',
      label: 'Dance Styles',
      value: user.dance_styles?.join(', '),
      onPress: null,
    },
    {
      icon: 'chart-line',
      iconType: 'material',
      label: 'Skill Level',
      value: user.skill_level,
      onPress: null,
    },
  ]

  const socialItems = [
    {
      platform: 'instagram',
      icon: 'instagram',
      iconType: 'font-awesome5',
      handle: user.instagram,
      color: '#E4405F',
    },
    {
      platform: 'tiktok',
      icon: 'tiktok',
      iconType: 'font-awesome5',
      handle: user.tiktok,
      color: '#000000',
    },
    {
      platform: 'youtube',
      icon: 'youtube',
      iconType: 'font-awesome5',
      handle: user.youtube,
      color: '#FF0000',
    },
    {
      platform: 'twitter',
      icon: 'twitter',
      iconType: 'font-awesome5',
      handle: user.twitter,
      color: '#1DA1F2',
    },
  ]

  const activeInfoItems = infoItems.filter(item => item.value)
  const activeSocialItems = socialItems.filter(item => item.handle)

  if (activeInfoItems.length === 0 && activeSocialItems.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      {activeInfoItems.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Information</Text>
          {activeInfoItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.infoItem}
              onPress={item.onPress || undefined}
              disabled={!item.onPress}
            >
              <View style={styles.infoIcon}>
                {item.iconType === 'material' ? (
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={theme.colors.primary}
                  />
                ) : (
                  <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
                )}
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                  {item.label}
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{item.value}</Text>
              </View>
              {item.onPress && (
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeSocialItems.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Social Media</Text>
          <View style={styles.socialGrid}>
            {activeSocialItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.socialItem, { backgroundColor: `${item.color}15` }]}
                onPress={() => openSocial(item.platform, item.handle || undefined)}
              >
                <FontAwesome5 name={item.icon} size={24} color={item.color} />
                <Text style={[styles.socialHandle, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.handle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  socialItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: '1%',
    marginBottom: 8,
    borderRadius: 12,
  },
  socialHandle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
})
