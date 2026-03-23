declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL?: string
    NEXT_PUBLIC_SUPABASE_URL?: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string
    NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID?: string
    NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID?: string
  }
}
