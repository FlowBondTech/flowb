/**
 * Privy SDK Agent
 * Handles all Privy authentication and user management for DANZ NOW
 */

import { supabase } from '../utils/supabase'

class PrivyAgent {
  constructor() {
    this.user = null
    this.session = null
    this.authListeners = new Set()
    this.profileCache = null
  }

  /**
   * Initialize Privy agent with current user
   */
  init(privyUser) {
    this.user = privyUser
    this.syncUserData()
    return this
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.user
  }

  /**
   * Get user email
   */
  getUserEmail() {
    if (!this.user) return null
    
    // Try different email sources in Privy user object
    return this.user.email?.address || 
           this.user.google?.email || 
           this.user.twitter?.email ||
           this.user.discord?.email ||
           null
  }

  /**
   * Get user wallet address
   */
  getWalletAddress() {
    if (!this.user) return null
    
    // Get embedded wallet or linked wallet
    return this.user.wallet?.address || 
           this.user.linkedAccounts?.find(acc => acc.type === 'wallet')?.address ||
           null
  }

  /**
   * Get user display name
   */
  getDisplayName() {
    if (!this.user) return 'Anonymous'
    
    // Try different name sources
    return this.user.google?.name ||
           this.user.twitter?.username ||
           this.user.discord?.username ||
           this.user.farcaster?.displayName ||
           this.getUserEmail()?.split('@')[0] ||
           'User'
  }

  /**
   * Get user ID
   */
  getUserId() {
    return this.user?.id || null
  }

  /**
   * Get auth provider
   */
  getAuthProvider() {
    if (!this.user) return null
    
    if (this.user.google) return 'google'
    if (this.user.twitter) return 'twitter'
    if (this.user.discord) return 'discord'
    if (this.user.farcaster) return 'farcaster'
    if (this.user.wallet) return 'wallet'
    if (this.user.email) return 'email'
    
    return 'unknown'
  }

  /**
   * Sync user data to localStorage
   */
  syncUserData() {
    if (!this.user) {
      this.clearUserData()
      return
    }

    const userData = {
      id: this.getUserId(),
      email: this.getUserEmail(),
      name: this.getDisplayName(),
      wallet: this.getWalletAddress(),
      provider: this.getAuthProvider(),
      timestamp: Date.now()
    }

    // Store in localStorage
    localStorage.setItem('userId', userData.id)
    localStorage.setItem('userEmail', userData.email || '')
    localStorage.setItem('userName', userData.name)
    localStorage.setItem('userWallet', userData.wallet || '')
    localStorage.setItem('authProvider', userData.provider)
    localStorage.setItem('userData', JSON.stringify(userData))

    return userData
  }

  /**
   * Clear user data from localStorage
   */
  clearUserData() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userWallet')
    localStorage.removeItem('authProvider')
    localStorage.removeItem('userData')
    this.profileCache = null
  }

  /**
   * Save user profile to Supabase
   */
  async saveUserProfile(additionalData = {}) {
    if (!this.user) {
      throw new Error('No authenticated user')
    }

    const profile = {
      id: this.getUserId(),
      email: this.getUserEmail(),
      name: this.getDisplayName(),
      wallet_address: this.getWalletAddress(),
      auth_provider: this.getAuthProvider(),
      avatar_url: this.user.google?.picture || null,
      metadata: {
        ...additionalData,
        lastLogin: new Date().toISOString()
      }
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(profile, {
          onConflict: 'id'
        })
        .select()
        .single()

      if (error) throw error

      this.profileCache = data
      console.log('User profile saved:', data)
      return data
    } catch (error) {
      console.error('Error saving user profile:', error)
      
      // If table doesn't exist, still return profile data
      if (error.code === '42P01') {
        console.warn('User profiles table not yet created')
        return profile
      }
      
      throw error
    }
  }

  /**
   * Get user profile from Supabase
   */
  async getUserProfile(forceRefresh = false) {
    if (!this.user) return null
    
    // Return cached profile if available
    if (!forceRefresh && this.profileCache) {
      return this.profileCache
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this.getUserId())
        .single()

      if (error) throw error

      this.profileCache = data
      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      
      // Return basic profile if database fetch fails
      return {
        id: this.getUserId(),
        email: this.getUserEmail(),
        name: this.getDisplayName(),
        wallet_address: this.getWalletAddress()
      }
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding() {
    const profile = await this.getUserProfile()
    return profile?.onboarding_completed || false
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(onboardingData = {}) {
    if (!this.user) {
      throw new Error('No authenticated user')
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          onboarding_completed: true,
          onboarding_data: onboardingData,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('id', this.getUserId())
        .select()
        .single()

      if (error) throw error

      this.profileCache = data
      return data
    } catch (error) {
      console.error('Error updating onboarding status:', error)
      throw error
    }
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory() {
    if (!this.user) return []

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', this.getUserId())
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching purchase history:', error)
      return []
    }
  }

  /**
   * Get user's active subscriptions
   */
  async getActiveSubscriptions() {
    if (!this.user) return []

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', this.getUserId())
        .eq('status', 'active')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      return []
    }
  }

  /**
   * Check if user has access to premium features
   */
  async hasPremiumAccess() {
    const subscriptions = await this.getActiveSubscriptions()
    return subscriptions.some(sub => 
      sub.product_id === 'prod_danz_app_premium' && 
      sub.status === 'active'
    )
  }

  /**
   * Check if user has device reservation
   */
  async hasDeviceReservation() {
    if (!this.user) return false

    try {
      const { data, error } = await supabase
        .from('device_reservations')
        .select('id')
        .eq('email', this.getUserEmail())
        .single()

      return !!data
    } catch (error) {
      return false
    }
  }

  /**
   * Handle login success
   */
  async handleLoginSuccess(privyUser) {
    this.init(privyUser)
    
    // Save/update user profile
    await this.saveUserProfile()
    
    // Check for pending actions
    const pendingReservation = sessionStorage.getItem('pendingReservation')
    const pendingPurchase = sessionStorage.getItem('pendingPurchase')
    
    // Notify listeners
    this.notifyAuthListeners('login', this.user)
    
    return {
      user: this.user,
      pendingReservation: pendingReservation ? JSON.parse(pendingReservation) : null,
      pendingPurchase: pendingPurchase ? JSON.parse(pendingPurchase) : null
    }
  }

  /**
   * Handle logout
   */
  handleLogout() {
    this.user = null
    this.clearUserData()
    this.notifyAuthListeners('logout', null)
  }

  /**
   * Add auth state listener
   */
  onAuthStateChange(callback) {
    this.authListeners.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.authListeners.delete(callback)
    }
  }

  /**
   * Notify auth listeners
   */
  notifyAuthListeners(event, data) {
    this.authListeners.forEach(listener => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('Auth listener error:', error)
      }
    })
  }

  /**
   * Request additional scopes
   */
  async requestAdditionalScopes(scopes = []) {
    // This would trigger Privy to request additional permissions
    console.log('Requesting additional scopes:', scopes)
    return true
  }

  /**
   * Link additional account
   */
  async linkAccount(provider) {
    console.log('Linking account:', provider)
    // This would trigger Privy's account linking flow
    return true
  }

  /**
   * Get social share data
   */
  getSocialShareData() {
    return {
      twitter: this.user?.twitter?.username,
      farcaster: this.user?.farcaster?.fid,
      hasWallet: !!this.getWalletAddress()
    }
  }
}

// Export singleton instance
const privyAgent = new PrivyAgent()
export default privyAgent