/**
 * Gig Completed Email Template
 *
 * Sent when a gig is completed and payment is awarded.
 */

import { baseTemplate, colors, ctaButton, emailConfig, infoBox, successBox } from './base.js'

interface GigCompletedData {
  userName: string
  gigTitle: string
  roleName: string
  eventTitle: string
  danzAwarded: number
  bonusDanz?: number
  totalDanzEarned?: number
  totalGigsCompleted?: number
}

export function gigCompletedTemplate(data: GigCompletedData): string {
  const totalReward = data.danzAwarded + (data.bonusDanz || 0)

  const content = `
    <h1 class="title">Gig Complete! 💰</h1>
    <p class="subtitle">You've earned $DANZ for your work</p>

    ${successBox(`
      <div style="text-align: center;">
        <p style="margin: 0; font-size: 14px; color: ${colors.textMuted};">You earned</p>
        <p class="reward" style="font-size: 42px; margin: 8px 0;">+${totalReward} $DANZ</p>
        ${
          data.bonusDanz
            ? `
          <p style="margin: 0; font-size: 14px; color: ${colors.success};">
            Includes ${data.bonusDanz} $DANZ bonus!
          </p>
        `
            : ''
        }
      </div>
    `)}

    <div class="content">
      <p>Hey ${data.userName}!</p>
      <p>
        Great work! You've successfully completed the <span class="highlight">${data.roleName}</span>
        gig at <span class="highlight">${data.eventTitle}</span>.
      </p>
      <p>
        Your $DANZ reward has been added to your account balance.
      </p>
    </div>

    ${infoBox(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${colors.textMuted};">Base Reward</td>
          <td style="padding: 8px 0; color: ${colors.text}; text-align: right;">${data.danzAwarded} $DANZ</td>
        </tr>
        ${
          data.bonusDanz
            ? `
        <tr>
          <td style="padding: 8px 0; color: ${colors.textMuted};">Performance Bonus</td>
          <td style="padding: 8px 0; color: ${colors.success}; text-align: right;">+${data.bonusDanz} $DANZ</td>
        </tr>
        `
            : ''
        }
        <tr style="border-top: 1px solid ${colors.border};">
          <td style="padding: 12px 0; color: ${colors.text}; font-weight: 600;">Total</td>
          <td style="padding: 12px 0; text-align: right;">
            <span style="font-size: 20px; font-weight: bold; color: ${colors.primary};">${totalReward} $DANZ</span>
          </td>
        </tr>
      </table>
    `)}

    ${
      data.totalGigsCompleted || data.totalDanzEarned
        ? `
    <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border-radius: 12px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: ${colors.textMuted};">Your Progress</p>
      <div style="display: flex; justify-content: center; gap: 32px;">
        ${
          data.totalGigsCompleted
            ? `
        <div>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${colors.text};">${data.totalGigsCompleted}</p>
          <p style="margin: 0; font-size: 12px; color: ${colors.textMuted};">Gigs Completed</p>
        </div>
        `
            : ''
        }
        ${
          data.totalDanzEarned
            ? `
        <div>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${colors.primary};">${data.totalDanzEarned}</p>
          <p style="margin: 0; font-size: 12px; color: ${colors.textMuted};">Total $DANZ</p>
        </div>
        `
            : ''
        }
      </div>
    </div>
    `
        : ''
    }

    <div style="text-align: center;">
      ${ctaButton('View Earnings', `${emailConfig.baseUrl}/dashboard/gigs`)}
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: ${colors.textMuted};">
      <p>
        Keep up the great work! The more gigs you complete with high ratings,
        the more opportunities you'll unlock.
      </p>
    </div>
  `

  return baseTemplate(content, `You earned ${totalReward} $DANZ for completing ${data.gigTitle}!`)
}

export function gigCompletedSubject(data: GigCompletedData): string {
  const totalReward = data.danzAwarded + (data.bonusDanz || 0)
  return `💰 You earned ${totalReward} $DANZ!`
}
