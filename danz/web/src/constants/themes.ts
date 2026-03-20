/**
 * DANZ Theme Configuration
 * Preset themes and custom color scheme definitions
 */

export interface ThemeColors {
  // Primary colors
  primary: string
  primaryAlt: string
  // Neon accents
  neonPink: string
  neonPurple: string
  neonBlue: string
  // Backgrounds
  bgPrimary: string
  bgSecondary: string
  bgCard: string
  bgHover: string
  // Text colors
  textPrimary: string
  textSecondary: string
  textMuted: string
}

export interface Theme {
  id: string
  name: string
  description: string
  colors: ThemeColors
  isDark: boolean
}

export const themes: Record<string, Theme> = {
  'neon-dark': {
    id: 'neon-dark',
    name: 'Neon Dark',
    description: 'Default purple/pink neon theme',
    isDark: true,
    colors: {
      primary: '#d25ca7',
      primaryAlt: '#926f8e',
      neonPink: '#ff6ec7',
      neonPurple: '#b967ff',
      neonBlue: '#00d4ff',
      bgPrimary: '#0a0a0f',
      bgSecondary: '#12121a',
      bgCard: '#1a1a24',
      bgHover: '#222230',
      textPrimary: '#ffffff',
      textSecondary: '#b8b8c8',
      textMuted: '#7a7a8e',
    },
  },
  'cyber-blue': {
    id: 'cyber-blue',
    name: 'Cyber Blue',
    description: 'Cool cyan and blue tones',
    isDark: true,
    colors: {
      primary: '#00d4ff',
      primaryAlt: '#0099cc',
      neonPink: '#00f5ff',
      neonPurple: '#00b4d8',
      neonBlue: '#48cae4',
      bgPrimary: '#0a0f14',
      bgSecondary: '#101820',
      bgCard: '#162028',
      bgHover: '#1e2a34',
      textPrimary: '#ffffff',
      textSecondary: '#90e0ef',
      textMuted: '#48cae4',
    },
  },
  'sunset-warm': {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    description: 'Warm oranges and reds',
    isDark: true,
    colors: {
      primary: '#ff6b35',
      primaryAlt: '#f7931e',
      neonPink: '#ff8c42',
      neonPurple: '#c44569',
      neonBlue: '#f8b500',
      bgPrimary: '#1a0a0a',
      bgSecondary: '#241212',
      bgCard: '#2e1a1a',
      bgHover: '#3a2424',
      textPrimary: '#fff5e4',
      textSecondary: '#ffb6c1',
      textMuted: '#d4a5a5',
    },
  },
  'forest-green': {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Nature-inspired greens',
    isDark: true,
    colors: {
      primary: '#52b788',
      primaryAlt: '#40916c',
      neonPink: '#74c69d',
      neonPurple: '#2d6a4f',
      neonBlue: '#95d5b2',
      bgPrimary: '#081c15',
      bgSecondary: '#0f2920',
      bgCard: '#1b4332',
      bgHover: '#234d3c',
      textPrimary: '#d8f3dc',
      textSecondary: '#b7e4c7',
      textMuted: '#74c69d',
    },
  },
  'royal-gold': {
    id: 'royal-gold',
    name: 'Royal Gold',
    description: 'Luxurious gold and purple',
    isDark: true,
    colors: {
      primary: '#ffd700',
      primaryAlt: '#daa520',
      neonPink: '#ffdf00',
      neonPurple: '#9d4edd',
      neonBlue: '#f5c542',
      bgPrimary: '#0d0a14',
      bgSecondary: '#151020',
      bgCard: '#1e1830',
      bgHover: '#28203c',
      textPrimary: '#fffbeb',
      textSecondary: '#e8d5b7',
      textMuted: '#a89070',
    },
  },
  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'Deep blues with subtle accents',
    isDark: true,
    colors: {
      primary: '#6366f1',
      primaryAlt: '#4f46e5',
      neonPink: '#818cf8',
      neonPurple: '#a78bfa',
      neonBlue: '#60a5fa',
      bgPrimary: '#0f0f1a',
      bgSecondary: '#161625',
      bgCard: '#1e1e32',
      bgHover: '#26263e',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
    },
  },
  'rose-light': {
    id: 'rose-light',
    name: 'Rose Light',
    description: 'Soft pink light theme',
    isDark: false,
    colors: {
      primary: '#db2777',
      primaryAlt: '#be185d',
      neonPink: '#f472b6',
      neonPurple: '#a855f7',
      neonBlue: '#ec4899',
      bgPrimary: '#fdf2f8',
      bgSecondary: '#fce7f3',
      bgCard: '#ffffff',
      bgHover: '#fbcfe8',
      textPrimary: '#1f1f1f',
      textSecondary: '#4a4a4a',
      textMuted: '#737373',
    },
  },
  'clean-light': {
    id: 'clean-light',
    name: 'Clean Light',
    description: 'Minimal light theme',
    isDark: false,
    colors: {
      primary: '#7c3aed',
      primaryAlt: '#6d28d9',
      neonPink: '#a78bfa',
      neonPurple: '#8b5cf6',
      neonBlue: '#6366f1',
      bgPrimary: '#f8fafc',
      bgSecondary: '#f1f5f9',
      bgCard: '#ffffff',
      bgHover: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
    },
  },
  // Dance Culture Themes
  'disco-fever': {
    id: 'disco-fever',
    name: 'Disco Fever',
    description: '70s disco vibes with gold sparkles',
    isDark: true,
    colors: {
      primary: '#ffd700',
      primaryAlt: '#ff69b4',
      neonPink: '#ff1493',
      neonPurple: '#9400d3',
      neonBlue: '#00bfff',
      bgPrimary: '#1a0a2e',
      bgSecondary: '#2d1545',
      bgCard: '#3d1f5c',
      bgHover: '#4d2970',
      textPrimary: '#ffd700',
      textSecondary: '#e6c200',
      textMuted: '#b8960f',
    },
  },
  'reggae-vibes': {
    id: 'reggae-vibes',
    name: 'Reggae Vibes',
    description: 'Jamaica-inspired red, gold & green',
    isDark: true,
    colors: {
      primary: '#ffd700',
      primaryAlt: '#e62020',
      neonPink: '#e62020',
      neonPurple: '#ffd700',
      neonBlue: '#009b3a',
      bgPrimary: '#0d1a0d',
      bgSecondary: '#142814',
      bgCard: '#1a351a',
      bgHover: '#234023',
      textPrimary: '#ffd700',
      textSecondary: '#e6c200',
      textMuted: '#8b7500',
    },
  },
  'salsa-caliente': {
    id: 'salsa-caliente',
    name: 'Salsa Caliente',
    description: 'Fiery Latin passion',
    isDark: true,
    colors: {
      primary: '#ff4500',
      primaryAlt: '#dc143c',
      neonPink: '#ff6347',
      neonPurple: '#ff0000',
      neonBlue: '#ffd700',
      bgPrimary: '#1a0505',
      bgSecondary: '#2d0a0a',
      bgCard: '#3d1010',
      bgHover: '#4d1818',
      textPrimary: '#fff5e1',
      textSecondary: '#ffc9a8',
      textMuted: '#d4856a',
    },
  },
  'bachata-sensual': {
    id: 'bachata-sensual',
    name: 'Bachata Sensual',
    description: 'Romantic Dominican moonlight',
    isDark: true,
    colors: {
      primary: '#722f37',
      primaryAlt: '#e6b8c4',
      neonPink: '#c9a0dc',
      neonPurple: '#722f37',
      neonBlue: '#e6b8c4',
      bgPrimary: '#0f0a14',
      bgSecondary: '#1a1020',
      bgCard: '#251830',
      bgHover: '#30203c',
      textPrimary: '#f5e6e8',
      textSecondary: '#e6b8c4',
      textMuted: '#9b7a8a',
    },
  },
  'hiphop-street': {
    id: 'hiphop-street',
    name: 'Hip Hop Street',
    description: 'Urban gold & graffiti energy',
    isDark: true,
    colors: {
      primary: '#ffd700',
      primaryAlt: '#ff3131',
      neonPink: '#ff3131',
      neonPurple: '#ffd700',
      neonBlue: '#39ff14',
      bgPrimary: '#0a0a0a',
      bgSecondary: '#141414',
      bgCard: '#1e1e1e',
      bgHover: '#2a2a2a',
      textPrimary: '#ffffff',
      textSecondary: '#ffd700',
      textMuted: '#888888',
    },
  },
  'kpop-idol': {
    id: 'kpop-idol',
    name: 'K-Pop Idol',
    description: 'Holographic pink & purple dreams',
    isDark: false,
    colors: {
      primary: '#ff6b9d',
      primaryAlt: '#c77dff',
      neonPink: '#ff6b9d',
      neonPurple: '#c77dff',
      neonBlue: '#72ddf7',
      bgPrimary: '#fff0f5',
      bgSecondary: '#ffe4ec',
      bgCard: '#ffffff',
      bgHover: '#ffd6e0',
      textPrimary: '#2d1f3d',
      textSecondary: '#6b4c7a',
      textMuted: '#9a7baa',
    },
  },
}

export const defaultThemeId = 'neon-dark'

export const getTheme = (id: string): Theme => {
  return themes[id] || themes[defaultThemeId]
}

export const getAllThemes = (): Theme[] => {
  return Object.values(themes)
}

export const getDarkThemes = (): Theme[] => {
  return Object.values(themes).filter(t => t.isDark)
}

export const getLightThemes = (): Theme[] => {
  return Object.values(themes).filter(t => !t.isDark)
}
