import dotenv from 'dotenv'
import Stripe from 'stripe'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

async function setupWebhook() {
  console.log('Setting up Stripe webhook endpoint...')

  const webhookUrl = process.env.WEBHOOK_URL || 'https://your-domain.com/api/stripe/webhook'

  try {
    // Create webhook endpoint
    const endpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_failed',
        'invoice.payment_succeeded',
      ],
    })

    console.log('\n✅ Webhook endpoint created successfully!')
    console.log('Webhook URL:', endpoint.url)
    console.log('Webhook Secret:', endpoint.secret)
    console.log('\n⚠️  IMPORTANT: Add this to your .env file:')
    console.log(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}`)
  } catch (error) {
    console.error('Error creating webhook:', error)
  }
}

// For local testing with Stripe CLI
console.log('\n📌 For local testing, use Stripe CLI:')
console.log('1. Install Stripe CLI: https://stripe.com/docs/stripe-cli')
console.log('2. Run: stripe login')
console.log('3. Run: stripe listen --forward-to localhost:8080/api/stripe/webhook')
console.log('4. Copy the webhook secret from the output and add to .env')
console.log('\nExample:')
console.log('STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here')

if (process.argv.includes('--create')) {
  setupWebhook()
} else {
  console.log('\nRun with --create flag to create production webhook endpoint')
}
