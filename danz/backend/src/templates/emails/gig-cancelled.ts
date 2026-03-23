/**
 * Gig Cancelled Email Template
 *
 * Sent when a gig is cancelled by the organizer.
 */

import { baseTemplate, colors, ctaButton, emailConfig, warningBox } from './base.js'

interface GigCancelledData {
  userName: string
  gigTitle: string
  roleName: string
  eventTitle: string
  eventDate: string
  reason?: string
}

export function gigCancelledTemplate(data: GigCancelledData): string {
  const content = `
    <h1 class="title">Gig Cancelled</h1>
    <p class="subtitle">An update about your upcoming gig</p>

    ${warningBox(`
      <p style="margin: 0; font-size: 16px; color: ${colors.text};">
        <strong>${data.gigTitle}</strong>
      </p>
      <p style="margin: 4px 0 0 0; color: ${colors.textMuted};">
        ${data.roleName} at ${data.eventTitle} • ${data.eventDate}
      </p>
    `)}

    <div class="content">
      <p>Hey ${data.userName},</p>
      <p>
        Unfortunately, the gig you were assigned to has been cancelled by the event organizer.
      </p>

      ${
        data.reason
          ? `
      <p style="margin-top: 16px;">
        <strong>Reason:</strong> ${data.reason}
      </p>
      `
          : ''
      }

      <p>
        We apologize for any inconvenience this may cause. The good news is there are
        always more opportunities available on DANZ!
      </p>
    </div>

    <div style="text-align: center;">
      ${ctaButton('Find New Gigs', `${emailConfig.baseUrl}/dashboard/gigs`)}
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: ${colors.textMuted};">
      <p>
        Don't worry – cancelled gigs won't affect your rating or standing on the platform.
        Keep applying for new opportunities!
      </p>
    </div>
  `

  return baseTemplate(content, `Your gig has been cancelled: ${data.gigTitle}`)
}

export function gigCancelledSubject(data: GigCancelledData): string {
  return `Gig Cancelled: ${data.eventTitle}`
}
