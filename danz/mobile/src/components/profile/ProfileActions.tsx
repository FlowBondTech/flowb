import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import type React from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'

interface ProfileActionsProps {
  onEditProfile?: () => void
  onViewProfile?: () => void
  onSettings?: () => void
  onSignOut?: () => void
  onWallet?: () => void
  isOwnProfile?: boolean
}

export const ProfileActions: React.FC<ProfileActionsProps> = ({
  onEditProfile,
  onViewProfile,
  onSettings,
  onSignOut,
  onWallet,
  isOwnProfile = false,
}) => {
  const { theme } = useTheme()

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: onSignOut,
        },
      ],
      { cancelable: true },
    )
  }

  const actions = [
    {
      icon: 'eye-outline',
      iconType: 'ionicons',
      label: 'View Profile',
      onPress: onViewProfile,
      color: theme.colors.secondary,
      show: isOwnProfile && onViewProfile,
    },
    {
      icon: 'person-outline',
      iconType: 'ionicons',
      label: 'Edit Profile',
      onPress: onEditProfile,
      color: theme.colors.primary,
      show: isOwnProfile && onEditProfile,
    },
    {
      icon: 'wallet-outline',
      iconType: 'ionicons',
      label: 'My Wallet',
      onPress: onWallet,
      color: '#FFD93D',
      show: isOwnProfile && onWallet,
    },
    {
      icon: 'settings-outline',
      iconType: 'ionicons',
      label: 'Settings',
      onPress: onSettings,
      color: '#A78BFA',
      show: isOwnProfile && onSettings,
    },
    {
      icon: 'log-out-outline',
      iconType: 'ionicons',
      label: 'Sign Out',
      onPress: handleSignOut,
      color: '#FF6B6B',
      show: isOwnProfile && onSignOut,
    },
  ].filter(action => action.show)

  if (actions.length === 0) return null

  return (
    <View style={styles.container}>
      <View style={[styles.actionsCard, { backgroundColor: theme.colors.surface }]}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.actionItem, index === actions.length - 1 && styles.lastActionItem]}
            onPress={action.onPress}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${action.color}20` }]}>
              {action.iconType === 'material' ? (
                <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
              ) : (
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              )}
            </View>
            <Text style={[styles.actionLabel, { color: theme.colors.text }]}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionsCard: {
    borderRadius: 16,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  lastActionItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
})
