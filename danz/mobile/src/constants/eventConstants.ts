/**
 * Event-related constants used across the application
 * Centralized to ensure consistency and easy maintenance
 */

// Event categories with display names and emojis
export const EVENT_CATEGORIES = [
  'class',
  'social',
  'workshop',
  'performance',
  'battle',
  'cultural',
  'fitness',
  'other',
] as const

export const EVENT_CATEGORIES_DISPLAY = {
  class: { name: 'Dance Class', emoji: '📚' },
  social: { name: 'Social Dance', emoji: '🎉' },
  workshop: { name: 'Workshop', emoji: '🎓' },
  performance: { name: 'Performance', emoji: '🎭' },
  battle: { name: 'Battle/Competition', emoji: '⚔️' },
  cultural: { name: 'Cultural Event', emoji: '🌍' },
  fitness: { name: 'Dance Fitness', emoji: '💪' },
  other: { name: 'Other', emoji: '✨' },
} as const

// Skill levels for events and profiles
export const SKILL_LEVELS = ['all', 'beginner', 'intermediate', 'advanced', 'professional'] as const

export const SKILL_LEVELS_DISPLAY = {
  all: 'All Levels',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  professional: 'Professional',
} as const

// For profile forms that don't include 'all'
export const PROFILE_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export const DANCE_STYLES = [
  'Hip Hop',
  'Ecstatic',
  'Contact',
  'Ballet',
  'Contemporary',
  'Jazz',
  'Salsa',
  'Bachata',
  'Breaking',
  'Popping',
  'Locking',
  'Afrobeats',
  'Dancehall',
  'Tap',
  'Ballroom',
  'Latin',
  'Voguing',
  'House',
  'Waacking',
  'Krump',
  'Reggaeton',
  'K-Pop',
] as const

// Dance style emojis for visual representation
export const DANCE_STYLE_EMOJIS: Record<string, string> = {
  'Hip Hop': '🎤',
  Salsa: '💃',
  Bachata: '🌹',
  Ballet: '🩰',
  Contemporary: '🩰',
  Jazz: '🎺',
  Breaking: '🔥',
  Tap: '👞',
  Ballroom: '🎩',
  Afrobeats: '🥁',
  Dancehall: '🎵',
  'K-Pop': '🌟',
  // Default emoji for styles not listed
  default: '🕺',
}

// Event types for organizers
export const EVENT_TYPES = [
  'Social Dance',
  'Classes',
  'Workshops',
  'Festivals',
  'Competitions',
  'Performances',
  'Practice Sessions',
  'Flash Mobs',
  'Dance Battles',
  'Other',
] as const

// Type definitions
export type EventCategory = (typeof EVENT_CATEGORIES)[number]
export type SkillLevel = (typeof SKILL_LEVELS)[number]
export type DanceStyle = (typeof DANCE_STYLES)[number]
export type EventType = (typeof EVENT_TYPES)[number]

// Validation constants
export const EVENT_VALIDATION = {
  minCapacity: 1,
  maxCapacity: 1000,
  minDuration: 15, // minutes
  maxDuration: 480, // 8 hours
  minPrice: 0,
  maxPrice: 9999,
  maxTitleLength: 100,
  maxDescriptionLength: 2000,
  maxRequirementsLength: 500,
} as const
