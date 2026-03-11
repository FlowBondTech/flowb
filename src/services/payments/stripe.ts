/**
 * Stripe Payment Service
 * Handles Stripe payments including Apple Pay
 */

import Stripe from "stripe";

interface CreatePaymentIntentParams {
  orderId: string;
  amount: number; // USDC amount
  productName: string;
  customerId: string;
  enableApplePay?: boolean;
}

interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export class StripeService {
  private stripe: Stripe | null = null;

  private getStripe(): Stripe {
    if (!this.stripe) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error("STRIPE_SECRET_KEY not configured");
      }
      this.stripe = new Stripe(secretKey);
    }
    return this.stripe;
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<PaymentIntentResult> {
    const stripe = this.getStripe();

    // Convert USDC to cents (assuming 1 USDC = 1 USD)
    const amountCents = Math.round(params.amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: params.orderId,
        customerId: params.customerId,
        productName: params.productName,
      },
      description: `FlowB Purchase: ${params.productName}`,
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  async verifyPayment(paymentIntentId: string): Promise<boolean> {
    const stripe = this.getStripe();

    try {
      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status === "succeeded";
    } catch {
      return false;
    }
  }

  async createCheckoutSession(params: {
    orderId: string;
    productName: string;
    amount: number;
    successUrl: string;
    cancelUrl: string;
    customerId?: string;
    customerEmail?: string;
  }): Promise<{ sessionId: string; url: string }> {
    const stripe = this.getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: params.productName,
            },
            unit_amount: Math.round(params.amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        orderId: params.orderId,
      },
      customer_email: params.customerEmail,
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async createSubscription(params: {
    customerId: string;
    priceId: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<{
    subscriptionId: string;
    clientSecret: string | null;
    status: string;
  }> {
    const stripe = this.getStripe();

    // Get or create customer
    let customer: Stripe.Customer;
    try {
      customer = (await stripe.customers.retrieve(
        params.customerId
      )) as Stripe.Customer;
    } catch {
      customer = await stripe.customers.create({
        metadata: { flowbUserId: params.customerId },
      });
    }

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: params.priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
      metadata: params.metadata,
    };

    if (params.trialDays && params.trialDays > 0) {
      subscriptionParams.trial_period_days = params.trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Handle expanded invoice - use type assertion for expanded fields
    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    let clientSecret: string | null = null;

    if (invoice) {
      const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent | string | null;
      if (paymentIntent && typeof paymentIntent !== "string") {
        clientSecret = paymentIntent.client_secret;
      }
    }

    return {
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
    };
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<void> {
    const stripe = this.getStripe();

    if (immediately) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  async getSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription | null> {
    const stripe = this.getStripe();

    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch {
      return null;
    }
  }

  async createRefund(
    paymentIntentId: string,
    amount?: number
  ): Promise<{ refundId: string; status: string }> {
    const stripe = this.getStripe();

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundParams);

    return {
      refundId: refund.id,
      status: refund.status!,
    };
  }

  // Webhook handling
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event {
    const stripe = this.getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<{
    type: string;
    orderId?: string;
    subscriptionId?: string;
    status?: string;
  }> {
    const eventType = event.type;

    switch (eventType) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        return {
          type: "payment_succeeded",
          orderId: paymentIntent.metadata.orderId,
          status: "completed",
        };
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        return {
          type: "payment_failed",
          orderId: paymentIntent.metadata.orderId,
          status: "failed",
        };
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          type: "checkout_completed",
          orderId: session.metadata?.orderId,
          status: "completed",
        };
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        return {
          type: "subscription_updated",
          subscriptionId: subscription.id,
          status: subscription.status,
        };
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        return {
          type: "subscription_cancelled",
          subscriptionId: subscription.id,
          status: "cancelled",
        };
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | Stripe.Subscription | null;
        return {
          type: "invoice_paid",
          subscriptionId: typeof subId === "string" ? subId : subId?.id,
          status: "active",
        };
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | Stripe.Subscription | null;
        return {
          type: "invoice_failed",
          subscriptionId: typeof subId === "string" ? subId : subId?.id,
          status: "past_due",
        };
      }

      default:
        return { type: eventType };
    }
  }
}
