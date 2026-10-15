
export type UserRole = 'patient' | 'doctor' | 'admin' | (string & {})

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active?: boolean
}

export interface PatientProfile {
  id: string
  user_id: string
  date_of_birth?: string | null
  phone?: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface PatientProfileCreate {
  date_of_birth?: string | null
  phone?: string | null
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
