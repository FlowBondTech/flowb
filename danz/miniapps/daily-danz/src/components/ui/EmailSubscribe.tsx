'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface EmailSubscribeProps {
  variant?: 'inline' | 'modal' | 'banner'
  onSuccess?: () => void
  onOpenFullSignup?: () => void
}

export function EmailSubscribe({
  variant = 'inline',
  onSuccess,
  onOpenFullSignup
}: EmailSubscribeProps) {
  const { subscribeEmail, subscribedEmail, openSignupPage } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await subscribeEmail(email)

    if (result) {
      setSuccess(true)
      setEmail('')
      onSuccess?.()
    } else {
      setError('Please enter a valid email address')
    }

    setIsSubmitting(false)
  }

  const handleFullSignup = () => {
    openSignupPage()
    onOpenFullSignup?.()
  }

  // Already subscribed
  if (subscribedEmail || success) {
    return (
      <div className={`email-subscribe email-subscribe--${variant}`}>
        <div className="email-subscribe__success">
          <span className="email-subscribe__check">✓</span>
          <span>You're subscribed! Check your inbox for updates.</span>
        </div>
        <button
          type="button"
          onClick={handleFullSignup}
          className="email-subscribe__full-signup"
        >
          Create full account on DANZ.app →
        </button>
      </div>
    )
  }

  return (
    <div className={`email-subscribe email-subscribe--${variant}`}>
      <div className="email-subscribe__header">
        <h3 className="email-subscribe__title">Stay in the loop</h3>
        <p className="email-subscribe__subtitle">
          Get updates on new features, dance challenges, and rewards
        </p>
      </div>

      <form onSubmit={handleSubmit} className="email-subscribe__form">
        <div className="email-subscribe__input-group">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="email-subscribe__input"
            disabled={isSubmitting}
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="email-subscribe__button"
          >
            {isSubmitting ? '...' : 'Subscribe'}
          </button>
        </div>
        {error && <p className="email-subscribe__error">{error}</p>}
      </form>

      <div className="email-subscribe__divider">
        <span>or</span>
      </div>

      <button
        type="button"
        onClick={handleFullSignup}
        className="email-subscribe__full-signup"
      >
        Sign up on DANZ.app for full features →
      </button>

      <style jsx>{`
        .email-subscribe {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          border: 1px solid rgba(255, 110, 199, 0.2);
        }

        .email-subscribe--banner {
          flex-direction: row;
          align-items: center;
          flex-wrap: wrap;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 12px;
        }

        .email-subscribe--modal {
          padding: 24px;
          background: rgba(20, 20, 30, 0.95);
          border-radius: 20px;
        }

        .email-subscribe__header {
          text-align: center;
        }

        .email-subscribe__title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin: 0 0 4px;
        }

        .email-subscribe__subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .email-subscribe__form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .email-subscribe__input-group {
          display: flex;
          gap: 8px;
        }

        .email-subscribe__input {
          flex: 1;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .email-subscribe__input:focus {
          border-color: #FF6EC7;
        }

        .email-subscribe__input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .email-subscribe__button {
          padding: 12px 20px;
          background: linear-gradient(135deg, #FF6EC7 0%, #7B68EE 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          white-space: nowrap;
        }

        .email-subscribe__button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .email-subscribe__button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .email-subscribe__button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .email-subscribe__error {
          font-size: 12px;
          color: #ff6b6b;
          margin: 0;
          text-align: center;
        }

        .email-subscribe__divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.3);
          font-size: 12px;
        }

        .email-subscribe__divider::before,
        .email-subscribe__divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .email-subscribe__full-signup {
          background: transparent;
          border: 1px solid rgba(255, 110, 199, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          color: #FF6EC7;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }

        .email-subscribe__full-signup:hover {
          background: rgba(255, 110, 199, 0.1);
          border-color: rgba(255, 110, 199, 0.5);
        }

        .email-subscribe__success {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #4ade80;
          font-size: 14px;
          justify-content: center;
        }

        .email-subscribe__check {
          font-size: 18px;
        }
      `}</style>
    </div>
  )
}
