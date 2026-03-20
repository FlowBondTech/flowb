'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PartyShop } from '@/components/party'
import { BottomNav } from '@/components/ui/BottomNav'
import { TransactionToast, useTransactionToast } from '@/components/ui/TransactionToast'
import type { ShopItem } from '@/types/shop'

export default function ShopPage() {
  // Mock user balance - replace with real data
  const [userBalance, setUserBalance] = useState(500)

  // Mock owned items
  const [ownedItems, setOwnedItems] = useState([
    { itemId: 'danz_dodge_single', quantity: 2 },
    { itemId: 'xp_boost_small', quantity: 1 },
  ])

  // Transaction toast
  const {
    transaction,
    dismissTransaction,
    showPurchase,
    showPurchaseSuccess,
    showPurchaseError,
  } = useTransactionToast()

  const handlePurchase = async (item: ShopItem) => {
    // Show pending toast
    showPurchase(item.name, item.price)

    try {
      // TODO: Implement real purchase logic
      console.log('Purchasing:', item.name)
      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Update balance and owned items (mock)
      setUserBalance((prev) => prev - item.price)
      setOwnedItems((prev) => {
        const existing = prev.find((i) => i.itemId === item.id)
        if (existing) {
          return prev.map((i) =>
            i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        }
        return [...prev, { itemId: item.id, quantity: 1 }]
      })

      // Show success toast
      showPurchaseSuccess(item.name, item.price)
    } catch {
      // Show error toast
      showPurchaseError(item.name, 'Transaction failed. Please try again.')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Transaction Toast */}
      <TransactionToast
        transaction={transaction}
        onDismiss={dismissTransaction}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-bg-secondary/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Link
            href="/party"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm"
          >
            ←
          </Link>
          <span className="font-display font-bold text-base">DANZ Shop</span>
        </div>
      </header>

      {/* Shop Content - add padding for auto-hide nav */}
      <main className="flex-1 overflow-hidden pb-20">
        <PartyShop
          userBalance={userBalance}
          ownedItems={ownedItems}
          onPurchase={handlePurchase}
        />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
