import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'
import { API_ENDPOINTS } from '../../services/endpoints'

type Doctor = { id: string; full_name: string; specialty: string; facility_name?: string | null; facility_address?: string | null }
type SlotResponse = { doctor_id: string; date: string; slots: string[] }

export default function FindDoctor() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('All')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Doctor | null>(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [slotLoading, setSlotLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    apiRequest<Doctor[]>(API_ENDPOINTS.doctorDirectory)
      .then(items => { if (active) setDoctors(items) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load doctors') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selected || !date) { setSlots([]); setTime(''); return }
    let active = true
    setSlotLoading(true); setSlots([]); setTime(''); setMessage('')
    apiRequest<SlotResponse>(`/doctors/${selected.id}/availability?appointment_date=${encodeURIComponent(date)}`)
      .then(result => { if (active) setSlots(result.slots) })
      .catch(e => { if (active) setMessage(e instanceof Error ? e.message : 'Unable to load availability') })
      .finally(() => { if (active) setSlotLoading(false) })
    return () => { active = false }
  }, [selected, date])

  const specialties = useMemo(() => ['All', ...Array.from(new Set(doctors.map(d => d.specialty))).sort()], [doctors])
  const filtered = doctors.filter(d =>
    `${d.full_name} ${d.specialty} ${d.facility_name || ''} ${d.facility_address || ''}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (specialty === 'All' || d.specialty === specialty))

  async function book() {
    if (!selected || !date || !time || !reason.trim()) { setMessage('Choose a date, available time, and reason.'); return }
    const scheduled = new Date(`${date}T${time}:00`)
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) { setMessage('Choose a future date and time.'); return }
    setBooking(true); setMessage('')
    try {
      await apiRequest(API_ENDPOINTS.appointments, {
        method: 'POST',
        body: JSON.stringify({ doctor_id: selected.id, scheduled_at: scheduled.toISOString(), reason: reason.trim() }),
      })
      setMessage(`Appointment request sent to ${selected.full_name}. Check Appointments for its status.`)
      setSlots(current => current.filter(slot => slot !== time))
      setTime(''); setReason('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to book this appointment.')
    } finally { setBooking(false) }
  }

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  return <section className="find-doctor">
    <h2>Find a Doctor</h2>
    <p className="doctor-subtitle">View a clinician's profile, see bookable times, and request a consultation. Recommendations are not a diagnosis.</p>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="doctor-filters">
      <input type="search" placeholder="Search name, specialty, facility…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search doctors" />
      <select value={specialty} onChange={e => setSpecialty(e.target.value)} aria-label="Filter specialty">{specialties.map(s => <option key={s}>{s}</option>)}</select>
    </div>
    {loading ? <p>Loading registered doctors…</p> : <>
      <p className="doctor-count">{filtered.length} {filtered.length === 1 ? 'doctor' : 'doctors'} found</p>
      {filtered.length === 0 ? <div className="doctor-empty"><h3>No registered doctors found</h3><p>Try a different search or specialty.</p></div> :
        <div className="dashboard-grid">{filtered.map(d => <article className="feature-card doctor-card" key={d.id}>
          <button type="button" className="doctor-avatar doctor-profile-open" aria-label={`View ${d.full_name} profile`} onClick={() => { setSelected(d); setDate(''); setSlots([]); setMessage('') }}>＋</button>
          <h3>{d.full_name}</h3><p><strong>Specialty:</strong> {d.specialty}</p>
          <p><strong>Facility:</strong> {d.facility_name || 'Not listed'}</p>
          <p><strong>Address:</strong> {d.facility_address || 'Not listed'}</p>
          <button type="button" onClick={() => { setSelected(d); setDate(''); setSlots([]); setMessage('') }}>View profile &amp; book</button>
        </article>)}</div>}
    </>}
    {selected && <div className="doctor-profile-panel feature-card" role="dialog" aria-modal="true" aria-labelledby="doctor-profile-title">
      <button type="button" className="doctor-details-button" onClick={() => { setSelected(null); setDate(''); setTime(''); setMessage('') }}>Close profile</button>
      <h3 id="doctor-profile-title">{selected.full_name}</h3>
      <p><strong>Specialty:</strong> {selected.specialty}</p>
      <p><strong>Facility:</strong> {selected.facility_name || 'Independent practice / not listed'}</p>
      <p><strong>Address:</strong> {selected.facility_address || 'Not listed'}</p>
      <h4>Request an appointment</h4>
      <label htmlFor="doctor-book-date">Choose date</label>
      <input id="doctor-book-date" type="date" min={today} value={date} onChange={e => setDate(e.target.value)} />
      <label htmlFor="doctor-book-time">Available appointment time</label>
      <select id="doctor-book-time" value={time} onChange={e => setTime(e.target.value)} disabled={!date || slotLoading || slots.length === 0}>
        <option value="">{!date ? 'Choose a date first' : slotLoading ? 'Loading availability…' : slots.length ? 'Select an available slot' : 'No available times for this date'}</option>
        {slots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
      </select>
      <label htmlFor="doctor-book-reason">Reason for consultation</label>
      <textarea id="doctor-book-reason" rows={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Briefly describe what you need help with" />
      <button type="button" disabled={booking || !date || !time || !reason.trim()} onClick={() => void book()}>{booking ? 'Requesting…' : 'Request appointment'}</button>
      {message && <p role="status" className="notice">{message}</p>}
      <small>Only slots returned as available by the server can be booked. A request is not confirmed until the clinician approves it.</small>
    </div>}
  </section>
}
