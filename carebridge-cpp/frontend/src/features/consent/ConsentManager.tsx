import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'
import { API_ENDPOINTS } from '../../services/endpoints'

type Doctor = { id: string; full_name: string; specialty: string }
type Consent = { id: string; doctor_id: string; scope: string; status: string; revoked_at?: string | null }

const scopes = [
  { id: 'profile', label: 'Profile and contact details' },
  { id: 'medical_history', label: 'Symptoms, diagnoses, notes and prescriptions' },
  { id: 'vitals', label: 'Vital readings' },
]

export default function ConsentManager() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [consents, setConsents] = useState<Consent[]>([])
  const [doctorId, setDoctorId] = useState('')
  const [selected, setSelected] = useState(['profile', 'medical_history', 'vitals'])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [doctorRows, consentRows] = await Promise.all([
        apiRequest<Doctor[]>(API_ENDPOINTS.doctorDirectory),
        apiRequest<Consent[]>(API_ENDPOINTS.patientConsents),
      ])
      setDoctors(doctorRows)
      setConsents(consentRows)
      if (doctorRows.length) setDoctorId(current => current || doctorRows[0].id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load permissions')
    }
  }

  useEffect(() => { void load() }, [])

  async function grant() {
    if (!doctorId || !selected.length) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      for (const scope of selected) {
        await apiRequest(API_ENDPOINTS.patientConsents, {
          method: 'POST',
          body: JSON.stringify({ doctor_id: doctorId, scope }),
        })
      }
      setMessage('Access permissions granted.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to grant access')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await apiRequest(`${API_ENDPOINTS.patientConsents}/${id}/revoke`, { method: 'POST' })
      setMessage('Permission revoked.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to revoke access')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="feature-card consent-page">
      <h2>Share health data</h2>
      <p>Choose the doctor and exactly what they may view. You can revoke permissions at any time.</p>
      {error && <p className="login-error" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}

      {doctors.length === 0 ? <div className="empty-state"><h3>No doctors available yet</h3><p>Registered clinicians will appear here when you are ready to share access.</p></div> : (
        <div className="consent-grant-panel">
          <label htmlFor="consent-doctor">Doctor</label>
          <select id="consent-doctor" value={doctorId} onChange={event => setDoctorId(event.target.value)}>
            {doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.full_name} — {doctor.specialty}</option>)}
          </select>
          <h3>Permissions to grant</h3>
          <div className="consent-scope-list">
            {scopes.map(scope => (
              <label className="consent-scope-option" key={scope.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(scope.id)}
                  onChange={event => setSelected(current => event.target.checked ? [...current, scope.id] : current.filter(item => item !== scope.id))}
                />
                <span>{scope.label}</span>
              </label>
            ))}
          </div>
          <button type="button" disabled={busy || !selected.length} onClick={() => void grant()}>
            {busy ? 'Saving…' : 'Grant selected access'}
          </button>
        </div>
      )}

      <section className="consent-history" aria-labelledby="consent-history-title">
        <h3 id="consent-history-title">Permissions history</h3>
        {consents.length === 0 ? <div className="empty-state"><p>No permissions have been granted.</p></div> : (
          <div className="consent-list">
            {consents.map(consent => (
              <article className="data-item consent-item" key={consent.id}>
                <div className="consent-item-copy">
                  <strong>{doctors.find(doctor => doctor.id === consent.doctor_id)?.full_name || 'Doctor'}</strong>
                  <span>{scopes.find(scope => scope.id === consent.scope)?.label || consent.scope}</span>
                </div>
                <div className="consent-item-actions">
                  <span className={`consent-status status-${consent.status}`}>{consent.status}</span>
                  {consent.status === 'granted' && !consent.revoked_at && (
                    <button type="button" className="doctor-details-button danger-button" disabled={busy} onClick={() => void revoke(consent.id)}>
                      Revoke access
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
