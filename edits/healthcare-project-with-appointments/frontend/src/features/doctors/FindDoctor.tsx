
import { useState } from 'react'
import { mockProviders } from '../../services/mockdata'

export default function FindDoctor() {
  const [search, setSearch] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('All')
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null)

  const specialties = [
    'All',
    ...Array.from(new Set(mockProviders.map((doctor) => doctor.specialty))),
  ]

  const filteredDoctors = mockProviders.filter((doctor) => {
    const matchesSearch =
      doctor.full_name.toLowerCase().includes(search.trim().toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(search.trim().toLowerCase()) ||
      (doctor.facility ?? '').toLowerCase().includes(search.trim().toLowerCase())

    const matchesSpecialty =
      selectedSpecialty === 'All' ||
      doctor.specialty === selectedSpecialty

    return matchesSearch && matchesSpecialty
  })

  return (
    <section className="find-doctor">
      <h2>Find a Doctor</h2>
      <p className="doctor-subtitle">
        Explore healthcare providers in this demo directory.
      </p>

      <div className="doctor-demo-notice">
        <strong>Demo directory</strong>
        <p>
          These providers and availability details are fictional examples.
          No appointment can be booked from this page.
        </p>
      </div>

      <div className="doctor-filters">
        <input
          type="search"
          placeholder="Search by name, specialty, or facility..."
          aria-label="Search doctors"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          aria-label="Filter by specialty"
          value={selectedSpecialty}
          onChange={(event) => setSelectedSpecialty(event.target.value)}
        >
          {specialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty === 'All' ? 'All specialties' : specialty}
            </option>
          ))}
        </select>
      </div>

      <p className="doctor-count">
        {filteredDoctors.length}{' '}
        {filteredDoctors.length === 1 ? 'provider' : 'providers'} found
      </p>

      {filteredDoctors.length === 0 ? (
        <div className="doctor-empty">
          <h3>No providers found</h3>
          <p>Try another name or specialty.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {filteredDoctors.map((doctor) => (
            <article className="feature-card doctor-card" key={doctor.id}>
              <div className="doctor-avatar" aria-hidden="true">＋</div>
              <h3>{doctor.full_name}</h3>
              <p><strong>Specialty:</strong> {doctor.specialty}</p>
              <p><strong>Facility:</strong> {doctor.facility || 'Not listed'}</p>
              <p><strong>Location:</strong> {doctor.location || 'Not listed'}</p>
              <p><strong>Availability:</strong> {doctor.availability || 'Not provided'}</p>

              <button
                type="button"
                className="doctor-details-button"
                onClick={() =>
                  setSelectedDoctor(
                    selectedDoctor === doctor.id ? null : doctor.id
                  )
                }
              >
                {selectedDoctor === doctor.id ? 'Hide Details' : 'View Details'}
              </button>

              {selectedDoctor === doctor.id && (
                <div className="doctor-extra-details">
                  <strong>Services</strong>
                  {doctor.services?.length ? (
                    <ul>
                      {doctor.services.map((service) => (
                        <li key={service}>{service}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No service information available.</p>
                  )}
                  <p>Demo listing only — please verify real provider details independently.</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
