import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'

type LabOrder = { id: string; patient_id: string; patient_name?: string; department: string; test_name: string; status: string; created_at: string; purpose?: string }
type ResultRow = { test_name: string; value: number; unit: string; reference_range?: string | null }
const CBC = ['Haemoglobin', 'WBC', 'Platelets'] as const

export default function LabDashboard() {
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [selected, setSelected] = useState<LabOrder | null>(null)
  const [values, setValues] = useState<Record<string, { value: string; unit: string; range: string }>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try { setOrders(await apiRequest<LabOrder[]>('/lab/me/orders')); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load assigned investigations') }
  }
  useEffect(() => { void load() }, [])

  async function open(order: LabOrder) {
    setError(''); setNotice('')
    try {
      if (order.status === 'Assigned') await apiRequest(`/lab/me/orders/${order.id}/start`, { method: 'POST' })
      setSelected(await apiRequest<LabOrder>(`/lab/me/orders/${order.id}`))
      await load()
    }
    catch (e) { setSelected(null); setError(e instanceof Error ? e.message : 'Access denied') }
  }
  async function submit() {
    if (!selected) return
    const names = selected.test_name === 'CBC' ? [...CBC] : [selected.test_name]
    const results: ResultRow[] = []
    for (const name of names) {
      const row = values[name]
      if (!row?.value || !row.unit.trim()) { setError(`Enter a value and unit for ${name}.`); return }
      const value = Number(row.value)
      if (!Number.isFinite(value) || value < 0) { setError(`Enter a valid non-negative value for ${name}.`); return }
      results.push({ test_name: name, value, unit: row.unit.trim(), reference_range: row.range.trim() || null })
    }
    setBusy(true); setError(''); setNotice('')
    try {
      await apiRequest(`/lab/me/orders/${selected.id}/results`, { method: 'POST', body: JSON.stringify({ results }) })
      setNotice('Results submitted and saved. The investigation is complete.')
      setSelected(null); setValues({}); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit results') }
    finally { setBusy(false) }
  }

  const resultNames = selected?.test_name === 'CBC' ? CBC : selected ? [selected.test_name] : []
  return <section className="feature-card">
    <h2>Laboratory investigations</h2>
    <p>Only requests assigned to your laboratory account and department are shown.</p>
    {error && <p className="login-error" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <h3>Assigned requests</h3>
    {orders.length === 0 ? <p>No assigned investigations.</p> : <div className="data-list">{orders.map(order => <article className="data-item" key={order.id}>
      <strong>{order.test_name} · {order.department}</strong><span>{order.status}</span>
      <small>{order.patient_name ? `Patient ${order.patient_name}` : `Patient ref ${order.patient_id}`} · {new Date(order.created_at).toLocaleString()}</small>
      <button type="button" className="doctor-details-button" onClick={() => void open(order)}>Open authorised request</button>
    </article>)}</div>}
    {selected && <section className="feature-card" style={{ marginTop: 20 }}>
      <h3>Investigation details</h3>
      <p><strong>Patient:</strong> {selected.patient_name}</p><p><strong>Test:</strong> {selected.test_name}</p><p><strong>Department:</strong> {selected.department}</p><p><strong>Purpose:</strong> {selected.purpose}</p><p><strong>Status:</strong> {selected.status}</p>
      {selected.status === 'Completed' ? <p>This request has already been completed.</p> : <>
        <h4>Enter results</h4>
        {resultNames.map(name => <fieldset key={name} className="data-item">
          <legend>{name}</legend>
          <label htmlFor={`result-${name}`}>Result value</label><input id={`result-${name}`} type="number" min="0" step="any" value={values[name]?.value ?? ''} onChange={e => setValues(v => ({ ...v, [name]: { ...v[name], value: e.target.value, unit: v[name]?.unit ?? '', range: v[name]?.range ?? '' } }))} />
          <label htmlFor={`unit-${name}`}>Unit</label><input id={`unit-${name}`} value={values[name]?.unit ?? ''} onChange={e => setValues(v => ({ ...v, [name]: { ...v[name], unit: e.target.value, value: v[name]?.value ?? '', range: v[name]?.range ?? '' } }))} />
          <label htmlFor={`range-${name}`}>Reference range (optional)</label><input id={`range-${name}`} value={values[name]?.range ?? ''} onChange={e => setValues(v => ({ ...v, [name]: { ...v[name], range: e.target.value, value: v[name]?.value ?? '', unit: v[name]?.unit ?? '' } }))} />
        </fieldset>)}
        <button type="button" disabled={busy} onClick={() => void submit()}>{busy ? 'Submitting…' : 'Submit results'}</button>
      </>}
      <button type="button" className="doctor-details-button" onClick={() => setSelected(null)}>Close investigation</button>
    </section>}
  </section>
}
