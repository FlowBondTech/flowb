import Stripe from 'stripe'
import { config } from './env.js'

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
})

export const STRIPE_CONFIG = {
  PRODUCT_ID: config.stripe.productId,
  PRICES: {
    MONTHLY: config.stripe.monthlyPriceId,
    YEARLY: config.stripe.yearlyPriceId,
  },
  SPONSOR_PRICES: {
    starter: config.stripe.ethdenverStarterPriceId,
    growth: config.stripe.ethdenverGrowthPriceId,
    headliner: config.stripe.ethdenverHeadlinerPriceId,
    ecosystem: config.stripe.ethdenverEcosystemPriceId,
  } as Record<string, string | undefined>,
  WEBHOOK_SECRET: config.stripe.webhookSecret,
  SUCCESS_URL: `${config.clientUrl}/dashboard/subscription?success=true`,
  CANCEL_URL: `${config.clientUrl}/dashboard/subscription?cancelled=true`,
  ETHDENVER_SUCCESS_URL: `${config.clientUrl}/ethdenver?sponsor_success=true`,
  ETHDENVER_CANCEL_URL: `${config.clientUrl}/ethdenver?sponsor_cancelled=true`,
  ETHDENVER_CLAIM_URL: `${config.clientUrl}/ethdenver/sponsor-claim`,
}

export const SPONSOR_TIER_MAP: Record<string, { tier: string; flowAmount: number; name: string }> = {
  starter: { tier: 'silver', flowAmount: 500, name: 'Starter' },
  growth: { tier: 'gold', flowAmount: 2000, name: 'Growth' },
  headliner: { tier: 'platinum', flowAmount: 5000, name: 'Headliner' },
  ecosystem: { tier: 'diamond', flowAmount: 10000, name: 'Ecosystem' },
}
