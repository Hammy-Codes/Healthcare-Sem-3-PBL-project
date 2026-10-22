import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../../services/api'
import { API_ENDPOINTS } from '../../services/endpoints'

type Doctor = { id: string; full_name: string; specialty: string; facility_name?: string | null; facility_address?: string | null }
type Appointment = { id: string; doctor_id: string; doctor_name: string; specialty: string; scheduled_at: string; reason: string; status: 'booked' | 'cancelled' | 'completed'; created_at: string }

export default function Appointments() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const [doctorList, appointmentList] = await Promise.all([
        apiRequest<Doctor[]>(API_ENDPOINTS.doctorDirectory),
        apiRequest<Appointment[]>(API_ENDPOINTS.appointments),
      ])
      setDoctors(doctorList); setAppointments(appointmentList)
      if (!doctorId && doctorList.length) setDoctorId(doctorList[0].id)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load appointments.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setSaving(true)
    try {
      const created = await apiRequest<Appointment>(API_ENDPOINTS.appointments, {
        method: 'POST', body: JSON.stringify({ doctor_id: doctorId, scheduled_at: new Date(date).toISOString(), reason }),
      })
      setAppointments((current) => [created, ...current].sort((a,b) => new Date(b.scheduled_at).getTime()-new Date(a.scheduled_at).getTime()))
      setReason(''); setDate(''); setMessage('Appointment booked successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to book appointment.') }
    finally { setSaving(false) }
  }

  async function cancel(id: string) {
    setError(''); setMessage('')
    try {
      const updated = await apiRequest<Appointment>(`${API_ENDPOINTS.appointments}/${id}/cancel`, { method: 'POST' })
      setAppointments((current) => current.map((item) => item.id === id ? updated : item))
      setMessage('Appointment cancelled.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to cancel appointment.') }
  }

  return <section className="appointments-page">
    <h2>Appointments</h2>
    <p className="timeline-subtitle">Book and manage consultations with registered CareBridge doctors.</p>
    {error && <p className="login-error" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    <div className="dashboard-grid">
      <article className="feature-card">
        <h3>Book a consultation</h3>
        {doctors.length === 0 && !loading ? <p>No registered doctors are available yet. Create a doctor account first.</p> : <form onSubmit={book} className="appointment-form">
          <label htmlFor="appointment-doctor">Doctor</label>
          <select id="appointment-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
            {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name} — {doctor.specialty}{doctor.facility_name ? ` · ${doctor.facility_name}` : ''}</option>)}
          </select>
          {doctorId && doctors.find((doctor) => doctor.id === doctorId)?.facility_address && <p>{doctors.find((doctor) => doctor.id === doctorId)?.facility_address}</p>}
          <label htmlFor="appointment-date">Date and time</label>
          <input id="appointment-date" type="datetime-local" value={date} min={new Date(Date.now() + 60000).toISOString().slice(0,16)} onChange={(e) => setDate(e.target.value)} required />
          <label htmlFor="appointment-reason">Reason for visit</label>
          <textarea id="appointment-reason" value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={500} rows={3} placeholder="Briefly describe why you'd like a consultation" required />
          <button type="submit" disabled={saving || loading || !doctors.length}>{saving ? 'Booking…' : 'Book appointment'}</button>
        </form>}
      </article>
      <article className="feature-card">
        <h3>Your appointments</h3>
        {loading ? <p>Loading appointments…</p> : appointments.length === 0 ? <p>No appointments yet. Book your first consultation.</p> : <div className="appointment-list">
          {appointments.map((appointment) => <article className="data-item" key={appointment.id}>
            <strong>{appointment.doctor_name}</strong><span>{appointment.specialty}</span>
            <p>{new Date(appointment.scheduled_at).toLocaleString()}</p><p>{appointment.reason}</p>
            <span className={`appointment-status status-${appointment.status}`}>{appointment.status}</span>
            {appointment.status === 'booked' && <button type="button" className="doctor-details-button" onClick={() => void cancel(appointment.id)}>Cancel appointment</button>}
          </article>)}
        </div>}
      </article>
    </div>
    <p className="demo-note">Appointments are stored by the backend. Confirm appointment details directly with the provider; this demo does not represent real-time provider availability.</p>
  </section>
}
