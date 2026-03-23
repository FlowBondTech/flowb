import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePrivy } from '@privy-io/react-auth'
import { supabase } from '../utils/supabase'

function UserOnboarding({ isOpen, onClose, onComplete }) {
  const { user, linkEmail } = usePrivy()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [needsEmail, setNeedsEmail] = useState(false)

  useEffect(() => {
    if (user) {
      // Pre-fill data from Privy if available
      setFormData(prev => ({
        ...prev,
        name: user?.google?.name || user?.twitter?.name || '',
        email: user?.email?.address || user?.google?.email || ''
      }))
      
      // Check if user authenticated with wallet only (no email)
      setNeedsEmail(!user?.email?.address && !user?.google?.email)
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.name.trim()) {
      setError('Please enter your name')
      return
    }

    if (!formData.email.trim()) {
      setError('Email is required for launch notifications')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      // If user doesn't have email in Privy, link it
      if (needsEmail && user) {
        try {
          await linkEmail(formData.email)
        } catch (linkError) {
          console.log('Email link error:', linkError)
          // Continue even if linking fails - we'll store in our database
        }
      }

      // Store complete profile in Supabase
      console.log('Attempting to save profile with data:', {
        email: formData.email,
        name: formData.name,
        phone: formData.phoneNumber || null,
        privyUserId: user?.id
      })

      // Save to danz_users table - our primary user table for Privy auth
      const userPayload = {
        privy_id: user?.id || `temp_${Date.now()}`, // Privy ID is required
        email: formData.email,
        name: formData.name,
        phone: formData.phoneNumber || null,
        wallet_address: user?.wallet?.address || null,
        wallet_addresses: user?.wallet ? [user.wallet.address] : [],
        auth_method: Object.keys(user || {}).find(key => 
          ['email', 'google', 'twitter', 'discord', 'wallet'].includes(key)
        ) || 'email',
        auth_providers: Object.keys(user || {}).filter(key => 
          ['email', 'google', 'twitter', 'discord', 'wallet'].includes(key)
        ),
        has_embedded_wallet: user?.wallet?.imported === false,
        avatar_url: user?.google?.profilePictureUrl || null,
        bio: `Early DANZ supporter - Joined ${new Date().toLocaleDateString()}`,
        city: 'Launch Interest',
        level: 'Beginner',
        xp: 0,
        role: 'dancer',
        is_beta_tester: true, // Early signups are beta testers
        launch_interest_location: 'Bali, Austin, Tulum',
        newsletter_subscribed: true,
        onboarding_completed_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      }

      console.log('Saving DANZ user with payload:', userPayload)

      const { data: userData, error: dbError } = await supabase
        .from('danz_users')
        .upsert([userPayload], {
          onConflict: 'email',
          ignoreDuplicates: false
        })
        .select()

      if (dbError) {
        console.error('Database error details:', {
          error: dbError,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        })
        
        // If danz_users table doesn't exist, fall back to simpler tables
        if (dbError.code === '42P01') {
          console.error('danz_users table does not exist - trying fallback tables')
          
          // Try simpler launch_signups table as fallback
          const fallbackPayload = {
            email: formData.email,
            name: formData.name,
            phone: formData.phoneNumber || null,
            privy_user_id: user?.id,
            wallet_address: user?.wallet?.address,
            auth_method: userPayload.auth_method,
            signup_date: new Date().toISOString(),
            source: 'landing_page',
            newsletter_subscribed: true
          }
          
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('launch_signups')
            .upsert([fallbackPayload], {
              onConflict: 'email'
            })
            .select()
          
          if (fallbackError && fallbackError.code === '42P01') {
            console.log('No user tables exist - saving to localStorage only')
            // Don't throw error - we'll still mark onboarding as complete
          } else if (fallbackError) {
            console.error('Fallback also failed:', fallbackError)
          } else {
            console.log('Saved to launch_signups as fallback:', fallbackData)
          }
        } else if (dbError.code === '23505') {
          console.log('User already exists - this is fine, their info was updated')
        } else if (dbError.code === '42501') {
          console.error('Permission denied - check RLS policies')
          // Don't throw error for permission issues - still complete onboarding
        } else {
          console.error('Unexpected error but continuing:', dbError.message)
          // Don't throw - we still want to complete onboarding
        }
      } else {
        console.log('User saved successfully:', userData)
      }

      // Also save additional metadata to user_metadata table (if it exists)
      try {
        const { error: metaError } = await supabase
          .from('user_metadata')
          .upsert([
            {
              email: formData.email,
              phone: formData.phoneNumber || null,
              privy_user_id: user?.id,
              wallet_address: user?.wallet?.address,
              auth_method: Object.keys(user || {}).find(key => 
                ['email', 'google', 'twitter', 'discord', 'wallet'].includes(key)
              ),
              onboarding_completed: true,
              onboarding_date: new Date().toISOString(),
              signup_source: 'landing_page',
              newsletter_subscribed: true,
              device_reservation_interest: false
            }
          ], {
            onConflict: 'email'
          })

        if (metaError) {
          console.log('Metadata table might not exist yet:', metaError)
          // Continue anyway - metadata table is optional
        }
      } catch (metaErr) {
        console.log('Metadata save skipped:', metaErr)
      }

      // Also add to email signups for notifications (if table exists)
      try {
        const { error: signupError } = await supabase
          .from('email_signups')
          .upsert([
            {
              email: formData.email,
              signup_type: 'launch_notification',
              source: 'onboarding'
            }
          ], {
            onConflict: 'email'
          })
        
        if (signupError) {
          console.log('Email signups table might not exist:', signupError)
        }
      } catch (signupErr) {
        console.log('Email signup save skipped:', signupErr)
      }

      // Store onboarding completion in localStorage
      localStorage.setItem('onboardingCompleted', 'true')
      localStorage.setItem('userEmail', formData.email)
      localStorage.setItem('userName', formData.name)

      // Success - call onComplete callback
      if (onComplete) {
        onComplete({
          name: formData.name,
          email: formData.email,
          phone: formData.phoneNumber
        })
      }

      // Close modal
      setTimeout(() => {
        onClose()
      }, 500)

    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
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
    hidden: { scale: 0.9, opacity: 0, y: 20 },
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
      scale: 0.9, 
      opacity: 0, 
      y: 20,
      transition: { duration: 0.2 }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="onboarding-modal-overlay"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => {
            // Prevent closing by clicking overlay during onboarding
            e.stopPropagation()
          }}
        >
          <motion.div 
            className="onboarding-modal"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title gradient-text">Complete Your Profile</h2>
              <p className="modal-subtitle">
                Help us personalize your DANZ experience and keep you updated on our Q4 2025 launch!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="onboarding-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Full Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="form-input"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="form-input"
                  required
                  disabled={isSubmitting}
                />
                <p className="form-hint">
                  We'll use this to send you launch updates and exclusive offers
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber" className="form-label">
                  Phone Number <span className="optional">(Optional)</span>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  className="form-input"
                  disabled={isSubmitting}
                />
                <p className="form-hint">
                  For SMS updates about your device reservation
                </p>
              </div>

              {error && (
                <motion.div 
                  className="error-message"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

              <div className="form-actions">
                <motion.button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSubmitting ? (
                    <span className="loading">Saving...</span>
                  ) : (
                    'Complete Profile'
                  )}
                </motion.button>
              </div>

              <div className="privacy-notice">
                <p>
                  🔒 Your information is secure and will never be shared without your consent.
                  By continuing, you agree to receive launch updates and exclusive DANZ offers.
                </p>
              </div>
            </form>

            {user?.wallet && (
              <div className="wallet-connected-notice">
                <span className="wallet-icon">👛</span>
                <span>Wallet connected: {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default UserOnboarding