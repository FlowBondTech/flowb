/**
 * Email Service
 *
 * Handles sending emails using Resend.
 */

import { emailConfig, isEmailConfigured, resend } from '../config/email.js'

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

/**
 * Send an email
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn('Email service not configured. Skipping email send.')
    return false
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: emailConfig.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo || emailConfig.replyTo,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return false
    }

    console.log('Email sent successfully:', data?.id)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string,
  text?: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  // Send in batches of 50
  const batchSize = 50
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    const results = await Promise.all(
      batch.map(email => sendEmail({ to: email, subject, html, text }).catch(() => false)),
    )

    sent += results.filter(Boolean).length
    failed += results.filter(r => !r).length
  }

  return { sent, failed }
}

export default { sendEmail, sendBulkEmail }
