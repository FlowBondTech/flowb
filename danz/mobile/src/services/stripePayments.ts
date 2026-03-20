import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'
import { subscriptionTiers } from '../config/stripe'

// API base URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://danz-backend.fly.dev'

// Stripe payment service for mobile
export class StripePaymentService {
  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(
    priceId: string,
    plan: 'monthly' | 'yearly',
    authToken: string,
  ): Promise<{ url: string; sessionId: string }> {
    try {
      const response = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          priceId,
          plan,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      return { url: data.url, sessionId: data.sessionId }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw error
    }
  }

  /**
   * Create a billing portal session
   */
  static async createPortalSession(authToken: string): Promise<{ url: string }> {
    try {
      const response = await fetch(`${API_URL}/api/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      return { url: data.url }
    } catch (error) {
      console.error('Error creating portal session:', error)
      throw error
    }
  }

  /**
   * Open checkout in web browser
   */
  static async openCheckout(url: string): Promise<WebBrowser.WebBrowserResult> {
    try {
      const result = await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        dismissButtonStyle: 'close',
        showTitle: true,
        enableBarCollapsing: true,
      })
      return result
    } catch (error) {
      console.error('Error opening checkout:', error)
      throw error
    }
  }
}

// Custom hook for Stripe payments in components
export const useStripePayments = () => {
  // Platform-specific payment support
  const isApplePaySupported = Platform.OS === 'ios'
  const isGooglePaySupported = Platform.OS === 'android'

  /**
   * Subscribe to a plan using Stripe Checkout
   * Opens the Stripe checkout page in an in-app browser
   */
  const subscribe = async (
    plan: 'monthly' | 'yearly',
    authToken: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get price ID based on plan
      const tier = subscriptionTiers[plan]
      const priceId = tier?.priceId
      if (!priceId) {
        throw new Error(`No price ID configured for ${plan} subscription`)
      }

      // Create checkout session
      const { url } = await StripePaymentService.createCheckoutSession(priceId, plan, authToken)

      if (!url) {
        throw new Error('No checkout URL returned from server')
      }

      // Open checkout in browser
      const result = await StripePaymentService.openCheckout(url)

      // Check if user completed or cancelled
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, error: 'Checkout cancelled' }
      }

      // Payment was initiated - webhook will handle the subscription activation
      return { success: true }
    } catch (error) {
      console.error('Subscription error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscription failed',
      }
    }
  }

  /**
   * Open the Stripe customer portal to manage subscription
   */
  const manageSubscription = async (
    authToken: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { url } = await StripePaymentService.createPortalSession(authToken)

      if (!url) {
        throw new Error('No portal URL returned from server')
      }

      await StripePaymentService.openCheckout(url)
      return { success: true }
    } catch (error) {
      console.error('Portal error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open subscription portal',
      }
    }
  }

  return {
    subscribe,
    manageSubscription,
    isApplePaySupported,
    isGooglePaySupported,
  }
}
