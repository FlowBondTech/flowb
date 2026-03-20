// Payment integration utilities for device reservations
import { supabase } from '../utils/supabase'

// Stripe configuration (add your Stripe public key to .env as VITE_STRIPE_PUBLIC_KEY)
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY

// NOWPayments configuration (add your API key to .env as VITE_NOWPAYMENTS_API_KEY)
const NOWPAYMENTS_API_KEY = import.meta.env.VITE_NOWPAYMENTS_API_KEY

/**
 * Create a Stripe checkout session for device reservation
 * Note: This would typically be handled by a backend API endpoint
 */
export async function createStripeCheckout(reservationId, packageDetails, email) {
  // In production, this should call your backend API
  // which uses Stripe's server-side SDK to create a checkout session
  
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reservationId,
      packageId: packageDetails.id,
      packageName: packageDetails.name,
      price: packageDetails.price,
      email
    })
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  const { sessionUrl } = await response.json()
  return sessionUrl
}

/**
 * Create a NOWPayments invoice for crypto payments
 */
export async function createCryptoPayment(reservationId, packageDetails, email) {
  if (!NOWPAYMENTS_API_KEY) {
    throw new Error('NOWPayments API key not configured')
  }

  // Create payment through NOWPayments API
  const response = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': NOWPAYMENTS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      price_amount: packageDetails.price,
      price_currency: 'usd',
      order_id: reservationId,
      order_description: packageDetails.name,
      ipn_callback_url: `${window.location.origin}/api/nowpayments-webhook`,
      success_url: `${window.location.origin}/reservation-success?id=${reservationId}`,
      cancel_url: `${window.location.origin}/#device`,
      customer_email: email
    })
  })

  if (!response.ok) {
    throw new Error('Failed to create crypto payment')
  }

  const paymentData = await response.json()
  
  // Update reservation with payment reference
  await supabase
    .from('device_reservations')
    .update({
      payment_method: 'crypto',
      payment_reference: paymentData.id,
      payment_status: 'processing'
    })
    .eq('id', reservationId)

  return paymentData.invoice_url
}

/**
 * Update reservation payment status
 */
export async function updatePaymentStatus(reservationId, status, paymentDetails = {}) {
  const { error } = await supabase
    .from('device_reservations')
    .update({
      payment_status: status,
      payment_date: status === 'completed' ? new Date().toISOString() : null,
      ...paymentDetails
    })
    .eq('id', reservationId)

  if (error) {
    console.error('Failed to update payment status:', error)
    throw error
  }
}

/**
 * Check reservation payment status
 */
export async function checkPaymentStatus(reservationId) {
  const { data, error } = await supabase
    .from('device_reservations')
    .select('payment_status, payment_method, payment_reference')
    .eq('id', reservationId)
    .single()

  if (error) {
    console.error('Failed to check payment status:', error)
    throw error
  }

  return data
}

/**
 * Get reservation details
 */
export async function getReservation(reservationId) {
  const { data, error } = await supabase
    .from('device_reservations')
    .select('*')
    .eq('id', reservationId)
    .single()

  if (error) {
    console.error('Failed to get reservation:', error)
    throw error
  }

  return data
}

/**
 * Cancel reservation
 */
export async function cancelReservation(reservationId) {
  const { error } = await supabase
    .from('device_reservations')
    .update({
      payment_status: 'cancelled'
    })
    .eq('id', reservationId)

  if (error) {
    console.error('Failed to cancel reservation:', error)
    throw error
  }
}