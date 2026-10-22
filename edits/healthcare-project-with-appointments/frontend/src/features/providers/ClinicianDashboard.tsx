
import { useState } from 'react'
import type { PatientProfile } from '../../types/healthcare'
const DEMO_PATIENT_NAME = 'Demo Patient'

interface ClinicianDashboardProps {
  patients: PatientProfile[]
}

export default function ClinicianDashboard({
  patients,
}: ClinicianDashboardProps) {
const [search, setSearch] = useState('')
const [selectedPatient, setSelectedPatient] =
  useState<PatientProfile | null>(null)


   const filteredPatients = patients.filter(() =>
  DEMO_PATIENT_NAME.toLowerCase().includes(search.trim().toLowerCase())
)

  return (
    <section className="clinician-dashboard">
      <h2>Clinician Dashboard</h2>
      <p>Authorized patient records — Demo View</p>

      <div className="patient-search">
        <input
          type="text"
          placeholder="Search patients by name..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search patients by name"
        />

        <span>
          {filteredPatients.length}{' '}
          {filteredPatients.length === 1 ? 'patient' : 'patients'} found
        </span>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="patient-empty">
          <h3>No patients found</h3>
          <p>Try searching with a different name.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {filteredPatients.map((patient) => (
            <div className="feature-card blue-card" key={patient.id}>
              <h3>{DEMO_PATIENT_NAME}</h3>
              <p>
                Date of birth: {patient.date_of_birth || 'Not available'}
              </p>

              <button
  className="view-details-button"
  onClick={() => setSelectedPatient(patient)}
>
  View Details
</button>

            </div>
          ))}
        </div>
      )}
      {selectedPatient && (
  <div className="patient-details">
    <h3>Patient Details</h3>

    <p><strong>Name:</strong> {DEMO_PATIENT_NAME}</p>
    <p><strong>Patient ID:</strong> {selectedPatient.id}</p>
    <p>
      <strong>Date of birth:</strong>{' '}
      {selectedPatient.date_of_birth || 'Not available'}
    </p>


    <button onClick={() => setSelectedPatient(null)}>
      Close Details
    </button>
  </div>
)}
    </section>
  )
}
