// This is a template for your Stripe checkout session creation endpoint
// You'll need to deploy this to a serverless function (Vercel, Netlify Functions, etc.)
// or integrate it into your backend server

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { priceId, quantity = 1, mode, customerEmail, metadata } = req.body

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      mode: mode || 'payment', // 'payment' for one-time, 'subscription' for recurring
      success_url: `${process.env.DOMAIN}/reservation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/`,
      customer_email: customerEmail,
      metadata: metadata || {},
      billing_address_collection: 'required',
      shipping_address_collection: mode === 'payment' ? {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      } : undefined,
    })

    res.status(200).json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    res.status(500).json({ error: error.message })
  }
}