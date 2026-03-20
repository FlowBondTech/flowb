/**
 * Gig Rating Received Email Template
 *
 * Sent when a worker receives a rating from the organizer.
 */

import { baseTemplate, colors, ctaButton, emailConfig, infoBox, successBox } from './base.js'

interface GigRatingReceivedData {
  userName: string
  gigTitle: string
  roleName: string
  eventTitle: string
  rating: number
  feedback?: string
  newAverageRating?: number
}

export function gigRatingReceivedTemplate(data: GigRatingReceivedData): string {
  const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating)
  const ratingColor =
    data.rating >= 4 ? colors.success : data.rating >= 3 ? colors.warning : colors.error

  const content = `
    <h1 class="title">You Got Rated!</h1>
    <p class="subtitle">Feedback from ${data.eventTitle}</p>

    ${
      data.rating >= 4
        ? successBox(`
      <div style="text-align: center;">
        <p class="rating" style="font-size: 32px; margin: 0; letter-spacing: 4px; color: ${ratingColor};">${stars}</p>
        <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: ${colors.text};">${data.rating}/5</p>
      </div>
    `)
        : infoBox(`
      <div style="text-align: center;">
        <p class="rating" style="font-size: 32px; margin: 0; letter-spacing: 4px; color: ${ratingColor};">${stars}</p>
        <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: ${colors.text};">${data.rating}/5</p>
      </div>
    `)
    }

    <div class="content">
      <p>Hey ${data.userName}!</p>
      <p>
        You received a rating for your <span class="highlight">${data.roleName}</span>
        work at <span class="highlight">${data.eventTitle}</span>.
      </p>

      ${
        data.feedback
          ? `
      <div style="background: ${colors.cardBg}; border-left: 4px solid ${colors.primary}; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-style: italic; color: ${colors.textMuted};">"${data.feedback}"</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: ${colors.textMuted};">— Event Organizer</p>
      </div>
      `
          : ''
      }

      ${
        data.newAverageRating
          ? `
      <p>
        Your overall rating is now <span class="highlight">${data.newAverageRating.toFixed(1)}/5</span>.
      </p>
      `
          : ''
      }

      ${
        data.rating >= 4
          ? `
      <p>
        Great job! High ratings help you stand out and get approved for more gigs.
        Keep up the excellent work! 🌟
      </p>
      `
          : data.rating >= 3
            ? `
      <p>
        Good work! There's always room to improve. Check the feedback and keep building
        your reputation on DANZ.
      </p>
      `
            : `
      <p>
        We know every gig is a learning experience. Review the feedback and use it
        to improve for your next opportunity.
      </p>
      `
      }
    </div>

    <div style="text-align: center;">
      ${ctaButton('View Your Profile', `${emailConfig.baseUrl}/dashboard/gigs`)}
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: ${colors.textMuted};">
      <p>
        <strong>Did you know?</strong> Workers with 4.5+ ratings are more likely
        to be approved for premium gigs with higher $DANZ rewards!
      </p>
    </div>
  `

  return baseTemplate(content, `You received a ${data.rating}-star rating for ${data.gigTitle}`)
}

export function gigRatingReceivedSubject(data: GigRatingReceivedData): string {
  if (data.rating >= 4) {
    return `⭐ Great rating! ${data.rating}/5 for ${data.eventTitle}`
  }
  return `You received a ${data.rating}/5 rating`
}
