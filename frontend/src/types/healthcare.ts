
export type UserRole = 'patient' | 'doctor' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
}

export interface PatientProfile {
  id: string
  full_name: string
  date_of_birth?: string
  blood_group?: string
}

export interface Provider {
  id: string
  full_name: string
  specialty: string
  facility?: string
  location?: string
  services?: string[]
  availability?: string
}

export interface SymptomSubmission {
  symptoms: string
  duration?: string
  notes?: string
}

export interface ClinicalEvent {
  id: string
  category: 'visit' | 'prescription' | 'lab_result' | 'vital'
  title: string
  date: string
  source?: string
  description?: string
}

export interface VitalReading {
  id: string
  type: string
  value: string | number
  unit: string
  recorded_at: string
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface PatientAlert {
  id: string
  severity: AlertSeverity
  reason: string
  status: string
  created_at: string
}
