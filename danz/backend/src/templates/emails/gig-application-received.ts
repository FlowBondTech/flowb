/**
 * Gig Application Received Email Template
 *
 * Sent to organizers when they receive a new gig application.
 */

import { baseTemplate, colors, ctaButton, emailConfig, infoBox } from './base.js'

interface GigApplicationReceivedData {
  organizerName: string
  applicantName: string
  applicantUsername?: string
  gigTitle: string
  roleName: string
  eventTitle: string
  applicationNote?: string
  applicantRating?: number
  applicantGigsCompleted?: number
}

export function gigApplicationReceivedTemplate(data: GigApplicationReceivedData): string {
  const ratingStars = data.applicantRating
    ? '★'.repeat(Math.round(data.applicantRating)) +
      '☆'.repeat(5 - Math.round(data.applicantRating))
    : null

  const content = `
    <h1 class="title">New Application 📬</h1>
    <p class="subtitle">Someone wants to work your event!</p>

    ${infoBox(`
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: white;">
          ${data.applicantName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style="margin: 0; font-weight: 600; color: ${colors.text};">${data.applicantName}</p>
          ${
            data.applicantUsername
              ? `
            <p style="margin: 2px 0 0 0; font-size: 14px; color: ${colors.textMuted};">@${data.applicantUsername}</p>
          `
              : ''
          }
          ${
            ratingStars
              ? `
            <p style="margin: 4px 0 0 0; font-size: 14px;">
              <span style="color: ${colors.warning};">${ratingStars}</span>
              <span style="color: ${colors.textMuted}; margin-left: 4px;">(${data.applicantRating?.toFixed(1)})</span>
              ${
                data.applicantGigsCompleted
                  ? `
                <span style="color: ${colors.textMuted}; margin-left: 8px;">• ${data.applicantGigsCompleted} gigs</span>
              `
                  : ''
              }
            </p>
          `
              : ''
          }
        </div>
      </div>
    `)}

    <div class="content">
      <p>Hey ${data.organizerName}!</p>
      <p>
        <span class="highlight">${data.applicantName}</span> has applied for the
        <span class="highlight">${data.roleName}</span> role at
        <span class="highlight">${data.eventTitle}</span>.
      </p>

      ${
        data.applicationNote
          ? `
      <div style="background: ${colors.cardBg}; border-left: 4px solid ${colors.primary}; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${colors.textMuted};">APPLICATION NOTE:</p>
        <p style="margin: 0; color: ${colors.text};">"${data.applicationNote}"</p>
      </div>
      `
          : ''
      }
    </div>

    <div style="text-align: center;">
      ${ctaButton('Review Application', `${emailConfig.baseUrl}/dashboard/my-events`)}
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: ${colors.textMuted};">
      <p>
        Applications are reviewed by gig managers. You can track application
        status in your event management dashboard.
      </p>
    </div>
  `

  return baseTemplate(content, `New application for ${data.gigTitle}`)
}

export function gigApplicationReceivedSubject(data: GigApplicationReceivedData): string {
  return `📬 New application: ${data.applicantName} for ${data.roleName}`
}
