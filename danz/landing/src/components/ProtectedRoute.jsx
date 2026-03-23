/**
 * ProtectedRoute Component
 * Protects routes that require authentication or specific permissions
 */

import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSessionContext } from './SessionProvider'

// Main Protected Route Component
export default function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requirePremium = false,
  requireDevice = false,
  redirectTo = '/',
  fallback = null
}) {
  const location = useLocation()
  const { 
    isAuthenticated, 
    isLoading, 
    checkPremiumAccess, 
    checkDeviceReservation,
    sessionStatus 
  } = useSessionContext()
  
  const [isAuthorized, setIsAuthorized] = useState(null)
  const [isChecking, setIsChecking] = useState(true)
  const [redirectPath, setRedirectPath] = useState(null)

  useEffect(() => {
    const checkAuthorization = async () => {
      setIsChecking(true)
      
      try {
        // Check authentication
        if (requireAuth && !isAuthenticated) {
          // Store intended destination
          sessionStorage.setItem('redirectAfterLogin', location.pathname)
          setIsAuthorized(false)
          setRedirectPath(redirectTo)
          return
        }

        // Check session status
        if (isAuthenticated && sessionStatus === 'expired') {
          setIsAuthorized(false)
          setRedirectPath(redirectTo)
          return
        }

        // Check premium access if required
        if (requirePremium) {
          const hasPremium = await checkPremiumAccess()
          if (!hasPremium) {
            setIsAuthorized(false)
            setRedirectPath('/subscription')
            return
          }
        }

        // Check device reservation if required
        if (requireDevice) {
          const hasDevice = await checkDeviceReservation()
          if (!hasDevice) {
            setIsAuthorized(false)
            setRedirectPath('/device-reservation')
            return
          }
        }

        // All checks passed
        setIsAuthorized(true)
      } catch (error) {
        console.error('Authorization check failed:', error)
        setIsAuthorized(false)
        setRedirectPath(redirectTo)
      } finally {
        setIsChecking(false)
      }
    }

    if (!isLoading) {
      checkAuthorization()
    }
  }, [
    isLoading,
    isAuthenticated,
    sessionStatus,
    requireAuth,
    requirePremium,
    requireDevice,
    location.pathname,
    redirectTo,
    checkPremiumAccess,
    checkDeviceReservation
  ])

  // Show loading state
  if (isLoading || isChecking) {
    return fallback || <LoadingScreen />
  }

  // Redirect if not authorized
  if (isAuthorized === false && redirectPath) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />
  }

  // Render children if authorized
  if (isAuthorized === true) {
    return <>{children}</>
  }

  // Default fallback
  return fallback || <LoadingScreen />
}

// Premium-only Route Component
export function PremiumRoute({ children, fallback }) {
  return (
    <ProtectedRoute
      requireAuth={true}
      requirePremium={true}
      redirectTo="/subscription"
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  )
}

// Device Owner Route Component
export function DeviceOwnerRoute({ children, fallback }) {
  return (
    <ProtectedRoute
      requireAuth={true}
      requireDevice={true}
      redirectTo="/device-reservation"
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  )
}

// Guest-only Route Component (redirects if authenticated)
export function GuestRoute({ children, redirectTo = '/dashboard' }) {
  const { isAuthenticated, isLoading } = useSessionContext()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    // Get redirect path from session storage or use default
    const savedRedirect = sessionStorage.getItem('redirectAfterLogin')
    if (savedRedirect) {
      sessionStorage.removeItem('redirectAfterLogin')
      return <Navigate to={savedRedirect} replace />
    }
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

// Loading Screen Component
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p>Checking authorization...</p>
    </div>
  )
}

// Route Guard HOC
export function withRouteGuard(Component, guardOptions = {}) {
  return function GuardedComponent(props) {
    return (
      <ProtectedRoute {...guardOptions}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Custom hook for route protection
export function useRouteProtection(options = {}) {
  const { 
    requireAuth = true,
    requirePremium = false,
    requireDevice = false
  } = options

  const { 
    isAuthenticated, 
    checkPremiumAccess, 
    checkDeviceReservation 
  } = useSessionContext()
  
  const [isAuthorized, setIsAuthorized] = useState(null)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkAccess = async () => {
      setIsChecking(true)
      setError(null)
      
      try {
        // Check authentication
        if (requireAuth && !isAuthenticated) {
          setIsAuthorized(false)
          setError('Authentication required')
          return
        }

        // Check premium
        if (requirePremium) {
          const hasPremium = await checkPremiumAccess()
          if (!hasPremium) {
            setIsAuthorized(false)
            setError('Premium subscription required')
            return
          }
        }

        // Check device
        if (requireDevice) {
          const hasDevice = await checkDeviceReservation()
          if (!hasDevice) {
            setIsAuthorized(false)
            setError('Device reservation required')
            return
          }
        }

        setIsAuthorized(true)
      } catch (err) {
        console.error('Route protection check failed:', err)
        setIsAuthorized(false)
        setError(err.message || 'Authorization check failed')
      } finally {
        setIsChecking(false)
      }
    }

    checkAccess()
  }, [
    isAuthenticated,
    requireAuth,
    requirePremium,
    requireDevice,
    checkPremiumAccess,
    checkDeviceReservation
  ])

  return {
    isAuthorized,
    isChecking,
    error
  }
}