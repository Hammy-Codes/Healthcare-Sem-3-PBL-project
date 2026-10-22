
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { patientService } from '../../services/patientService'
import type {
  SymptomCatalogItem,
  SymptomHistoryEntry,
  SymptomSeverity,
} from '../../types/healthcare'

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
      clearForm()
      setSuccess('Your symptoms were saved successfully.')

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
