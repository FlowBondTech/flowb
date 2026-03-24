export const colors = {
  background: {
    base: '#050510',
    depth1: '#0a0a1a',
    depth2: '#12122a',
  },
  glass: {
    subtle: 'rgba(255,255,255,0.04)',
    light: 'rgba(255,255,255,0.08)',
    medium: 'rgba(255,255,255,0.12)',
    heavy: 'rgba(255,255,255,0.18)',
  },
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    default: 'rgba(255,255,255,0.10)',
    bright: 'rgba(255,255,255,0.18)',
  },
  accent: {
    primary: '#7c6cf0',
    primaryGlow: 'rgba(124,108,240,0.3)',
    secondary: '#a78bfa',
    cyan: '#22d3ee',
    cyanGlow: 'rgba(34,211,238,0.2)',
    emerald: '#34d399',
    amber: '#fbbf24',
    rose: '#fb7185',
  },
  text: {
    primary: '#f8f8ff',
    secondary: '#8888aa',
    tertiary: '#555570',
    inverse: '#050510',
  },
  semantic: {
    success: '#34d399',
    warning: '#fbbf24',
    error: '#fb7185',
    info: '#22d3ee',
  },
  transparent: 'transparent',
  white: '#ffffff',
  black: '#000000',
} as const;

export type Colors = typeof colors;
