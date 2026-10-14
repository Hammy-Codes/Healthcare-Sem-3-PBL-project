
import { useState } from 'react'
import { mockVitals, mockAlerts } from '../../services/mockdata'

export default function VitalsAlerts() {
  const [severityFilter, setSeverityFilter] = useState('All')

  const filteredAlerts = mockAlerts.filter((alert) =>
    severityFilter === 'All' ? true : alert.severity === severityFilter
  )

  function formatDate(date: string) {
    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return date

    return parsedDate.toLocaleString()
  }

  return (
    <section className="monitoring-page">
      <h2>Vitals &amp; Alerts</h2>
      <p className="monitoring-subtitle">
        View sample vital readings and demo alerts.
      </p>

      <div className="monitoring-notice">
        <strong>Demo data only</strong>
        <p>
          These values are synthetic examples, not live monitoring.
          Alerts are not medical diagnoses or emergency notifications.
        </p>
      </div>

      <h3 className="monitoring-section-title">Vital Readings</h3>

      <div className="dashboard-grid">
        {mockVitals.map((vital) => (
          <article className="feature-card vital-card" key={vital.id}>
            <h3>{vital.type}</h3>
            <p className="monitoring-value">
              {vital.value} <span>{vital.unit}</span>
            </p>
            <p className="monitoring-timestamp">
              Recorded: {formatDate(vital.recorded_at)}
            </p>
          </article>
        ))}
      </div>

      <div className="monitoring-alert-heading">
        <h3 className="monitoring-section-title">Patient Alerts</h3>

        <label>
          Filter by severity
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
          >
            <option value="All">All severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
      </div>

      <p className="monitoring-count">
        {filteredAlerts.length}{' '}
        {filteredAlerts.length === 1 ? 'alert' : 'alerts'} found
      </p>

      {filteredAlerts.length === 0 ? (
        <div className="monitoring-empty">
          <h3>No demo alerts match</h3>
          <p>Try another severity filter.</p>
        </div>
      ) : (
        <div className="monitoring-alert-list">
          {filteredAlerts.map((alert) => (
            <article className="monitoring-alert" key={alert.id}>
              <div>
                <span className={`severity-tag severity-${alert.severity}`}>
                  {alert.severity.toUpperCase()}
                </span>
                <h4>{alert.reason}</h4>
                <p>Status: {alert.status}</p>
                <p>Recorded: {formatDate(alert.created_at)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
