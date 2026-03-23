import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import type React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DIMENSIONS } from '../../constants/dimensions'
import { useTheme } from '../../contexts/ThemeContext'
import type { User } from '../../generated/graphql'
import { nullToUndefined } from '../../utils/nullUtils'
import { LinearGradientCompat as LinearGradient } from '../../utils/platformUtils'
import { transformPresets } from '../../utils/supabaseTransforms'
import { ImageLoader } from '../ui/ImageLoader'

interface ProfileHeaderProps {
  user: User | null
  onEditProfilePress?: () => void
  onBackPress?: () => void
  isOwnProfile?: boolean
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  onEditProfilePress,
  onBackPress,
  isOwnProfile = false,
}) => {
  const { theme } = useTheme()
  const { top } = useSafeAreaInsets()

  if (!user) return null

  const getInitials = (name?: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <View style={styles.container}>
      {/* Cover Image or Gradient Background */}
      {user.cover_image_url ? (
        <View style={styles.coverContainer}>
          <ImageLoader
            source={{ uri: user.cover_image_url }}
            style={styles.coverImage}
            transformOptions={transformPresets.coverFull}
            placeholderColor={theme.colors.surface}
            fallbackIcon="image-outline"
            showRetry={true}
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.coverOverlay} />
        </View>
      ) : (
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          style={styles.coverContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      <View style={[styles.headerSafeArea, { paddingTop: top + DIMENSIONS.headerButtonPadding }]}>
        {onBackPress && (
          <TouchableOpacity onPress={onBackPress} style={[styles.actionButton, styles.backButton]}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {isOwnProfile && onEditProfilePress && (
          <TouchableOpacity
            onPress={onEditProfilePress}
            style={[styles.actionButton, styles.editButton]}
          >
            <Ionicons name="pencil" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.profileImageContainer}>
        {user.avatar_url ? (
          <ImageLoader
            source={{ uri: user.avatar_url }}
            style={styles.profileImage}
            placeholderColor={theme.colors.surface}
            transformOptions={transformPresets.avatarFull}
            fallbackIcon="person-outline"
            showRetry={true}
          />
        ) : (
          <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.initialsText, { color: theme.colors.primary }]}>
              {getInitials(nullToUndefined(user.display_name) || nullToUndefined(user.username))}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.displayName, { color: theme.colors.text }]}>
        {user.display_name || user.username || 'Anonymous User'}
      </Text>

      {user.username && (
        <Text style={[styles.username, { color: theme.colors.textSecondary }]}>
          @{user.username}
        </Text>
      )}

      {user.pronouns && (
        <Text style={[styles.pronouns, { color: theme.colors.textSecondary }]}>
          {user.pronouns}
        </Text>
      )}

      {user.bio && <Text style={[styles.bio, { color: theme.colors.text }]}>{user.bio}</Text>}

      <View style={styles.badgesContainer}>
        <View style={styles.levelContainer}>
          <MaterialCommunityIcons name="trophy" size={16} color={theme.colors.primary} />
          <Text style={[styles.levelText, { color: theme.colors.text }]}>
            {user.skill_level || 'Beginner'} • {0} XP
          </Text>
        </View>

        {user.role === 'organizer' && (
          <View
            style={[
              styles.organizerBadge,
              {
                backgroundColor: user.is_organizer_approved
                  ? `${theme.colors.success}20`
                  : `${theme.colors.warning}20`,
              },
            ]}
          >
            <Feather
              name="calendar"
              size={16}
              color={user.is_organizer_approved ? theme.colors.success : theme.colors.warning}
            />
            <Text
              style={[
                styles.organizerBadgeText,
                {
                  color: user.is_organizer_approved ? theme.colors.success : theme.colors.warning,
                },
              ]}
            >
              {user.is_organizer_approved ? 'Event Organizer' : 'Organizer (Pending)'}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  coverContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: DIMENSIONS.coverImageHeight,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  backButton: {},
  editButton: {},
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: DIMENSIONS.headerButtonSize / 2,
    width: DIMENSIONS.headerButtonSize,
    height: DIMENSIONS.headerButtonSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginTop: DIMENSIONS.coverImageHeight - 50,
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(147, 51, 234, 0.9)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    marginBottom: 4,
  },
  pronouns: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
    lineHeight: 20,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  organizerBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
