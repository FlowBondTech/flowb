'use client'

import type { FarcasterFriend } from '@/src/lib/neynar'
import type { DanzParty } from '@/src/types/party'
import { Check, Loader2, Search, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface InviteFriendsModalProps {
  isOpen: boolean
  onClose: () => void
  party: DanzParty | null
  currentUserFid?: number
  onInviteFriend: (fid: number, username: string) => Promise<void>
}

export function InviteFriendsModal({
  isOpen,
  onClose,
  party,
  currentUserFid,
  onInviteFriend,
}: InviteFriendsModalProps) {
  const [friends, setFriends] = useState<FarcasterFriend[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [invitedFids, setInvitedFids] = useState<Set<number>>(new Set())
  const [invitingFid, setInvitingFid] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch friends when modal opens
  const fetchFriends = useCallback(async () => {
    if (!currentUserFid && !searchQuery) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (searchQuery.length >= 2) {
        params.set('search', searchQuery)
      } else if (currentUserFid) {
        params.set('fid', currentUserFid.toString())
        params.set('limit', '50')
      } else {
        return
      }

      const response = await fetch(`/api/farcaster/friends?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch friends')
      }

      setFriends(data.friends || [])
    } catch (err) {
      console.error('Failed to fetch friends:', err)
      setError(err instanceof Error ? err.message : 'Failed to load friends')
      setFriends([])
    } finally {
      setIsLoading(false)
    }
  }, [currentUserFid, searchQuery])

  // Load friends on mount
  useEffect(() => {
    if (isOpen && currentUserFid) {
      fetchFriends()
    }
  }, [isOpen, currentUserFid, fetchFriends])

  // Debounced search
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        fetchFriends()
      } else if (searchQuery.length === 0 && currentUserFid) {
        fetchFriends()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, isOpen, currentUserFid, fetchFriends])

  const handleInvite = async (friend: FarcasterFriend) => {
    if (invitedFids.has(friend.fid) || invitingFid === friend.fid) return

    setInvitingFid(friend.fid)
    try {
      await onInviteFriend(friend.fid, friend.username)
      setInvitedFids(prev => new Set([...prev, friend.fid]))
    } catch (err) {
      console.error('Failed to invite:', err)
    } finally {
      setInvitingFid(null)
    }
  }

  if (!isOpen || !party) return null

  // Filter out users already in the party
  const partyMemberFids = new Set(
    party.members.map(m => {
      // Assuming wallet address could contain FID or we check by other means
      // For now, we'll use display name matching as a fallback
      return 0 // This would need proper FID tracking
    }),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[80vh] bg-bg-primary border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 p-4 border-b border-white/10 bg-bg-primary/95 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Invite Friends to {party.name}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Farcaster users..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-neon-purple/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-neon-purple animate-spin mb-3" />
              <p className="text-white/50 text-sm">Loading friends...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="w-12 h-12 text-white/20 mb-3" />
              <p className="text-white/50 text-sm">
                {searchQuery ? 'No users found' : 'Connect your Farcaster to see friends'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-white/40 mb-3">
                {searchQuery ? 'Search results' : 'People you follow'}
              </p>
              {friends.map(friend => {
                const isInvited = invitedFids.has(friend.fid)
                const isInviting = invitingFid === friend.fid

                return (
                  <div
                    key={friend.fid}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center overflow-hidden">
                        {friend.pfpUrl ? (
                          <img
                            src={friend.pfpUrl}
                            alt={friend.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm text-white font-bold">
                            {friend.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <p className="font-medium text-white">{friend.displayName}</p>
                        <p className="text-sm text-white/50">@{friend.username}</p>
                      </div>
                    </div>

                    {/* Invite Button */}
                    <button
                      onClick={() => handleInvite(friend)}
                      disabled={isInvited || isInviting}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        isInvited
                          ? 'bg-green-500/20 text-green-400 cursor-default'
                          : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30'
                      }`}
                    >
                      {isInviting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isInvited ? (
                        <>
                          <Check className="w-4 h-4" />
                          Invited
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Invite
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-bg-primary/95">
          <p className="text-xs text-white/40 text-center">
            Invitations are sent via Farcaster direct cast
          </p>
        </div>
      </div>
    </div>
  )
}
