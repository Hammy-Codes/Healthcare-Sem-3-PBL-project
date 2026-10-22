import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'
import { API_ENDPOINTS } from '../../services/endpoints'

type Appointment = {
  id: string
  doctor_id: string
  doctor_name: string
  specialty: string
  scheduled_at: string
  reason: string
  status: 'booked' | 'approved' | 'cancelled' | 'completed'
  created_at: string
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const list = await apiRequest<Appointment[]>(API_ENDPOINTS.appointments)
      setAppointments(list.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load appointments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function cancel(id: string) {
    setBusyId(id); setError(''); setMessage('')
    try {
      const updated = await apiRequest<Appointment>(`${API_ENDPOINTS.appointments}/${id}/cancel`, { method: 'POST' })
      setAppointments(current => current.map(item => item.id === id ? updated : item))
      setMessage('Appointment cancelled.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to cancel appointment.')
    } finally {
      setBusyId('')
    }
  }

  const active = appointments.filter(a => a.status !== 'cancelled')
  const cancelled = appointments.filter(a => a.status === 'cancelled')
  const upcomingFollowups = active.filter(a => a.reason.toLowerCase().startsWith('follow-up:') && new Date(a.scheduled_at).getTime() > Date.now())

  return <section className="appointments-page">
    <h2>Appointments</h2>
    <p className="timeline-subtitle">Manage consultations you have requested from your symptom recommendations.</p>
    {error && <p className="login-error" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    {upcomingFollowups.length > 0 && <section className="feature-card" aria-live="polite"><h3>Follow-up scheduled by your doctor</h3><p>Your clinician has scheduled a follow-up. Review the date and time below.</p>{upcomingFollowups.map(item => <p key={item.id}><strong>{item.doctor_name}</strong> · {new Date(item.scheduled_at).toLocaleString()} · {item.reason.replace(/^Follow-up:\s*/i, '')}</p>)}</section>}
    {loading ? <p>Loading your appointments…</p> : active.length === 0 ? <article className="feature-card">
      <h3>No appointments yet</h3>
      <p>Record your symptoms first. We'll suggest doctors whose specialties may be relevant, and you can book a consultation directly from those recommendations.</p>
    </article> : <>
      <h3>Your booked doctors</h3>
      <div className="dashboard-grid">{active.map(a => <article className="feature-card" key={a.id}>
        <h3>{a.doctor_name}</h3>
        <p><strong>Specialty:</strong> {a.specialty}</p>
        <p><strong>Date and time:</strong> {new Date(a.scheduled_at).toLocaleString()}</p>
        <p><strong>Reason:</strong> {a.reason}</p>
        <span className={`appointment-status status-${a.status}`}>{a.status}</span>
        {a.status === 'booked' && <p><button type="button" className="doctor-details-button" disabled={busyId === a.id} onClick={() => void cancel(a.id)}>{busyId === a.id ? 'Cancelling…' : 'Cancel appointment'}</button></p>}
      </article>)}</div>
    </>}
    {cancelled.length > 0 && <details className="feature-card"><summary>Cancelled appointments ({cancelled.length})</summary><div className="dashboard-grid">{cancelled.map(a => <article className="data-item" key={a.id}><strong>{a.doctor_name}</strong><p>{a.specialty}</p><p>{new Date(a.scheduled_at).toLocaleString()}</p><span className="appointment-status status-cancelled">Cancelled</span></article>)}</div></details>}
  </section>
}
