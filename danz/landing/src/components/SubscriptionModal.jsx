import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { submitEmailSignup } from '../api/signup'

function SubscriptionModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await submitEmailSignup(email)
      
      if (result.success) {
        setIsSuccess(true)
        setTimeout(() => {
          onClose()
          setEmail('')
          setIsSuccess(false)
        }, 2000)
      } else {
        setError(result.message || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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

                  <form onSubmit={handleSubmit} className="subscription-form">
                    <div className="form-group">
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        className="email-input"
                        autoFocus
                      />
                      <motion.button 
                        type="submit" 
                        className="submit-btn"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isSubmitting ? (
                          <span className="loading">Subscribing...</span>
                        ) : (
                          'Subscribe Now'
                        )}
                      </motion.button>
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
                  </form>

                  <p className="modal-footer">
                    No spam, just launch updates and exclusive perks 💃
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

export default SubscriptionModal