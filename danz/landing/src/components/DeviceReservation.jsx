import React from 'react'
// Simplified device information section without reservation functionality

function DeviceReservation() {
  return (
    <section id="device" className="section device-section">
      <div className="container">
        <div className="section-header animate">
          <span className="section-tag">Coming Soon</span>
          <h2 className="section-title">FlowBond Technology</h2>
          <p className="section-description">
            Revolutionary movement tracking technology that captures your dance data and rewards every move. 
            <br />Stay tuned for more information about our wearable device launching Q4 2025.
          </p>
        </div>

        <div className="device-showcase animate">
          <div className="device-image-container">
            <div className="device-glow"></div>
            <div className="device-placeholder">
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
                <ellipse cx="100" cy="100" rx="80" ry="60" stroke="var(--neon-purple)" strokeWidth="3" opacity="0.8"/>
                <ellipse cx="100" cy="100" rx="60" ry="45" stroke="var(--neon-pink)" strokeWidth="2" opacity="0.6"/>
                <circle cx="100" cy="100" r="20" fill="var(--neon-purple)" opacity="0.9"/>
                <path d="M85 100L95 110L115 90" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="device-features-strip animate">
          <div className="feature-item">
            <svg className="feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C10 2 8 6 8 10s2 8 2 8s2-4 2-8s-2-8-2-8z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.3"/>
              <path d="M5 10c0-3 1.5-5 1.5-5M14.5 5s1.5 2 1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Water Resistant</span>
          </div>
          <div className="feature-item">
            <svg className="feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="6" y="4" width="8" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 7h2M9 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="10" cy="14" r="1" fill="currentColor"/>
            </svg>
            <span>7 Day Battery</span>
          </div>
          <div className="feature-item">
            <svg className="feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 6v8M6 8l4-2l4 2M6 12l4 2l4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Bluetooth 5.0</span>
          </div>
        </div>

        <div className="device-info-grid animate">
          <div className="info-card">
            <div className="info-icon">💃</div>
            <h3>Movement Tracking</h3>
            <p>Advanced sensors capture every movement, from subtle steps to explosive jumps, ensuring accurate $DANZ rewards.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">⚡</div>
            <h3>Real-Time Sync</h3>
            <p>Instant synchronization with the DANZ app for live tracking, social features, and immediate reward distribution.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">🎯</div>
            <h3>Precision Technology</h3>
            <p>FlowBond's proprietary algorithm distinguishes dance movements from regular activity for fair reward calculation.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">🌟</div>
            <h3>Premium Design</h3>
            <p>Sleek, lightweight design that's comfortable for all-day wear and stylish enough for any occasion.</p>
          </div>
        </div>

        <div className="device-coming-soon animate">
          <h3 className="coming-soon-title">Launching Q4 2025</h3>
          <p className="coming-soon-description">
            Be part of the movement revolution. Join our waitlist to get exclusive updates and early access opportunities.
          </p>
          <button 
            className="btn btn-primary btn-large"
            onClick={() => {
              const event = new CustomEvent('openWaitlist')
              window.dispatchEvent(event)
            }}
          >
            Join the Waitlist
          </button>
        </div>
      </div>
    </section>
  )
}

export default DeviceReservation