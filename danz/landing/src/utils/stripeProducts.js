import { loadStripe } from '@stripe/stripe-js'
import { stripeConfig } from '../config/stripe'

// Initialize Stripe
const stripePromise = loadStripe(stripeConfig.publishableKey)

/**
 * Fetch products and prices from Stripe
 * Note: This requires a backend endpoint that uses the Stripe Secret Key
 * For now, we'll use a mock function that you can replace with an API call
 */
export async function fetchStripeProducts() {
  try {
    // In production, this would be an API call to your backend:
    // const response = await fetch('/api/stripe-products')
    // const data = await response.json()
    // return data
    
    // For testing, we'll return mock data matching Stripe's structure
    // Replace this with actual API call once backend is set up
    console.log('Fetching Stripe products...')
    
    // Mock response - replace with actual API call
    return {
      products: [
        {
          id: 'prod_flowbond_device',
          name: 'FlowBond Device',
          description: 'DANZ NOW movement tracking bracelet',
          images: [],
          metadata: {
            category: 'hardware',
            featured: 'true'
          },
          prices: [
            {
              id: 'price_device_onetime',
              unit_amount: 19999, // $199.99 in cents
              currency: 'usd',
              type: 'one_time',
              recurring: null,
              nickname: 'One-time Purchase'
            },
            {
              id: 'price_device_monthly',
              unit_amount: 1999, // $19.99 in cents
              currency: 'usd',
              type: 'recurring',
              recurring: {
                interval: 'month',
                interval_count: 1
              },
              nickname: 'Monthly Subscription'
            }
          ]
        },
        {
          id: 'prod_danz_app',
          name: 'DANZ NOW App Premium',
          description: 'Premium app features and rewards',
          images: [],
          metadata: {
            category: 'software',
            featured: 'false'
          },
          prices: [
            {
              id: 'price_app_monthly',
              unit_amount: 999, // $9.99 in cents
              currency: 'usd',
              type: 'recurring',
              recurring: {
                interval: 'month',
                interval_count: 1
              },
              nickname: 'Monthly'
            },
            {
              id: 'price_app_yearly',
              unit_amount: 9999, // $99.99 in cents
              currency: 'usd',
              type: 'recurring',
              recurring: {
                interval: 'year',
                interval_count: 1
              },
              nickname: 'Yearly',
              metadata: {
                badge: 'BEST VALUE'
              }
            }
          ]
        }
      ]
    }
  } catch (error) {
    console.error('Error fetching Stripe products:', error)
    throw error
  }
}

/**
 * Transform Stripe products into our app's format
 */
export function transformStripeProducts(stripeData) {
  return stripeData.products.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.metadata?.category || 'general',
    featured: product.metadata?.featured === 'true',
    paymentOptions: product.prices.map(price => ({
      id: price.id,
      price: price.unit_amount / 100, // Convert from cents to dollars
      currency: price.currency,
      type: price.type === 'recurring' ? 'subscription' : 'one-time',
      interval: price.recurring?.interval,
      intervalCount: price.recurring?.interval_count,
      label: price.nickname || 
        (price.recurring 
          ? `$${price.unit_amount / 100}/${price.recurring.interval}`
          : `$${price.unit_amount / 100} one-time`),
      badge: price.metadata?.badge,
      stripePriceId: price.id
    }))
  }))
}

/**
 * Get products with caching
 */
let cachedProducts = null
let cacheTimestamp = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getStripeProducts(forceRefresh = false) {
  const now = Date.now()
  
  if (!forceRefresh && cachedProducts && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    return cachedProducts
  }
  
  try {
    const stripeData = await fetchStripeProducts()
    cachedProducts = transformStripeProducts(stripeData)
    cacheTimestamp = now
    return cachedProducts
  } catch (error) {
    // If fetch fails and we have cache, return cached data
    if (cachedProducts) {
      console.warn('Using cached products due to fetch error:', error)
      return cachedProducts
    }
    throw error
  }
}