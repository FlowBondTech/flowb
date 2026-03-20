/**
 * Local Stripe Test Server
 * Run this to test Stripe integration locally without deployment
 * Usage: node server/stripe-test-server.js
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Stripe from 'stripe'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') })

const app = express()
const PORT = process.env.SERVER_PORT || 3001

// Initialize Stripe with your test secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:3000'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

/**
 * GET /api/stripe-products
 * Fetch all products and prices from Stripe
 */
app.get('/api/stripe-products', async (req, res) => {
  try {
    console.log('📦 Fetching products from Stripe...')
    
    // Fetch products
    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price']
    })
    
    // Fetch prices
    const prices = await stripe.prices.list({
      active: true,
      limit: 100
    })
    
    // Group prices by product
    const pricesByProduct = {}
    prices.data.forEach(price => {
      const productId = typeof price.product === 'string' ? price.product : price.product?.id
      if (!pricesByProduct[productId]) {
        pricesByProduct[productId] = []
      }
      pricesByProduct[productId].push({
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        type: price.type,
        recurring: price.recurring,
        nickname: price.nickname,
        metadata: price.metadata
      })
    })
    
    // Format response
    const formattedProducts = products.data.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      images: product.images,
      metadata: product.metadata,
      prices: pricesByProduct[product.id] || []
    }))
    
    console.log(`✅ Found ${formattedProducts.length} products`)
    res.json({
      products: formattedProducts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error fetching products:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/create-checkout-session
 * Create a Stripe checkout session
 */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, quantity = 1, mode, customerEmail, metadata } = req.body
    
    console.log('🛒 Creating checkout session:', {
      priceId,
      mode,
      customerEmail,
      metadata
    })
    
    // Validate price ID exists
    try {
      const price = await stripe.prices.retrieve(priceId)
      console.log(`✅ Price found: ${price.nickname || price.id} - $${price.unit_amount / 100}`)
    } catch (err) {
      console.error('❌ Invalid price ID:', priceId)
      return res.status(400).json({ error: 'Invalid price ID' })
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      mode: mode || 'payment',
      success_url: `http://localhost:5173/reservation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/`,
      customer_email: customerEmail,
      metadata: metadata || {},
      billing_address_collection: 'required',
      shipping_address_collection: mode === 'payment' ? {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      } : undefined,
    })
    
    console.log(`✅ Checkout session created: ${session.id}`)
    console.log(`🔗 Checkout URL: ${session.url}`)
    
    res.json({ 
      sessionId: session.id, 
      url: session.url 
    })
  } catch (error) {
    console.error('❌ Error creating checkout session:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/stripe-webhook
 * Handle Stripe webhook events
 */
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret'
  
  let event
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }
  
  // Handle the event
  console.log(`📮 Received webhook: ${event.type}`)
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      console.log('✅ Payment successful!')
      console.log('   Customer:', session.customer_email)
      console.log('   Amount:', `$${session.amount_total / 100}`)
      console.log('   Session ID:', session.id)
      // Here you would update your database
      break
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object
      console.log('❌ Payment failed:', paymentIntent.id)
      break
    }
    
    case 'customer.subscription.created': {
      const subscription = event.data.object
      console.log('📅 Subscription created:', subscription.id)
      console.log('   Status:', subscription.status)
      break
    }
    
    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`)
  }
  
  res.json({ received: true })
})

/**
 * GET /api/test-connection
 * Test if server is running and Stripe is connected
 */
app.get('/api/test-connection', async (req, res) => {
  try {
    // Test Stripe connection
    const account = await stripe.accounts.retrieve()
    
    res.json({
      status: 'connected',
      server: 'running',
      stripe: {
        connected: true,
        accountId: account.id,
        testMode: !account.livemode
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.json({
      status: 'error',
      server: 'running',
      stripe: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/test-checkout
 * Create a test checkout session with a test price
 */
app.get('/api/test-checkout/:priceId', async (req, res) => {
  try {
    const { priceId } = req.params
    
    console.log('🧪 Creating test checkout for price:', priceId)
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:5173/test-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/test-cancel`,
    })
    
    res.redirect(303, session.url)
  } catch (error) {
    console.error('❌ Test checkout error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Start server
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('                 STRIPE TEST SERVER RUNNING                    ')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log()
  console.log(`🚀 Server running on: http://localhost:${PORT}`)
  console.log(`📦 Products endpoint: http://localhost:${PORT}/api/stripe-products`)
  console.log(`🛒 Checkout endpoint: http://localhost:${PORT}/api/create-checkout-session`)
  console.log(`📮 Webhook endpoint:  http://localhost:${PORT}/api/stripe-webhook`)
  console.log(`🧪 Test connection:   http://localhost:${PORT}/api/test-connection`)
  console.log()
  console.log('🔑 Using Stripe Test Mode')
  console.log('💳 Test card: 4242 4242 4242 4242')
  console.log()
  console.log('Press Ctrl+C to stop the server')
  console.log('═══════════════════════════════════════════════════════════════')
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down...')
  process.exit(0)
})