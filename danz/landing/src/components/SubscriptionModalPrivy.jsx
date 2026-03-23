import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePrivy } from '@privy-io/react-auth'
import { supabase } from '../utils/supabase'

function SubscriptionModalPrivy({ isOpen, onClose }) {
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const { 
    ready,
    authenticated,
    user,
    login,
    logout,
    linkEmail,
    linkWallet,
  } = usePrivy()

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open')
      return () => {
        document.body.classList.remove('modal-open')
      }
    }
  }, [isOpen])

  // Handle successful authentication
  useEffect(() => {
    if (authenticated && user && isOpen) {
      handleSignupAfterAuth()
    }
  }, [authenticated, user, isOpen])

  const handleSignupAfterAuth = async () => {
    try {
      // Get user email from Privy user object
      const email = user?.email?.address || 
                   user?.google?.email || 
                   user?.twitter?.username || 
                   user?.discord?.username

      if (!email) {
        setError('Could not get email from authentication')
        return
      }

      // Store signup in database
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert([
          {
            email,
            name: user?.google?.name || user?.twitter?.name || email.split('@')[0],
            role: 'launch_signup',
            city: 'Launch Interest',
            // Store Privy user ID for future reference
            metadata: {
              privy_user_id: user.id,
              wallet_address: user?.wallet?.address,
              auth_method: Object.keys(user).find(key => 
                ['email', 'google', 'twitter', 'discord', 'wallet'].includes(key)
              )
            }
          }
        ], {
          onConflict: 'email',
          ignoreDuplicates: false
        })

      if (dbError && dbError.code !== '23505') {
        console.error('Database error:', dbError)
      }

      setIsSuccess(true)
      setTimeout(() => {
        onClose()
        setIsSuccess(false)
      }, 2000)
      
    } catch (err) {
      console.error('Signup error:', err)
      setError('Failed to complete signup. Please try again.')
    }
  }

  const handleLogin = () => {
    setError('')
    // This opens Privy's modal with multiple login options
    login()
  }

  const modalVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  }

  const contentVariants = {
    hidden: { scale: 0.8, opacity: 0, y: 50 },
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
      scale: 0.8, 
      opacity: 0, 
      y: 50,
      transition: { duration: 0.2 }
    }
  }

  if (!ready) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="subscription-modal-overlay"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div 
            className="subscription-modal"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="modal-content">
              {!isSuccess ? (
                <>
                  <motion.div 
                    className="modal-icon"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, 5, -5, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    🌍
                  </motion.div>
                  
                  <h2 className="modal-title gradient-text">Be First to Dance!</h2>
                  <p className="modal-description">
                    Get notified when DANZ launches in Bali, Austin, and Tulum in Q4 2025. Join the movement early and receive exclusive launch benefits.
                  </p>

                  {authenticated ? (
                    <div className="authenticated-content">
                      <p className="user-info">
                        Signed in as: <strong>{
                          user?.email?.address || 
                          user?.google?.email || 
                          user?.wallet?.address?.slice(0, 6) + '...' + user?.wallet?.address?.slice(-4) ||
                          'User'
                        }</strong>
                      </p>
                      
                      <div className="auth-actions">
                        {user?.wallet ? (
                          <p className="wallet-connected">
                            🔗 Wallet connected: {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
                          </p>
                        ) : (
                          <motion.button
                            className="btn btn-secondary"
                            onClick={linkWallet}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Connect Wallet
                          </motion.button>
                        )}
                        
                        {!user?.email && (
                          <motion.button
                            className="btn btn-secondary"
                            onClick={linkEmail}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Add Email
                          </motion.button>
                        )}
                      </div>

                      <motion.button
                        className="btn btn-primary"
                        onClick={() => {
                          logout()
                          onClose()
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Sign Out
                      </motion.button>
                    </div>
                  ) : (
                    <div className="login-section">
                      <motion.button 
                        className="submit-btn primary-login-btn"
                        onClick={handleLogin}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Sign Up / Login
                      </motion.button>

                      <div className="login-options">
                        <p className="options-label">Sign in with:</p>
                        <div className="options-list">
                          <span>📧 Email</span>
                          <span>🔍 Google</span>
                          <span>🐦 Twitter</span>
                          <span>💬 Discord</span>
                          <span>👛 Wallet</span>
                        </div>
                      </div>

                      {error && (
                        <motion.p 
                          className="error-message"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {error}
                        </motion.p>
                      )}
                    </div>
                  )}

                  <p className="modal-footer">
                    {authenticated 
                      ? '✨ You\'re part of the movement!' 
                      : 'No spam, just launch updates and exclusive perks 💃'}
                  </p>
                </>
              ) : (
                <motion.div 
                  className="success-content"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  <div className="success-icon">✨</div>
                  <h2 className="modal-title gradient-text">You're In!</h2>
                  <p className="success-message">
                    Welcome to the movement! Check your inbox for confirmation.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SubscriptionModalPrivy