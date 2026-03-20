import dotenv from 'dotenv'

dotenv.config()

type Environment = 'local' | 'development' | 'production'

interface Config {
  env: Environment
  port: number
  privy: {
    appId: string
    appSecret: string
  }
  supabase: {
    url: string
    secretKey: string
    s3: {
      endpoint: string
      region: string
      bucketName: string
      accessKeyId: string
      secretAccessKey: string
    }
  }
  stripe: {
    publishableKey: string
    secretKey: string
    productId: string
    monthlyPriceId?: string
    yearlyPriceId?: string
    webhookSecret?: string
    ethdenverStarterPriceId?: string
    ethdenverGrowthPriceId?: string
    ethdenverHeadlinerPriceId?: string
    ethdenverEcosystemPriceId?: string
  }
  cors: {
    origins: string[]
  }
  clientUrl: string
}

const env = (process.env.NODE_ENV || 'development') as Environment

export const config: Config = {
  env,
  port: parseInt(process.env.PORT || '8080', 10),
  privy: {
    appId: process.env.PRIVY_APP_ID || '',
    appSecret: process.env.PRIVY_APP_SECRET || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || '',
    s3: {
      endpoint: process.env.SUPABASE_S3_ENDPOINT || '',
      region: process.env.SUPABASE_S3_REGION || '',
      bucketName: process.env.SUPABASE_BUCKET_NAME || '',
      accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY || '',
    },
  },
  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    productId: process.env.STRIPE_PRODUCT_ID || '',
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
    yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    ethdenverStarterPriceId: process.env.STRIPE_ETHDENVER_STARTER_PRICE_ID,
    ethdenverGrowthPriceId: process.env.STRIPE_ETHDENVER_GROWTH_PRICE_ID,
    ethdenverHeadlinerPriceId: process.env.STRIPE_ETHDENVER_HEADLINER_PRICE_ID,
    ethdenverEcosystemPriceId: process.env.STRIPE_ETHDENVER_ECOSYSTEM_PRICE_ID,
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8081'],
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
}

export const validateConfig = () => {
  const requiredVars = ['PRIVY_APP_ID', 'PRIVY_APP_SECRET', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY']

  const missing = requiredVars.filter(varName => !process.env[varName])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
