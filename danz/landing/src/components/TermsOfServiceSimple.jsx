import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function TermsOfServiceSimple() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleBackClick = () => {
    navigate(-1)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      paddingTop: '120px',
      paddingBottom: '80px',
      position: 'relative'
    }}>
      {/* Back Button */}
      <div style={{position: 'absolute', top: '28px', left: '0', right: '0', zIndex: 10}}>
        <div className="container">
          <button className="back-button-inline" onClick={handleBackClick}>
            <span className="back-arrow">←</span> BACK
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="container" style={{maxWidth: '800px', margin: '0 auto'}}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '3rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          color: 'var(--text-secondary)',
          lineHeight: '1.6'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            color: 'var(--text-primary)',
            marginBottom: '0.5rem',
            background: 'var(--gradient-neon)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center'
          }}>Terms of Service</h1>
          
          <p style={{textAlign: 'center', marginBottom: '2rem', opacity: 0.8}}>
            Last updated: December 6, 2024
          </p>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using DANZ.NOW ("the Service"), you agree to be bound by these 
              Terms of Service ("Terms"). If you do not agree to these Terms, you may not 
              use the Service.
            </p>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              2. Description of Service
            </h2>
            <p>
              DANZ.NOW is a movement-to-earn platform that rewards users with $DANZ tokens 
              for verified physical movement and dance activities through our FlowBond 
              wearable technology.
            </p>
            <h3 style={{color: 'var(--primary-pink)', marginTop: '1.5rem'}}>Key Features:</h3>
            <ul style={{paddingLeft: '1.5rem'}}>
              <li>Movement tracking and token rewards</li>
              <li>Social flow matching and community features</li>
              <li>Event hosting and participation</li>
              <li>Blockchain-based token transactions</li>
            </ul>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              3. User Responsibilities
            </h2>
            <h3 style={{color: 'var(--primary-pink)', marginTop: '1.5rem'}}>Prohibited Activities</h3>
            <p>You agree not to:</p>
            <ul style={{paddingLeft: '1.5rem'}}>
              <li>Manipulate movement data or attempt to cheat the system</li>
              <li>Use automated devices or software to simulate movement</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Interfere with the proper functioning of the Service</li>
            </ul>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              4. $DANZ Tokens and Blockchain
            </h2>
            <h3 style={{color: 'var(--primary-pink)', marginTop: '1.5rem'}}>Token Nature</h3>
            <p>
              $DANZ tokens are utility tokens used within the DANZ.NOW ecosystem. 
              They are not securities, investments, or guarantees of profit.
            </p>
            
            <h3 style={{color: 'var(--primary-pink)', marginTop: '1.5rem'}}>Blockchain Transactions</h3>
            <ul style={{paddingLeft: '1.5rem'}}>
              <li>All token transactions are recorded on blockchain networks</li>
              <li>Transactions may be irreversible once confirmed</li>
              <li>Network fees may apply to blockchain transactions</li>
              <li>We are not responsible for blockchain network issues or delays</li>
            </ul>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              5. Privacy and Data
            </h2>
            <p>
              Your privacy is important to us. Please review our{' '}
              <a href="/privacy-policy" style={{color: 'var(--primary-pink)'}}>Privacy Policy</a>{' '}
              to understand how we collect, use, and protect your information.
            </p>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              6. Contact Information
            </h2>
            <div style={{
              background: 'rgba(255, 110, 199, 0.05)',
              border: '1px solid rgba(255, 110, 199, 0.1)',
              borderRadius: '10px',
              padding: '1.5rem',
              margin: '1rem 0'
            }}>
              <p><strong>Email:</strong> <a href="mailto:legal@danz.now" style={{color: 'var(--primary-pink)'}}>legal@danz.now</a></p>
              <p><strong>General inquiries:</strong> <a href="mailto:info@danz.now" style={{color: 'var(--primary-pink)'}}>info@danz.now</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsOfServiceSimple