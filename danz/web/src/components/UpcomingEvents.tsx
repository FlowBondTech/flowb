'use client'

import UpcomingEventsGrid from './UpcomingEventsGrid'

export default function UpcomingEvents() {
  return (
    <section id="events" className="section bg-bg-primary relative overflow-hidden">
      <div className="container relative z-10">
        <UpcomingEventsGrid showTitle={true} />
      </div>
    </section>
  )
}
