import crypto from 'node:crypto'
import type { Request, Response } from 'express'
import { Router } from 'express'
import type Stripe from 'stripe'
import { SPONSOR_TIER_MAP, STRIPE_CONFIG, stripe } from '../config/stripe.js'
import { supabase } from '../config/supabase.js'
import { type AuthRequest, authenticateUser } from '../middleware/auth.js'
import { discord } from '../services/discord.js'
import { logger } from '../utils/logger.js'

const router = Router()

router.post(
  '/create-checkout-session',
  authenticateUser,
  async (req: AuthRequest, res: Response) => {
    try {
      const { priceId, plan } = req.body
      const { privyId } = req.user!

      if (!plan) {
        return res.status(400).json({ error: 'Plan is required' })
      }

      if (!['monthly', 'yearly'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan type' })
      }

      // Resolve price ID - support both direct price IDs and lookup keys
      let resolvedPriceId = priceId

      // If no priceId provided, use lookup key based on plan
      if (!priceId) {
        const lookupKey = plan === 'monthly' ? 'standard_monthly' : 'standard_yearly'
        const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 })
        if (prices.data.length === 0) {
          return res.status(400).json({ error: `No price found for lookup key: ${lookupKey}` })
        }
        resolvedPriceId = prices.data[0].id
      } else if (!priceId.startsWith('price_')) {
        // priceId is a lookup key, resolve it
        const prices = await stripe.prices.list({ lookup_keys: [priceId], limit: 1 })
        if (prices.data.length === 0) {
          return res.status(400).json({ error: `No price found for lookup key: ${priceId}` })
        }
        resolvedPriceId = prices.data[0].id
      }

      const { data: user } = await supabase
        .from('users')
        .select('privy_id, stripe_customer_id, username, display_name')
        .eq('privy_id', privyId)
        .single()

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      let customerId = user.stripe_customer_id

      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: {
            privy_id: privyId,
            username: user.username || '',
            display_name: user.display_name || '',
          },
        })

        customerId = customer.id

        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('privy_id', privyId)
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: resolvedPriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: STRIPE_CONFIG.SUCCESS_URL,
        cancel_url: STRIPE_CONFIG.CANCEL_URL,
        metadata: {
          privy_id: privyId,
          plan: plan,
        },
        subscription_data: {
          metadata: {
            privy_id: privyId,
            plan: plan,
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
      })

      logger.info('Checkout session created', { sessionId: session.id, privyId, plan })

      return res.json({ url: session.url, sessionId: session.id })
    } catch (error) {
      logger.error('Error creating checkout session', error)
      return res.status(500).json({ error: 'Failed to create checkout session' })
    }
  },
)

router.post('/create-portal-session', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { privyId } = req.user!

    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('privy_id', privyId)
      .single()

    if (!user?.stripe_customer_id) {
      return res.status(404).json({ error: 'No Stripe customer found' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${STRIPE_CONFIG.SUCCESS_URL.split('?')[0]}`,
    })

    logger.info('Portal session created', { customerId: user.stripe_customer_id, privyId })

    return res.json({ url: session.url })
  } catch (error) {
    logger.error('Error creating portal session', error)
    return res.status(500).json({ error: 'Failed to create portal session' })
  }
})

router.post(
  '/create-sponsor-checkout',
  authenticateUser,
  async (req: AuthRequest, res: Response) => {
    try {
      const { tierId } = req.body
      const { privyId } = req.user!

      const validTiers = ['starter', 'growth', 'headliner', 'ecosystem']
      if (!tierId || !validTiers.includes(tierId)) {
        return res.status(400).json({ error: 'Invalid sponsor tier' })
      }

      const priceId = STRIPE_CONFIG.SPONSOR_PRICES[tierId]
      if (!priceId) {
        return res.status(400).json({ error: `Price not configured for tier: ${tierId}` })
      }

      const { data: user } = await supabase
        .from('users')
        .select('privy_id, stripe_customer_id, username, display_name')
        .eq('privy_id', privyId)
        .single()

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      let customerId = user.stripe_customer_id

      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: {
            privy_id: privyId,
            username: user.username || '',
            display_name: user.display_name || '',
          },
        })

        customerId = customer.id

        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('privy_id', privyId)
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: STRIPE_CONFIG.ETHDENVER_SUCCESS_URL,
        cancel_url: STRIPE_CONFIG.ETHDENVER_CANCEL_URL,
        metadata: {
          privy_id: privyId,
          type: 'ethdenver_sponsor',
          tier_id: tierId,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
      })

      logger.info('Sponsor checkout session created', { sessionId: session.id, privyId, tierId })

      return res.json({ url: session.url, sessionId: session.id })
    } catch (error) {
      logger.error('Error creating sponsor checkout session', error)
      return res.status(500).json({ error: 'Failed to create sponsor checkout session' })
    }
  },
)

// Guest sponsor checkout - no auth required
router.post('/create-sponsor-checkout-guest', async (req: Request, res: Response) => {
  try {
    const { tierId } = req.body

    const validTiers = ['starter', 'growth', 'headliner', 'ecosystem']
    if (!tierId || !validTiers.includes(tierId)) {
      return res.status(400).json({ error: 'Invalid sponsor tier' })
    }

    const priceId = STRIPE_CONFIG.SPONSOR_PRICES[tierId]
    if (!priceId) {
      return res.status(400).json({ error: `Price not configured for tier: ${tierId}` })
    }

    const claimToken = crypto.randomBytes(32).toString('hex')

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${STRIPE_CONFIG.ETHDENVER_CLAIM_URL}?session_id={CHECKOUT_SESSION_ID}&claim_token=${claimToken}`,
      cancel_url: STRIPE_CONFIG.ETHDENVER_CANCEL_URL,
      metadata: {
        type: 'ethdenver_sponsor_guest',
        tier_id: tierId,
        claim_token: claimToken,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    logger.info('Guest sponsor checkout session created', { sessionId: session.id, tierId })

    return res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    logger.error('Error creating guest sponsor checkout session', error)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

// Verify a claim token (public - no auth)
router.get('/verify-claim-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params

    if (!token || token.length !== 64) {
      return res.status(400).json({ valid: false, error: 'Invalid token format' })
    }

    const { data: pending } = await supabase
      .from('pending_sponsor_purchases')
      .select('tier_id, tier_name, amount_usd, flow_amount, status, expires_at')
      .eq('claim_token', token)
      .single()

    if (!pending) {
      return res.json({ valid: false, error: 'Token not found' })
    }

    if (pending.status !== 'pending') {
      return res.json({ valid: false, error: 'Token already claimed' })
    }

    if (new Date(pending.expires_at) < new Date()) {
      return res.json({ valid: false, error: 'Token expired' })
    }

    return res.json({
      valid: true,
      tierId: pending.tier_id,
      tierName: pending.tier_name,
      amountUsd: pending.amount_usd,
      flowAmount: pending.flow_amount,
    })
  } catch (error) {
    logger.error('Error verifying claim token', error)
    return res.status(500).json({ valid: false, error: 'Verification failed' })
  }
})

// Claim a guest sponsor purchase (auth required)
router.post('/claim-sponsor-purchase', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { claimToken } = req.body
    const { privyId } = req.user!

    if (!claimToken || claimToken.length !== 64) {
      return res.status(400).json({ error: 'Invalid claim token' })
    }

    // Find pending purchase atomically - check status and expiry
    const { data: pending, error: findError } = await supabase
      .from('pending_sponsor_purchases')
      .select('*')
      .eq('claim_token', claimToken)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (findError || !pending) {
      return res.status(404).json({ error: 'No valid pending purchase found for this token' })
    }

    // Mark as claimed atomically (re-check status to prevent race conditions)
    const { data: claimed, error: claimError } = await supabase
      .from('pending_sponsor_purchases')
      .update({
        status: 'claimed',
        claimed_by: privyId,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', pending.id)
      .eq('status', 'pending')
      .select()
      .single()

    if (claimError || !claimed) {
      return res.status(409).json({ error: 'Purchase already claimed' })
    }

    const tierInfo = SPONSOR_TIER_MAP[pending.tier_id] || SPONSOR_TIER_MAP.starter

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('username, display_name, stripe_customer_id')
      .eq('privy_id', privyId)
      .single()

    // Create or update sponsor profile (same logic as handleSponsorPurchase)
    const { data: existingSponsor } = await supabase
      .from('sponsors')
      .select('id, total_flow_contributed')
      .eq('user_id', privyId)
      .single()

    if (existingSponsor) {
      const newTotal = Number(existingSponsor.total_flow_contributed) + tierInfo.flowAmount
      await supabase
        .from('sponsors')
        .update({ total_flow_contributed: newTotal })
        .eq('id', existingSponsor.id)
    } else {
      await supabase.from('sponsors').insert({
        user_id: privyId,
        company_name: user?.display_name || user?.username || 'Sponsor',
        total_flow_contributed: tierInfo.flowAmount,
      })
    }

    // Record in sponsor_purchases
    await supabase.from('sponsor_purchases').insert({
      user_id: privyId,
      stripe_session_id: pending.stripe_session_id,
      stripe_payment_intent_id: pending.stripe_payment_intent_id,
      tier_id: pending.tier_id,
      tier_name: pending.tier_name,
      amount_usd: pending.amount_usd,
      flow_amount: pending.flow_amount,
    })

    // Link Stripe customer to user if we have one from the checkout
    if (pending.stripe_customer_id && !user?.stripe_customer_id) {
      await supabase
        .from('users')
        .update({ stripe_customer_id: pending.stripe_customer_id })
        .eq('privy_id', privyId)
    }

    // Discord notification
    discord
      .notifySponsorPurchase({
        username: user?.username || 'Unknown',
        tier: pending.tier_name,
        amount: Number(pending.amount_usd),
      })
      .catch(err => console.error('[Discord] Sponsor claim notification failed:', err))

    logger.info('Guest sponsor purchase claimed', {
      privyId,
      tierId: pending.tier_id,
      amountUsd: pending.amount_usd,
    })

    return res.json({
      success: true,
      tierId: pending.tier_id,
      tierName: pending.tier_name,
      flowAmount: pending.flow_amount,
    })
  } catch (error) {
    logger.error('Error claiming sponsor purchase', error)
    return res.status(500).json({ error: 'Failed to claim purchase' })
  }
})

router.post('/webhook', async (req: Request, res: Response): Promise<Response> => {
  const sig = req.headers['stripe-signature'] as string

  if (!STRIPE_CONFIG.WEBHOOK_SECRET) {
    logger.error('Stripe webhook secret not configured')
    return res.status(500).send('Webhook secret not configured')
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CONFIG.WEBHOOK_SECRET)
  } catch (err) {
    logger.error('Webhook signature verification failed', err)
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`)
  }

  logger.info('Processing webhook event', { type: event.type, id: event.id })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Handle guest sponsor purchases (no privy_id expected)
        if (session.metadata?.type === 'ethdenver_sponsor_guest') {
          await handleGuestSponsorPurchase(session)
          break
        }

        const privyId = session.metadata?.privy_id

        if (!privyId) {
          logger.error('No privy_id in checkout session metadata')
          break
        }

        // Route based on checkout type
        if (session.metadata?.type === 'ethdenver_sponsor') {
          await handleSponsorPurchase(session, privyId)
          break
        }

        // Default: subscription checkout
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

        const currentPeriodStart = (subscription as any).current_period_start
        const currentPeriodEnd = (subscription as any).current_period_end

        await supabase
          .from('users')
          .update({
            is_premium: 'active',
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            subscription_plan: subscription.metadata.plan || 'monthly',
            subscription_start_date: currentPeriodStart
              ? new Date(currentPeriodStart * 1000).toISOString()
              : new Date().toISOString(),
            subscription_end_date: currentPeriodEnd
              ? new Date(currentPeriodEnd * 1000).toISOString()
              : null,
          })
          .eq('privy_id', privyId)

        await supabase.from('subscription_history').insert({
          user_id: privyId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan: subscription.metadata.plan || 'monthly',
          event_type: 'created',
          metadata: {
            session_id: session.id,
            customer_id: session.customer,
          },
        })

        // Get username for Discord notification
        const { data: subUser } = await supabase
          .from('users')
          .select('username')
          .eq('privy_id', privyId)
          .single()

        // Calculate amount from invoice
        const invoiceAmount = session.amount_total ? session.amount_total / 100 : 0

        // Discord webhook: Subscription started
        discord
          .notifySubscriptionStarted({
            username: subUser?.username || 'Unknown',
            plan: (subscription.metadata.plan as 'monthly' | 'yearly') || 'monthly',
            amount: invoiceAmount,
          })
          .catch(err => console.error('[Discord] Subscription started notification failed:', err))

        logger.info('Subscription activated', { privyId, subscriptionId: subscription.id })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const privyId = subscription.metadata?.privy_id

        if (!privyId) {
          logger.error('No privy_id in subscription metadata')
          break
        }

        const isPremium =
          subscription.status === 'active'
            ? 'active'
            : subscription.status === 'past_due'
              ? 'past_due'
              : subscription.status === 'trialing'
                ? 'trialing'
                : 'inactive'

        await supabase
          .from('users')
          .update({
            is_premium: isPremium,
            subscription_status: subscription.status,
            subscription_start_date: (subscription as any).current_period_start
              ? new Date((subscription as any).current_period_start * 1000).toISOString()
              : new Date().toISOString(),
            subscription_end_date: (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000).toISOString()
              : null,
            subscription_cancelled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
          })
          .eq('privy_id', privyId)

        await supabase.from('subscription_history').insert({
          user_id: privyId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan: subscription.metadata.plan || 'monthly',
          event_type: 'updated',
          metadata: {
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
        })

        logger.info('Subscription updated', { privyId, status: subscription.status })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const privyId = subscription.metadata?.privy_id

        if (!privyId) {
          const customer = await stripe.customers.retrieve(subscription.customer as string)
          const privyIdFromCustomer = (customer as any).metadata?.privy_id

          if (privyIdFromCustomer) {
            await handleSubscriptionCancellation(privyIdFromCustomer, subscription)
          }
        } else {
          await handleSubscriptionCancellation(privyId, subscription)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        if (!(invoice as any).subscription) {
          logger.info('No subscription in invoice, skipping')
          break
        }

        const subscription = await stripe.subscriptions.retrieve(
          (invoice as any).subscription as string,
        )
        const privyId = subscription.metadata?.privy_id

        if (privyId) {
          await supabase
            .from('users')
            .update({
              is_premium: 'past_due',
              subscription_status: 'past_due',
            })
            .eq('privy_id', privyId)

          await supabase.from('subscription_history').insert({
            user_id: privyId,
            stripe_subscription_id: subscription.id,
            status: 'past_due',
            plan: subscription.metadata.plan || 'monthly',
            event_type: 'payment_failed',
            metadata: {
              invoice_id: invoice.id,
              attempt_count: invoice.attempt_count,
            },
          })

          logger.warn('Payment failed', { privyId, invoiceId: invoice.id })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        if (!(invoice as any).subscription) {
          logger.info('No subscription in invoice, skipping')
          break
        }

        const subscription = await stripe.subscriptions.retrieve(
          (invoice as any).subscription as string,
        )
        const privyId = subscription.metadata?.privy_id

        if (privyId && subscription.status === 'active') {
          await supabase
            .from('users')
            .update({
              is_premium: 'active',
              subscription_status: 'active',
              subscription_start_date: (subscription as any).current_period_start
                ? new Date((subscription as any).current_period_start * 1000).toISOString()
                : new Date().toISOString(),
              subscription_end_date: (subscription as any).current_period_end
                ? new Date((subscription as any).current_period_end * 1000).toISOString()
                : null,
            })
            .eq('privy_id', privyId)

          await supabase.from('subscription_history').insert({
            user_id: privyId,
            stripe_subscription_id: subscription.id,
            status: 'active',
            plan: subscription.metadata.plan || 'monthly',
            event_type: 'payment_succeeded',
            metadata: {
              invoice_id: invoice.id,
              amount_paid: invoice.amount_paid,
            },
          })

          logger.info('Payment succeeded', { privyId, invoiceId: invoice.id })
        }
        break
      }

      default:
        logger.info('Unhandled webhook event type', { type: event.type })
    }

    return res.json({ received: true })
  } catch (error) {
    logger.error('Error processing webhook', error)
    return res.status(500).send('Error processing webhook')
  }
})

async function handleSponsorPurchase(session: Stripe.Checkout.Session, privyId: string) {
  const tierId = session.metadata?.tier_id || 'starter'
  const tierInfo = SPONSOR_TIER_MAP[tierId] || SPONSOR_TIER_MAP.starter
  const amountUsd = session.amount_total ? session.amount_total / 100 : 0

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('username, display_name')
    .eq('privy_id', privyId)
    .single()

  // Look up existing sponsor profile
  const { data: existingSponsor } = await supabase
    .from('sponsors')
    .select('id, total_flow_contributed')
    .eq('user_id', privyId)
    .single()

  if (existingSponsor) {
    // Add flow amount to existing sponsor (trigger recalculates tier)
    const newTotal = Number(existingSponsor.total_flow_contributed) + tierInfo.flowAmount
    await supabase
      .from('sponsors')
      .update({ total_flow_contributed: newTotal })
      .eq('id', existingSponsor.id)
  } else {
    // Create new sponsor profile
    await supabase.from('sponsors').insert({
      user_id: privyId,
      company_name: user?.display_name || user?.username || 'Sponsor',
      total_flow_contributed: tierInfo.flowAmount,
    })
  }

  // Record purchase
  await supabase.from('sponsor_purchases').insert({
    user_id: privyId,
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    tier_id: tierId,
    tier_name: tierInfo.name,
    amount_usd: amountUsd,
    flow_amount: tierInfo.flowAmount,
  })

  // Discord notification
  discord
    .notifySponsorPurchase({
      username: user?.username || 'Unknown',
      tier: tierInfo.name,
      amount: amountUsd,
    })
    .catch(err => console.error('[Discord] Sponsor purchase notification failed:', err))

  logger.info('Sponsor purchase processed', { privyId, tierId, amountUsd })
}

async function handleGuestSponsorPurchase(session: Stripe.Checkout.Session) {
  const claimToken = session.metadata?.claim_token
  const tierId = session.metadata?.tier_id || 'starter'
  const tierInfo = SPONSOR_TIER_MAP[tierId] || SPONSOR_TIER_MAP.starter
  const amountUsd = session.amount_total ? session.amount_total / 100 : 0

  if (!claimToken) {
    logger.error('No claim_token in guest sponsor session metadata', { sessionId: session.id })
    return
  }

  // Insert pending purchase
  const { error } = await supabase.from('pending_sponsor_purchases').insert({
    claim_token: claimToken,
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    stripe_customer_id: session.customer as string,
    stripe_customer_email: session.customer_details?.email || null,
    tier_id: tierId,
    tier_name: tierInfo.name,
    amount_usd: amountUsd,
    flow_amount: tierInfo.flowAmount,
  })

  if (error) {
    logger.error('Failed to insert pending sponsor purchase', { error, sessionId: session.id })
    return
  }

  // Discord notification
  discord
    .notifySponsorPurchase({
      username: session.customer_details?.email || 'Guest',
      tier: `${tierInfo.name} (pending claim)`,
      amount: amountUsd,
    })
    .catch(err => console.error('[Discord] Guest sponsor notification failed:', err))

  logger.info('Guest sponsor purchase recorded, awaiting claim', {
    sessionId: session.id,
    tierId,
    amountUsd,
  })
}

async function handleSubscriptionCancellation(privyId: string, subscription: Stripe.Subscription) {
  // Get username before update for Discord notification
  const { data: cancelledUser } = await supabase
    .from('users')
    .select('username')
    .eq('privy_id', privyId)
    .single()

  await supabase
    .from('users')
    .update({
      is_premium: 'inactive',
      subscription_status: 'cancelled',
      stripe_subscription_id: null,
      subscription_plan: null,
      subscription_cancelled_at: new Date().toISOString(),
    })
    .eq('privy_id', privyId)

  await supabase.from('subscription_history').insert({
    user_id: privyId,
    stripe_subscription_id: subscription.id,
    status: 'cancelled',
    plan: subscription.metadata.plan || 'monthly',
    event_type: 'cancelled',
    metadata: {
      canceled_at: subscription.canceled_at,
      ended_at: subscription.ended_at,
    },
  })

  // Discord webhook: Subscription cancelled
  discord
    .notifySubscriptionCancelled({
      username: cancelledUser?.username || 'Unknown',
    })
    .catch(err => console.error('[Discord] Subscription cancelled notification failed:', err))

  logger.info('Subscription cancelled', { privyId, subscriptionId: subscription.id })
}

export default router
