/**
 * Payment Types for FlowB
 * Unified payment infrastructure supporting multiple methods
 */

export type PaymentMethod =
  | "stripe"
  | "apple_pay"
  | "wallet_connect"
  | "usdc_direct"
  | "crypto_swap"
  | "telegram_stars";

export type PaymentNetwork =
  | "base"
  | "ethereum"
  | "polygon"
  | "arbitrum"
  | "optimism";

export type OrderStatus =
  | "pending"
  | "processing"
  | "awaiting_payment"
  | "completed"
  | "failed"
  | "refunded"
  | "expired"
  | "cancelled";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productType: "one_time" | "subscription" | "consumable";
  category: "boost" | "agent" | "skill" | "premium" | "enterprise" | "custom";
  basePriceUsdc: number;
  stripePriceId: string | null;
  telegramStarsPrice: number | null;
  billingPeriod: "monthly" | "yearly" | "weekly" | null;
  features: string[];
  icon: string | null;
  bizOnly: boolean;
  active: boolean;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  amountUsdc: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentNetwork: PaymentNetwork | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  telegramInvoiceId: string | null;
  expectedWalletAddress: string | null;
  senderWalletAddress: string | null;
  txHash: string | null;
  txVerified: boolean;
  swapService: string | null;
  originalTokenSymbol: string | null;
  originalAmount: string | null;
  expiresAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface CreateOrderParams {
  userId: string;
  productSlug: string;
  paymentMethod: PaymentMethod;
  network?: PaymentNetwork;
  walletAddress?: string;
  quantity?: number;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  orderId: string;
  method: PaymentMethod;
  amountUsdc: number;
  expiresAt: Date;
  // Stripe-specific
  clientSecret?: string;
  stripePublishableKey?: string;
  stripeCheckoutUrl?: string;
  // Crypto-specific
  paymentAddress?: string;
  network?: PaymentNetwork;
  chainId?: number;
  // Telegram-specific
  telegramInvoiceUrl?: string;
  starsAmount?: number;
}

export interface ConfirmPaymentParams {
  orderId: string;
  // Stripe
  paymentIntentId?: string;
  // Crypto
  txHash?: string;
  senderAddress?: string;
  // Telegram
  telegramPaymentChargeId?: string;
}

export interface PaymentResult {
  success: boolean;
  order: Order;
  error?: string;
  subscription?: {
    id: string;
    currentPeriodEnd: Date;
  };
}

export interface RefundParams {
  orderId: string;
  reason?: string;
  amount?: number; // Partial refund
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface ConnectedWallet {
  id: string;
  userId: string;
  walletAddress: string;
  chainId: number;
  chainName: string;
  isPrimary: boolean;
  ensName: string | null;
  lastConnectedAt: Date;
}

export interface NetworkConfig {
  id: PaymentNetwork;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  usdcAddress: string;
  nativeSymbol: string;
  minConfirmations: number;
}

// Subscription types
export interface Subscription {
  id: string;
  userId: string;
  productId: string;
  status: "active" | "cancelled" | "expired" | "past_due" | "trialing";
  paymentMethod: PaymentMethod;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}
