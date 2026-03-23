// Product configuration for DANZ NOW
// Update these with your actual Stripe price IDs once created

export const products = [
  {
    id: 'flowbond-device',
    name: 'FlowBond Device',
    description: 'Advanced motion tracking wearable for precision dance analytics',
    category: 'device',
    basePrice: 99.00,
    currency: 'USD',
    paymentOptions: [
      {
        id: 'device-only',
        type: 'one-time',
        price: 99.00,
        stripePriceId: 'price_1RxztWPhVlDr0T8WrReOpFGD', // Actual Stripe price ID
        label: 'Device Only',
        description: 'FlowBond Device at 33% off'
      },
      {
        id: 'device-plus-premium',
        type: 'one-time',
        price: 149.00,
        stripePriceId: 'price_1Rxzv1PhVlDr0T8WRfgpdELM', // Actual Stripe price ID
        label: 'Device + 1 Year Premium',
        description: 'Best value package',
        badge: 'MOST POPULAR'
      }
    ],
    features: [
      'Professional-grade motion sensors',
      'Real-time movement tracking',
      '12-hour battery life',
      'Water-resistant design',
      'Bluetooth 5.0 connectivity',
      'Haptic feedback for coaching',
      'RGB LED status indicators',
      'Includes charging case'
    ],
    recommended: true,
    inStock: true
  },
  {
    id: 'flow-subscription',
    name: 'Flow Subscription',
    description: 'Subscribe to the FlowBond ecosystem',
    category: 'software',
    basePrice: 9.90,
    currency: 'USD',
    paymentOptions: [
      {
        id: 'flow-monthly',
        type: 'subscription',
        price: 9.90,
        stripePriceId: 'price_1RxzwvPhVlDr0T8W5dvKNRe7', // Actual Stripe price ID
        label: '$9.90/month',
        description: 'Monthly subscription'
      },
      {
        id: 'flow-yearly',
        type: 'subscription',
        price: 77.00,
        stripePriceId: 'price_1RxzxXPhVlDr0T8WWrZOactu', // Actual Stripe price ID
        label: '$77/year',
        description: 'Save $42 with annual billing',
        badge: 'BEST VALUE'
      }
    ],
    features: [
      'Unlimited dance sessions',
      'AI-powered movement analysis',
      'Earn $DANZ tokens daily',
      'Access to all dance challenges',
      'Premium event invitations',
      'Advanced analytics dashboard',
      'Priority customer support',
      'Early access to new features'
    ],
    recommended: false,
    requiresDevice: false
  }
]

// Stripe configuration
export const stripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  successUrl: `${window.location.origin}/purchase/success`,
  cancelUrl: `${window.location.origin}/purchase/cancel`
}