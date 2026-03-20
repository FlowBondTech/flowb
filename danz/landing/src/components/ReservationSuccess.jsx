import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getReservation } from '../api/payment'

function ReservationSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [reservation, setReservation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reservationId = searchParams.get('id')

  useEffect(() => {
    if (!reservationId) {
      navigate('/')
      return
    }

    loadReservation()
  }, [reservationId])

  const loadReservation = async () => {
    try {
      const data = await getReservation(reservationId)
      setReservation(data)
    } catch (err) {
      setError('Could not load reservation details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="success-page loading-state">
        <div className="container">
          <motion.div 
            className="loading-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            ⏳
          </motion.div>
          <p>Loading your reservation...</p>
        </div>
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="success-page error-state">
        <div className="container">
          <h1>Oops!</h1>
          <p>{error || 'Reservation not found'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="success-page">
      <div className="container">
        <motion.div 
          className="success-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="success-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              damping: 10,
              stiffness: 100,
              delay: 0.2 
            }}
          >
            🎉
          </motion.div>

          <h1 className="gradient-text">Reservation Confirmed!</h1>
          
          <div className="reservation-details">
            <h2>Order Summary</h2>
            <div className="detail-card">
              <div className="detail-row">
                <span className="label">Package:</span>
                <span className="value">{reservation.package_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Price:</span>
                <span className="value">${reservation.price}</span>
              </div>
              <div className="detail-row">
                <span className="label">Email:</span>
                <span className="value">{reservation.email}</span>
              </div>
              <div className="detail-row">
                <span className="label">Estimated Shipping:</span>
                <span className="value">{reservation.estimated_shipping}</span>
              </div>
              <div className="detail-row">
                <span className="label">Order ID:</span>
                <span className="value small">{reservation.id}</span>
              </div>
            </div>
          </div>

          <div className="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li>
                <span className="step-icon">📧</span>
                <div>
                  <strong>Check Your Email</strong>
                  <p>We've sent your order confirmation and receipt</p>
                </div>
              </li>
              <li>
                <span className="step-icon">🚀</span>
                <div>
                  <strong>Get Launch Updates</strong>
                  <p>We'll notify you as we approach Q4 2025 launch</p>
                </div>
              </li>
              <li>
                <span className="step-icon">📦</span>
                <div>
                  <strong>Device Shipping</strong>
                  <p>Your FlowBond device will ship when the app launches</p>
                </div>
              </li>
              <li>
                <span className="step-icon">💃</span>
                <div>
                  <strong>Join the Community</strong>
                  <p>Connect with other early adopters and dancers</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="success-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Return to Homepage
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => window.location.href = '#bracelet'}
            >
              Explore Premium Plans
            </button>
          </div>

          <div className="thank-you-message">
            <p>Thank you for being an early supporter of the DANZ movement!</p>
            <p className="emoji-line">🌟 💃 🎵 🌍</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default ReservationSuccess