'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MyPartyBanner, PartyCard, PartyLeaderboard, CreatePartyModal, JoinPartyModal, PartyDetailView } from '@/components/party'
import { BottomNav } from '@/components/ui/BottomNav'
import { useParty } from '@/hooks/useParty'
import { useFarcasterSDK } from '@/hooks/useFarcasterSDK'
import { DanzParty } from '@/types/party'

type ViewState = 'home' | 'detail' | 'browse'

export default function PartyPage() {
  const { user } = useFarcasterSDK()
  const {
    userParty,
    membership,
    leaderboard,
    discoverParties,
    isLoading,
    error,
    createParty,
    joinParty,
    leaveParty,
    refreshParty,
    refreshLeaderboard,
    refreshDiscover,
  } = useParty()

  const [view, setView] = useState<ViewState>('home')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [selectedParty, setSelectedParty] = useState<DanzParty | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const handleCreateParty = async (data: { name: string; description: string; emoji: string; isPublic: boolean; txHash?: string }) => {
    try {
      setActionLoading(true)
      await createParty({
        name: data.name,
        description: data.description,
        emoji: data.emoji,
        isPublic: data.isPublic,
        txHash: data.txHash,
      })
      setShowCreateModal(false)
      await refreshLeaderboard()
    } catch (err) {
      console.error('Create party error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveParty = async () => {
    try {
      setActionLoading(true)
      await leaveParty()
      setView('home')
      await Promise.all([refreshLeaderboard(), refreshDiscover()])
    } catch (err) {
      console.error('Leave party error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenJoinModal = (partyId: string) => {
    const party = discoverParties.find(p => p.id === partyId)
    if (party) {
      setSelectedParty(party)
      setShowJoinModal(true)
    }
  }

  const handleJoinParty = async (partyIdOrCode: string) => {
    try {
      setActionLoading(true)
      await joinParty(partyIdOrCode)
      setShowJoinModal(false)
      setSelectedParty(null)
      await refreshLeaderboard()
    } catch (err) {
      console.error('Join party error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // Get current user's member record for detail view
  const currentUserId = user?.fid ? `fc-${user.fid}` : undefined

  if (view === 'detail' && userParty) {
    return (
      <PartyDetailView
        party={userParty}
        currentUserId={currentUserId || ''}
        onLeaveParty={handleLeaveParty}
        onInviteMember={() => {}}
        onBack={() => setView('home')}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-bg-secondary/80 backdrop-blur-md">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🎉</span> DANZ Party
        </h1>
        <Link
          href="/shop"
          className="px-2.5 py-1 bg-gradient-to-r from-danz-pink-500/20 to-danz-purple-500/20 rounded-full text-xs font-medium text-danz-pink-400 hover:bg-danz-pink-500/30 transition-colors"
        >
          🏪 Shop
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-4 pb-20 space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-danz-pink-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* User's party or CTA */}
        {!isLoading && (
          <MyPartyBanner
            party={userParty}
            onCreateParty={() => setShowCreateModal(true)}
            onViewParty={() => userParty ? setView('detail') : setView('browse')}
          />
        )}

        {/* Party Leaderboard */}
        {!isLoading && (
          <PartyLeaderboard
            leaderboard={leaderboard}
            userPartyId={userParty?.id}
          />
        )}

        {/* Discover parties */}
        {!isLoading && !userParty && discoverParties.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Discover Parties</h2>
            <div className="space-y-3">
              {discoverParties.map(party => (
                <PartyCard
                  key={party.id}
                  party={party}
                  onJoin={handleOpenJoinModal}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no parties to discover */}
        {!isLoading && !userParty && discoverParties.length === 0 && (
          <div className="p-6 bg-bg-secondary/50 rounded-xl text-center">
            <p className="text-gray-400 text-sm mb-2">No public parties available</p>
            <p className="text-gray-500 text-xs">Be the first to create one!</p>
          </div>
        )}
      </main>

      {/* Auto-hide Bottom Navigation */}
      <BottomNav />

      {/* Create party modal */}
      <CreatePartyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateParty}
      />

      {/* Join party modal */}
      <JoinPartyModal
        isOpen={showJoinModal}
        party={selectedParty}
        onClose={() => {
          setShowJoinModal(false)
          setSelectedParty(null)
        }}
        onJoin={handleJoinParty}
      />
    </div>
  )
}
