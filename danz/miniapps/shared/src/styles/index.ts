// Shared style constants for DANZ ecosystem

// DANZ Brand Colors
export const colors = {
  // Primary neon pink
  pink: {
    50: '#fff0f9',
    100: '#ffe0f4',
    200: '#ffc2ea',
    300: '#ff94d8',
    400: '#ff54bc',
    500: '#ff1493', // Primary brand pink
    600: '#f00082',
    700: '#d10069',
    800: '#ac0056',
    900: '#8e004a',
  },
  // Secondary purple
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  // Accent cyan/teal
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  // Dark backgrounds
  dark: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
} as const

// Gradient definitions
export const gradients = {
  // Primary neon gradient
  neonPink: 'linear-gradient(135deg, #ff1493 0%, #ff54bc 50%, #c084fc 100%)',
  // Dark background gradient
  darkBg: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
  // Card background
  cardBg: 'linear-gradient(135deg, rgba(255, 20, 147, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
  // Button gradient
  button: 'linear-gradient(135deg, #ff1493 0%, #c084fc 100%)',
  // Success gradient
  success: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
  // XP bar gradient
  xpBar: 'linear-gradient(90deg, #ff1493 0%, #c084fc 50%, #06b6d4 100%)',
} as const

// Animation durations
export const durations = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '700ms',
} as const

// Common shadows with neon glow
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  neonPink: '0 0 20px rgba(255, 20, 147, 0.5)',
  neonPurple: '0 0 20px rgba(168, 85, 247, 0.5)',
  neonCyan: '0 0 20px rgba(6, 182, 212, 0.5)',
} as const

// Border radius values
export const radii = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
} as const

// Z-index scale
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1200,
  popover: 1300,
  tooltip: 1400,
  toast: 1500,
} as const

// Spacing scale (matches Tailwind)
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const
