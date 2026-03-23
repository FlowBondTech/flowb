import { supabase } from '@/src/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface CheckoutSessionResponse {
  url: string
  sessionId: string
}

export interface PortalSessionResponse {
  url: string
}

export interface ClaimTokenVerification {
  valid: boolean
  tierId?: string
  tierName?: string
  amountUsd?: number
  flowAmount?: number
  error?: string
}

export interface ClaimPurchaseResponse {
  success: boolean
  tierId: string
  tierName: string
  flowAmount: number
}

export const stripeService = {
  async createCheckoutSession(
    priceId: string,
    plan: 'monthly' | 'yearly',
  ): Promise<CheckoutSessionResponse> {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    console.log('api_url', API_URL)

    console.log('plan', plan)

    console.log('priceId', priceId)

    const response = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ priceId, plan }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create checkout session')
    }

    return response.json()
  },

  async createSponsorCheckoutSession(
    tierId: string,
  ): Promise<CheckoutSessionResponse> {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const response = await fetch(`${API_URL}/api/stripe/create-sponsor-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tierId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create sponsor checkout session')
    }

    return response.json()
  },

  async createGuestSponsorCheckoutSession(
    tierId: string,
  ): Promise<CheckoutSessionResponse> {
    const response = await fetch(`${API_URL}/api/stripe/create-sponsor-checkout-guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tierId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create guest checkout session')
    }

    return response.json()
  },

  async verifyClaimToken(token: string): Promise<ClaimTokenVerification> {
    const response = await fetch(`${API_URL}/api/stripe/verify-claim-token/${token}`)

    if (!response.ok) {
      return { valid: false, error: 'Verification request failed' }
    }

    return response.json()
  },

  async claimSponsorPurchase(claimToken: string): Promise<ClaimPurchaseResponse> {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const response = await fetch(`${API_URL}/api/stripe/claim-sponsor-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ claimToken }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to claim purchase')
    }

    return response.json()
  },

  async createPortalSession(): Promise<PortalSessionResponse> {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const response = await fetch(`${API_URL}/api/stripe/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create portal session')
    }

    return response.json()
  },
}

export const STRIPE_PRICE_IDS = {
  MONTHLY: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '',
  YEARLY: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || '',
}
