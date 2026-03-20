/**
 * SessionProvider Component
 * Provides session context and management to the entire app
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSession } from '../hooks/useSession'
import sessionManager from '../utils/SessionManager'

// Create context
const SessionContext = createContext(null)

// Export hook to use session context
export function useSessionContext() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider')
  }
  return context
}

// Session Provider Component
export default function SessionProvider({ children }) {
  const session = useSession()
  const [showExpiryWarning, setShowExpiryWarning] = useState(false)
  const [showInactivityWarning, setShowInactivityWarning] = useState(false)

  // Monitor session expiry
  useEffect(() => {
    if (!session.sessionInfo) return

    const { timeRemaining, inactiveTime } = session.sessionInfo
    
    // Show expiry warning when less than 5 minutes remaining
    if (timeRemaining > 0 && timeRemaining < 5 * 60 * 1000) {
      setShowExpiryWarning(true)
    } else {
      setShowExpiryWarning(false)
    }
    
    // Show inactivity warning after 10 minutes
    if (inactiveTime > 10 * 60 * 1000) {
      setShowInactivityWarning(true)
    } else {
      setShowInactivityWarning(false)
    }
  }, [session.sessionInfo])

  // Handle session refresh
  const handleRefresh = async () => {
    try {
      await session.refreshSession()
      setShowExpiryWarning(false)
      setShowInactivityWarning(false)
    } catch (error) {
      console.error('Failed to refresh session:', error)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await session.logout()
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  // Session context value
  const contextValue = {
    ...session,
    showExpiryWarning,
    showInactivityWarning,
    handleRefresh,
    handleLogout
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
      
      {/* Session Expiry Warning Modal */}
      {showExpiryWarning && (
        <SessionWarningModal
          type="expiry"
          timeRemaining={session.sessionInfo?.timeRemaining}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
      )}
      
      {/* Inactivity Warning Modal */}
      {showInactivityWarning && (
        <SessionWarningModal
          type="inactivity"
          inactiveTime={session.sessionInfo?.inactiveTime}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
      )}
    </SessionContext.Provider>
  )
}

// Session Warning Modal Component
function SessionWarningModal({ type, timeRemaining, inactiveTime, onRefresh, onLogout }) {
  const [countdown, setCountdown] = useState('')
  
  useEffect(() => {
    if (type === 'expiry' && timeRemaining) {
      const updateCountdown = () => {
        const minutes = Math.floor(timeRemaining / 60000)
        const seconds = Math.floor((timeRemaining % 60000) / 1000)
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
      
      updateCountdown()
      const interval = setInterval(updateCountdown, 1000)
      
      return () => clearInterval(interval)
    }
  }, [type, timeRemaining])

  const getMessage = () => {
    if (type === 'expiry') {
      return {
        title: 'Session Expiring Soon',
        message: `Your session will expire in ${countdown}. Would you like to continue?`,
        icon: '⏱️'
      }
    } else {
      const minutes = Math.floor((inactiveTime || 0) / 60000)
      return {
        title: 'Are You Still There?',
        message: `You've been inactive for ${minutes} minutes. Would you like to continue your session?`,
        icon: '💤'
      }
    }
  }

  const { title, message, icon } = getMessage()

  return (
    <div className="session-warning-overlay">
      <div className="session-warning-modal">
        <div className="session-warning-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="session-warning-actions">
          <button 
            className="btn btn-primary"
            onClick={onRefresh}
          >
            Continue Session
          </button>
          <button 
            className="btn btn-secondary"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

// Session Status Indicator Component
export function SessionStatusIndicator() {
  const { sessionStatus, sessionInfo, isAuthenticated } = useSessionContext()
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    if (!sessionInfo || !isAuthenticated) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const { timeRemaining } = sessionInfo
      
      if (timeRemaining <= 0) {
        setCountdown(null)
      } else if (timeRemaining < 5 * 60 * 1000) {
        // Show countdown when less than 5 minutes
        const minutes = Math.floor(timeRemaining / 60000)
        const seconds = Math.floor((timeRemaining % 60000) / 1000)
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setCountdown(null)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [sessionInfo, isAuthenticated])

  if (!isAuthenticated) return null

  const getStatusColor = () => {
    switch (sessionStatus) {
      case 'active': return '#00ff00'
      case 'expiring_soon': return '#ffaa00'
      case 'inactive': return '#ff6600'
      case 'expired': return '#ff0000'
      default: return '#888888'
    }
  }

  const getStatusText = () => {
    if (countdown) return `Session expires in ${countdown}`
    
    switch (sessionStatus) {
      case 'active': return 'Session active'
      case 'inactive': return 'Session inactive'
      case 'expired': return 'Session expired'
      default: return ''
    }
  }

  return (
    <div className="session-status-indicator">
      <span 
        className="session-status-dot"
        style={{ backgroundColor: getStatusColor() }}
      />
      <span className="session-status-text">
        {getStatusText()}
      </span>
    </div>
  )
}