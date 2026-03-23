import React from 'react'
import { useNavigate } from 'react-router-dom'

function Token() {
  const navigate = useNavigate()
  
  const handleLearnMore = (e) => {
    e.preventDefault()
    navigate('/danz')
  }
  
  const tokenFeatures = [
    {
      title: 'Earn by Moving',
      description: 'Every step, dance move, and yoga pose counts',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      title: 'Event Rewards',
      description: 'Bonus tokens for attending community events',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1 4 21 4.9 21 6V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V6C3 4.9 3.9 4 5 4Z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    {
      title: 'Fair Distribution',
      description: '30% of event fees go to the token treasury',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ]

  return (
    <section id="token" className="section token-section">
      <div className="container">
        <div className="token-layout">
          <div className="token-info animate">
            <span className="section-tag">Movement Rewards</span>
            <h2 className="section-title gradient-text">Introducing $DANZ</h2>
            <p className="token-description">
              The world's first dance-based reward token. Turn your rhythm into real rewards – no crypto knowledge required.
            </p>
            
            <div className="token-features">
              {tokenFeatures.map((feature, index) => (
                <div key={index} className="token-feature">
                  <div className="feature-icon-wrap">
                    {feature.icon}
                  </div>
                  <div className="feature-content">
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="token-actions">
              <a href="/danz" onClick={handleLearnMore} className="btn btn-primary">Start Earning</a>
              <a href="/tokenomics" onClick={(e) => { e.preventDefault(); navigate('/tokenomics'); }} className="btn btn-ghost">How It Works</a>
            </div>
          </div>
          
          <div className="token-visual animate">
            <div className="token-display">
              <div className="token-glow"></div>
              <div className="token-inner">
                <span className="token-symbol">$DANZ</span>
                <div className="token-particles">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Token