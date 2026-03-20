import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function TermsOfService() {
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
              <h1>Terms of Service</h1>
              <p className="last-updated">Last updated: December 6, 2024</p>
            </header>

            <div className="legal-section">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using DANZ.NOW ("the Service"), you agree to be bound by these 
                Terms of Service ("Terms"). If you do not agree to these Terms, you may not 
                use the Service.
              </p>
            </div>

            <div className="legal-section">
              <h2>2. Description of Service</h2>
              <p>
                DANZ.NOW is a movement-to-earn platform that rewards users with $DANZ tokens 
                for verified physical movement and dance activities through our FlowBond 
                wearable technology.
              </p>
              <h3>Key Features:</h3>
              <ul>
                <li>Movement tracking and token rewards</li>
                <li>Social flow matching and community features</li>
                <li>Event hosting and participation</li>
                <li>Blockchain-based token transactions</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>3. Eligibility</h2>
              <p>
                To use DANZ.NOW, you must:
              </p>
              <ul>
                <li>Be at least 18 years old (or legal age in your jurisdiction)</li>
                <li>Have the legal capacity to enter into agreements</li>
                <li>Not be prohibited from using our services under applicable laws</li>
                <li>Provide accurate and complete information during registration</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>4. User Accounts and Responsibilities</h2>
              <h3>Account Security</h3>
              <ul>
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You must notify us immediately of any unauthorized use</li>
                <li>You are liable for all activities that occur under your account</li>
              </ul>
              
              <h3>Prohibited Activities</h3>
              <p>You agree not to:</p>
              <ul>
                <li>Manipulate movement data or attempt to cheat the system</li>
                <li>Use automated devices or software to simulate movement</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Interfere with the proper functioning of the Service</li>
                <li>Attempt to gain unauthorized access to our systems</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>5. $DANZ Tokens and Blockchain</h2>
              <h3>Token Nature</h3>
              <p>
                $DANZ tokens are utility tokens used within the DANZ.NOW ecosystem. 
                They are not securities, investments, or guarantees of profit.
              </p>
              
              <h3>Blockchain Transactions</h3>
              <ul>
                <li>All token transactions are recorded on blockchain networks</li>
                <li>Transactions may be irreversible once confirmed</li>
                <li>Network fees may apply to blockchain transactions</li>
                <li>We are not responsible for blockchain network issues or delays</li>
              </ul>

              <h3>Token Value</h3>
              <p>
                The value of $DANZ tokens may fluctuate. We make no guarantees about 
                token value, liquidity, or exchangeability.
              </p>
            </div>

            <div className="legal-section">
              <h2>6. FlowBond Wearable Devices</h2>
              <p>
                Use of FlowBond devices is subject to:
              </p>
              <ul>
                <li>Proper care and handling as outlined in device documentation</li>
                <li>Regular updates and maintenance requirements</li>
                <li>Compliance with health and safety guidelines</li>
                <li>Accuracy limitations inherent to wearable technology</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>7. Intellectual Property</h2>
              <p>
                All content, trademarks, and intellectual property on DANZ.NOW are owned 
                by us or our licensors. You may not:
              </p>
              <ul>
                <li>Copy, distribute, or modify our proprietary content</li>
                <li>Use our trademarks without permission</li>
                <li>Reverse engineer our software or technology</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>8. Privacy and Data</h2>
              <p>
                Your privacy is important to us. Please review our 
                <a href="/privacy-policy"> Privacy Policy</a> to understand how we collect, 
                use, and protect your information.
              </p>
            </div>

            <div className="legal-section">
              <h2>9. Service Availability</h2>
              <p>
                We strive to maintain service availability but cannot guarantee:
              </p>
              <ul>
                <li>Uninterrupted access to the Service</li>
                <li>Error-free operation</li>
                <li>Compatibility with all devices or platforms</li>
              </ul>
              
              <p>
                We reserve the right to modify, suspend, or discontinue the Service 
                at any time with reasonable notice.
              </p>
            </div>

            <div className="legal-section">
              <h2>10. Disclaimers and Limitations</h2>
              <h3>Health and Safety</h3>
              <p>
                Physical activity involves inherent risks. Consult healthcare professionals 
                before beginning any exercise program. We are not liable for injuries 
                resulting from physical activity.
              </p>

              <h3>Service Disclaimer</h3>
              <p>
                The Service is provided "as is" without warranties of any kind. We disclaim 
                all warranties, express or implied, including merchantability and fitness 
                for a particular purpose.
              </p>

              <h3>Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by law, our liability is limited to the 
                amount you paid for the Service in the past 12 months.
              </p>
            </div>

            <div className="legal-section">
              <h2>11. Indemnification</h2>
              <p>
                You agree to indemnify and hold us harmless from claims arising from:
              </p>
              <ul>
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>12. Dispute Resolution</h2>
              <p>
                Disputes will be resolved through binding arbitration rather than courts, 
                except for small claims court matters. You waive your right to participate 
                in class action lawsuits.
              </p>
            </div>

            <div className="legal-section">
              <h2>13. Changes to Terms</h2>
              <p>
                We may update these Terms periodically. Material changes will be 
                communicated through the Service or email. Continued use constitutes 
                acceptance of updated Terms.
              </p>
            </div>

            <div className="legal-section">
              <h2>14. Termination</h2>
              <p>
                Either party may terminate your account at any time. Upon termination:
              </p>
              <ul>
                <li>Your access to the Service will cease</li>
                <li>Outstanding token balances may be forfeited</li>
                <li>Certain provisions of these Terms will survive termination</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>15. Governing Law</h2>
              <p>
                These Terms are governed by the laws of [Jurisdiction] without regard 
                to conflict of law principles.
              </p>
            </div>

            <div className="legal-section">
              <h2>16. Contact Information</h2>
              <p>
                For questions about these Terms, contact us:
              </p>
              <div className="contact-info">
                <p><strong>Email:</strong> <a href="mailto:legal@danz.now">legal@danz.now</a></p>
                <p><strong>General inquiries:</strong> <a href="mailto:info@danz.now">info@danz.now</a></p>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService