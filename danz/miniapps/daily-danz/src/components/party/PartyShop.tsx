'use client'

import { useState } from 'react'
import {
  ShopItem,
  ItemCategory,
  ItemRarity,
  PROTECTION_ITEMS,
  BOOST_ITEMS,
  UTILITY_ITEMS,
  COSMETIC_ITEMS,
  getAllShopItems,
  getItemsByCategory,
  getRarityColor,
  getRarityBgColor,
} from '@/types/shop'

interface PartyShopProps {
  userBalance: number
  ownedItems?: { itemId: string; quantity: number }[]
  onPurchase: (item: ShopItem) => void
}

export function PartyShop({ userBalance, ownedItems = [], onPurchase }: PartyShopProps) {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all')
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  const categories: { id: ItemCategory | 'all'; label: string; emoji: string }[] = [
    { id: 'all', label: 'All', emoji: '🛒' },
    { id: 'protection', label: 'Protection', emoji: '🛡️' },
    { id: 'boost', label: 'Boosts', emoji: '⚡' },
    { id: 'utility', label: 'Utility', emoji: '🔧' },
    { id: 'cosmetic', label: 'Cosmetic', emoji: '🎨' },
  ]

  const items = selectedCategory === 'all'
    ? getAllShopItems()
    : getItemsByCategory(selectedCategory)

  const getOwnedQuantity = (itemId: string) => {
    const owned = ownedItems.find((i) => i.itemId === itemId)
    return owned?.quantity || 0
  }

  const canAfford = (price: number) => userBalance >= price

  const handlePurchase = async (item: ShopItem) => {
    if (!canAfford(item.price)) return
    setPurchasing(true)
    await onPurchase(item)
    setPurchasing(false)
    setSelectedItem(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-base flex items-center gap-1.5">
            <span>🏪</span> Shop
          </h2>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-danz-pink-500/20 to-danz-purple-500/20 rounded-full">
            <span className="text-xs">💰</span>
            <span className="font-bold text-sm">{userBalance.toLocaleString()}</span>
            <span className="text-[10px] text-gray-400">DANZ</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-danz-pink-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const owned = getOwnedQuantity(item.id)
            const affordable = canAfford(item.price)
            const maxed = item.maxStack && owned >= item.maxStack

            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`relative p-2.5 rounded-lg border text-left transition-all ${
                  maxed
                    ? 'bg-white/5 border-white/5 opacity-60'
                    : affordable
                    ? 'bg-bg-card/80 border-white/10 hover:border-neon-pink/30 hover:scale-[1.02]'
                    : 'bg-bg-card/40 border-white/5 opacity-70'
                }`}
              >
                {/* Rarity indicator */}
                <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${getRarityBgColor(item.rarity)}`} />

                {/* Owned badge */}
                {owned > 0 && (
                  <div className="absolute top-1.5 left-1.5 px-1 py-0.5 bg-green-500/20 rounded text-[9px] text-green-400">
                    x{owned}
                  </div>
                )}

                {/* Item Content */}
                <div className="text-center">
                  <span className="text-2xl mb-1 block">{item.emoji}</span>
                  <h4 className="font-medium text-xs mb-0.5 line-clamp-1">{item.name}</h4>
                  <p className={`text-[10px] font-medium ${getRarityColor(item.rarity)}`}>
                    {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                  </p>
                </div>

                {/* Price */}
                <div className="mt-1.5 pt-1.5 border-t border-white/5 text-center">
                  <span className={`font-bold text-xs ${affordable ? 'text-danz-pink-400' : 'text-gray-500'}`}>
                    {item.price} DANZ
                  </span>
                </div>

                {/* Maxed indicator */}
                {maxed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                    <span className="text-[10px] text-gray-300">MAX</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          />

          <div className="relative w-full max-w-md bg-bg-secondary rounded-t-2xl border-t border-white/10 animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-8 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Item Header */}
            <div className="px-4 pb-3 text-center">
              <span className="text-4xl mb-2 block">{selectedItem.emoji}</span>
              <h3 className="font-display font-bold text-lg">{selectedItem.name}</h3>
              <p className={`text-xs ${getRarityColor(selectedItem.rarity)} mt-0.5`}>
                {selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1)} Item
              </p>
            </div>

            {/* Description */}
            <div className="px-4 pb-3">
              <p className="text-gray-300 text-xs text-center">{selectedItem.description}</p>
            </div>

            {/* Effect */}
            <div className="mx-4 p-2.5 bg-danz-purple-500/10 rounded-lg border border-danz-purple-500/20 mb-3">
              <p className="text-[10px] text-gray-400 mb-0.5">Effect:</p>
              <p className="text-xs font-medium">{selectedItem.effect.description}</p>
            </div>

            {/* Details */}
            <div className="px-4 pb-3 space-y-1.5">
              {selectedItem.duration && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Duration</span>
                  <span>{selectedItem.duration}h</span>
                </div>
              )}
              {selectedItem.maxStack && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Max Stack</span>
                  <span>{selectedItem.maxStack}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">You Own</span>
                <span>{getOwnedQuantity(selectedItem.id)}</span>
              </div>
            </div>

            {/* Purchase Button */}
            <div className="p-3 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs">Price</span>
                <span className="font-bold text-lg text-danz-pink-400">
                  {selectedItem.price} DANZ
                </span>
              </div>

              {selectedItem.maxStack && getOwnedQuantity(selectedItem.id) >= selectedItem.maxStack ? (
                <button
                  disabled
                  className="w-full py-2.5 bg-white/5 rounded-lg text-gray-500 text-sm font-medium"
                >
                  Maximum Owned
                </button>
              ) : !canAfford(selectedItem.price) ? (
                <button
                  disabled
                  className="w-full py-2.5 bg-white/5 rounded-lg text-gray-500 text-xs font-medium"
                >
                  Need {(selectedItem.price - userBalance).toLocaleString()} more DANZ
                </button>
              ) : (
                <button
                  onClick={() => handlePurchase(selectedItem)}
                  disabled={purchasing}
                  className="w-full py-2.5 bg-gradient-to-r from-neon-pink to-neon-purple rounded-lg text-sm font-medium shadow-glow-pink hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {purchasing ? 'Purchasing...' : `Buy for ${selectedItem.price} DANZ`}
                </button>
              )}
            </div>

            {/* Balance info */}
            <div className="px-4 pb-4 text-center">
              <p className="text-[10px] text-gray-500">
                Balance: {userBalance.toLocaleString()} DANZ
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Featured items carousel for homepage
export function FeaturedShopItems({
  items,
  onViewAll,
}: {
  items: ShopItem[]
  onViewAll: () => void
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold">🏪 Shop Highlights</h3>
        <button onClick={onViewAll} className="text-sm text-danz-pink-400">
          View All →
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {items.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-28 p-3 bg-bg-card/80 rounded-xl border border-white/10 text-center"
          >
            <span className="text-2xl">{item.emoji}</span>
            <p className="text-xs font-medium mt-1 line-clamp-1">{item.name}</p>
            <p className="text-xs text-danz-pink-400 mt-1">{item.price} DANZ</p>
          </div>
        ))}
      </div>
    </div>
  )
}
