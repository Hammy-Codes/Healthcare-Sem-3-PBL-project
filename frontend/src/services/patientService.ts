
import { apiRequest } from './api'
import { API_ENDPOINTS } from './endpoints'

import type {
  PatientAlert,
  PatientProfile,
  ClinicalEvent,
  VitalReading,
  SymptomCatalogItem,
  StructuredSymptomSubmission,
  SymptomHistoryEntry,
} from '../types/healthcare'

export const patientService = {
  async registerDoctor(payload: { email: string; password: string; full_name: string; specialty: string; registration_number: string }): Promise<void> {
    await apiRequest(API_ENDPOINTS.doctorRegister, { method: 'POST', body: JSON.stringify(payload) })
  },

  async getProfile(): Promise<PatientProfile> {
    return apiRequest<PatientProfile>(API_ENDPOINTS.patient.profile)
  },

  async getSymptomCatalog(): Promise<SymptomCatalogItem[]> {
    const params = new URLSearchParams({ limit: '500' })

    return apiRequest<SymptomCatalogItem[]>(
      `${API_ENDPOINTS.patient.symptomCatalog}?${params.toString()}`,
    )
  },

  async submitStructuredSymptoms(
    submission: StructuredSymptomSubmission,
  ): Promise<SymptomHistoryEntry> {
    return apiRequest<SymptomHistoryEntry>(
      API_ENDPOINTS.patient.structuredSymptoms,
      {
        method: 'POST',
        body: JSON.stringify(submission),
      },
    )
  },

  async getSymptomHistory(): Promise<SymptomHistoryEntry[]> {
    return apiRequest<SymptomHistoryEntry[]>(
      API_ENDPOINTS.patient.symptomHistory,
    )
  },

  getTimeline(): Promise<ClinicalEvent[]> {
    return apiRequest<ClinicalEvent[]>('/patients/me/timeline')
  },

  async getVitals(): Promise<VitalReading[]> {
    const rows = await apiRequest<{id:string;heart_rate:number|null;systolic_bp:number|null;diastolic_bp:number|null;temperature_c:number|null;oxygen_saturation:number|null;weight_kg:number|null;recorded_at:string;simulated:boolean}[]>('/patients/me/vitals')
    const fields: [keyof typeof rows[number], string, string][] = [
      ['heart_rate', 'Heart Rate', 'bpm'], ['systolic_bp', 'Systolic Blood Pressure', 'mmHg'],
      ['diastolic_bp', 'Diastolic Blood Pressure', 'mmHg'], ['temperature_c', 'Temperature', '°C'],
      ['oxygen_saturation', 'Oxygen Saturation', '%'], ['weight_kg', 'Weight', 'kg'],
    ]
    return rows.flatMap(row => fields.flatMap(([field, type, unit]) => {
      const value = row[field]
      return typeof value === 'number' ? [{ id: `${row.id}-${field}`, type, value, unit, recorded_at: row.recorded_at }] : []
    }))
  },

  getAlerts(): Promise<PatientAlert[]> {
    return apiRequest<PatientAlert[]>('/patients/me/alerts')
  },
}
