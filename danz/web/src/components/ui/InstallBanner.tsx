'use client'

import { useInstallPrompt } from '@/src/hooks/useInstallPrompt'
import { FiDownload, FiPlusSquare, FiShare, FiX } from 'react-icons/fi'

export default function InstallBanner() {
  const { isInstallable, isInstalled, isIOS, promptInstall, dismissBanner, showBanner } =
    useInstallPrompt()

  // Don't show if already installed or banner is hidden
  if (isInstalled || !showBanner || !isInstallable) {
    return null
  }

  const handleInstall = async () => {
    if (isIOS) {
      // For iOS, we can't auto-prompt, so just keep banner visible
      // The instructions are shown in the banner
      return
    }
    await promptInstall()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 lg:hidden">
      <div className="bg-bg-secondary border border-neon-purple/30 rounded-2xl shadow-xl shadow-neon-purple/20 overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-neon-purple to-neon-pink" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* App Icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">D</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-text-primary font-bold text-sm">Add DANZ to Home Screen</h3>
              {isIOS ? (
                <p className="text-text-secondary text-xs mt-1">
                  Tap <FiShare className="inline text-neon-purple" size={12} /> then{' '}
                  <span className="text-text-primary">"Add to Home Screen"</span>
                  <FiPlusSquare className="inline text-neon-purple ml-1" size={12} />
                </p>
              ) : (
                <p className="text-text-secondary text-xs mt-1">
                  Install for quick access and a better experience
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={dismissBanner}
              className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Dismiss"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Action buttons */}
          {!isIOS && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={dismissBanner}
                className="flex-1 py-2.5 text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2.5 bg-gradient-to-r from-neon-purple to-neon-pink text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <FiDownload size={16} />
                Install
              </button>
            </div>
          )}

          {/* iOS specific action */}
          {isIOS && (
            <button
              onClick={dismissBanner}
              className="w-full mt-3 py-2.5 text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
