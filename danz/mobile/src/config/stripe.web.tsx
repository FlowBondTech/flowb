import type React from 'react'

// Web-compatible Stripe configuration (no native SDK)
export const stripeConfig = {
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  merchantIdentifier: 'merchant.com.danz.app',
  urlScheme: 'danz',
  setReturnUrlSchemeOnAndroid: true,
}

// Stripe theme configuration to match DANZ branding
export const stripeTheme = {
  colors: {
    primary: '#FF6EC7',
    background: '#0a0a0f',
    componentBackground: '#1a0a1a',
    componentBorder: 'rgba(255, 110, 199, 0.2)',
    componentDivider: 'rgba(255, 110, 199, 0.1)',
    primaryText: '#ffffff',
    secondaryText: '#b8b8b8',
    componentText: '#ffffff',
    placeholderText: '#666666',
    icon: '#FF6EC7',
    error: '#ff6b6b',
    success: '#4caf50',
  },
  shapes: {
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryButton: {
    colors: {
      background: '#FF6EC7',
      text: '#ffffff',
      border: '#FF6EC7',
    },
  },
}

// No-op StripeProvider for web (Stripe.js handles web payments)
export const StripeProviderWrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

// Subscription tier configuration
export const subscriptionTiers = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: ['Join 3 events/month', 'Earn up to 100 DANZ/month', 'Community access'],
  },
  monthly: {
    name: 'Pro Monthly',
    price: 9.99,
    priceId: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'standard_monthly',
    features: [
      'Unlimited events',
      'Unlimited DANZ earning',
      '2x reward multiplier',
      'Priority booking',
      'Exclusive challenges',
      'Pro badge',
    ],
  },
  yearly: {
    name: 'Pro Yearly',
    price: 99,
    priceId: process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID || 'standard_yearly',
    features: [
      'Unlimited events',
      'Unlimited DANZ earning',
      '2x reward multiplier',
      'Priority booking',
      'Exclusive challenges',
      'Pro badge',
      '2 months free (save $20)',
    ],
  },
}
