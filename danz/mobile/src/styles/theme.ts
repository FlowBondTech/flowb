export const theme = {
  colors: {
    primary: '#ff6ec7', // Neon pink
    secondary: '#b967ff', // Neon purple
    background: '#0A0A0F', // Very dark background
    surface: '#1a1a2e', // Card background
    modalBackground: '#050507', // Very dark black for modals
    tabBarBackground: '#050507', // Same very dark black for tab bar
    text: '#ffffff',
    textSecondary: '#b8c3d1',
    iconInactive: 'rgba(255, 255, 255, 0.7)', // White inactive icons
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    gradient: {
      start: '#ff6ec7',
      end: '#b967ff',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 10,
    },
    glow: {
      shadowColor: '#ff6ec7',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
  },
}

export type Theme = typeof theme
