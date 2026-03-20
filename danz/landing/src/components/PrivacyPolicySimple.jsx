import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function PrivacyPolicySimple() {
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
          }}>Privacy Policy</h1>
          
          <p style={{textAlign: 'center', marginBottom: '2rem', opacity: 0.8}}>
            Last updated: December 6, 2024
          </p>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              1. Information We Collect
            </h2>
            <h3 style={{color: 'var(--primary-pink)', marginTop: '1.5rem'}}>Personal Information</h3>
            <p>When you use DANZ.NOW, we may collect personal information including:</p>
            <ul style={{paddingLeft: '1.5rem'}}>
              <li>Name and contact information (email address)</li>
              <li>Wallet addresses and blockchain transaction data</li>
              <li>Device information and usage analytics</li>
              <li>Movement and activity data from FlowBond wearable devices</li>
            </ul>
            
            <h3 style={{color: 'var(--primary-pink)', marginTop: '1.5rem'}}>Movement Data</h3>
            <p>Our FlowBond technology collects movement and biometric data to:</p>
            <ul style={{paddingLeft: '1.5rem'}}>
              <li>Track your dance and movement activities</li>
              <li>Calculate token rewards based on verified movement</li>
              <li>Enable social flow matching and community features</li>
              <li>Provide personalized insights and recommendations</li>
            </ul>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              2. How We Use Your Information
            </h2>
            <p>We use collected information to:</p>
            <ul style={{paddingLeft: '1.5rem'}}>
              <li>Provide and improve our movement tracking and reward services</li>
              <li>Process $DANZ token transactions and rewards</li>
              <li>Enable social features and community matching</li>
              <li>Send important updates about your account and our services</li>
              <li>Comply with legal obligations and prevent fraud</li>
            </ul>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              3. Data Sharing and Disclosure
            </h2>
            <p>We may share your information in the following situations:</p>
            <ul style={{paddingLeft: '1.5rem'}}>
              <li><strong>With Your Consent:</strong> When you explicitly agree to share data</li>
              <li><strong>Service Providers:</strong> With trusted partners who help operate our platform</li>
              <li><strong>Blockchain Networks:</strong> Token transactions are recorded on public blockchains</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p>We never sell your personal information to third parties for marketing purposes.</p>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              4. Your Rights and Choices
            </h2>
            <p>You have the right to:</p>
            <ul style={{paddingLeft: '1.5rem'}}>
              <li>Access, update, or delete your personal information</li>
              <li>Opt out of non-essential communications</li>
              <li>Request a copy of your data in a portable format</li>
              <li>Withdraw consent for data processing (where applicable)</li>
            </ul>
            <p>
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@danz.now" style={{color: 'var(--primary-pink)'}}>
                privacy@danz.now
              </a>
            </p>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h2 style={{color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 110, 199, 0.2)', paddingBottom: '0.5rem'}}>
              5. Contact Us
            </h2>
            <div style={{
              background: 'rgba(255, 110, 199, 0.05)',
              border: '1px solid rgba(255, 110, 199, 0.1)',
              borderRadius: '10px',
              padding: '1.5rem',
              margin: '1rem 0'
            }}>
              <p><strong>Email:</strong> <a href="mailto:privacy@danz.now" style={{color: 'var(--primary-pink)'}}>privacy@danz.now</a></p>
              <p><strong>General inquiries:</strong> <a href="mailto:info@danz.now" style={{color: 'var(--primary-pink)'}}>info@danz.now</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicySimple