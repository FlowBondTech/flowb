import React, { useState } from 'react'

function Partners() {
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  
  const partnerCards = [
    {
      title: 'Host Events',
      description: 'Create magical movement experiences and earn $DANZ from every ticket sold',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2"/>
          <path d="M18 20L24 26L30 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="24" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    {
      title: 'Build Community',
      description: 'Connect dancers in your city and grow a thriving local movement scene',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="18" cy="20" r="6" stroke="currentColor" strokeWidth="2"/>
          <circle cx="30" cy="20" r="6" stroke="currentColor" strokeWidth="2"/>
          <circle cx="24" cy="32" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M22 26L26 26M20 30L28 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      title: 'Earn Together',
      description: 'Share in the success with revenue splits and community rewards',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M12 24C12 16 18 8 24 8C30 8 36 16 36 24C36 32 24 40 24 40C24 40 12 32 12 24Z" stroke="currentColor" strokeWidth="2"/>
          <circle cx="24" cy="22" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M24 19V25M21 22H27" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    }
  ]
  
  const handleApplyClick = () => {
    setIsApplyModalOpen(true)
  }

  return (
    <section id="governance" className="section governance-section">
      <div className="container">
        <div className="section-header animate">
          <span className="section-tag">Community Partners</span>
          <h2 className="section-title">Become a FlowHost</h2>
          <p className="section-description">
            Are you a facilitator, DJ, or venue? Join our network of movement leaders and help build the future of conscious community.
          </p>
        </div>
        <div className="utility-grid">
          {partnerCards.map((card, index) => (
            <div key={index} className="utility-card animate">
              <div className="card-gradient"></div>
              <div className="utility-icon">
                {card.icon}
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
        
        <div className="partners-cta animate">
          <button onClick={handleApplyClick} className="btn btn-primary btn-large">
            Apply to be a FlowHost
          </button>
          <p className="cta-note">Join hundreds of facilitators already earning with DANZ.NOW</p>
        </div>
      </div>
    </section>
  )
}

export default Partners