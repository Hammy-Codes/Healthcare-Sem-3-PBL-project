
import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { mockVitals, mockAlerts } from '../../services/mockdata'

export default function VitalsAlerts() {
 const [severityFilter, setSeverityFilter] = useState('All')
const [statusFilter, setStatusFilter] = useState('All')
const [timeRange, setTimeRange] = useState('1h')

const heartRateSamples = [
  { minute: 0, value: 72 },
  { minute: 10, value: 75 },
  { minute: 20, value: 74 },
  { minute: 30, value: 78 },
  { minute: 40, value: 76 },
  { minute: 50, value: 73 },
  { minute: 60, value: 76 },
]

const oxygenSamples = [
  { minute: 0, value: 97 },
  { minute: 10, value: 98 },
  { minute: 20, value: 97 },
  { minute: 30, value: 99 },
  { minute: 40, value: 98 },
  { minute: 50, value: 97 },
  { minute: 60, value: 98 },
]


const is24HourRange = timeRange === '24h'
const intervalMinutes = is24HourRange ? 60 : 10
const rangeMinutes = timeRange === '30m' ? 30 : is24HourRange ? 1440 : 60

function createChartData(samples: { minute: number; value: number }[]) {
  return Array.from(
    { length: rangeMinutes / intervalMinutes + 1 },
    (_, index) => {
      const minute = index * intervalMinutes
      const sample = samples.find((item) => item.minute === minute)

      return {
        time: is24HourRange
          ? `${String(Math.floor(minute / 60)).padStart(2, '0')}:00`
          : `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, '0')}`,
        value:
          sample?.value ??
          samples[Math.floor(minute / 10) % samples.length].value,
      }
    }
  )
}

const heartRateData = createChartData(heartRateSamples)
const oxygenData = createChartData(oxygenSamples)



const filteredAlerts = mockAlerts.filter((alert) => {
  const matchesSeverity =
    severityFilter === 'All' || alert.severity === severityFilter

  const matchesStatus =
    statusFilter === 'All' ||
    alert.status.toLowerCase() === statusFilter.toLowerCase()

  return matchesSeverity && matchesStatus
})

const availableStatuses = [
  ...new Set(mockAlerts.map((alert) => alert.status)),
]

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


<div className="vital-trends-heading">
  <div>
    <h3 className="monitoring-section-title">Vital Trends</h3>
    <p>Illustrative synthetic readings · Not live patient data</p>
  </div>

  <label className="time-range-control">
    <span>Time range</span>
    <select
      value={timeRange}
      onChange={(event) => setTimeRange(event.target.value)}
    >
      <option value="30m">Last 30 minutes</option>
      <option value="1h">Last hour</option>
      <option value="24h">Last 24 hours</option>
    </select>
  </label>
</div>


<div className="vital-charts-grid">
  <article className="vital-chart-card">
    <div className="vital-chart-heading">
      <div>
        <h3>Heart Rate</h3>
        <p>Illustrative readings · beats per minute</p>
      </div>
      <span className="chart-demo-tag">DEMO</span>
    </div>

    <div className="vital-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={heartRateData}
          margin={{ top: 12, right: 12, left: -12, bottom: 4 }}
        >
          <CartesianGrid stroke="#e5edf2" strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[60, 90]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            name="Heart rate"
            stroke="#087e80"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </article>

  <article className="vital-chart-card">
    <div className="vital-chart-heading">
      <div>
        <h3>Oxygen Saturation</h3>
        <p>Illustrative readings · SpO₂ percentage</p>
      </div>
      <span className="chart-demo-tag">DEMO</span>
    </div>

    <div className="vital-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={oxygenData}
          margin={{ top: 12, right: 12, left: -12, bottom: 4 }}
        >
          <CartesianGrid stroke="#e5edf2" strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[90, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            name="SpO₂"
            stroke="#3987c9"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </article>
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
        <label>
  Filter by status
  <select
    value={statusFilter}
    onChange={(event) => setStatusFilter(event.target.value)}
  >
    <option value="All">All statuses</option>
    {availableStatuses.map((status) => (
      <option key={status} value={status}>
        {status}
      </option>
    ))}
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
