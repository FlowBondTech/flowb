// Dance Styles
export const DANCE_STYLES = [
  { value: 'BALLET', label: 'Ballet' },
  { value: 'CONTEMPORARY', label: 'Contemporary' },
  { value: 'JAZZ', label: 'Jazz' },
  { value: 'HIP_HOP', label: 'Hip Hop' },
  { value: 'BREAKING', label: 'Breaking' },
  { value: 'POPPING', label: 'Popping' },
  { value: 'LOCKING', label: 'Locking' },
  { value: 'HOUSE', label: 'House' },
  { value: 'KRUMP', label: 'Krump' },
  { value: 'WAACKING', label: 'Waacking' },
  { value: 'VOGUING', label: 'Voguing' },
  { value: 'SALSA', label: 'Salsa' },
  { value: 'BACHATA', label: 'Bachata' },
  { value: 'KIZOMBA', label: 'Kizomba' },
  { value: 'ZOUK', label: 'Zouk' },
  { value: 'TANGO', label: 'Tango' },
  { value: 'SWING', label: 'Swing' },
  { value: 'BALLROOM', label: 'Ballroom' },
  { value: 'LATIN', label: 'Latin' },
  { value: 'AFROBEATS', label: 'Afrobeats' },
  { value: 'DANCEHALL', label: 'Dancehall' },
  { value: 'REGGAETON', label: 'Reggaeton' },
  { value: 'KPOP', label: 'K-Pop' },
  { value: 'TAP', label: 'Tap' },
  { value: 'FLAMENCO', label: 'Flamenco' },
  { value: 'FOLK', label: 'Folk' },
  { value: 'CULTURAL', label: 'Cultural' },
  { value: 'FUSION', label: 'Fusion' },
  { value: 'FREESTYLE', label: 'Freestyle' },
  { value: 'OTHER', label: 'Other' },
] as const

// Event Types
export const EVENT_TYPES = [
  { value: 'BATTLE', label: 'Battle' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'CLASS', label: 'Class' },
  { value: 'SOCIAL', label: 'Social Dance' },
  { value: 'SHOWCASE', label: 'Showcase' },
  { value: 'COMPETITION', label: 'Competition' },
  { value: 'JAM', label: 'Jam Session' },
  { value: 'CYPHER', label: 'Cypher' },
  { value: 'PARTY', label: 'Dance Party' },
  { value: 'CONCERT', label: 'Concert' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'BOOTCAMP', label: 'Bootcamp' },
  { value: 'INTENSIVE', label: 'Intensive' },
  { value: 'RETREAT', label: 'Retreat' },
  { value: 'AUDITION', label: 'Audition' },
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'MEETUP', label: 'Meetup' },
  { value: 'PRACTICE', label: 'Practice Session' },
  { value: 'OTHER', label: 'Other' },
] as const

// Event Categories (for organizers)
export const EVENT_CATEGORIES = [
  { value: 'STREET', label: 'Street Dance' },
  { value: 'CLUB', label: 'Club/Social' },
  { value: 'STUDIO', label: 'Studio/Class' },
  { value: 'COMPETITION', label: 'Competition' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'PROFESSIONAL', label: 'Professional' },
] as const

// Skill Levels
export const SKILL_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
  { value: 'PROFESSIONAL', label: 'Professional' },
] as const

// US Regions
export const US_REGIONS = [
  {
    value: 'NORTHEAST',
    label: 'Northeast',
    states: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
  },
  {
    value: 'SOUTHEAST',
    label: 'Southeast',
    states: ['AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
  },
  {
    value: 'MIDWEST',
    label: 'Midwest',
    states: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  },
  { value: 'SOUTHWEST', label: 'Southwest', states: ['AZ', 'NM', 'OK', 'TX'] },
  {
    value: 'WEST',
    label: 'West',
    states: ['AK', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
  },
] as const

// Helper functions
export const getDanceStyleLabel = (value: string): string => {
  const style = DANCE_STYLES.find(s => s.value === value)
  return style?.label || value
}

export const getEventTypeLabel = (value: string): string => {
  const type = EVENT_TYPES.find(t => t.value === value)
  return type?.label || value
}

export const getSkillLevelLabel = (value: string): string => {
  const level = SKILL_LEVELS.find(l => l.value === value)
  return level?.label || value
}

export const getRegionLabel = (value: string): string => {
  const region = US_REGIONS.find(r => r.value === value)
  return region?.label || value
}

// Type exports
export type DanceStyle = (typeof DANCE_STYLES)[number]['value']
export type EventType = (typeof EVENT_TYPES)[number]['value']
export type EventCategory = (typeof EVENT_CATEGORIES)[number]['value']
export type SkillLevel = (typeof SKILL_LEVELS)[number]['value']
export type USRegion = (typeof US_REGIONS)[number]['value']
