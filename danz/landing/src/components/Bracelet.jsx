import React, { useState } from 'react'
import SubscriptionModal from './SubscriptionModal'

function Subscription() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const subscriptionFeatures = [
    'Unlimited event matching',
    'Priority access to popular events',
    'Double $DANZ token rewards',
    'Advanced movement analytics',
    'Community chat and messaging',
    'Exclusive facilitator workshops'
  ]
  
  const handleSubscribe = (plan) => {
    setIsModalOpen(true)
  }

  return (
    <section id="bracelet" className="section bracelet-section">
      <div className="container">
        <div className="section-header animate">
          <span className="section-tag">Premium Access</span>
          <h2 className="section-title">Find Your Flow</h2>
          <p className="section-subtitle">Connect with your vibe through our premium matching system</p>
        </div>
        
        <div className="subscription-plans">
          <div className="plan-card monthly-plan animate">
            <div className="plan-header">
              <h3>Monthly Flow</h3>
            </div>
            <ul className="plan-features">
              {subscriptionFeatures.map((feature, index) => (
                <li key={index}>
                  <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button className="btn btn-primary" onClick={() => handleSubscribe('monthly')}>
              Notify Me
            </button>
          </div>
          
          <div className="plan-card annual-plan animate popular">
            <div className="popular-badge">Most Popular</div>
            <div className="plan-header">
              <h3>Annual Flow</h3>
            </div>
            <ul className="plan-features">
              {subscriptionFeatures.map((feature, index) => (
                <li key={index}>
                  <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button className="btn btn-primary" onClick={() => handleSubscribe('annual')}>
              Notify Me
            </button>
          </div>
        </div>
        
        <div className="subscription-note animate">
          <p>Start with a free account to explore basic features, then upgrade when you're ready to unlock the full FlowBond experience.</p>
        </div>
      </div>
      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  )
}

export default Subscription