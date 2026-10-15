import { apiRequest } from './api'
import { API_ENDPOINTS } from './endpoints'

import {
  mockAlerts,

  mockTimeline,
  mockVitals,
} from './mockdata'

import type {
  PatientAlert,
  PatientProfile,
  ClinicalEvent,
  VitalReading,
} from '../types/healthcare'

// Demo service: returns synthetic data only.
// Real API integration will be added after endpoint contracts are confirmed.

const DEMO_MODE = true

function demoDelay<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), 400)
  })
}

export const patientService = {
 async getProfile(): Promise<PatientProfile> {
  return apiRequest<PatientProfile>(API_ENDPOINTS.patient.profile)
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
