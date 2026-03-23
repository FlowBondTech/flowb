// Stripe webhook handler for processing payment events
// Deploy this as a serverless function or backend endpoint

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  let event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body string
      sig,
      endpointSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        
        // Update purchase intent in database
        if (session.metadata?.purchaseIntentId) {
          await supabase
            .from('purchase_intents')
            .update({
              status: 'completed',
              stripe_session_id: session.id,
              stripe_payment_intent: session.payment_intent,
              completed_at: new Date().toISOString()
            })
            .eq('id', session.metadata.purchaseIntentId)
        }
        
        // Create order record
        await supabase
          .from('orders')
          .insert({
            user_id: session.metadata?.userId,
            email: session.customer_email,
            product_id: session.metadata?.productId,
            payment_option_id: session.metadata?.optionId,
            stripe_session_id: session.id,
            stripe_customer_id: session.customer,
            amount_total: session.amount_total / 100, // Convert from cents
            currency: session.currency,
            payment_status: session.payment_status,
            status: 'processing'
          })
        
        console.log('Payment successful for session:', session.id)
        break
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        console.error('Payment failed:', paymentIntent.id)
        
        // Update purchase intent status
        await supabase
          .from('purchase_intents')
          .update({
            status: 'failed',
            error_message: paymentIntent.last_payment_error?.message
          })
          .eq('stripe_payment_intent', paymentIntent.id)
        break
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        
        // Handle subscription creation/update
        await supabase
          .from('subscriptions')
          .upsert({
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
          })
        
        console.log('Subscription updated:', subscription.id)
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        // Handle subscription cancellation
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
        
        console.log('Subscription canceled:', subscription.id)
        break
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).json({ received: true })
}

// Configuration for Next.js/Vercel to handle raw body
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    // Disable body parsing, we need raw body for signature verification
    bodyParser: false,
  },
}