import { Ionicons } from '@expo/vector-icons'
import type React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { designSystem } from '../styles/designSystem'

export interface NotificationItemProps {
  id: string
  type: 'dance' | 'event' | 'challenge' | 'social' | 'reward' | 'system'
  title: string
  message: string
  timestamp: Date
  read: boolean
  icon?: string
  actionable?: {
    action: () => void
    label: string
  }
  onPress: () => void
  onMarkAsRead: (id: string) => void
}

const getIconForType = (type: NotificationItemProps['type']) => {
  switch (type) {
    case 'dance':
      return { name: 'musical-notes', color: designSystem.colors.primary }
    case 'event':
      return { name: 'calendar', color: designSystem.colors.accent }
    case 'challenge':
      return { name: 'trophy', color: designSystem.colors.secondary }
    case 'social':
      return { name: 'people', color: designSystem.colors.info }
    case 'reward':
      return { name: 'gift', color: designSystem.colors.success }
    case 'system':
      return { name: 'information-circle', color: designSystem.colors.textSecondary }
    default:
      return { name: 'notifications', color: designSystem.colors.textSecondary }
  }
}

const getTimeAgo = (timestamp: Date) => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`

  return timestamp.toLocaleDateString()
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  title,
  message,
  timestamp,
  read,
  icon,
  actionable,
  onPress,
  onMarkAsRead,
}) => {
  const { theme } = useTheme()
  const iconConfig = getIconForType(type)

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: read ? 'transparent' : theme.colors.surface },
        !read && styles.unread,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${iconConfig.color}20` }]}>
        {icon ? (
          <Text style={styles.emojiIcon}>{icon}</Text>
        ) : (
          <Ionicons name={iconConfig.name as any} size={20} color={iconConfig.color} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {getTimeAgo(timestamp)}
          </Text>
        </View>

        <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {message}
        </Text>

        {actionable && (
          <TouchableOpacity style={styles.actionButton} onPress={actionable.action}>
            <Text style={styles.actionText}>{actionable.label}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!read && (
        <TouchableOpacity style={styles.markReadButton} onPress={() => onMarkAsRead(id)}>
          <View style={styles.unreadDot} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  unread: {
    borderWidth: 1,
    borderColor: 'rgba(255, 110, 199, 0.2)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: `${designSystem.colors.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: designSystem.colors.primary,
  },
  markReadButton: {
    padding: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designSystem.colors.primary,
  },
})
