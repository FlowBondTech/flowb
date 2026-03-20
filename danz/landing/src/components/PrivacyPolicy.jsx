import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function PrivacyPolicy() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleBackClick = () => {
    navigate(-1)
  }

  return (
    <div className="legal-page" style={{minHeight: '100vh', padding: '120px 0 80px', background: 'var(--bg-primary)'}}>
      {/* Back Button Header */}
      <div style={{position: 'absolute', top: '28px', left: '0', right: '0', zIndex: 10}}>
        <div className="container">
          <button className="back-button-inline" onClick={handleBackClick}>
            <span className="back-arrow">←</span> BACK
          </button>
        </div>
      </div>
      
      <div className="container">
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'var(--bg-card)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '3rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}>
            <header className="legal-document-header">
              <h1>Privacy Policy</h1>
              <p className="last-updated">Last updated: December 6, 2024</p>
            </header>

            <div className="legal-section">
              <h2>1. Information We Collect</h2>
              <h3>Personal Information</h3>
              <p>
                When you use DANZ.NOW, we may collect personal information including:
              </p>
              <ul>
                <li>Name and contact information (email address)</li>
                <li>Wallet addresses and blockchain transaction data</li>
                <li>Device information and usage analytics</li>
                <li>Movement and activity data from FlowBond wearable devices</li>
              </ul>

              <h3>Movement Data</h3>
              <p>
                Our FlowBond technology collects movement and biometric data to:
              </p>
              <ul>
                <li>Track your dance and movement activities</li>
                <li>Calculate token rewards based on verified movement</li>
                <li>Enable social flow matching and community features</li>
                <li>Provide personalized insights and recommendations</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>2. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul>
                <li>Provide and improve our movement tracking and reward services</li>
                <li>Process $DANZ token transactions and rewards</li>
                <li>Enable social features and community matching</li>
                <li>Send important updates about your account and our services</li>
                <li>Comply with legal obligations and prevent fraud</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>3. Data Sharing and Disclosure</h2>
              <p>We may share your information in the following situations:</p>
              <ul>
                <li><strong>With Your Consent:</strong> When you explicitly agree to share data</li>
                <li><strong>Service Providers:</strong> With trusted partners who help operate our platform</li>
                <li><strong>Blockchain Networks:</strong> Token transactions are recorded on public blockchains</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
              <p>
                We never sell your personal information to third parties for marketing purposes.
              </p>
            </div>

            <div className="legal-section">
              <h2>4. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your data:
              </p>
              <ul>
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Secure authentication and access controls</li>
                <li>Compliance with applicable data protection regulations</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>5. Your Rights and Choices</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access, update, or delete your personal information</li>
                <li>Opt out of non-essential communications</li>
                <li>Request a copy of your data in a portable format</li>
                <li>Withdraw consent for data processing (where applicable)</li>
              </ul>
              <p>
                To exercise these rights, contact us at <a href="mailto:privacy@danz.now">privacy@danz.now</a>
              </p>
            </div>

            <div className="legal-section">
              <h2>6. Data Retention</h2>
              <p>
                We retain your information for as long as necessary to provide our services 
                and comply with legal obligations. Movement data may be retained to maintain 
                the integrity of blockchain records and token distribution history.
              </p>
            </div>

            <div className="legal-section">
              <h2>7. International Data Transfers</h2>
              <p>
                DANZ.NOW operates globally. Your data may be transferred to and processed 
                in countries other than your own. We ensure appropriate safeguards are in 
                place to protect your data regardless of where it is processed.
              </p>
            </div>

            <div className="legal-section">
              <h2>8. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will notify you of any 
                material changes by posting the new policy on our website and updating the 
                "Last updated" date.
              </p>
            </div>

            <div className="legal-section">
              <h2>9. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, 
                please contact us:
              </p>
              <div className="contact-info">
                <p><strong>Email:</strong> <a href="mailto:privacy@danz.now">privacy@danz.now</a></p>
                <p><strong>General inquiries:</strong> <a href="mailto:info@danz.now">info@danz.now</a></p>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy