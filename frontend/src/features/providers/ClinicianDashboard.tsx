import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../../services/api'
import { API_ENDPOINTS } from '../../services/endpoints'
import { dateTimeInZone, getBusinessTimeZone, isBusinessTimeZoneConfigured, wallTimeToInstant } from '../../lib/timezone'

type Profile = { id:string; full_name:string; email:string; specialty:string; registration_number:string; facility_name?:string|null; facility_address?:string|null }
type Symptom = { id:string; symptoms:string; duration:string; notes?:string|null; severity?:string|null; created_at:string }
type Patient = { patient_id:string; full_name:string; date_of_birth?:string|null; phone?:string|null; symptoms:Symptom[] }

export default function ClinicianDashboard() {
 const [profile,setProfile]=useState<Profile|null>(null); const [patients,setPatients]=useState<Patient[]>([]); const [selectedPatientId,setSelectedPatientId]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
 async function load(clearError=false){if(clearError)setError('');try{const [p,pt]=await Promise.all([apiRequest<Profile>(API_ENDPOINTS.doctorProfile),apiRequest<Patient[]>(API_ENDPOINTS.doctorPatients)]);setProfile(p);setPatients(pt)}catch(e){setError(e instanceof Error?e.message:'Could not load doctor workspace')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[])
 if(loading)return <section className="feature-card"><h2>Doctor workspace</h2><p>Loading your clinical workspace…</p></section>
 return <section className="clinician-dashboard"><h2>Doctor Workspace</h2><p>Manage appointment requests and review patient information shared with your account.</p>{error&&<p className="login-error" role="alert">{error}</p>}
 {profile&&<article className="feature-card"><h3>Professional profile</h3><p><strong>{profile.full_name}</strong> · {profile.specialty}</p><p>{profile.email}</p><p>Registration: {profile.registration_number}</p><p>{profile.facility_name||'Independent practice'}{profile.facility_address?` · ${profile.facility_address}`:''}</p></article>}
 <p className="notice">Manage appointment requests in the Appointments tab. This workspace is for patient records and clinical actions.</p>
 <h3>Patients who shared access</h3>
 {patients.length===0?<p className="notice">No patients have granted profile access yet. Patients can grant profile and medical-history access from Share health data.</p>:
 <div className="dashboard-grid">{patients.map(p=><article className="feature-card" key={p.patient_id}>
   <h4>{p.full_name}</h4><p>DOB: {p.date_of_birth?new Date(p.date_of_birth).toLocaleDateString():'Not provided'}</p>
   <p>Recent shared symptom records: {p.symptoms.length}</p>
   <button type="button" onClick={()=>setSelectedPatientId(p.patient_id)}>Open patient profile</button>
 </article>)}</div>}
 {selectedPatientId && (() => {
   const p = patients.find(item => item.patient_id === selectedPatientId)
   if (!p) return null
   return <section className="feature-card patient-profile-detail" aria-label={`${p.full_name} patient profile`} style={{marginTop:24}}>
     <button type="button" className="doctor-details-button" onClick={()=>setSelectedPatientId('')}>Close patient profile</button>
     <h3>{p.full_name} — Clinical profile</h3>
     <div className="dashboard-grid">
       <div className="data-item"><strong>Patient details</strong><p>Date of birth: {p.date_of_birth?new Date(p.date_of_birth).toLocaleDateString():'Not provided'}</p><p>Phone: {p.phone||'Not provided'}</p></div>
       <div className="data-item"><strong>Shared symptom history</strong><p>{p.symptoms.length} records available under current consent.</p></div>
     </div>
     <h4>Recent symptoms</h4>
     {p.symptoms.length===0?<p>No symptoms are shared or recorded.</p>:p.symptoms.map(s=><div className="data-item" key={s.id}><strong>{s.symptoms}</strong><p>{s.severity||'Severity not recorded'} · {s.duration}</p>{s.notes&&<p>{s.notes}</p>}<small>{new Date(s.created_at).toLocaleString()}</small></div>)}
      <PatientLabResults patientId={p.patient_id}/>
      <PatientClinicalTools patientId={p.patient_id} refresh={() => load(true)}/>
      <CreateLabOrder patientId={p.patient_id}/>
   </section>
 })()}
 </section>
}

function PatientLabResults({patientId}:{patientId:string}) {
 const [results,setResults]=useState<{id:string;test_name:string;value:number;unit:string;reference_range?:string|null;timestamp:string}[]>([])
 const [error,setError]=useState('')
 useEffect(()=>{let active=true;apiRequest<typeof results>(`/doctors/me/lab-results?patient_id=${encodeURIComponent(patientId)}`).then(rows=>{if(active)setResults(rows)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Laboratory results unavailable')});return()=>{active=false}},[patientId])
 return <section><h4>Laboratory results</h4>{error&&<p role="alert" className="login-error">{error}</p>}{results.length?results.map(r=><article className="data-item" key={r.id}><strong>{r.test_name}</strong><span>{r.value} {r.unit}</span>{r.reference_range&&<p>Reference range: {r.reference_range}</p>}<small>{new Date(r.timestamp).toLocaleString()}</small></article>):!error&&<p>No completed results for this patient.</p>}</section>
}

function CreateLabOrder({patientId}:{patientId:string}) {
 const [technicians,setTechnicians]=useState<{id:string;full_name:string;department:string}[]>([])
 const [technicianId,setTechnicianId]=useState('')
 const [test,setTest]=useState('CBC')
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 useEffect(()=>{let active=true;apiRequest<typeof technicians>('/doctors/me/lab-technicians').then(rows=>{if(active){setTechnicians(rows);setTechnicianId(rows[0]?.id||'')}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Technician directory unavailable')});return()=>{active=false}},[])
 const selected=technicians.find(t=>t.id===technicianId)
 async function request(){if(!selected)return;setBusy(true);setError('');setMessage('');try{const order=await apiRequest<{id:string}>('/doctors/me/patients/'+encodeURIComponent(patientId)+'/lab-orders',{method:'POST',body:JSON.stringify({test_name:test,technician_id:selected.id,department:selected.department})});setMessage(`Investigation requested and assigned (${order.id}).`)}catch(e){setError(e instanceof Error?e.message:'Unable to request investigation')}finally{setBusy(false)}}
 return <section className="feature-card" style={{marginTop:16}}><h4>Laboratory investigation</h4><p>Requests require current medical-history consent and are assigned to one technician in their registered department.</p>{error&&<p className="login-error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}<label htmlFor={`lab-test-${patientId}`}>Test</label><select id={`lab-test-${patientId}`} value={test} onChange={e=>setTest(e.target.value)}><option value="CBC">Complete Blood Count (CBC)</option><option value="Haemoglobin">Haemoglobin (Hb)</option><option value="WBC">White Blood Cell count (WBC)</option><option value="Platelets">Platelet count</option></select><label htmlFor={`lab-tech-${patientId}`}>Assigned technician</label><select id={`lab-tech-${patientId}`} value={technicianId} onChange={e=>setTechnicianId(e.target.value)}>{technicians.map(t=><option key={t.id} value={t.id}>{t.full_name} · {t.department}</option>)}</select><button type="button" disabled={busy||!selected} onClick={()=>void request()}>{busy?'Requesting…':'Request laboratory investigation'}</button>{!technicians.length&&<p>No laboratory technicians are provisioned yet.</p>}</section>
}

function PatientClinicalTools({patientId,refresh}:{patientId:string;refresh:()=>Promise<void>}) {
 const [type,setType]=useState<'diagnosis'|'note'>('diagnosis'); const [title,setTitle]=useState(''); const [content,setContent]=useState(''); const [file,setFile]=useState<File|null>(null); const [error,setError]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false); const [followupAt,setFollowupAt]=useState(''); const [followupReason,setFollowupReason]=useState('Review and follow-up')
 const minDateTime=dateTimeInZone()
 async function save(){setBusy(true);setError('');setMessage('');try{await apiRequest(`/doctors/me/patients/${patientId}/records`,{method:'POST',body:JSON.stringify({record_type:type,title:title.trim(),content:content.trim()})});setTitle('');setContent('');setMessage('Clinical record saved for this patient.')}catch(e){setError(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}}
 async function upload(){if(!file)return;setBusy(true);setError('');setMessage('');try{if(file.size>8*1024*1024)throw new Error('File must be under 8 MB');if(!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error('Upload PDF, JPEG or PNG');const b64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(new Error('Could not read file'));r.readAsDataURL(file)});await apiRequest(`/doctors/me/patients/${patientId}/prescriptions`,{method:'POST',body:JSON.stringify({filename:file.name,content_type:file.type,file_base64:b64})});setFile(null);setMessage('Prescription uploaded and saved to the patient’s Health Records.')}catch(e){setError(e instanceof Error?e.message:'Upload failed')}finally{setBusy(false)}}
 async function followup(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');setMessage('');try{const selected=wallTimeToInstant(followupAt,getBusinessTimeZone());if(selected.getTime()<=Date.now())throw new Error('Choose a future date and time.');await apiRequest(`/doctors/me/patients/${patientId}/followups`,{method:'POST',body:JSON.stringify({scheduled_at:selected.toISOString(),reason:followupReason.trim()})});setMessage('Follow-up scheduled. It will appear in the patient’s appointments as an in-app follow-up notice.');setFollowupAt('');await refresh()}catch(e){setError(e instanceof Error?e.message:'Could not schedule follow-up')}finally{setBusy(false)}}
 return <div className="feature-card" style={{marginTop:16}}><h4>Clinical actions</h4>{error&&<p className="login-error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}<label>Record type</label><select value={type} onChange={e=>setType(e.target.value as 'diagnosis'|'note')}><option value="diagnosis">Diagnosis / condition</option><option value="note">Consultation note</option></select><label>Title</label><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} placeholder="e.g. Follow-up assessment"/><label>Details</label><textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={10000} placeholder="Enter clinical details"/><button disabled={busy||title.trim().length<2||content.trim().length<2} onClick={()=>void save()}>Save record</button><hr/><label>Prescription PDF/JPEG/PNG (max 8 MB)</label><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>setFile(e.target.files?.[0]||null)}/><button disabled={busy||!file} onClick={()=>void upload()}>{busy&&file?'Uploading…':'Upload prescription'}</button><hr/><h4>Schedule a follow-up</h4>{!isBusinessTimeZoneConfigured()&&<p role="status">Follow-up scheduling is unavailable until the clinic timezone is configured with VITE_CAREBRIDGE_TIMEZONE.</p>}<form onSubmit={followup} className="symptom-form"><label htmlFor={`followup-date-${patientId}`}>Date and time</label><input id={`followup-date-${patientId}`} type="datetime-local" min={minDateTime} value={followupAt} disabled={!isBusinessTimeZoneConfigured()} onChange={e=>setFollowupAt(e.target.value)} required/><label htmlFor={`followup-reason-${patientId}`}>Reason for follow-up</label><input id={`followup-reason-${patientId}`} value={followupReason} onChange={e=>setFollowupReason(e.target.value)} maxLength={300} required/><button type="submit" disabled={!isBusinessTimeZoneConfigured()||busy||!followupAt||!followupReason.trim()}>{busy?'Saving…':'Schedule follow-up'}</button></form></div>
}
