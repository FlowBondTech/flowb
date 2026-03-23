// DANZ Design System - Beautiful, cohesive UI/UX with Responsive Scaling
import { Dimensions } from 'react-native'
import {
  componentSizes,
  layoutMetrics,
  responsiveFontSize,
  responsiveSpacing,
  scale,
} from './responsive'

const { width, height } = Dimensions.get('window')

export const designSystem = {
  // Enhanced Color Palette
  colors: {
    // Primary Colors
    primary: '#FF6EC7', // Neon Pink
    primaryDark: '#E854B1',
    primaryLight: '#FFB3E0',

    secondary: '#B967FF', // Neon Purple
    secondaryDark: '#9B42F5',
    secondaryLight: '#D4A5FF',

    // Accent Colors
    accent: '#01FFF7', // Cyan
    accentYellow: '#FFE66D', // Warm Yellow
    accentGreen: '#00FF88', // Neon Green

    // Background Colors
    background: '#0A0A0F',
    backgroundSecondary: '#12121A',
    surface: '#1A1A25',
    surfaceLight: '#232330',

    // Text Colors
    text: '#FFFFFF',
    textSecondary: '#B8B8C8',
    textTertiary: '#7A7A8E',
    textInverse: '#0A0A0F',

    // Semantic Colors
    success: '#00FF88',
    warning: '#FFE66D',
    error: '#FF4757',
    info: '#01FFF7',

    // Additional Colors
    white: '#FFFFFF',
    dark: '#0A0A0F',

    // Gradient Colors
    gradients: {
      primary: ['#FF6EC7', '#B967FF'] as readonly [string, string],
      secondary: ['#B967FF', '#01FFF7'] as readonly [string, string],
      success: ['#00FF88', '#01FFF7'] as readonly [string, string],
      fire: ['#FF6EC7', '#FFE66D'] as readonly [string, string],
      cosmic: ['#B967FF', '#FF6EC7', '#01FFF7'] as readonly [string, string, string],
      dark: ['#1A1A25', '#0A0A0F'] as readonly [string, string],
    },

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(255, 255, 255, 0.1)',
  },

  // Typography - Responsive
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
      black: 'System',
    },
    fontSize: responsiveFontSize, // Now using responsive font sizes
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 1,
      widest: 2,
    },
  },

  // Spacing System - Responsive
  spacing: responsiveSpacing, // Now using responsive spacing

  // Border Radius - Responsive
  borderRadius: {
    xs: scale(4),
    sm: scale(8),
    md: scale(12),
    lg: scale(16),
    xl: scale(24),
    xxl: scale(32),
    full: 999,
  },

  // iOS 26 Liquid Glass System
  glass: {
    // Blur intensity tiers
    blur: {
      subtle: 25,    // Light frosting - background panels
      medium: 50,    // Standard glass - cards, sheets
      strong: 80,    // Heavy frost - tab bar, modals
      intense: 120,  // Maximum blur - overlays, alerts
    },
    // Surface tint overlays (applied on top of blur)
    tint: {
      light: 'rgba(255, 255, 255, 0.06)',
      medium: 'rgba(255, 255, 255, 0.10)',
      heavy: 'rgba(255, 255, 255, 0.15)',
    },
    // Specular highlight borders
    specular: {
      subtle: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.12)',
      strong: 'rgba(255, 255, 255, 0.18)',
      accent: 'rgba(255, 255, 255, 0.25)',
    },
    // Inner highlight for top edges
    innerHighlight: 'rgba(255, 255, 255, 0.06)',
    // Border radius for glass elements (more rounded than standard)
    borderRadius: {
      sm: scale(12),
      md: scale(16),
      lg: scale(22),
      xl: scale(28),
      pill: scale(999),
    },
  },

  // Shadows (glass-optimized - softer, more ambient)
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
      elevation: 12,
    },
    glow: {
      shadowColor: '#FF6EC7',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 0,
    },
  },

  // Animation
  animation: {
    duration: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 500,
      slower: 800,
    },
    easing: {
      linear: [0, 0, 1, 1],
      easeIn: [0.42, 0, 1, 1],
      easeOut: [0, 0, 0.58, 1],
      easeInOut: [0.42, 0, 0.58, 1],
      bounce: [0.68, -0.55, 0.265, 1.55],
    },
  },

  // Layout - Responsive
  layout: {
    screenWidth: width,
    screenHeight: height,
    isSmallDevice: layoutMetrics.isSmallDevice,
    isProMax: layoutMetrics.isProMax,
    contentPadding: layoutMetrics.contentPadding,
    cardPadding: componentSizes.cardPadding,
    tabBarHeight: componentSizes.tabBarHeight,
    headerHeight: componentSizes.headerHeight,
  },

  // Z-Index
  zIndex: {
    base: 0,
    dropdown: 100,
    sticky: 200,
    overlay: 300,
    modal: 400,
    popover: 500,
    tooltip: 600,
    toast: 700,
  },

  // Component Sizes - Responsive
  components: componentSizes,
}

// Helper functions for consistent styling
export const createGradient = (colors: string[], start = { x: 0, y: 0 }, end = { x: 1, y: 1 }) => ({
  colors,
  start,
  end,
})

export const createShadow = (type: keyof typeof designSystem.shadows) => designSystem.shadows[type]

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default designSystem
