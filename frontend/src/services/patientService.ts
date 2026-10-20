
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
  SymptomCatalogItem,
  StructuredSymptomSubmission,
  SymptomHistoryEntry,
} from '../types/healthcare'

// Existing dashboard sections remain in demo mode.
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
