import React, { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import UserOnboarding from './UserOnboarding'

function AuthManager({ children }) {
  const { ready, authenticated, user } = usePrivy()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingCompleted = localStorage.getItem('onboardingCompleted')
    const userEmail = localStorage.getItem('userEmail')
    
    if (onboardingCompleted === 'true' && userEmail) {
      setHasCompletedOnboarding(true)
    }
  }, [])

  useEffect(() => {
    if (ready && authenticated && user && !hasCompletedOnboarding) {
      // Check if we need to show onboarding
      const needsOnboarding = checkIfNeedsOnboarding(user)
      
      if (needsOnboarding) {
        // Small delay to ensure smooth transition
        setTimeout(() => {
          setShowOnboarding(true)
        }, 500)
      }
    }
  }, [ready, authenticated, user, hasCompletedOnboarding])

  const checkIfNeedsOnboarding = (user) => {
    // Check if user has email and name
    const hasEmail = user?.email?.address || user?.google?.email
    const hasName = user?.google?.name || user?.twitter?.name
    
    // If authenticated with wallet only, definitely needs onboarding
    if (user?.wallet && !hasEmail) {
      return true
    }
    
    // If missing name, needs onboarding
    if (!hasName) {
      return true
    }
    
    // Check localStorage to see if this specific user completed onboarding
    const storedPrivyId = localStorage.getItem('privyUserId')
    if (storedPrivyId !== user.id) {
      return true
    }
    
    return false
  }

  const handleOnboardingComplete = (userData) => {
    console.log('Onboarding completed:', userData)
    setHasCompletedOnboarding(true)
    setShowOnboarding(false)
    
    // Store user ID to track completion
    if (user?.id) {
      localStorage.setItem('privyUserId', user.id)
    }
  }

  const handleOnboardingClose = () => {
    // For now, we'll make onboarding mandatory
    // You could make it optional by uncommenting the next line
    // setShowOnboarding(false)
    
    // Keep the modal open - user must complete onboarding
    console.log('Onboarding is required to continue')
  }

  return (
    <>
      {children}
      <UserOnboarding 
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />
    </>
  )
}

export default AuthManager