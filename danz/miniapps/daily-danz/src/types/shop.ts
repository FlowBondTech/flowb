// DANZ Shop - Purchasable Items and Power-ups

// ============================================
// ITEM CATEGORIES
// ============================================

export type ItemCategory =
  | 'protection'     // Items that protect from slashing
  | 'boost'          // XP multiplier boosts
  | 'cosmetic'       // Visual customization
  | 'utility'        // Useful tools and features
  | 'party'          // Party-specific items

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

// ============================================
// SHOP ITEMS
// ============================================

export interface ShopItem {
  id: string
  name: string
  description: string
  emoji: string
  category: ItemCategory
  rarity: ItemRarity
  price: number // In DANZ tokens
  priceInCreatorToken?: number // Alternative price in creator tokens
  duration?: number // Duration in hours (null = permanent or single use)
  maxStack?: number // Max quantity user can hold
  isLimitedEdition?: boolean
  availableUntil?: string
  effect: ItemEffect
}

export interface ItemEffect {
  type: string
  value: number | string | boolean
  description: string
}

// ============================================
// PROTECTION ITEMS
// ============================================

export interface DanzDodge extends ShopItem {
  category: 'protection'
  effect: {
    type: 'slash_protection'
    value: number // Number of slashes protected
    description: string
  }
}

// Pre-defined protection items
export const PROTECTION_ITEMS: ShopItem[] = [
  {
    id: 'danz_dodge_single',
    name: 'Danz Dodge',
    description: 'Protects your treasury from ONE missed check-in slash. Use wisely!',
    emoji: '🛡️',
    category: 'protection',
    rarity: 'common',
    price: 25,
    // Single use - no duration
    maxStack: 5,
    effect: {
      type: 'slash_protection',
      value: 1,
      description: 'Blocks 1 slash event',
    },
  },
  {
    id: 'danz_dodge_triple',
    name: 'Triple Dodge Pack',
    description: 'A pack of 3 Danz Dodges at a discount. Planning a vacation?',
    emoji: '🛡️🛡️🛡️',
    category: 'protection',
    rarity: 'uncommon',
    price: 60, // 20% discount
    duration: undefined,
    maxStack: 3,
    effect: {
      type: 'slash_protection',
      value: 3,
      description: 'Blocks 3 slash events',
    },
  },
  {
    id: 'immunity_shield',
    name: 'Immunity Shield',
    description: '24-hour complete protection from ALL slash types. Perfect for emergencies!',
    emoji: '✨🛡️✨',
    category: 'protection',
    rarity: 'rare',
    price: 100,
    duration: 24,
    maxStack: 2,
    effect: {
      type: 'timed_immunity',
      value: 24,
      description: '24h immunity from all slashing',
    },
  },
  {
    id: 'weekend_pass',
    name: 'Weekend Pass',
    description: 'Protection for Saturday and Sunday. Because weekends are sacred!',
    emoji: '🎉🛡️',
    category: 'protection',
    rarity: 'uncommon',
    price: 40,
    duration: 48,
    maxStack: 4,
    effect: {
      type: 'weekend_protection',
      value: true,
      description: 'Weekend slash protection',
    },
  },
  {
    id: 'vacation_mode',
    name: 'Vacation Mode',
    description: '7-day protection for when life happens. No slashing, no worries.',
    emoji: '🏖️',
    category: 'protection',
    rarity: 'epic',
    price: 200,
    duration: 168, // 7 days
    maxStack: 1,
    effect: {
      type: 'vacation_protection',
      value: 7,
      description: '7-day complete protection',
    },
  },
]

// ============================================
// BOOST ITEMS
// ============================================

export const BOOST_ITEMS: ShopItem[] = [
  {
    id: 'xp_boost_small',
    name: 'XP Spark',
    description: '+25% XP for your next 3 check-ins. Every bit counts!',
    emoji: '⚡',
    category: 'boost',
    rarity: 'common',
    price: 15,
    duration: undefined, // 3 uses
    maxStack: 10,
    effect: {
      type: 'xp_multiplier',
      value: 1.25,
      description: '+25% XP for 3 check-ins',
    },
  },
  {
    id: 'xp_boost_medium',
    name: 'XP Surge',
    description: '+50% XP for 24 hours. Make every dance count double!',
    emoji: '⚡⚡',
    category: 'boost',
    rarity: 'uncommon',
    price: 50,
    duration: 24,
    maxStack: 5,
    effect: {
      type: 'xp_multiplier',
      value: 1.50,
      description: '+50% XP for 24h',
    },
  },
  {
    id: 'xp_boost_large',
    name: 'XP Storm',
    description: 'DOUBLE XP for 48 hours! Climb that leaderboard!',
    emoji: '🌩️',
    category: 'boost',
    rarity: 'rare',
    price: 150,
    duration: 48,
    maxStack: 2,
    effect: {
      type: 'xp_multiplier',
      value: 2.0,
      description: '2x XP for 48h',
    },
  },
  {
    id: 'streak_saver',
    name: 'Streak Saver',
    description: 'Restores a broken streak back to its previous value. One-time use.',
    emoji: '🔥💾',
    category: 'boost',
    rarity: 'epic',
    price: 100,
    duration: undefined,
    maxStack: 1,
    effect: {
      type: 'streak_restore',
      value: true,
      description: 'Restores broken streak',
    },
  },
  {
    id: 'party_boost',
    name: 'Party Amplifier',
    description: 'Boosts entire party XP by 10% for 24h. Share the love!',
    emoji: '📢',
    category: 'boost',
    rarity: 'rare',
    price: 200,
    duration: 24,
    maxStack: 1,
    effect: {
      type: 'party_xp_boost',
      value: 1.10,
      description: '+10% party XP for 24h',
    },
  },
]

// ============================================
// UTILITY ITEMS
// ============================================
// Removed items (per UX research):
// - anonymous_encourage (Secret Admirer) - enables confusion/harassment
// - party_rename (Party Rebrand) - moderation nightmare

export const UTILITY_ITEMS: ShopItem[] = [
  {
    id: 'extra_encourage',
    name: 'Megaphone',
    description: 'Send 5 extra encouragement messages today. Rally your crew!',
    emoji: '📣',
    category: 'utility',
    rarity: 'common',
    price: 10,
    duration: 24,
    maxStack: 3,
    effect: {
      type: 'extra_messages',
      value: 5,
      description: '+5 encouragement messages',
    },
  },
  {
    id: 'slot_expansion',
    name: 'Party Expansion',
    description: 'Add 5 more member slots to your party. Grow the crew!',
    emoji: '📈',
    category: 'utility',
    rarity: 'rare',
    price: 150,
    duration: undefined, // Permanent
    maxStack: 3,
    effect: {
      type: 'member_slots',
      value: 5,
      description: '+5 party member slots',
    },
  },
  {
    id: 'early_warning',
    name: 'Early Warning System',
    description: 'Get notified 2 hours earlier when party members are at risk.',
    emoji: '⏰',
    category: 'utility',
    rarity: 'uncommon',
    price: 30,
    duration: 168, // 7 days
    maxStack: 4,
    effect: {
      type: 'early_notifications',
      value: 2,
      description: '2h earlier risk alerts',
    },
  },
]

// ============================================
// COSMETIC ITEMS
// ============================================
// NOTE: All cosmetic items removed per UX research
// Cosmetics should be EARNED through achievements, not purchased
// - Fire Frame -> 100-day streak reward
// - Rainbow Frame -> Tier 3 party achievement
// - Dance Master Title -> Achievement unlock
// - Confetti Check-in -> 100 check-in milestone (free)

export const COSMETIC_ITEMS: ShopItem[] = [
  // Cosmetics are now earned, not purchased
  // See achievements system for unlock conditions
]

// ============================================
// USER INVENTORY
// ============================================

export interface InventoryItem {
  id: string
  itemId: string
  userId: string
  quantity: number
  purchasedAt: string
  expiresAt?: string
  usesRemaining?: number
  isActive: boolean
  activatedAt?: string
}

export interface UserInventory {
  userId: string
  items: InventoryItem[]
  totalSpent: number
  favoriteCategory?: ItemCategory
}

// ============================================
// SHOP HELPERS
// ============================================

export function getAllShopItems(): ShopItem[] {
  return [
    ...PROTECTION_ITEMS,
    ...BOOST_ITEMS,
    ...UTILITY_ITEMS,
    ...COSMETIC_ITEMS,
  ]
}

export function getItemsByCategory(category: ItemCategory): ShopItem[] {
  return getAllShopItems().filter(item => item.category === category)
}

export function getItemById(itemId: string): ShopItem | undefined {
  return getAllShopItems().find(item => item.id === itemId)
}

export function getRarityColor(rarity: ItemRarity): string {
  switch (rarity) {
    case 'common': return 'text-gray-400'
    case 'uncommon': return 'text-green-400'
    case 'rare': return 'text-blue-400'
    case 'epic': return 'text-purple-400'
    case 'legendary': return 'text-yellow-400'
    default: return 'text-gray-400'
  }
}

export function getRarityBgColor(rarity: ItemRarity): string {
  switch (rarity) {
    case 'common': return 'bg-gray-500/20'
    case 'uncommon': return 'bg-green-500/20'
    case 'rare': return 'bg-blue-500/20'
    case 'epic': return 'bg-purple-500/20'
    case 'legendary': return 'bg-yellow-500/20'
    default: return 'bg-gray-500/20'
  }
}
