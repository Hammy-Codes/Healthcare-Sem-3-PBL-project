

import {
  mockAlerts,
  mockTimeline,
  mockVitals,
} from './mockdata'
import { apiRequest } from './api'
import { API_ENDPOINTS } from './endpoints'
import type { User } from '../types/healthcare'
import type {
  PatientAlert,
  PatientProfile,
  ClinicalEvent,
  VitalReading,
} from '../types/healthcare'

// Patient profile uses the real backend.
// Timeline, vitals, and alerts still use synthetic demo data.

const DEMO_MODE = true

function demoDelay<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), 400)
  })
}

export const patientService = {
  async getProfile(): Promise<PatientProfile> {
  const [user, profile] = await Promise.all([
    apiRequest<User>(API_ENDPOINTS.auth.me),
    apiRequest<{
      id: string
      user_id: string
      date_of_birth?: string | null
      phone?: string | null
    }>(API_ENDPOINTS.patient.profile),
  ])

  return {
    id: profile.id,
    full_name: user.full_name,
    date_of_birth: profile.date_of_birth ?? undefined,
    blood_group: undefined,
  }
},

  getTimeline(): Promise<ClinicalEvent[]> {
    if (DEMO_MODE) {
      return demoDelay(mockTimeline)
    }

    throw new Error('Real timeline API is not connected yet.')
  },

  getVitals(): Promise<VitalReading[]> {
    if (DEMO_MODE) {
      return demoDelay(mockVitals)
    }

    throw new Error('Real vitals API is not connected yet.')
  },

  getAlerts(): Promise<PatientAlert[]> {
    if (DEMO_MODE) {
      return demoDelay(mockAlerts)
    }

    throw new Error('Real alerts API is not connected yet.')
  },
}
