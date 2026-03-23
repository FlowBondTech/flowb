/**
 * Gig Application Rejected Email Template
 *
 * Sent when a user's gig application is not selected.
 */

import { baseTemplate, colors, ctaButton, emailConfig, warningBox } from './base.js'

interface GigApplicationRejectedData {
  userName: string
  gigTitle: string
  roleName: string
  eventTitle: string
  reason?: string
}

export function gigApplicationRejectedTemplate(data: GigApplicationRejectedData): string {
  const content = `
    <h1 class="title">Application Update</h1>
    <p class="subtitle">Regarding your gig application</p>

    <div class="content">
      <p>Hey ${data.userName},</p>
      <p>
        Thank you for applying for the <span class="highlight">${data.roleName}</span>
        role at <span class="highlight">${data.eventTitle}</span>.
      </p>
      <p>
        Unfortunately, we weren't able to select you for this particular gig.
        ${data.reason ? '' : 'This was a competitive position and we had many qualified applicants.'}
      </p>

      ${
        data.reason
          ? warningBox(`
        <p style="margin: 0; font-weight: 600; color: ${colors.warning};">Feedback:</p>
        <p style="margin: 8px 0 0 0; color: ${colors.textMuted};">${data.reason}</p>
      `)
          : ''
      }

      <p>
        Don't let this discourage you! There are plenty of other gig opportunities on DANZ.
        Keep applying and building your reputation.
      </p>
    </div>

    <div style="text-align: center;">
      ${ctaButton('Find More Gigs', `${emailConfig.baseUrl}/dashboard/gigs`)}
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: ${colors.textMuted};">
      <p>
        <strong>Tip:</strong> Applying early, adding a thoughtful note, and maintaining
        a high rating on completed gigs can improve your chances!
      </p>
    </div>
  `

  return baseTemplate(content, `Update on your ${data.gigTitle} application`)
}

export function gigApplicationRejectedSubject(data: GigApplicationRejectedData): string {
  return `Update on your application for ${data.eventTitle}`
}
