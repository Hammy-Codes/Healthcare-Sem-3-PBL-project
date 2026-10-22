import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'

type ClinicalRecord = { id: string; record_type: string; title: string; content: string; created_at: string }
type Prescription = { id: string; filename: string; content_type: string; created_at: string }
type PrescriptionFile = { filename: string; content_type: string; file_base64: string }

function saveFile(file: PrescriptionFile) {
  const binary = atob(file.file_base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([bytes], { type: file.content_type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function PatientHealthRecords() {
  const [records, setRecords] = useState<ClinicalRecord[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true); setError(''); setMessage('')
    const [recordsResult, prescriptionsResult] = await Promise.allSettled([
      apiRequest<ClinicalRecord[]>('/patients/me/clinical-records'),
      apiRequest<Prescription[]>('/patients/me/prescriptions'),
    ])
    if (recordsResult.status === 'fulfilled') setRecords(recordsResult.value)
    if (prescriptionsResult.status === 'fulfilled') setPrescriptions(prescriptionsResult.value)
    const failures = [recordsResult, prescriptionsResult].filter(result => result.status === 'rejected')
    if (failures.length) {
      const reason = failures[0].status === 'rejected' ? failures[0].reason : null
      setError(reason instanceof Error ? reason.message : 'Some records could not be loaded. Check the backend connection and refresh.')
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function download(id: string) {
    setDownloading(id); setError(''); setMessage('')
    try {
      const file = await apiRequest<PrescriptionFile>(`/patients/me/prescriptions/${id}/download`)
      saveFile(file)
      setMessage(`Downloaded ${file.filename}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed. Please try again.')
    } finally { setDownloading('') }
  }

  return <section className="feature-card">
    <h2>Health Records</h2>
    <p>Diagnoses, clinical notes and prescriptions shared by your clinician.</p>
    <button type="button" className="doctor-details-button" disabled={loading} onClick={() => void load()}>{loading ? 'Refreshing…' : 'Refresh records'}</button>
    {error && <p className="login-error" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    <h3>Clinical records</h3>
    {loading ? <p>Loading clinical records…</p> : records.length ? records.map(record => <article className="data-item" key={record.id}><strong>{record.record_type === 'diagnosis' ? 'Diagnosis / condition' : 'Clinical note'}: {record.title}</strong><p>{record.content}</p><small>{new Date(record.created_at).toLocaleString()}</small></article>) : <p className="notice">No clinical records yet.</p>}
    <h3>Prescriptions</h3>
    {loading ? <p>Loading prescriptions…</p> : prescriptions.length ? prescriptions.map(prescription => <article className="data-item" key={prescription.id}><strong>{prescription.filename}</strong><p>{new Date(prescription.created_at).toLocaleString()}</p><button type="button" disabled={downloading === prescription.id} onClick={() => void download(prescription.id)}>{downloading === prescription.id ? 'Preparing download…' : 'Download prescription'}</button></article>) : <p className="notice">No prescriptions yet. A successfully uploaded prescription will appear here after refreshing.</p>}
  </section>
}
