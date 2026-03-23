'use client'

import {
  type AuthProvider,
  type User,
  type GenerateLinkingTokenResponse,
  type LinkAccountResponse,
  type ValidateLinkingTokenResponse,
  type ProviderMetadata,
  LINKING_REWARDS,
} from '@/types/auth'

// =====================================================
// Configuration
// =====================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
const DANZ_WEB_URL = process.env.NEXT_PUBLIC_DANZ_WEB_URL || 'https://danz.app'

// =====================================================
// API Client Functions
// =====================================================

/**
 * Generate a linking token for cross-app account linking
 * Used when linking from miniapp to web app
 */
export async function generateLinkingToken(
  targetProvider: AuthProvider
): Promise<GenerateLinkingTokenResponse> {
  const response = await fetch(`${API_BASE}/api/auth/generate-linking-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ targetProvider }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to generate linking token' }))
    throw new Error(error.message || 'Failed to generate linking token')
  }

  return response.json()
}

/**
 * Validate a linking token and complete the account link
 * Used when receiving a link from another app
 */
export async function validateLinkingToken(
  token: string,
  targetProviderId: string,
  targetMetadata: ProviderMetadata
): Promise<ValidateLinkingTokenResponse> {
  const response = await fetch(`${API_BASE}/api/auth/validate-linking-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      token,
      targetProviderId,
      targetMetadata,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to validate linking token' }))
    throw new Error(error.message || 'Failed to validate linking token')
  }

  return response.json()
}

/**
 * Directly link an account (same-app linking)
 */
export async function linkAccount(
  targetProvider: AuthProvider,
  targetProviderId: string,
  targetMetadata: ProviderMetadata,
  linkingToken?: string
): Promise<LinkAccountResponse> {
  const response = await fetch(`${API_BASE}/api/auth/link-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      targetProvider,
      targetProviderId,
      targetMetadata,
      linkingToken,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to link account' }))
    throw new Error(error.message || 'Failed to link account')
  }

  return response.json()
}

/**
 * Unlink an account from the current user
 */
export async function unlinkAccount(
  provider: AuthProvider
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/api/auth/unlink-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ provider }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to unlink account' }))
    throw new Error(error.message || 'Failed to unlink account')
  }

  return response.json()
}

/**
 * Fetch the current user's profile with all linked accounts
 */
export async function fetchUserProfile(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        return null
      }
      throw new Error('Failed to fetch user profile')
    }

    return response.json()
  } catch {
    return null
  }
}

// =====================================================
// Linking URL Builders
// =====================================================

/**
 * Build the URL to open DANZ web app for linking
 */
export function buildWebLinkingUrl(token: string): string {
  const url = new URL('/link-account', DANZ_WEB_URL)
  url.searchParams.set('token', token)
  url.searchParams.set('source', 'miniapp')
  return url.toString()
}

/**
 * Build the URL to deep-link back to miniapp after linking
 */
export function buildMiniappReturnUrl(token: string): string {
  const url = new URL('/link-callback', window.location.origin)
  url.searchParams.set('token', token)
  return url.toString()
}

// =====================================================
// Cross-App Linking Flow
// =====================================================

/**
 * Initiate linking flow from miniapp to web app
 * 1. Generate a linking token
 * 2. Open DANZ web in a new window/tab
 * 3. User authenticates with Privy on web
 * 4. Accounts are linked
 */
export async function initiateLinkToWeb(): Promise<{
  success: boolean
  linkUrl?: string
  error?: string
}> {
  try {
    const response = await generateLinkingToken('privy')

    if (response.linkUrl) {
      return {
        success: true,
        linkUrl: response.linkUrl,
      }
    }

    // Build URL manually if not provided
    const linkUrl = buildWebLinkingUrl(response.token)
    return {
      success: true,
      linkUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate linking',
    }
  }
}

/**
 * Handle callback after linking is complete
 * Called when user returns to miniapp from web app
 */
export async function handleLinkingCallback(
  token: string
): Promise<{ success: boolean; user?: User; bonusXp?: number; error?: string }> {
  try {
    // The token validation happens on the web side
    // This just fetches the updated user
    const user = await fetchUserProfile()

    if (!user) {
      return {
        success: false,
        error: 'Failed to fetch updated profile',
      }
    }

    return {
      success: true,
      user,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete linking',
    }
  }
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Calculate total potential XP from linking all accounts
 */
export function calculateLinkingXpPotential(user: User): {
  earned: number
  potential: number
  remaining: number
} {
  const linkedCount = user.accountsLinkedCount
  const maxProviders = 2 // Farcaster + Privy

  const earnedFromLinks = Math.min(linkedCount, maxProviders) * LINKING_REWARDS.firstLink
  const fullLinkBonus = user.linkingBonusClaimed ? LINKING_REWARDS.fullLink : 0
  const earned = earnedFromLinks + fullLinkBonus

  const potential = (maxProviders * LINKING_REWARDS.firstLink) + LINKING_REWARDS.fullLink
  const remaining = potential - earned

  return {
    earned,
    potential,
    remaining,
  }
}

/**
 * Check if user can claim the full link bonus
 */
export function canClaimFullLinkBonus(user: User): boolean {
  return (
    user.accountsLinkedCount >= 2 &&
    !user.linkingBonusClaimed
  )
}

/**
 * Get a human-readable linking status message
 */
export function getLinkingStatusMessage(user: User): string {
  const { authProviders } = user
  const hasFarcaster = authProviders.some(p => p.provider === 'farcaster')
  const hasPrivy = authProviders.some(p => p.provider === 'privy')

  if (hasFarcaster && hasPrivy) {
    return 'All accounts linked! Your DANZ experience is fully synced.'
  }

  if (hasFarcaster && !hasPrivy) {
    return 'Link your DANZ web account to sync all your rewards.'
  }

  if (!hasFarcaster && hasPrivy) {
    return 'Link your Farcaster account to access miniapp features.'
  }

  return 'Link your accounts to unlock the full DANZ experience.'
}

/**
 * Store linking state for cross-session continuity
 */
export function storeLinkingState(state: {
  token: string
  initiatedAt: number
  targetProvider: AuthProvider
}): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('danz_linking_state', JSON.stringify(state))
  }
}

/**
 * Retrieve stored linking state
 */
export function retrieveLinkingState(): {
  token: string
  initiatedAt: number
  targetProvider: AuthProvider
} | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem('danz_linking_state')
  if (!stored) return null

  try {
    const state = JSON.parse(stored)
    // Expire after 10 minutes
    if (Date.now() - state.initiatedAt > 10 * 60 * 1000) {
      clearLinkingState()
      return null
    }
    return state
  } catch {
    return null
  }
}

/**
 * Clear stored linking state
 */
export function clearLinkingState(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('danz_linking_state')
  }
}
