// =====================================================
// DANZ Account Linking & Identity Types
// =====================================================

export type AuthProvider = 'privy' | 'farcaster' | 'wallet'

export type RewardType = 
  | 'first_link'      // First time linking a new provider
  | 'full_link'       // Linked all available providers
  | 'cross_app_first' // First action in a different app after linking
  | 'referral'        // Referred someone who linked

// =====================================================
// User & Auth Provider Types
// =====================================================

export interface UserAuthProvider {
  id: string
  provider: AuthProvider
  providerId: string
  metadata: ProviderMetadata
  isPrimary: boolean
  verified: boolean
  linkedAt: string
  lastUsedAt: string
}

export interface ProviderMetadata {
  // Farcaster
  fid?: number
  username?: string
  custodyAddress?: string
  verifiedAddresses?: string[]
  
  // Privy
  did?: string
  email?: string
  
  // Wallet
  address?: string
  chain?: string
}

export interface UserWallet {
  id: string
  address: string
  chain: string
  source?: AuthProvider
  isPrimary: boolean
  verifiedAt?: string
}

export interface User {
  id: string
  username?: string
  displayName?: string
  avatarUrl?: string
  email?: string
  
  // Stats
  totalXp: number
  currentLevel: number
  currentStreak: number
  longestStreak: number
  
  // Linking
  linkingBonusClaimed: boolean
  accountsLinkedCount: number
  
  // Related
  authProviders: UserAuthProvider[]
  wallets: UserWallet[]
  
  // Timestamps
  createdAt: string
  updatedAt: string
  lastActiveAt: string
}

// =====================================================
// Linking Types
// =====================================================

export interface LinkingToken {
  id: string
  token: string
  userId: string
  sourceProvider: AuthProvider
  targetProvider: AuthProvider
  expiresAt: string
  createdAt: string
}

export interface LinkingReward {
  id: string
  userId: string
  providerLinked?: AuthProvider
  rewardType: RewardType
  xpAwarded: number
  awardedAt: string
}

// =====================================================
// API Request/Response Types
// =====================================================

export interface AuthenticateRequest {
  provider: AuthProvider
  providerId: string
  metadata: ProviderMetadata
}

export interface AuthenticateResponse {
  user: User
  token: string
  isNewUser: boolean
  linkedExisting: boolean
  bonusXp?: number
}

export interface LinkAccountRequest {
  targetProvider: AuthProvider
  targetProviderId: string
  targetMetadata: ProviderMetadata
  linkingToken?: string // Optional token from cross-app flow
}

export interface LinkAccountResponse {
  success: boolean
  bonusXp?: number
  error?: string
  user?: User
}

export interface GenerateLinkingTokenRequest {
  targetProvider: AuthProvider
}

export interface GenerateLinkingTokenResponse {
  token: string
  expiresAt: string
  linkUrl: string
}

export interface ValidateLinkingTokenRequest {
  token: string
  targetProviderId: string
  targetMetadata: ProviderMetadata
}

export interface ValidateLinkingTokenResponse {
  success: boolean
  user?: User
  bonusXp?: number
  error?: string
}

// =====================================================
// Linking Status Types
// =====================================================

export interface LinkingStatus {
  hasFarcaster: boolean
  hasPrivy: boolean
  hasWallet: boolean
  
  farcasterUsername?: string
  privyEmail?: string
  primaryWallet?: string
  
  canClaimFullLinkBonus: boolean
  totalLinkedProviders: number
}

export interface LinkingRewardConfig {
  firstLink: number
  fullLink: number
  crossAppFirst: number
  referral: number
}

export const LINKING_REWARDS: LinkingRewardConfig = {
  firstLink: 500,
  fullLink: 250,
  crossAppFirst: 100,
  referral: 200,
}

// =====================================================
// Helper Functions
// =====================================================

export function extractWalletFromProvider(
  provider: AuthProvider,
  metadata: ProviderMetadata
): string | null {
  switch (provider) {
    case 'farcaster':
      return metadata.custodyAddress || metadata.verifiedAddresses?.[0] || null
    case 'privy':
      return metadata.address || null
    case 'wallet':
      return metadata.address || null
    default:
      return null
  }
}

export function getLinkingStatus(user: User): LinkingStatus {
  const hasFarcaster = user.authProviders.some(p => p.provider === 'farcaster')
  const hasPrivy = user.authProviders.some(p => p.provider === 'privy')
  const hasWallet = user.wallets.length > 0
  
  const farcasterProvider = user.authProviders.find(p => p.provider === 'farcaster')
  const privyProvider = user.authProviders.find(p => p.provider === 'privy')
  const primaryWallet = user.wallets.find(w => w.isPrimary) || user.wallets[0]
  
  const totalLinkedProviders = [hasFarcaster, hasPrivy].filter(Boolean).length
  const canClaimFullLinkBonus = totalLinkedProviders >= 2 && !user.linkingBonusClaimed
  
  return {
    hasFarcaster,
    hasPrivy,
    hasWallet,
    farcasterUsername: farcasterProvider?.metadata.username,
    privyEmail: privyProvider?.metadata.email,
    primaryWallet: primaryWallet?.address,
    canClaimFullLinkBonus,
    totalLinkedProviders,
  }
}

export function getProviderDisplayName(provider: AuthProvider): string {
  switch (provider) {
    case 'farcaster':
      return 'Farcaster'
    case 'privy':
      return 'DANZ Web'
    case 'wallet':
      return 'Wallet'
    default:
      return provider
  }
}

export function getProviderIcon(provider: AuthProvider): string {
  switch (provider) {
    case 'farcaster':
      return '🟣'
    case 'privy':
      return '🌐'
    case 'wallet':
      return '💎'
    default:
      return '🔗'
  }
}
