// Shared utilities for DANZ ecosystem

import type { PartyRewards } from '../types'

/**
 * Calculate bonus multiplier based on party member count
 * 1 dancer: 1.0x, 2: 1.2x, 3: 1.5x, 4: 1.8x, 5+: 2.0x
 */
export function calculateBonusMultiplier(memberCount: number): number {
  if (memberCount <= 1) return 1
  if (memberCount === 2) return 1.2
  if (memberCount === 3) return 1.5
  if (memberCount === 4) return 1.8
  return 2.0
}

/**
 * Calculate total party rewards including all bonuses
 */
export function calculatePartyRewards(
  baseXp: number,
  memberCount: number,
  isHost: boolean,
  streak: number = 0
): PartyRewards {
  const multiplier = calculateBonusMultiplier(memberCount)
  const partyBonus = Math.floor(baseXp * (multiplier - 1))
  const hostBonus = isHost ? Math.floor(baseXp * 0.1) : 0
  const streakBonus = Math.floor(baseXp * Math.min(streak * 0.05, 0.5))
  const totalXp = baseXp + partyBonus + hostBonus + streakBonus
  const tokensEarned = totalXp * 0.1

  return {
    baseXp,
    partyBonus,
    hostBonus,
    streakBonus,
    totalXp,
    tokensEarned,
    multiplierUsed: multiplier,
  }
}

/**
 * Format XP number with commas
 */
export function formatXp(xp: number): string {
  return xp.toLocaleString()
}

/**
 * Format tokens with decimal places
 */
export function formatTokens(tokens: number, decimals: number = 1): string {
  return tokens.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Get level from XP
 */
export function getLevelFromXp(xp: number): number {
  // Level thresholds: 0-99 = 1, 100-299 = 2, 300-599 = 3, etc.
  if (xp < 100) return 1
  if (xp < 300) return 2
  if (xp < 600) return 3
  if (xp < 1000) return 4
  if (xp < 1500) return 5
  if (xp < 2100) return 6
  if (xp < 2800) return 7
  if (xp < 3600) return 8
  if (xp < 4500) return 9
  return Math.floor(10 + (xp - 4500) / 1000)
}

/**
 * Get XP progress percentage to next level
 */
export function getXpProgress(xp: number): number {
  const level = getLevelFromXp(xp)
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500]

  if (level <= 10) {
    const current = thresholds[level - 1] || 0
    const next = thresholds[level] || current + 1000
    return ((xp - current) / (next - current)) * 100
  }

  // After level 10, each level is 1000 XP
  const baseXp = 4500 + (level - 10) * 1000
  return ((xp - baseXp) / 1000) * 100
}

/**
 * Generate a random party code
 */
export function generatePartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Format duration in seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Check if user is in a Farcaster frame context
 */
export function isInFrame(): boolean {
  if (typeof window === 'undefined') return false
  return window.self !== window.top
}
