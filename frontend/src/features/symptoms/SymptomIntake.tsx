
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { patientService } from '../../services/patientService'
import { apiRequest } from '../../services/api'
import { API_ENDPOINTS } from '../../services/endpoints'
import type {
  SymptomCatalogItem,
  SymptomHistoryEntry,
  SymptomSeverity,
} from '../../types/healthcare'

type RecommendedDoctor = { id: string; full_name: string; specialty: string; facility_name?: string | null; facility_address?: string | null }

const MAX_SELECTED_SYMPTOMS = 20

const DURATION_OPTIONS = [
  'Less than a day',
  '1–3 days',
  '4–7 days',
  'More than a week',
  'Recurring',
]

const SEVERITY_OPTIONS: {
  value: SymptomSeverity
  label: string
  description: string
}[] = [
  {
    value: 'mild',
    label: 'Mild',
    description: 'Noticeable but manageable',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Interferes with some activities',
  },
  {
    value: 'severe',
    label: 'Severe',
    description: 'Significantly affects daily activities',
  },
]

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function SymptomIntake() {
  const [catalog, setCatalog] = useState<SymptomCatalogItem[]>([])
  const [history, setHistory] = useState<SymptomHistoryEntry[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [duration, setDuration] = useState('')
  const [severity, setSeverity] = useState<SymptomSeverity | ''>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recommendedDoctors, setRecommendedDoctors] = useState<RecommendedDoctor[]>([])
  const [recommendationNote, setRecommendationNote] = useState('')
  const [sharingDoctor, setSharingDoctor] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [bookingDate, setBookingDate] = useState<Record<string, string>>({})
  const [bookingTime, setBookingTime] = useState<Record<string, string>>({})
  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>({})
  const [availabilityLoading, setAvailabilityLoading] = useState<Record<string, boolean>>({})
  const [bookingReason, setBookingReason] = useState<Record<string, string>>({})
  const [bookingDoctor, setBookingDoctor] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError('')

      const [catalogResult, historyResult] = await Promise.allSettled([
        patientService.getSymptomCatalog(),
        patientService.getSymptomHistory(),
      ])

      if (!active) return

      if (catalogResult.status === 'fulfilled') {
        setCatalog(catalogResult.value)
      } else {
        setError(
          catalogResult.reason instanceof Error
            ? catalogResult.reason.message
            : 'Unable to load the symptom catalog.',
        )
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value)
      } else if (catalogResult.status === 'fulfilled') {
        setError(
          historyResult.reason instanceof Error
            ? `Catalog loaded, but symptom history could not be loaded: ${historyResult.reason.message}`
            : 'Catalog loaded, but symptom history could not be loaded.',
        )
      }

      setLoading(false)
    }

    void loadData()

    return () => {
      active = false
    }
  }, [])

  const categories = useMemo(
    () =>
      [...new Set(catalog.map((item) => item.category))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [catalog],
  )

  const filteredSymptoms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    return catalog
      .filter((item) => !category || item.category === category)
      .filter((item) => {
        if (!query) return true

        return [item.name, item.category, ...item.aliases]
          .some((value) => value.toLocaleLowerCase().includes(query))
      })
      .sort((a, b) => {
        const categoryComparison = a.category.localeCompare(b.category)
        return categoryComparison || a.name.localeCompare(b.name)
      })
  }, [catalog, search, category])

  const selectedSymptoms = useMemo(() => {
    const byId = new Map(catalog.map((item) => [item.id, item]))
    return selectedIds
      .map((id) => byId.get(id))
      .filter((item): item is SymptomCatalogItem => Boolean(item))
  }, [catalog, selectedIds])

  function toggleSymptom(id: string) {
    setError('')
    setSuccess('')

    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((selectedId) => selectedId !== id)
      }

      if (current.length >= MAX_SELECTED_SYMPTOMS) {
        setError(`You can select up to ${MAX_SELECTED_SYMPTOMS} symptoms.`)
        return current
      }

      return [...current, id]
    })
  }

  function clearForm() {
    setSelectedIds([])
    setDuration('')
    setSeverity('')
    setNotes('')
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (selectedIds.length === 0) {
      setError('Please select at least one symptom.')
      return
    }

    if (!duration) {
      setError('Please select how long you have had these symptoms.')
      return
    }

    if (!severity) {
      setError('Please select a severity level.')
      return
    }

    setSubmitting(true)

    try {
      const result = await patientService.submitStructuredSymptoms({
        symptom_ids: selectedIds,
        duration,
        severity,
        notes: notes.trim() || null,
      })

      setHistory((current) => [
        result,
        ...current.filter((entry) => entry.id !== result.id),
      ])
      // Include catalog names, categories and aliases before clearing the form.
      const symptomText = [
        ...selectedSymptoms.flatMap((item) => [item.name, item.category, ...item.aliases]),
        ...result.symptom_names,
        notes,
      ].join(' ').toLowerCase()
      clearForm()
      setSuccess('Your symptoms were saved successfully.')
      try {
        const doctors = await apiRequest<RecommendedDoctor[]>(API_ENDPOINTS.doctorDirectory)
        const rules: { specialty: string[]; symptoms: string[] }[] = [
          { specialty: ['cardio', 'heart'], symptoms: ['heart', 'cardiac', 'chest pain', 'chest tightness', 'palpitation', 'shortness of breath', 'breathlessness', 'high blood pressure'] },
          { specialty: ['dermat', 'skin'], symptoms: ['rash', 'itch', 'skin', 'acne', 'eczema', 'hair loss'] },
          { specialty: ['gastro', 'digestive'], symptoms: ['stomach', 'abdominal', 'nausea', 'vomit', 'diarrhea', 'constipation', 'digestive', 'heartburn'] },
          { specialty: ['neurolog', 'brain'], symptoms: ['headache', 'migraine', 'dizziness', 'numbness', 'seizure', 'tremor', 'nerve'] },
          { specialty: ['orthop', 'bone', 'musculoskeletal'], symptoms: ['joint', 'bone', 'back pain', 'muscle', 'fracture', 'knee', 'shoulder'] },
          { specialty: ['pulmon', 'respir', 'chest'], symptoms: ['cough', 'breath', 'wheezing', 'lung', 'asthma'] },
          { specialty: ['ophthalm', 'eye'], symptoms: ['eye', 'vision', 'sight'] },
          { specialty: ['ent', 'otolaryng', 'ear nose throat'], symptoms: ['ear', 'nose', 'throat', 'sinus'] },
          { specialty: ['psychiatr', 'mental health', 'psycholog'], symptoms: ['anxiety', 'depression', 'panic', 'sleep', 'stress'] },
          { specialty: ['gynecol', 'obstetr'], symptoms: ['menstrual', 'period', 'pelvic', 'pregnancy'] },
          { specialty: ['endocrin', 'diabet'], symptoms: ['diabetes', 'blood sugar', 'thyroid', 'hormone'] },
          { specialty: ['urolog'], symptoms: ['urinary', 'urine', 'kidney stone', 'bladder'] },
        ]
        const normalizedSymptomText = symptomText
          .normalize('NFKD')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim()
        const matched = doctors.filter(doctor => {
          const specialty = doctor.specialty.toLowerCase()
          return rules.some(rule =>
            rule.specialty.some(term => specialty.includes(term)) &&
            rule.symptoms.some(term => normalizedSymptomText.includes(term)),
          )
        })
        // Never leave the patient with an empty booking path just because a
        // catalog term did not match a specialty keyword exactly. Prefer a
        // general practitioner; otherwise show registered doctors as general
        // options, clearly labelled as not an exact specialty match.
        const general = doctors.filter(doctor =>
          /general|family|primary|internal medicine|general practice|gp\b/i.test(doctor.specialty),
        )
        const suggestions = matched.length ? matched : (general.length ? general : doctors)
        setRecommendedDoctors(suggestions.slice(0, 4))
        setRecommendationNote(matched.length
          ? 'Matched to your symptom keywords and the clinician specialty. This is not a diagnosis.'
          : 'No exact specialty match was found. These are general available clinician options, not a symptom-specific recommendation.')
        if (matched.length === 0) {
          setBookingMessage(doctors.length
            ? 'Your symptoms were saved. No exact specialty match was found; you can still request an appointment with one of these clinicians.'
            : 'Your symptoms were saved, but no active doctor accounts are registered yet.')
        } else {
          setBookingMessage('Your symptoms were saved. Choose a date and available time below to request an appointment.')
        }
      } catch (recommendationError) {
        setRecommendedDoctors([])
        setError(recommendationError instanceof Error
          ? `Symptoms saved, but doctor recommendations could not load: ${recommendationError.message}`
          : 'Symptoms saved, but doctor recommendations could not load.')
      }

    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to save your symptoms. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function bookRecommendedDoctor(doctor: RecommendedDoctor) {
    const date = bookingDate[doctor.id] || ''
    const time = bookingTime[doctor.id] || ''
    const reason = (bookingReason[doctor.id] || '').trim()
    setBookingMessage('')
    if (!date || !time || !reason) {
      setBookingMessage('Choose a date, time, and reason before booking.')
      return
    }
    const scheduled = new Date(`${date}T${time}`)
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
      setBookingMessage('Please choose a future date and time.')
      return
    }
    setBookingDoctor(doctor.id)
    try {
      await apiRequest(API_ENDPOINTS.appointments, {
        method: 'POST',
        body: JSON.stringify({ doctor_id: doctor.id, scheduled_at: scheduled.toISOString(), reason }),
      })
      setBookingMessage(`Appointment request sent to ${doctor.full_name}. You can track it in Appointments.`)
      setBookingDate(current => ({ ...current, [doctor.id]: '' }))
      setBookingTime(current => ({ ...current, [doctor.id]: '' }))
      setBookingReason(current => ({ ...current, [doctor.id]: '' }))
    } catch (e) {
      setBookingMessage(e instanceof Error ? e.message : 'Unable to book this appointment.')
    } finally {
      setBookingDoctor('')
    }
  }

  return (
    <section className="symptom-intake">
      <div className="symptom-heading">
        <div>
          <h2>Symptom Intake</h2>
          <p className="symptom-subtitle">
            Record what you are experiencing to share with your healthcare
            provider.
          </p>
        </div>
        <span className="symptom-catalog-count">
          {catalog.length} symptoms available
        </span>
      </div>

      <div className="symptom-demo-notice">
        <strong>About your symptom record</strong>
        <p>
          Your submission is saved to your patient record. This tool records
          symptoms; it does not diagnose medical conditions.
        </p>
      </div>

      {error && (
        <div className="symptom-feedback symptom-feedback-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div
          className="symptom-feedback symptom-feedback-success"
          role="status"
          aria-live="polite"
        >
          {success}
        </div>
      )}

      {success && (
        <section className="feature-card symptom-recommendations">
          <h3>Recommended doctors</h3>
          <p>{recommendationNote || "Recommendations use symptom keywords and registered doctor specialties. They are not a diagnosis."} Seek urgent care for severe or rapidly worsening symptoms.</p>
          {recommendedDoctors.length === 0 ? <p>No registered doctor matched these symptom keywords. Your symptom record is saved; you can still browse doctors in Find a Doctor.</p> : <div className="dashboard-grid">
            {recommendedDoctors.map((doctor) => (
              <article className="data-item" key={doctor.id}>
                <strong>{doctor.full_name}</strong>
                <p>{doctor.specialty}</p>
                <p>{doctor.facility_name || 'Facility not listed'}</p>
                <div className="appointment-form symptom-booking-form">
                  <label htmlFor={`rec-date-${doctor.id}`}>Appointment date</label>
                  <input id={`rec-date-${doctor.id}`} type="date" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)} value={bookingDate[doctor.id] || ''} onChange={e => {
                    const chosenDate = e.target.value
                    setBookingDate(current => ({ ...current, [doctor.id]: chosenDate }))
                    setBookingTime(current => ({ ...current, [doctor.id]: '' }))
                    if (!chosenDate) { setAvailableSlots(current => ({ ...current, [doctor.id]: [] })); return }
                    setAvailabilityLoading(current => ({ ...current, [doctor.id]: true }))
                    apiRequest<{slots:string[]}>(`/doctors/${doctor.id}/availability?appointment_date=${encodeURIComponent(chosenDate)}`)
                      .then(result => setAvailableSlots(current => ({ ...current, [doctor.id]: result.slots })))
                      .catch(() => setAvailableSlots(current => ({ ...current, [doctor.id]: [] })))
                      .finally(() => setAvailabilityLoading(current => ({ ...current, [doctor.id]: false })))
                  }} />
                  <label htmlFor={`rec-time-${doctor.id}`}>Appointment time</label>
                  <select id={`rec-time-${doctor.id}`} value={bookingTime[doctor.id] || ''} disabled={!bookingDate[doctor.id] || availabilityLoading[doctor.id] || !(availableSlots[doctor.id]?.length)} onChange={e => setBookingTime(current => ({ ...current, [doctor.id]: e.target.value }))}>
                    <option value="">{!bookingDate[doctor.id] ? 'Choose a date first' : availabilityLoading[doctor.id] ? 'Loading available times…' : availableSlots[doctor.id]?.length ? 'Select an available time' : 'No slots available for this date'}</option>
                    {(availableSlots[doctor.id] || []).map(slot => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                  <label htmlFor={`rec-reason-${doctor.id}`}>Reason for consultation</label>
                  <textarea id={`rec-reason-${doctor.id}`} rows={2} maxLength={500} placeholder="Briefly describe what you need help with" value={bookingReason[doctor.id] ?? ''} onChange={e => setBookingReason(current => ({ ...current, [doctor.id]: e.target.value }))} />
                  <button type="button" disabled={bookingDoctor === doctor.id} onClick={() => void bookRecommendedDoctor(doctor)}>{bookingDoctor === doctor.id ? 'Sending request…' : 'Book appointment'}</button>
                </div>
                <button type="button" className="doctor-details-button" disabled={sharingDoctor === doctor.id} onClick={async () => {
                  setSharingDoctor(doctor.id); setShareMessage('');
                  try { await apiRequest(API_ENDPOINTS.patientConsents, { method: 'POST', body: JSON.stringify({ doctor_id: doctor.id, scope: 'profile' }) }); await apiRequest(API_ENDPOINTS.patientConsents, { method: 'POST', body: JSON.stringify({ doctor_id: doctor.id, scope: 'medical_history' }) }); setShareMessage(`Profile and symptom-history access granted to ${doctor.full_name}.`) }
                  catch (e) { setShareMessage(e instanceof Error ? e.message : 'Unable to grant access.') }
                  finally { setSharingDoctor('') }
                }}>Share symptom history</button>
                <button type="button" className="doctor-details-button" disabled={sharingDoctor === `${doctor.id}-vitals`} onClick={async () => {
                  setSharingDoctor(`${doctor.id}-vitals`); setShareMessage('');
                  try { await apiRequest(API_ENDPOINTS.patientConsents, { method: 'POST', body: JSON.stringify({ doctor_id: doctor.id, scope: 'vitals' }) }); setShareMessage(`Vitals access granted to ${doctor.full_name}.`) }
                  catch (e) { setShareMessage(e instanceof Error ? e.message : 'Unable to grant vitals access.') }
                  finally { setSharingDoctor('') }
                }}>Share vitals separately</button>
                <p><small>Sharing records is optional. Symptom history and vitals have separate consent controls. Only share with a clinician you trust.</small></p>
              </article>
            ))}
          </div>}
          {bookingMessage && <p role="status" className="notice">{bookingMessage}</p>}
          {shareMessage && <p role="status" className="notice">{shareMessage}</p>}
        </section>
      )}

      <form className="symptom-form" onSubmit={handleSubmit}>
        <div className="symptom-section-heading">
          <h3>1. Select your symptoms</h3>
          <span>{selectedIds.length}/{MAX_SELECTED_SYMPTOMS} selected</span>
        </div>

        <label htmlFor="symptom-search">Search symptoms</label>
        <input
          id="symptom-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Try headache, stomach pain, or an alias..."
          autoComplete="off"
        />

        <label htmlFor="symptom-category">Browse by category</label>
        <select
          id="symptom-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {selectedSymptoms.length > 0 && (
          <div className="symptom-selected-panel">
            <div className="symptom-section-heading">
              <h4>Selected symptoms</h4>
              <button
                type="button"
                className="symptom-text-button"
                onClick={() => setSelectedIds([])}
              >
                Clear selection
              </button>
            </div>

            <div className="symptom-chip-list">
              {selectedSymptoms.map((item) => (
                <button
                  type="button"
                  className="symptom-chip"
                  key={item.id}
                  onClick={() => toggleSymptom(item.id)}
                  aria-label={`Remove ${item.name}`}
                  title={`Remove ${item.name}`}
                >
                  {item.name} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="symptom-results-header">
          <span>
            {loading
              ? 'Loading symptom catalog…'
              : `${filteredSymptoms.length} matching symptoms`}
          </span>
        </div>

        {!loading && filteredSymptoms.length === 0 && (
          <p className="symptom-empty-state">
            No matching symptoms found. Try another search term or category.
          </p>
        )}

        <div className="symptom-results" aria-label="Available symptoms">
          {filteredSymptoms.map((item) => {
            const selected = selectedIds.includes(item.id)
            const disabled =
              !selected && selectedIds.length >= MAX_SELECTED_SYMPTOMS

            return (
              <label
                className={`symptom-option${selected ? ' is-selected' : ''}`}
                key={item.id}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={disabled || loading}
                  onChange={() => toggleSymptom(item.id)}
                />
                <span className="symptom-option-copy">
                  <strong>{item.name}</strong>
                  <span className="symptom-option-meta">
                    {item.category}
                  </span>
                  {item.aliases.length > 0 && (
                    <span className="symptom-aliases">
                      Also known as: {item.aliases.join(', ')}
                    </span>
                  )}
                </span>
                {selected && (
                  <span className="symptom-selected-mark" aria-hidden="true">
                    ✓
                  </span>
                )}
              </label>
            )
          })}
        </div>

        <div className="symptom-form-divider" />

        <div className="symptom-section-heading">
          <h3>2. Tell us more</h3>
        </div>

        <label htmlFor="symptom-duration">How long have you had them? *</label>
        <select
          id="symptom-duration"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          required
        >
          <option value="">Select duration</option>
          {DURATION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <fieldset className="symptom-severity-fieldset">
          <legend>How severe are your symptoms? *</legend>
          <div className="symptom-severity-options">
            {SEVERITY_OPTIONS.map((option) => (
              <label
                className={`symptom-severity-option${
                  severity === option.value ? ' is-selected' : ''
                }`}
                key={option.value}
              >
                <input
                  type="radio"
                  name="symptom-severity"
                  value={option.value}
                  checked={severity === option.value}
                  onChange={() => setSeverity(option.value)}
                  required
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="symptom-notes">Additional notes (optional)</label>
        <textarea
          id="symptom-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="When symptoms occur, what makes them better or worse, or other details..."
          rows={4}
          maxLength={3000}
        />
        <span className="symptom-character-count">
          {notes.length}/3000 characters
        </span>

        <div className="symptom-actions">
          <button
            type="submit"
            disabled={loading || submitting || catalog.length === 0}
          >
            {submitting ? 'Saving symptoms…' : 'Save symptom record'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={clearForm}
            disabled={submitting}
          >
            Clear form
          </button>
        </div>
      </form>

      <section className="symptom-history" aria-labelledby="symptom-history-title">
        <div className="symptom-section-heading">
          <div>
            <h3 id="symptom-history-title">Your symptom history</h3>
            <p className="symptom-subtitle">
              Previous records saved to your patient account.
            </p>
          </div>
          <button
            type="button"
            className="symptom-text-button"
            onClick={async () => {
              try {
                setError('')
                setHistory(await patientService.getSymptomHistory())
              } catch (historyError) {
                setError(
                  historyError instanceof Error
                    ? historyError.message
                    : 'Unable to refresh symptom history.',
                )
              }
            }}
          >
            Refresh
          </button>
        </div>

        {loading && <p>Loading symptom history…</p>}

        {!loading && history.length === 0 && (
          <p className="symptom-empty-state">
            You have no symptom submissions yet.
          </p>
        )}

        <div className="symptom-history-list">
          {history.map((entry) => {
            const names =
              entry.symptom_names.length > 0
                ? entry.symptom_names
                : entry.symptoms
                    .split(',')
                    .map((name) => name.trim())
                    .filter(Boolean)

            return (
              <article className="symptom-history-card" key={entry.id}>
                <div className="symptom-history-card-header">
                  <time dateTime={entry.created_at}>
                    {formatDate(entry.created_at)}
                  </time>
                  <span className={`symptom-status status-${entry.status}`}>
                    {entry.status}
                  </span>
                </div>

                <h4>{names.join(', ') || 'Symptom record'}</h4>

                <div className="symptom-history-details">
                  <span>
                    <strong>Duration:</strong> {entry.duration}
                  </span>
                  <span>
                    <strong>Severity:</strong>{' '}
                    {entry.severity ?? 'Not recorded'}
                  </span>
                </div>

                {entry.notes && (
                  <p className="symptom-history-notes">
                    <strong>Notes:</strong> {entry.notes}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </section>
  )
}
