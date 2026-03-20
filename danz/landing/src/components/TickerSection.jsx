import React from 'react'

const tickerItems = [
  { value: '10K+', label: 'Dancers' },
  { value: '500+', label: 'Events Monthly' },
  { value: '12', label: 'Cities' },
  { value: '50K+', label: 'Sessions Tracked' },
  { value: '200+', label: 'Hosts' },
  { value: '30+', label: 'Dance Styles' },
]

// Duplicate for seamless loop
const allItems = [...tickerItems, ...tickerItems]

function TickerSection() {
  return (
    <section className="ticker-section">
      <div className="ticker-track">
        {allItems.map((item, i) => (
          <div key={i} className="ticker-item">
            <span className="ticker-value">{item.value}</span>
            <span className="ticker-label">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TickerSection
