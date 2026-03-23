/**
 * Onboarding constants used across the application
 * Matching danz-app constants for consistency
 */

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

export const DANCE_STYLE_EMOJIS: Record<string, string> = {
  'Hip Hop': '🎤',
  Ecstatic: '🌀',
  Contact: '🤝',
  Ballet: '🩰',
  Contemporary: '💃',
  Jazz: '🎺',
  Salsa: '🌶️',
  Bachata: '🌹',
  Breaking: '🔥',
  Popping: '🤖',
  Locking: '🔒',
  Afrobeats: '🥁',
  Dancehall: '🎵',
  Tap: '👞',
  Ballroom: '🎩',
  Latin: '💃',
  Voguing: '✨',
  House: '🏠',
  Waacking: '💫',
  Krump: '⚡',
  Reggaeton: '🔥',
  'K-Pop': '🌟',
}

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

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export const SKILL_LEVEL_DISPLAY = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

export type DanceStyle = (typeof DANCE_STYLES)[number]
export type EventType = (typeof EVENT_TYPES)[number]
export type SkillLevel = (typeof SKILL_LEVELS)[number]
