
export const API_ENDPOINTS = {
  health: '/health',

  auth: {
    login: '/auth/login',
    me: '/auth/me',
  },

  patient: {
    profile: '/patients/me',
    symptoms: '/symptoms',
    timeline: '/patients/me/timeline',
    vitals: '/patients/me/vitals',
  },

  providers: '/providers',
  alerts: '/alerts',
} as const
