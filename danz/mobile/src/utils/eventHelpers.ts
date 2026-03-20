import { DANCE_STYLE_EMOJIS, EVENT_CATEGORIES_DISPLAY } from '../constants/eventConstants'
import { designSystem } from '../styles/designSystem'

export const getDifficultyColor = (level: string | undefined): string => {
  switch (level) {
    case 'beginner':
      return designSystem.colors.success
    case 'intermediate':
      return designSystem.colors.accentYellow
    case 'advanced':
      return designSystem.colors.error
    default:
      return designSystem.colors.primary
  }
}

export const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'upcoming':
      return designSystem.colors.success
    case 'ongoing':
      return designSystem.colors.primary
    case 'completed':
      return designSystem.colors.textSecondary
    case 'cancelled':
      return designSystem.colors.error
    default:
      return designSystem.colors.textSecondary
  }
}

export const getCategoryEmoji = (category?: string): string => {
  if (!category) return '🕺'
  const categoryData = EVENT_CATEGORIES_DISPLAY[category as keyof typeof EVENT_CATEGORIES_DISPLAY]
  return categoryData?.emoji || '🕺'
}

export const getDanceStyleEmoji = (style?: string): string => {
  if (!style) return DANCE_STYLE_EMOJIS.default
  return DANCE_STYLE_EMOJIS[style] || DANCE_STYLE_EMOJIS.default
}
