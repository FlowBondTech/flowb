// API endpoint to fetch products and prices from Stripe
// This must run on your backend server (Vercel, Netlify Functions, etc.)

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch all active products
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
      limit: 100
    })
    
    // Fetch all active prices for these products
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100
    })
    
    // Group prices by product
    const productPriceMap = {}
    prices.data.forEach(price => {
      const productId = typeof price.product === 'string' ? price.product : price.product.id
      if (!productPriceMap[productId]) {
        productPriceMap[productId] = []
      }
      productPriceMap[productId].push({
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        type: price.type,
        recurring: price.recurring ? {
          interval: price.recurring.interval,
          interval_count: price.recurring.interval_count,
          trial_period_days: price.recurring.trial_period_days
        } : null,
        nickname: price.nickname,
        metadata: price.metadata
      })
    })
    
    // Format products with their prices
    const formattedProducts = products.data.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      images: product.images,
      metadata: product.metadata,
      prices: productPriceMap[product.id] || []
    }))
    
    // Sort products by metadata.order or name
    formattedProducts.sort((a, b) => {
      const orderA = parseInt(a.metadata?.order || '999')
      const orderB = parseInt(b.metadata?.order || '999')
      if (orderA !== orderB) return orderA - orderB
      return a.name.localeCompare(b.name)
    })
    
    res.status(200).json({
      products: formattedProducts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Stripe API error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch products',
      message: error.message 
    })
  }
}

// Configuration for Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}