import { MaterialCommunityIcons } from '@expo/vector-icons'
import type React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { designSystem } from '../../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../../styles/responsive'
import type { EventTabType } from './EventTabs'

interface EventEmptyStateProps {
  tabType: EventTabType
}

export const EventEmptyState: React.FC<EventEmptyStateProps> = ({ tabType }) => {
  const getEmptyContent = () => {
    switch (tabType) {
      case 'joined':
        return {
          icon: 'calendar-blank' as const,
          title: 'No Events Joined Yet',
          message: 'Join some events to see them here!',
        }
      case 'created':
        return {
          icon: 'calendar-plus' as const,
          title: 'No Events Created Yet',
          message: 'Create your first event to get started!',
        }
      case 'upcoming':
      default:
        return {
          icon: 'calendar-blank' as const,
          title: 'No Upcoming Events',
          message: 'Check back soon for new events',
        }
    }
  }

  const content = getEmptyContent()

  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name={content.icon}
        size={64}
        color={designSystem.colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>{content.title}</Text>
      <Text style={styles.emptyText}>{content.message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: designSystem.colors.white,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    textAlign: 'center',
  },
})
