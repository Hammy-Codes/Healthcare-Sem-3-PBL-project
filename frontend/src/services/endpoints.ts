
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
  doctorDirectory: '/doctors/directory',
  appointments: '/patients/me/appointments',
  doctorProfile: '/doctors/me/profile',
  doctorAppointments: '/doctors/me/appointments',
  doctorPatients: '/doctors/me/patients',
  doctorRegister: '/auth/register/doctor',
  patientConsents: '/patients/me/consents',
  patientClinicalRecords: '/patients/me/clinical-records',
  patientPrescriptions: '/patients/me/prescriptions',
  alerts: '/alerts',
} as const
