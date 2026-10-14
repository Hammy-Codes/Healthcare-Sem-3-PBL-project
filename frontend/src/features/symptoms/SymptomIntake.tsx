
import { useState, type FormEvent } from 'react'

interface SymptomEntry {
  symptoms: string
  duration: string
  notes: string
}

export default function SymptomIntake() {
  const [symptoms, setSymptoms] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [submittedEntry, setSubmittedEntry] =
    useState<SymptomEntry | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSubmittedEntry({
      symptoms: symptoms.trim(),
      duration,
      notes: notes.trim(),
    })
  }

  function handleReset() {
    setSymptoms('')
    setDuration('')
    setNotes('')
    setSubmittedEntry(null)
  }

  return (
    <section className="symptom-intake">
      <h2>Symptom Intake</h2>
      <p className="symptom-subtitle">
        Record your symptoms and relevant information.
      </p>

      <div className="symptom-demo-notice">
        <strong>Demo mode</strong>
        <p>
          This form stores information only in the current page state.
          It does not send data to a server or provide a diagnosis.
        </p>
      </div>

      <form className="symptom-form" onSubmit={handleSubmit}>
        <label htmlFor="symptoms">Describe your symptoms *</label>
        <textarea
          id="symptoms"
          value={symptoms}
          onChange={(event) => setSymptoms(event.target.value)}
          placeholder="Describe what you are experiencing..."
          rows={4}
          required
        />

        <label htmlFor="duration">How long have you had them? *</label>
        <select
          id="duration"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          required
        >
          <option value="">Select duration</option>
          <option value="Less than a day">Less than a day</option>
          <option value="1–3 days">1–3 days</option>
          <option value="4–7 days">4–7 days</option>
          <option value="More than a week">More than a week</option>
          <option value="Recurring">Recurring</option>
        </select>

        <label htmlFor="notes">Additional notes (optional)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything else you would like to record..."
          rows={3}
        />

        <div className="symptom-actions">
          <button type="submit">Review Entry</button>
          <button type="button" className="secondary-button" onClick={handleReset}>
            Clear Form
          </button>
        </div>
      </form>

      {submittedEntry && (
        <div className="symptom-review" aria-live="polite">
          <h3>Entry Preview</h3>
          <p><strong>Symptoms:</strong> {submittedEntry.symptoms}</p>
          <p><strong>Duration:</strong> {submittedEntry.duration}</p>
          <p>
            <strong>Additional notes:</strong>{' '}
            {submittedEntry.notes || 'None provided'}
          </p>
          <p className="review-demo-label">
            Demo preview only — not saved to a medical record.
          </p>
        </div>
      )}
    </section>
  )
}
