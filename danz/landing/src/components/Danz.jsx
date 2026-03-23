import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SubscriptionModal from './SubscriptionModal'

function Danz() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()
  
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0)
  }, [])
  
  const handleBackClick = () => {
    navigate(-1) // Go back to previous page
  }
  
  const features = [
    {
      title: 'Move-to-Earn',
      description: 'Get rewarded for dancing, activating the floor, and participating in live or virtual dance journeys.'
    },
    {
      title: 'Access Utility',
      description: 'Use $DANZ to unlock events, retreats, exclusive workshops, and immersive wellness & movement experiences.'
    },
    {
      title: 'Social Flow Matching',
      description: 'Connect with people you vibe with — literally. FlowBond wearables detect co-regulation and reward group flow with bonus $DANZ.'
    },
    {
      title: 'Proof of Movement',
      description: 'On-chain verification that you\'re not just watching — you\'re dancing, leading, and co-creating the rhythm.'
    },
    {
      title: 'Collective Rewards',
      description: 'Teams, dance crews, and communities can pool their movement for amplified rewards.'
    },
    {
      title: 'Bridge Between Body & Blockchain',
      description: '$DANZ links the biointelligence of the body with the smart contracts of Web3, offering a new form of embodied economy.'
    }
  ]

  return (
    <div className="danz-page">
      {/* Back Button Header */}
      <div className="danz-header">
        <div className="container">
          <button className="back-button-inline" onClick={handleBackClick}>
            <span className="back-arrow">←</span> BACK HOME
          </button>
        </div>
      </div>
      
      {/* Hero Section */}
      <section className="danz-hero">
        <div className="hero-bg-gradient"></div>
        <div className="container">
          <div className="danz-hero-content animate">
            <h1 className="danz-title gradient-text">$DANZ</h1>
            <p className="danz-tagline">
              Where movement becomes currency,<br />
              connection becomes value,<br />
              and every beat counts.
            </p>
            <p className="danz-intro">
              $DANZ is the official movement token of the FlowBond ecosystem — a decentralized token that rewards dancers, movers, and flow-activators for doing what they love: showing up, moving their bodies, and generating high-vibe energy with others.
            </p>
          </div>
        </div>
      </section>

      {/* What is $DANZ Section */}
      <section className="section">
        <div className="container">
          <div className="section-content animate">
            <h2 className="section-title with-arrow">
              <span className="arrow-icon">›</span>
              What is $DANZ?
            </h2>
            <div className="content-box">
              <p>
                $DANZ is a utility and rewards token designed to power a dance-based economy. It lives at the intersection of dance culture, Web3 technology, and biometric flow states. Through the FlowBond wearable and ecosystem, every dance session, group sync, and flow activation generates real, measurable value — and $DANZ is how that value is distributed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why $DANZ Section */}
      <section className="section danz-features-section">
        <div className="container">
          <div className="section-header animate">
            <h2 className="section-title">Why $DANZ?</h2>
          </div>
          <div className="danz-features-grid">
            {features.map((feature, index) => (
              <div key={index} className="danz-feature-card animate">
                <div className="card-glow"></div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="section vision-section">
        <div className="container">
          <div className="section-content animate">
            <h2 className="section-title with-arrow">
              <span className="arrow-icon">›</span>
              The Vision
            </h2>
            <div className="vision-box">
              <p>
                $DANZ is more than a token — it's a cultural catalyst for regenerative joy and embodied connection. As the FlowBond network grows, $DANZ will become the energetic fuel for a new kind of decentralized movement economy — one where those who move the most, feel the most, and connect the most are the ones who thrive.
              </p>
              <p className="vision-highlight">
                In a world where attention is monetized, $DANZ offers a new paradigm: <span className="gradient-text">presence as value</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section danz-cta">
        <div className="container">
          <div className="cta-content animate">
            <h2>Ready to start earning through movement?</h2>
            <div className="cta-actions">
              <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}>Join the $DANZ Movement</a>
              <a href="/tokenomics" className="btn btn-ghost">View Tokenomics</a>
            </div>
          </div>
        </div>
      </section>
      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

export default Danz