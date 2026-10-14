
import type {
  ClinicalEvent,
  PatientAlert,
  PatientProfile,
  Provider,
  VitalReading,
} from '../types/healthcare'

// Synthetic demonstration data only.
// Never use this data as a real patient record.

export const mockPatient: PatientProfile = {
  id: 'demo-patient-001',
  full_name: 'Demo Patient',
  date_of_birth: '2000-01-01',
  blood_group: 'Not provided',
}

export const mockProviders: Provider[] = [
  {
    id: 'demo-provider-001',
    full_name: 'Dr. A. Sharma',
    specialty: 'General Medicine',
    facility: 'Demo Health Centre',
    location: 'Dehradun',
    services: ['General consultation'],
    availability: 'Demo schedule — not live availability',
  },
  {
    id: 'demo-provider-002',
    full_name: 'Dr. R. Mehta',
    specialty: 'Cardiology',
    facility: 'Demo Medical Clinic',
    location: 'Dehradun',
    services: ['Cardiology consultation'],
    availability: 'Demo schedule — not live availability',
  },
]

export const mockTimeline: ClinicalEvent[] = [
  {
    id: 'demo-event-001',
    category: 'visit',
    title: 'Example consultation',
    date: '2026-10-14T10:00:00',
    source: 'Synthetic demo data',
    description: 'Example event to demonstrate the patient timeline.',
  },
  {
    id: 'demo-event-002',
    category: 'lab_result',
    title: 'Example laboratory result',
    date: '2026-10-13T12:00:00',
    source: 'Synthetic demo data',
    description: 'No real laboratory result is represented.',
  },
]

export const mockVitals: VitalReading[] = [
  {
    id: 'demo-vital-001',
    type: 'Heart rate',
    value: 76,
    unit: 'bpm',
    recorded_at: '2026-10-14T10:00:00',
  },
  {
    id: 'demo-vital-002',
    type: 'Oxygen saturation',
    value: 98,
    unit: '%',
    recorded_at: '2026-10-14T10:00:00',
  },
]

export const mockAlerts: PatientAlert[] = [
  {
    id: 'demo-alert-001',
    severity: 'low',
    reason: 'Example demonstration alert',
    status: 'Demo only',
    created_at: '2026-10-14T10:05:00',
  },
]
