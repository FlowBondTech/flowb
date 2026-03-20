/**
 * Email Configuration
 *
 * Configuration for the email service using Resend.
 */

import { Resend } from 'resend'

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY

export const resend = resendApiKey ? new Resend(resendApiKey) : null

// Email configuration
export const emailConfig = {
  from: process.env.EMAIL_FROM || 'DANZ <noreply@danz.app>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@danz.app',
  baseUrl: process.env.APP_URL || 'https://danz.app',
  enabled: !!resendApiKey,
}

// Check if email is configured
export const isEmailConfigured = (): boolean => {
  return emailConfig.enabled && resend !== null
}
