
import { useState } from 'react'
import type { ClinicalEvent } from '../../types/healthcare'
import { mockTimeline } from '../../services/mockdata'

export default function PatientTimeline() {
  const [selectedCategory, setSelectedCategory] = useState('All')

  const categories = [
    'All',
    'visit',
    'prescription',
    'lab_result',
    'vital',
  ]

  const events = [...(mockTimeline as ClinicalEvent[])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const filteredEvents =
    selectedCategory === 'All'
      ? events
      : events.filter((event) => event.category === selectedCategory)

  function formatDate(date: string) {
    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return date
    }

    return parsedDate.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <section className="patient-timeline">
      <h2>Patient Timeline</h2>
      <p className="timeline-subtitle">
        A chronological overview of demo clinical events.
      </p>

      <div className="timeline-notice">
        <strong>Demo records only</strong>
        <p>
          These events are sample data, not a real medical history.
          No clinical decisions should be made from this timeline.
        </p>
      </div>

      <label className="timeline-filter-label" htmlFor="timeline-category">
        Filter by event type
      </label>

      <select
        id="timeline-category"
        className="timeline-filter"
        value={selectedCategory}
        onChange={(event) => setSelectedCategory(event.target.value)}
      >
        {categories.map((category) => (
          <option key={category} value={category}>
            {category === 'All'
              ? 'All events'
              : category === 'lab_result'
                ? 'Lab results'
                : category.charAt(0).toUpperCase() + category.slice(1)}
          </option>
        ))}
      </select>

      <p className="timeline-count">
        {filteredEvents.length}{' '}
        {filteredEvents.length === 1 ? 'event' : 'events'} found
      </p>

      {filteredEvents.length === 0 ? (
        <div className="timeline-empty">
          <h3>No events found</h3>
          <p>Try selecting another event type.</p>
        </div>
      ) : (
        <div className="timeline-list">
          {filteredEvents.map((event) => (
            <article className="timeline-event" key={event.id}>
              <div className="timeline-marker" aria-hidden="true" />

              <div className="timeline-event-content">
                <div className="timeline-event-header">
                  <span className="timeline-category">
                    {event.category === 'lab_result'
                      ? 'Lab result'
                      : event.category.charAt(0).toUpperCase() +
                        event.category.slice(1)}
                  </span>

                  <time>{formatDate(event.date)}</time>
                </div>

                <h3>{event.title}</h3>

                {event.source && <p><strong>Source:</strong> {event.source}</p>}

                {event.description && <p>{event.description}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
