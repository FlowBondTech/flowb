/**
 * Gig Reminder Email Template
 *
 * Sent as a reminder before a gig starts.
 */

import { baseTemplate, colors, ctaButton, emailConfig, infoBox } from './base.js'

interface GigReminderData {
  userName: string
  gigTitle: string
  roleName: string
  eventTitle: string
  eventDate: string
  eventLocation?: string
  hoursUntil: number
  timeCommitment?: string
  specificRequirements?: string
}

export function gigReminderTemplate(data: GigReminderData): string {
  const timeText =
    data.hoursUntil === 24
      ? 'tomorrow'
      : data.hoursUntil === 1
        ? 'in 1 hour'
        : `in ${data.hoursUntil} hours`

  const content = `
    <h1 class="title">Gig Reminder ⏰</h1>
    <p class="subtitle">Your gig starts ${timeText}</p>

    ${infoBox(`
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.text};">
        ${data.gigTitle}
      </p>
      <p style="margin: 4px 0 0 0; color: ${colors.textMuted};">
        ${data.roleName} at ${data.eventTitle}
      </p>
    `)}

    <div class="content">
      <p>Hey ${data.userName}!</p>
      <p>
        Just a friendly reminder that your <span class="highlight">${data.roleName}</span>
        gig is coming up ${timeText}.
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: ${colors.cardBg}; border-radius: 12px; padding: 16px;">
      <tr>
        <td style="padding: 12px 16px; color: ${colors.textMuted};">📅 When</td>
        <td style="padding: 12px 16px; color: ${colors.text}; text-align: right; font-weight: 600;">${data.eventDate}</td>
      </tr>
      ${
        data.eventLocation
          ? `
      <tr>
        <td style="padding: 12px 16px; color: ${colors.textMuted};">📍 Where</td>
        <td style="padding: 12px 16px; color: ${colors.text}; text-align: right;">${data.eventLocation}</td>
      </tr>
      `
          : ''
      }
      ${
        data.timeCommitment
          ? `
      <tr>
        <td style="padding: 12px 16px; color: ${colors.textMuted};">⏱️ Duration</td>
        <td style="padding: 12px 16px; color: ${colors.text}; text-align: right;">${data.timeCommitment}</td>
      </tr>
      `
          : ''
      }
    </table>

    ${
      data.specificRequirements
        ? `
    <div class="content" style="margin-top: 16px;">
      <p style="font-weight: 600; color: ${colors.text};">📋 Remember:</p>
      <p style="color: ${colors.textMuted};">${data.specificRequirements}</p>
    </div>
    `
        : ''
    }

    <div style="text-align: center;">
      ${ctaButton('View Gig Details', `${emailConfig.baseUrl}/dashboard/gigs`)}
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px;">
      <p><strong>Checklist:</strong></p>
      <ul style="padding-left: 20px; margin: 8px 0; color: ${colors.textMuted};">
        <li>✓ Plan your route to the venue</li>
        <li>✓ Arrive early to check in</li>
        <li>✓ Bring any required materials</li>
        <li>✓ Have your phone ready for check-in</li>
      </ul>
    </div>
  `

  return baseTemplate(content, `Reminder: Your gig starts ${timeText}`)
}

export function gigReminderSubject(data: GigReminderData): string {
  const timeText =
    data.hoursUntil === 24
      ? 'tomorrow'
      : data.hoursUntil === 1
        ? 'in 1 hour'
        : `in ${data.hoursUntil} hours`
  return `⏰ Reminder: Your gig starts ${timeText}`
}
