/**
 * FlowB Color System
 *
 * Glassmorphism dark theme palette. All glass tints and borders use rgba
 * so they layer correctly over blurred or gradient backgrounds.
 */

export const colors = {
  // ── Background layers ──────────────────────────────────────────────
  background: {
    /** Deepest base — used for root screens */
    base: '#050510',
    /** First depth layer — cards sitting on base */
    depth1: '#0a0a1a',
    /** Second depth layer — elevated surfaces */
    depth2: '#12122a',
  },

  // ── Glass tints (overlay backgrounds) ──────────────────────────────
  glass: {
    subtle: 'rgba(255,255,255,0.04)',
    light: 'rgba(255,255,255,0.08)',
    medium: 'rgba(255,255,255,0.12)',
    heavy: 'rgba(255,255,255,0.18)',
  },

  // ── Borders ────────────────────────────────────────────────────────
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    default: 'rgba(255,255,255,0.10)',
    bright: 'rgba(255,255,255,0.18)',
  },

  // ── Accent palette ─────────────────────────────────────────────────
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

  // ── Text ───────────────────────────────────────────────────────────
  text: {
    /** High-emphasis text — headings, primary content */
    primary: '#f8f8ff',
    /** Medium-emphasis — supporting content, labels */
    secondary: '#8888aa',
    /** Low-emphasis — placeholders, disabled */
    tertiary: '#555570',
    /** For use on light/accent backgrounds */
    inverse: '#050510',
  },

  // ── Semantic ───────────────────────────────────────────────────────
  semantic: {
    success: '#34d399',
    warning: '#fbbf24',
    error: '#fb7185',
    info: '#22d3ee',
  },

  // ── Transparent helpers ────────────────────────────────────────────
  transparent: 'transparent',
  white: '#ffffff',
  black: '#000000',

  // ── Shorthand aliases ────────────────────────────────────────────
  bg: {
    base: '#050510',
    depth1: '#0a0a1a',
    depth2: '#12122a',
  },
} as const;

export type Colors = typeof colors;
