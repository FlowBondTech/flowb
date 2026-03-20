import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { motion } from 'framer-motion'
import { usePrivy } from '@privy-io/react-auth'

function PrivyLogin({ isOpen, onClose }) {
  const { login, ready, authenticated, connectWallet } = usePrivy()
  const [error, setError] = useState('')
  const [selectedMethod, setSelectedMethod] = useState(null)

  const handleLogin = async (method) => {
    setError('')
    setSelectedMethod(method)
    
    try {
      if (method === 'wallet') {
        // Use connectWallet for direct wallet connection
        await connectWallet()
      } else {
        // Use regular login for social/email
        await login()
      }
      // If successful, modal will close automatically via onboarding flow
    } catch (err) {
      // Check if user rejected or if it's an actual error
      if (err?.message?.includes('rejected') || err?.code === 4001) {
        // User canceled - just reset state, no error message
        setSelectedMethod(null)
      } else {
        // Actual error - show message
        setError('Connection failed. Please try again.')
        setSelectedMethod(null)
      }
    }
  }

  const modalVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  }

  const contentVariants = {
    hidden: { scale: 0.95, opacity: 0, y: 20 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      scale: 0.95, 
      opacity: 0, 
      y: 20,
      transition: { duration: 0.2 }
    }
  }

  if (!isOpen) return null

  // Use React Portal to render modal at document body level
  return ReactDOM.createPortal(
    <motion.div 
      className="privy-login-overlay"
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClose}
    >
      <motion.div 
        className="privy-login-modal"
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effects */}
        <div className="login-glow login-glow-1"></div>
        <div className="login-glow login-glow-2"></div>
        
        {/* Header */}
        <div className="login-header">
          <div className="login-logo-container">
            <motion.div
              className="login-logo"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <span style={{ fontSize: '32px' }}>✨</span>
            </motion.div>
          </div>
          <h2 className="login-title">Welcome to DANZ NOW</h2>
          <p className="login-subtitle">Connect to start earning through movement</p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div 
            className="login-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </motion.div>
        )}

        {/* Login Options */}
        <div className="login-options">
          {/* Web3 Section */}
          <div className="login-section">
            <div className="login-section-header">
              <span className="login-section-title">Web3 Login</span>
              <span className="login-badge">Recommended</span>
            </div>
            
            <motion.button
              className="login-button login-button-primary"
              onClick={() => handleLogin('wallet')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!ready || selectedMethod !== null}
            >
              <span>👛</span>
              <span>{selectedMethod === 'wallet' ? 'Connecting...' : 'Connect Wallet'}</span>
              {selectedMethod !== 'wallet' && <span className="ml-auto">→</span>}
              {selectedMethod === 'wallet' && (
                <motion.div 
                  className="login-button-loading"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              )}
            </motion.button>
          </div>

          {/* Divider */}
          <div className="login-divider">
            <span>or continue with</span>
          </div>

          {/* Social Login Section */}
          <div className="login-section">
            <div className="login-section-header">
              <span className="login-section-title">Social Login</span>
            </div>
            
            <div className="login-social-grid">
              <motion.button
                className="login-button login-button-social"
                onClick={() => handleLogin('email')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!ready || selectedMethod !== null}
              >
                <span>📧</span>
                <span>{selectedMethod === 'email' ? '...' : 'Email'}</span>
              </motion.button>

              <motion.button
                className="login-button login-button-social"
                onClick={() => handleLogin('google')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!ready || selectedMethod !== null}
              >
                <span>🌐</span>
                <span>{selectedMethod === 'google' ? '...' : 'Google'}</span>
              </motion.button>

              <motion.button
                className="login-button login-button-social"
                onClick={() => handleLogin('twitter')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!ready || selectedMethod !== null}
              >
                <span>𝕏</span>
                <span>{selectedMethod === 'twitter' ? '...' : 'Twitter'}</span>
              </motion.button>

              <motion.button
                className="login-button login-button-social"
                onClick={() => handleLogin('discord')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!ready || selectedMethod !== null}
              >
                <span>💬</span>
                <span>{selectedMethod === 'discord' ? '...' : 'Discord'}</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p className="login-footer-text">
            🔒 Your information is secure and will never be shared
          </p>
          <p className="login-footer-text">
            By connecting, you agree to receive launch updates
          </p>
        </div>

        {/* Close Button */}
        <button
          className="login-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </motion.div>
    </motion.div>,
    document.body // Render at body level
  )
}

export default PrivyLogin