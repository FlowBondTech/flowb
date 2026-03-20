#!/usr/bin/env node

/**
 * Script to fetch products and prices from your Stripe account
 * Run: node scripts/fetch-stripe-products.js
 */

import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

async function fetchStripeProducts() {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  
  if (!STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables')
    process.exit(1)
  }

  console.log('🔍 Fetching products from Stripe...\n')

  try {
    // Make direct API call to Stripe
    const productsResponse = await fetch('https://api.stripe.com/v1/products?active=true&limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch products: ${productsResponse.statusText}`)
    }

    const productsData = await productsResponse.json()
    
    // Fetch prices
    const pricesResponse = await fetch('https://api.stripe.com/v1/prices?active=true&limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    if (!pricesResponse.ok) {
      throw new Error(`Failed to fetch prices: ${pricesResponse.statusText}`)
    }

    const pricesData = await pricesResponse.json()

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('                    YOUR STRIPE PRODUCTS                       ')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log()

    if (productsData.data.length === 0) {
      console.log('⚠️  No products found in your Stripe account.')
      console.log('📝 Please create products in your Stripe Dashboard:')
      console.log('   https://dashboard.stripe.com/test/products')
      console.log()
      console.log('Suggested products to create:')
      console.log('1. FlowBond Device - $199.99 one-time, $19.99/month')
      console.log('2. DANZ NOW App Premium - $9.99/month, $99.99/year')
      return
    }

    // Group prices by product
    const pricesByProduct = {}
    pricesData.data.forEach(price => {
      const productId = typeof price.product === 'string' ? price.product : price.product?.id
      if (!pricesByProduct[productId]) {
        pricesByProduct[productId] = []
      }
      pricesByProduct[productId].push(price)
    })

    // Display products and their prices
    productsData.data.forEach((product, index) => {
      console.log(`📦 Product ${index + 1}: ${product.name}`)
      console.log(`   ID: ${product.id}`)
      if (product.description) {
        console.log(`   Description: ${product.description}`)
      }
      console.log()
      
      const prices = pricesByProduct[product.id] || []
      if (prices.length > 0) {
        console.log('   💰 Prices:')
        prices.forEach(price => {
          const amount = (price.unit_amount / 100).toFixed(2)
          const currency = price.currency.toUpperCase()
          let priceDesc = `$${amount} ${currency}`
          
          if (price.type === 'recurring') {
            const interval = price.recurring.interval
            const count = price.recurring.interval_count
            priceDesc += count > 1 ? ` every ${count} ${interval}s` : `/${interval}`
          } else {
            priceDesc += ' (one-time)'
          }
          
          console.log(`      • ${priceDesc}`)
          console.log(`        Price ID: ${price.id}`)
          if (price.nickname) {
            console.log(`        Nickname: ${price.nickname}`)
          }
          console.log()
        })
      } else {
        console.log('   ⚠️  No prices configured for this product')
        console.log()
      }
      
      console.log('───────────────────────────────────────────────────────────────')
      console.log()
    })

    // Generate configuration code
    console.log('📝 Configuration Code for stripe-agent.js:')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log()
    console.log('// Add these price IDs to your stripe-agent.js getMockProducts():')
    console.log()

    productsData.data.forEach(product => {
      const prices = pricesByProduct[product.id] || []
      console.log(`// ${product.name}`)
      prices.forEach(price => {
        const varName = price.nickname?.toLowerCase().replace(/\s+/g, '_') || 
                        `${product.name.toLowerCase().replace(/\s+/g, '_')}_${price.type}`
        console.log(`const ${varName} = '${price.id}'`)
      })
      console.log()
    })

    // Also save to a JSON file
    const config = {
      products: productsData.data.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        prices: (pricesByProduct[product.id] || []).map(price => ({
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          type: price.type,
          nickname: price.nickname,
          recurring: price.recurring
        }))
      })),
      timestamp: new Date().toISOString()
    }

    const outputPath = 'stripe-products.json'
    fs.writeFileSync(outputPath, JSON.stringify(config, null, 2))
    console.log(`\n✅ Products saved to ${outputPath}`)

  } catch (error) {
    console.error('❌ Error fetching products:', error.message)
    console.error('\nPlease check:')
    console.error('1. Your Stripe secret key is correct')
    console.error('2. You have an active internet connection')
    console.error('3. The key has proper permissions')
  }
}

// Run the script
fetchStripeProducts()