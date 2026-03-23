'use client'

import { FiLock, FiX } from 'react-icons/fi'

interface UsernameMintModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  onSuccess?: () => void
}

export default function UsernameMintModal({
  isOpen,
  onClose,
  username,
  onSuccess,
}: UsernameMintModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-bg-secondary rounded-2xl border border-neon-purple/20 max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
        >
          <FiX className="w-5 h-5" />
        </button>

        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-neon-purple/20 rounded-full flex items-center justify-center">
            <FiLock className="w-8 h-8 text-neon-purple" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">
            Username Minting Upgrading
          </h2>
          <p className="text-text-secondary">
            On-chain username minting for <strong className="text-neon-purple">@{username}</strong> will
            be available when the wallet system upgrade is complete.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-neon-purple/20 text-neon-purple rounded-xl hover:bg-neon-purple/30 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
