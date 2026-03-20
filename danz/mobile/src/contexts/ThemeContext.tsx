import AsyncStorage from '@react-native-async-storage/async-storage'
import type React from 'react'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

export type ThemeName =
  | 'neon'
  | 'midnight'
  | 'sunset'
  | 'forest'
  | 'ocean'
  | 'lavender'
  | 'cyberpunk'
  | 'monochrome'

export interface ThemeColors {
  // Primary colors
  primary: string
  secondary: string
  accent: string

  // Background colors
  background: string
  surface: string
  card: string

  // Text colors
  text: string
  textSecondary: string
  textMuted: string

  // Status colors
  success: string
  warning: string
  error: string
  info: string

  // Special colors
  border: string
  overlay: string
  highlight: string
  shadow: string

  // Glass system (iOS 26 Liquid Glass)
  glassSurface: string   // Primary glass panel tint
  glassCard: string      // Card-level glass tint
  glassBorder: string    // Specular highlight border
  glassHighlight: string // Inner edge highlight
  glassOverlay: string   // Modal/overlay glass tint
}

export interface Theme {
  name: ThemeName
  displayName: string
  colors: ThemeColors
  isDark: boolean
  gradients: {
    primary: string[]
    secondary: string[]
    accent: string[]
  }
  glass: {
    blur: number        // Default blur intensity for this theme
    tint: 'dark' | 'light'
  }
}

// Theme definitions
const themes: Record<ThemeName, Theme> = {
  neon: {
    name: 'neon',
    displayName: 'Neon Nights',
    isDark: true,
    colors: {
      primary: '#ff6ec7',
      secondary: '#b967ff',
      accent: '#05ffa1',
      background: '#0A0A0F',
      surface: '#16161F',
      card: 'rgba(255, 255, 255, 0.05)',
      text: '#ffffff',
      textSecondary: '#b4b4b4',
      textMuted: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      border: 'rgba(255, 255, 255, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.5)',
      highlight: 'rgba(255, 110, 199, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.3)',
      glassSurface: 'rgba(22, 22, 31, 0.65)',
      glassCard: 'rgba(255, 255, 255, 0.06)',
      glassBorder: 'rgba(255, 255, 255, 0.12)',
      glassHighlight: 'rgba(255, 110, 199, 0.08)',
      glassOverlay: 'rgba(10, 10, 15, 0.75)',
    },
    gradients: {
      primary: ['#ff6ec7', '#b967ff'],
      secondary: ['#b967ff', '#05ffa1'],
      accent: ['#05ffa1', '#01ffc3'],
    },
    glass: { blur: 50, tint: 'dark' },
  },
  midnight: {
    name: 'midnight',
    displayName: 'Midnight Blue',
    isDark: true,
    colors: {
      primary: '#4a9eff',
      secondary: '#7c3aed',
      accent: '#06b6d4',
      background: '#0f172a',
      surface: '#1e293b',
      card: 'rgba(30, 41, 59, 0.5)',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      border: 'rgba(148, 163, 184, 0.2)',
      overlay: 'rgba(15, 23, 42, 0.5)',
      highlight: 'rgba(74, 158, 255, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.3)',
      glassSurface: 'rgba(30, 41, 59, 0.60)',
      glassCard: 'rgba(148, 163, 184, 0.08)',
      glassBorder: 'rgba(148, 163, 184, 0.15)',
      glassHighlight: 'rgba(74, 158, 255, 0.06)',
      glassOverlay: 'rgba(15, 23, 42, 0.75)',
    },
    gradients: {
      primary: ['#4a9eff', '#7c3aed'],
      secondary: ['#7c3aed', '#06b6d4'],
      accent: ['#06b6d4', '#0891b2'],
    },
    glass: { blur: 50, tint: 'dark' },
  },
  sunset: {
    name: 'sunset',
    displayName: 'Sunset Vibes',
    isDark: true,
    colors: {
      primary: '#ff6b6b',
      secondary: '#ff9f43',
      accent: '#ffd93d',
      background: '#1a0f1f',
      surface: '#2a1f3f',
      card: 'rgba(255, 107, 107, 0.1)',
      text: '#ffffff',
      textSecondary: '#ffd4d4',
      textMuted: '#997777',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      border: 'rgba(255, 107, 107, 0.2)',
      overlay: 'rgba(26, 15, 31, 0.5)',
      highlight: 'rgba(255, 107, 107, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.3)',
      glassSurface: 'rgba(42, 31, 63, 0.60)',
      glassCard: 'rgba(255, 107, 107, 0.06)',
      glassBorder: 'rgba(255, 200, 200, 0.12)',
      glassHighlight: 'rgba(255, 107, 107, 0.06)',
      glassOverlay: 'rgba(26, 15, 31, 0.75)',
    },
    gradients: {
      primary: ['#ff6b6b', '#ff9f43'],
      secondary: ['#ff9f43', '#ffd93d'],
      accent: ['#ffd93d', '#fbcfe8'],
    },
    glass: { blur: 50, tint: 'dark' },
  },
  forest: {
    name: 'forest',
    displayName: 'Forest Green',
    isDark: true,
    colors: {
      primary: '#4ade80',
      secondary: '#22c55e',
      accent: '#86efac',
      background: '#0a1f0a',
      surface: '#14532d',
      card: 'rgba(74, 222, 128, 0.1)',
      text: '#f0fdf4',
      textSecondary: '#bbf7d0',
      textMuted: '#86efac',
      success: '#4ade80',
      warning: '#facc15',
      error: '#f87171',
      info: '#60a5fa',
      border: 'rgba(74, 222, 128, 0.2)',
      overlay: 'rgba(10, 31, 10, 0.5)',
      highlight: 'rgba(74, 222, 128, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.3)',
      glassSurface: 'rgba(20, 83, 45, 0.55)',
      glassCard: 'rgba(74, 222, 128, 0.06)',
      glassBorder: 'rgba(134, 239, 172, 0.12)',
      glassHighlight: 'rgba(74, 222, 128, 0.06)',
      glassOverlay: 'rgba(10, 31, 10, 0.75)',
    },
    gradients: {
      primary: ['#4ade80', '#22c55e'],
      secondary: ['#22c55e', '#86efac'],
      accent: ['#86efac', '#bbf7d0'],
    },
    glass: { blur: 50, tint: 'dark' },
  },
  ocean: {
    name: 'ocean',
    displayName: 'Ocean Depths',
    isDark: true,
    colors: {
      primary: '#06b6d4',
      secondary: '#0891b2',
      accent: '#67e8f9',
      background: '#0c1f2e',
      surface: '#164e63',
      card: 'rgba(6, 182, 212, 0.1)',
      text: '#f0fdfa',
      textSecondary: '#a5f3fc',
      textMuted: '#67e8f9',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      border: 'rgba(6, 182, 212, 0.2)',
      overlay: 'rgba(12, 31, 46, 0.5)',
      highlight: 'rgba(6, 182, 212, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.3)',
      glassSurface: 'rgba(22, 78, 99, 0.55)',
      glassCard: 'rgba(6, 182, 212, 0.06)',
      glassBorder: 'rgba(103, 232, 249, 0.12)',
      glassHighlight: 'rgba(6, 182, 212, 0.06)',
      glassOverlay: 'rgba(12, 31, 46, 0.75)',
    },
    gradients: {
      primary: ['#06b6d4', '#0891b2'],
      secondary: ['#0891b2', '#67e8f9'],
      accent: ['#67e8f9', '#a5f3fc'],
    },
    glass: { blur: 50, tint: 'dark' },
  },
  lavender: {
    name: 'lavender',
    displayName: 'Lavender Dreams',
    isDark: true,
    colors: {
      primary: '#c084fc',
      secondary: '#a855f7',
      accent: '#e9d5ff',
      background: '#1a0f2e',
      surface: '#2e1065',
      card: 'rgba(192, 132, 252, 0.1)',
      text: '#faf5ff',
      textSecondary: '#e9d5ff',
      textMuted: '#c084fc',
      success: '#86efac',
      warning: '#fde047',
      error: '#fca5a5',
      info: '#93c5fd',
      border: 'rgba(192, 132, 252, 0.2)',
      overlay: 'rgba(26, 15, 46, 0.5)',
      highlight: 'rgba(192, 132, 252, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.3)',
      glassSurface: 'rgba(46, 16, 101, 0.55)',
      glassCard: 'rgba(192, 132, 252, 0.06)',
      glassBorder: 'rgba(233, 213, 255, 0.12)',
      glassHighlight: 'rgba(192, 132, 252, 0.06)',
      glassOverlay: 'rgba(26, 15, 46, 0.75)',
    },
    gradients: {
      primary: ['#c084fc', '#a855f7'],
      secondary: ['#a855f7', '#e9d5ff'],
      accent: ['#e9d5ff', '#f3e8ff'],
    },
    glass: { blur: 50, tint: 'dark' },
  },
  cyberpunk: {
    name: 'cyberpunk',
    displayName: 'Cyberpunk 2077',
    isDark: true,
    colors: {
      primary: '#fcee09',
      secondary: '#00f0ff',
      accent: '#ff003c',
      background: '#000000',
      surface: '#1a1a1a',
      card: 'rgba(252, 238, 9, 0.1)',
      text: '#ffffff',
      textSecondary: '#fcee09',
      textMuted: '#808080',
      success: '#00ff41',
      warning: '#ffa500',
      error: '#ff003c',
      info: '#00f0ff',
      border: 'rgba(252, 238, 9, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      highlight: 'rgba(252, 238, 9, 0.3)',
      shadow: 'rgba(252, 238, 9, 0.2)',
      glassSurface: 'rgba(26, 26, 26, 0.65)',
      glassCard: 'rgba(252, 238, 9, 0.04)',
      glassBorder: 'rgba(252, 238, 9, 0.15)',
      glassHighlight: 'rgba(0, 240, 255, 0.06)',
      glassOverlay: 'rgba(0, 0, 0, 0.80)',
    },
    gradients: {
      primary: ['#fcee09', '#00f0ff'],
      secondary: ['#00f0ff', '#ff003c'],
      accent: ['#ff003c', '#fcee09'],
    },
    glass: { blur: 50, tint: 'dark' },
  },
  monochrome: {
    name: 'monochrome',
    displayName: 'Monochrome',
    isDark: true,
    colors: {
      primary: '#ffffff',
      secondary: '#808080',
      accent: '#404040',
      background: '#000000',
      surface: '#1a1a1a',
      card: 'rgba(255, 255, 255, 0.05)',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      textMuted: '#666666',
      success: '#ffffff',
      warning: '#b0b0b0',
      error: '#808080',
      info: '#d0d0d0',
      border: 'rgba(255, 255, 255, 0.2)',
      overlay: 'rgba(0, 0, 0, 0.5)',
      highlight: 'rgba(255, 255, 255, 0.1)',
      shadow: 'rgba(0, 0, 0, 0.5)',
      glassSurface: 'rgba(26, 26, 26, 0.60)',
      glassCard: 'rgba(255, 255, 255, 0.04)',
      glassBorder: 'rgba(255, 255, 255, 0.14)',
      glassHighlight: 'rgba(255, 255, 255, 0.04)',
      glassOverlay: 'rgba(0, 0, 0, 0.75)',
    },
    gradients: {
      primary: ['#ffffff', '#808080'],
      secondary: ['#808080', '#404040'],
      accent: ['#404040', '#000000'],
    },
    glass: { blur: 50, tint: 'dark' },
  },
}

interface ThemeContextValue {
  theme: Theme
  themeName: ThemeName
  setTheme: (name: ThemeName) => void
  availableThemes: typeof themes
  isThemePreviewActive: boolean
  previewTheme: Theme | null
  startThemePreview: () => void
  endThemePreview: () => void
  setPreviewTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = '@danz:theme'

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>('neon')
  const [isThemePreviewActive, setIsThemePreviewActive] = useState(false)
  const [previewTheme, setPreviewThemeState] = useState<Theme | null>(null)

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY)
      if (savedTheme && savedTheme in themes) {
        setThemeName(savedTheme as ThemeName)
      }
    } catch (error) {
      console.error('Error loading theme:', error)
    }
  }

  // Load saved theme on mount
  useEffect(() => {
    loadSavedTheme()
  }, [loadSavedTheme])

  const setTheme = async (name: ThemeName) => {
    try {
      setThemeName(name)
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name)
    } catch (error) {
      console.error('Error saving theme:', error)
    }
  }

  const startThemePreview = () => {
    setIsThemePreviewActive(true)
    setPreviewThemeState(themes[themeName])
  }

  const endThemePreview = () => {
    setIsThemePreviewActive(false)
    setPreviewThemeState(null)
  }

  const setPreviewTheme = (name: ThemeName) => {
    if (isThemePreviewActive) {
      setPreviewThemeState(themes[name])
    }
  }

  const currentTheme = isThemePreviewActive && previewTheme ? previewTheme : themes[themeName]

  const value: ThemeContextValue = {
    theme: currentTheme,
    themeName: isThemePreviewActive && previewTheme ? previewTheme.name : themeName,
    setTheme,
    availableThemes: themes,
    isThemePreviewActive,
    previewTheme,
    startThemePreview,
    endThemePreview,
    setPreviewTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
