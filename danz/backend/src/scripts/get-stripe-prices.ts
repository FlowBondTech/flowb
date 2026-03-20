import dotenv from 'dotenv'
import Stripe from 'stripe'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

async function getProductPrices() {
  const productId = process.env.STRIPE_PRODUCT_ID

  console.log(`Fetching prices for product: ${productId}`)

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  })

  console.log('\nActive Prices:')
  console.log('==============')

  prices.data.forEach(price => {
    const interval = price.recurring?.interval
    const amount = (price.unit_amount || 0) / 100
    console.log(`\n${interval?.toUpperCase()} Price:`)
    console.log(`  ID: ${price.id}`)
    console.log(`  Amount: $${amount} ${price.currency.toUpperCase()}`)
    console.log(`  Interval: ${price.recurring?.interval}`)
    console.log(`  Active: ${price.active}`)
  })

  console.log('\n\nAdd these to your .env file:')
  console.log('============================')

  const monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month')
  const yearlyPrice = prices.data.find(p => p.recurring?.interval === 'year')

  if (monthlyPrice) {
    console.log(`STRIPE_MONTHLY_PRICE_ID=${monthlyPrice.id}`)
  }
  if (yearlyPrice) {
    console.log(`STRIPE_YEARLY_PRICE_ID=${yearlyPrice.id}`)
  }
}

getProductPrices().catch(console.error)
