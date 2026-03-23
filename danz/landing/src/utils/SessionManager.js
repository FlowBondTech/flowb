/**
 * SessionManager - Advanced session management for DANZ NOW
 * Handles authentication state, persistence, multi-tab sync, and session lifecycle
 */

import privyAgent from '../agents/privy-agent'

class SessionManager {
  constructor() {
    this.session = null
    this.listeners = new Set()
    this.syncChannel = null
    this.refreshTimer = null
    this.inactivityTimer = null
    this.lastActivity = Date.now()
    
    // Configuration
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      inactivityTimeout: 15 * 60 * 1000, // 15 minutes
      storageKey: 'danz_session',
      syncChannelName: 'danz_session_sync'
    }
    
    this.init()
  }

  /**
   * Initialize session manager
   */
  init() {
    // Load existing session
    this.loadSession()
    
    // Set up multi-tab synchronization
    this.setupSync()
    
    // Set up activity tracking
    this.setupActivityTracking()
    
    // Set up periodic refresh
    this.setupRefreshTimer()
    
    // Listen for storage events
    window.addEventListener('storage', this.handleStorageChange.bind(this))
    
    // Clean up on page unload
    window.addEventListener('beforeunload', this.handleUnload.bind(this))
  }

  /**
   * Create new session
   */
  createSession(user, authToken = null) {
    const session = {
      id: this.generateSessionId(),
      userId: privyAgent.getUserId() || user?.id,
      email: privyAgent.getUserEmail() || user?.email,
      name: privyAgent.getDisplayName() || user?.name,
      wallet: privyAgent.getWalletAddress(),
      provider: privyAgent.getAuthProvider(),
      authToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionTimeout,
      lastActivity: Date.now(),
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`
      }
    }
    
    this.session = session
    this.saveSession()
    this.broadcastSession('create')
    this.notifyListeners('session_created', session)
    
    // Initialize refresh timer
    this.setupRefreshTimer()
    
    return session
  }

  /**
   * Load session from storage
   */
  loadSession() {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (!stored) return null
      
      const session = JSON.parse(stored)
      
      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        this.destroySession('expired')
        return null
      }
      
      this.session = session
      this.notifyListeners('session_restored', session)
      
      return session
    } catch (error) {
      console.error('Failed to load session:', error)
      return null
    }
  }

  /**
   * Save session to storage
   */
  saveSession() {
    if (!this.session) return
    
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.session))
      
      // Also save key session data separately for quick access
      localStorage.setItem('userId', this.session.userId || '')
      localStorage.setItem('userEmail', this.session.email || '')
      localStorage.setItem('userName', this.session.name || '')
      localStorage.setItem('sessionId', this.session.id)
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  /**
   * Refresh session
   */
  async refreshSession() {
    if (!this.session) return null
    
    // Check if session needs refresh
    const timeUntilExpiry = this.session.expiresAt - Date.now()
    if (timeUntilExpiry > this.config.refreshInterval) {
      return this.session
    }
    
    try {
      // Extend session
      this.session.expiresAt = Date.now() + this.config.sessionTimeout
      this.session.lastActivity = Date.now()
      
      // Refresh user profile if needed
      if (privyAgent.isAuthenticated()) {
        const profile = await privyAgent.getUserProfile(true)
        if (profile) {
          this.session.metadata.profile = profile
        }
      }
      
      this.saveSession()
      this.broadcastSession('refresh')
      this.notifyListeners('session_refreshed', this.session)
      
      return this.session
    } catch (error) {
      console.error('Failed to refresh session:', error)
      return this.session
    }
  }

  /**
   * Destroy session
   */
  destroySession(reason = 'logout') {
    if (!this.session) return
    
    const sessionId = this.session.id
    
    // Clear session
    this.session = null
    
    // Clear storage
    localStorage.removeItem(this.config.storageKey)
    localStorage.removeItem('sessionId')
    
    // Clear timers
    this.clearTimers()
    
    // Broadcast to other tabs
    this.broadcastSession('destroy', { reason })
    
    // Notify listeners
    this.notifyListeners('session_destroyed', { sessionId, reason })
    
    // Clear Privy data
    privyAgent.clearUserData()
  }

  /**
   * Set up multi-tab synchronization
   */
  setupSync() {
    try {
      // Use BroadcastChannel API if available
      if ('BroadcastChannel' in window) {
        this.syncChannel = new BroadcastChannel(this.config.syncChannelName)
        
        this.syncChannel.onmessage = (event) => {
          this.handleSyncMessage(event.data)
        }
      }
    } catch (error) {
      console.warn('BroadcastChannel not available:', error)
    }
  }

  /**
   * Broadcast session changes to other tabs
   */
  broadcastSession(action, data = null) {
    if (!this.syncChannel) return
    
    try {
      this.syncChannel.postMessage({
        action,
        session: this.session,
        data,
        timestamp: Date.now(),
        tabId: this.getTabId()
      })
    } catch (error) {
      console.error('Failed to broadcast session:', error)
    }
  }

  /**
   * Handle sync messages from other tabs
   */
  handleSyncMessage(message) {
    // Ignore messages from this tab
    if (message.tabId === this.getTabId()) return
    
    switch (message.action) {
      case 'create':
      case 'refresh':
        this.session = message.session
        this.saveSession()
        this.notifyListeners('session_synced', this.session)
        break
        
      case 'destroy':
        this.session = null
        this.notifyListeners('session_destroyed', message.data)
        break
        
      case 'activity':
        if (this.session) {
          this.session.lastActivity = message.data.timestamp
        }
        break
    }
  }

  /**
   * Set up activity tracking
   */
  setupActivityTracking() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity.bind(this), { passive: true })
    })
  }

  /**
   * Handle user activity
   */
  handleActivity() {
    const now = Date.now()
    
    // Throttle activity updates (max once per second)
    if (now - this.lastActivity < 1000) return
    
    this.lastActivity = now
    
    if (this.session) {
      this.session.lastActivity = now
      
      // Reset inactivity timer
      this.resetInactivityTimer()
      
      // Broadcast activity to other tabs
      this.broadcastSession('activity', { timestamp: now })
    }
  }

  /**
   * Set up refresh timer
   */
  setupRefreshTimer() {
    this.clearRefreshTimer()
    
    if (!this.session) return
    
    this.refreshTimer = setInterval(() => {
      this.refreshSession()
    }, this.config.refreshInterval)
  }

  /**
   * Clear refresh timer
   */
  clearRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Reset inactivity timer
   */
  resetInactivityTimer() {
    this.clearInactivityTimer()
    
    if (!this.session) return
    
    this.inactivityTimer = setTimeout(() => {
      this.handleInactivity()
    }, this.config.inactivityTimeout)
  }

  /**
   * Clear inactivity timer
   */
  clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }
  }

  /**
   * Handle inactivity
   */
  handleInactivity() {
    if (!this.session) return
    
    // Check if session should be destroyed
    const inactiveTime = Date.now() - this.session.lastActivity
    
    if (inactiveTime > this.config.inactivityTimeout) {
      this.notifyListeners('session_inactive', {
        inactiveTime,
        session: this.session
      })
      
      // Optionally destroy session on inactivity
      // this.destroySession('inactivity')
    }
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    this.clearRefreshTimer()
    this.clearInactivityTimer()
  }

  /**
   * Handle storage changes from other tabs
   */
  handleStorageChange(event) {
    if (event.key !== this.config.storageKey) return
    
    if (event.newValue) {
      // Session updated in another tab
      try {
        const session = JSON.parse(event.newValue)
        this.session = session
        this.notifyListeners('session_synced', session)
      } catch (error) {
        console.error('Failed to sync session:', error)
      }
    } else {
      // Session removed in another tab
      this.session = null
      this.notifyListeners('session_destroyed', { reason: 'external' })
    }
  }

  /**
   * Handle page unload
   */
  handleUnload() {
    // Save current session state
    if (this.session) {
      this.saveSession()
    }
    
    // Clean up
    this.clearTimers()
    
    if (this.syncChannel) {
      this.syncChannel.close()
    }
  }

  /**
   * Add session listener
   */
  addListener(callback) {
    this.listeners.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('Session listener error:', error)
      }
    })
  }

  /**
   * Get current session
   */
  getSession() {
    return this.session
  }

  /**
   * Check if session is valid
   */
  isValid() {
    if (!this.session) return false
    
    // Check expiration
    if (this.session.expiresAt < Date.now()) {
      this.destroySession('expired')
      return false
    }
    
    return true
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.isValid() && !!this.session.userId
  }

  /**
   * Get session info
   */
  getInfo() {
    if (!this.session) return null
    
    const now = Date.now()
    
    return {
      id: this.session.id,
      userId: this.session.userId,
      email: this.session.email,
      name: this.session.name,
      provider: this.session.provider,
      createdAt: this.session.createdAt,
      expiresAt: this.session.expiresAt,
      timeRemaining: Math.max(0, this.session.expiresAt - now),
      lastActivity: this.session.lastActivity,
      inactiveTime: now - this.session.lastActivity,
      isExpired: this.session.expiresAt < now,
      isActive: (now - this.session.lastActivity) < this.config.inactivityTimeout
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get unique tab ID
   */
  getTabId() {
    if (!this.tabId) {
      this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    return this.tabId
  }

  /**
   * Update session metadata
   */
  updateMetadata(metadata) {
    if (!this.session) return
    
    this.session.metadata = {
      ...this.session.metadata,
      ...metadata,
      updatedAt: Date.now()
    }
    
    this.saveSession()
    this.broadcastSession('update')
  }

  /**
   * Check if user has premium access
   */
  async hasPremiumAccess() {
    if (!this.isAuthenticated()) return false
    
    // Check cached value first
    if (this.session.metadata?.hasPremium !== undefined) {
      return this.session.metadata.hasPremium
    }
    
    // Fetch from API
    const hasPremium = await privyAgent.hasPremiumAccess()
    
    // Cache result
    this.updateMetadata({ hasPremium })
    
    return hasPremium
  }

  /**
   * Check if user has device reservation
   */
  async hasDeviceReservation() {
    if (!this.isAuthenticated()) return false
    
    // Check cached value first
    if (this.session.metadata?.hasDevice !== undefined) {
      return this.session.metadata.hasDevice
    }
    
    // Fetch from API
    const hasDevice = await privyAgent.hasDeviceReservation()
    
    // Cache result
    this.updateMetadata({ hasDevice })
    
    return hasDevice
  }
}

// Export singleton instance
const sessionManager = new SessionManager()
export default sessionManager