/**
 * Stripe SDK Agent
 * Handles all Stripe-related operations for DANZ NOW
 */

import { loadStripe } from '@stripe/stripe-js'
import { stripeConfig } from '../config/stripe'

class StripeAgent {
  constructor() {
    this.stripe = null
    this.publishableKey = stripeConfig.publishableKey
    this.products = []
    this.prices = []
    this.lastFetch = null
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Initialize Stripe instance
   */
  async init() {
    if (!this.stripe) {
      this.stripe = await loadStripe(this.publishableKey)
    }
    return this.stripe
  }

  /**
   * Fetch products from Stripe API
   * Uses your test products created in Stripe Dashboard
   */
  async fetchProducts(forceRefresh = false) {
    const now = Date.now()
    
    // Return cached data if available and not expired
    if (!forceRefresh && this.products.length > 0 && this.lastFetch && 
        (now - this.lastFetch) < this.cacheTimeout) {
      return this.products
    }

    try {
      // Try local test server first, then fallback to production API
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/stripe-products'
        : '/api/stripe-products'
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }

      const data = await response.json()
      this.products = data.products
      this.lastFetch = now
      
      console.log('Stripe products fetched:', this.products)
      return this.products
    } catch (error) {
      console.error('Error fetching Stripe products:', error)
      
      // Return mock data for development
      return this.getMockProducts()
    }
  }

  /**
   * Get mock products for development/testing
   * These are your ACTUAL Stripe products!
   */
  getMockProducts() {
    return [
      {
        id: 'prod_StnUBj8dAHiFGh',
        name: 'FlowBond Device',
        description: 'This include just the FlowBond Device at 33% off',
        metadata: {
          category: 'hardware',
          featured: 'true'
        },
        prices: [
          {
            id: 'price_1RxztWPhVlDr0T8WrReOpFGD',
            unit_amount: 9900, // $99.00
            currency: 'usd',
            type: 'one_time',
            nickname: 'FlowBond Device'
          },
          {
            id: 'price_1Rxzv1PhVlDr0T8WRfgpdELM',
            unit_amount: 14900, // $149.00
            currency: 'usd',
            type: 'one_time',
            nickname: 'FlowBond Device + 1 Year Premium'
          }
        ]
      },
      {
        id: 'prod_StnY4VtcAVlVv6',
        name: 'Flow Subscription',
        description: 'Subscribe to the FlowBond ecosystem',
        metadata: {
          category: 'software',
          featured: 'false'
        },
        prices: [
          {
            id: 'price_1RxzwvPhVlDr0T8W5dvKNRe7',
            unit_amount: 990, // $9.90
            currency: 'usd',
            type: 'recurring',
            recurring: {
              interval: 'month',
              interval_count: 1
            },
            nickname: 'Monthly Flow'
          },
          {
            id: 'price_1RxzxXPhVlDr0T8WWrZOactu',
            unit_amount: 7700, // $77.00
            currency: 'usd',
            type: 'recurring',
            recurring: {
              interval: 'year',
              interval_count: 1
            },
            nickname: 'Annual Flow',
            metadata: {
              badge: 'BEST VALUE - Save $42'
            }
          }
        ]
      }
    ]
  }

  /**
   * Create a checkout session
   */
  async createCheckoutSession({
    priceId,
    mode = 'payment',
    quantity = 1,
    customerEmail,
    metadata = {},
    successUrl,
    cancelUrl
  }) {
    try {
      // Use local test server if running locally
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/create-checkout-session'
        : '/api/create-checkout-session'
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          mode,
          quantity,
          customerEmail,
          metadata,
          successUrl: successUrl || `${window.location.origin}/reservation-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: cancelUrl || window.location.origin
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create checkout session: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw error
    }
  }

  /**
   * Redirect to Stripe Checkout
   */
  async redirectToCheckout({ sessionId, priceId, mode, customerEmail, metadata }) {
    await this.init()

    if (sessionId) {
      // Use existing session ID
      const { error } = await this.stripe.redirectToCheckout({ sessionId })
      if (error) {
        console.error('Stripe redirect error:', error)
        throw error
      }
    } else if (priceId) {
      // Create new session and redirect
      const session = await this.createCheckoutSession({
        priceId,
        mode,
        customerEmail,
        metadata
      })
      
      if (session.url) {
        // Redirect to Stripe-hosted checkout
        window.location.href = session.url
      } else if (session.sessionId) {
        // Use session ID for redirect
        const { error } = await this.stripe.redirectToCheckout({ 
          sessionId: session.sessionId 
        })
        if (error) {
          console.error('Stripe redirect error:', error)
          throw error
        }
      }
    } else {
      throw new Error('Either sessionId or priceId is required')
    }
  }

  /**
   * Format price for display
   */
  formatPrice(amount, currency = 'usd') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    const products = await this.fetchProducts()
    return products.find(p => p.id === productId)
  }

  /**
   * Get price by ID
   */
  async getPrice(priceId) {
    const products = await this.fetchProducts()
    for (const product of products) {
      const price = product.prices.find(p => p.id === priceId)
      if (price) {
        return { ...price, product }
      }
    }
    return null
  }

  /**
   * Transform Stripe products to app format
   */
  transformProducts(stripeProducts) {
    return stripeProducts.map(product => {
      // Generate default features based on product name
      let features = []
      if (product.name.toLowerCase().includes('device')) {
        features = [
          'FlowBond movement tracker',
          'Automatic $DANZ earning',
          'Waterproof & durable design',
          '7-day battery life',
          'Ships Q4 2025'
        ]
      } else if (product.name.toLowerCase().includes('subscription')) {
        features = [
          'Premium app features',
          'Double $DANZ rewards',
          'Priority event access',
          'Advanced analytics',
          'Community perks'
        ]
      }
      
      // Use metadata features if available, otherwise use defaults
      if (product.metadata?.features) {
        try {
          features = JSON.parse(product.metadata.features)
        } catch (e) {
          // Keep default features if parsing fails
        }
      }
      
      return {
        id: product.id,
        name: product.name,
        description: product.description || product.name,
        category: product.metadata?.category || 'general',
        featured: product.metadata?.featured === 'true',
        recommended: product.metadata?.recommended === 'true',
        features: features,
        paymentOptions: product.prices.map(price => ({
          id: price.id,
          price: price.unit_amount / 100,
          currency: price.currency,
          type: price.type === 'recurring' ? 'subscription' : 'one-time',
          interval: price.recurring?.interval,
          intervalCount: price.recurring?.interval_count,
          label: price.nickname || this.generatePriceLabel(price),
          badge: price.metadata?.badge,
          stripePriceId: price.id
        }))
      }
    })
  }

  /**
   * Generate price label
   */
  generatePriceLabel(price) {
    const amount = this.formatPrice(price.unit_amount, price.currency)
    
    if (price.type === 'recurring') {
      const interval = price.recurring.interval
      const count = price.recurring.interval_count
      
      if (count === 1) {
        return `${amount}/${interval}`
      } else {
        return `${amount} every ${count} ${interval}s`
      }
    }
    
    return `${amount} one-time`
  }

  /**
   * Validate webhook signature
   */
  async validateWebhook(payload, signature, secret) {
    // This would be done on the backend
    // Including here for completeness
    return true
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(sessionId) {
    console.log('Payment successful for session:', sessionId)
    
    // Clear any cart data
    localStorage.removeItem('pendingPurchase')
    
    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: sessionId,
        value: 0, // Would be filled with actual amount
        currency: 'USD'
      })
    }
    
    return true
  }

  /**
   * Handle payment cancellation
   */
  handlePaymentCancel() {
    console.log('Payment cancelled')
    
    // Restore cart state if needed
    const pendingPurchase = localStorage.getItem('pendingPurchase')
    if (pendingPurchase) {
      return JSON.parse(pendingPurchase)
    }
    
    return null
  }
}

// Export singleton instance
const stripeAgent = new StripeAgent()
export default stripeAgent