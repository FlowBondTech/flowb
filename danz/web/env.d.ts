declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL?: string
    NEXT_PUBLIC_PRIVY_APP_ID?: string
    NEXT_PUBLIC_PRIVY_CLIENT_ID?: string
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string
    NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID?: string
    NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID?: string
  }
}
