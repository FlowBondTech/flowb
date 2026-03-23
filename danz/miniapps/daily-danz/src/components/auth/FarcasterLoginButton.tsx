'use client'

import { NeynarAuthButton, useNeynarContext } from '@neynar/react'
import { useEffect } from 'react'

interface FarcasterLoginButtonProps {
  onSuccess?: (user: {
    fid: number
    username: string
    displayName: string
    pfpUrl: string
    signerUuid: string
  }) => void
  onError?: (error: Error) => void
}

export function FarcasterLoginButton({ onSuccess, onError }: FarcasterLoginButtonProps) {
  const { user, isAuthenticated } = useNeynarContext()

  // Handle successful authentication
  useEffect(() => {
    if (isAuthenticated && user && onSuccess) {
      onSuccess({
        fid: user.fid,
        username: user.username || '',
        displayName: user.display_name || user.username || '',
        pfpUrl: user.pfp_url || '',
        signerUuid: user.signer_uuid || '',
      })
    }
  }, [isAuthenticated, user, onSuccess])

  return (
    <div className="farcaster-login-btn">
      <NeynarAuthButton />
      <style jsx global>{`
        .farcaster-login-btn button {
          width: 100%;
          max-width: 320px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
        }
        .farcaster-login-btn button:hover {
          transform: scale(1.02);
          box-shadow: 0 6px 25px rgba(139, 92, 246, 0.4);
        }
        .farcaster-login-btn button:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}

// Hook to access Neynar auth state
export function useFarcasterAuth() {
  const { user, isAuthenticated, logoutUser } = useNeynarContext()

  return {
    user: user ? {
      fid: user.fid,
      username: user.username || '',
      displayName: user.display_name || user.username || '',
      pfpUrl: user.pfp_url || '',
      signerUuid: user.signer_uuid || '',
    } : null,
    isAuthenticated,
    logout: logoutUser,
  }
}
