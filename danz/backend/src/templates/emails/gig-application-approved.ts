/**
 * Gig Application Approved Email Template
 *
 * Sent when a user's gig application is approved.
 */

import { baseTemplate, colors, ctaButton, emailConfig, infoBox, successBox } from './base.js'

interface GigApplicationApprovedData {
  userName: string
  gigTitle: string
  roleName: string
  eventTitle: string
  eventDate: string
  eventLocation?: string
  danzReward: number
  timeCommitment?: string
  specificRequirements?: string
}

export function gigApplicationApprovedTemplate(data: GigApplicationApprovedData): string {
  const content = `
    <h1 class="title">You Got the Gig! 🎉</h1>
    <p class="subtitle">Your application has been approved</p>

    ${successBox(`
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
        Congratulations! You've been selected for the <span class="highlight">${data.roleName}</span>
        role at <span class="highlight">${data.eventTitle}</span>.
      </p>
    </div>

    ${infoBox(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${colors.textMuted};">📅 Event Date</td>
          <td style="padding: 8px 0; color: ${colors.text}; text-align: right;">${data.eventDate}</td>
        </tr>
        ${
          data.eventLocation
            ? `
        <tr>
          <td style="padding: 8px 0; color: ${colors.textMuted};">📍 Location</td>
          <td style="padding: 8px 0; color: ${colors.text}; text-align: right;">${data.eventLocation}</td>
        </tr>
        `
            : ''
        }
        ${
          data.timeCommitment
            ? `
        <tr>
          <td style="padding: 8px 0; color: ${colors.textMuted};">⏱️ Time Commitment</td>
          <td style="padding: 8px 0; color: ${colors.text}; text-align: right;">${data.timeCommitment}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="padding: 8px 0; color: ${colors.textMuted};">💰 Reward</td>
          <td style="padding: 8px 0; text-align: right;">
            <span class="reward">${data.danzReward} $DANZ</span>
          </td>
        </tr>
      </table>
    `)}

    ${
      data.specificRequirements
        ? `
    <div class="content" style="margin-top: 16px;">
      <p style="font-weight: 600; color: ${colors.text};">📋 Requirements:</p>
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
      <p><strong>Remember to:</strong></p>
      <ul style="padding-left: 20px; margin: 8px 0;">
        <li>Check in when you arrive at the event</li>
        <li>Complete all assigned tasks</li>
        <li>Check out and submit proof of work</li>
        <li>Earn your $DANZ reward!</li>
      </ul>
    </div>
  `

  return baseTemplate(content, `You've been approved for ${data.gigTitle}!`)
}

export function gigApplicationApprovedSubject(data: GigApplicationApprovedData): string {
  return `🎉 You got the gig! ${data.roleName} at ${data.eventTitle}`
}
