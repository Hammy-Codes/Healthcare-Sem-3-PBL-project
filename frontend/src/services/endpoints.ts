
export const API_ENDPOINTS = {
  health: '/health',

  auth: {
    login: '/auth/login',
    me: '/auth/me',
  },

  patient: {
    profile: '/patients/me',
    symptoms: '/symptoms',
    symptomCatalog: '/symptoms/catalog',
    structuredSymptoms: '/patients/me/symptoms/structured',
    symptomHistory: '/patients/me/symptoms',
    timeline: '/patients/me/timeline',
    vitals: '/patients/me/vitals',
  },

  providers: '/providers',
  alerts: '/alerts',
} as const
