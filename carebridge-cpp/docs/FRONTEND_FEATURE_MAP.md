# Frontend feature-to-API map

“Live API” means a current source call through `apiRequest`; it does not mean a server is present or the call was tested. The new workspace has no backend. “Synthetic” refers to explicit frontend fixtures or client-generated illustrative values.

| Feature | Current API dependencies | Static/mock behavior and gaps |
|---|---|---|
| Login and patient registration | `POST /auth/login`, `GET /auth/me`, `POST /auth/register` | Token only held in memory. Registration auto-logs in. No login persistence, token refresh, or API logout. |
| Doctor registration | `POST /auth/register/doctor`, then login and `/auth/me` | Requires full name, email, password, specialty, registration number. No visible verification/approval workflow. |
| Patient dashboard | `GET /patients/me`; appointments `GET /patients/me/appointments` for notices | Profile is live API call. Vitals and alerts use mock service data. Name comes from `/auth/me`. Dashboard labels sample monitoring data. |
| Patient profile | `GET /patients/me`; `POST /patients/me` after patient signup | Only DOB and phone are gathered. Profile settings menu explicitly says settings are not connected. No update/edit endpoint is called. |
| Doctor dashboard | `GET /doctors/me/profile`, `GET /doctors/me/patients` | API-backed profile and consent-shared symptom list. UI says sharing is consent based, but server must enforce it. Clinical actions call additional record/prescription/follow-up endpoints. |
| Find a doctor | `GET /doctors/directory`, `GET /doctors/{id}/availability?appointment_date=...`, `POST /patients/me/appointments` | Directory/search results are server-backed. Filtering is client-side. Booking is disabled unless clinic timezone configuration is valid. |
| Appointments (patient) | `GET /patients/me/appointments`, `POST /patients/me/appointments/{id}/cancel` | Client sorts by schedule; status vocabulary is inconsistent between patient and doctor callers. Follow-up cards are inferred from reason text prefix. |
| Appointments (doctor) | `GET /doctors/me/appointments`, `PATCH /doctors/me/appointments/{id}` | Client supports approve, decline/reject, and complete actions. Backend must enforce doctor ownership and valid transitions. |
| Symptom intake | `GET /symptoms/catalog?limit=500`, `GET /patients/me/symptoms`, `POST /patients/me/symptoms/structured` | Catalog/history/submission are API-backed. Up to 20 symptom IDs. Specialty recommendation is deterministic client-side keyword matching over directory results; not a clinical assessment. |
| Symptom-driven booking / sharing | `GET /doctors/directory`, availability, appointment POST; consent POST | Recommendations fall back to general doctors or all doctors if no keyword match. Consent actions issue multiple separate POSTs; first can succeed even if later call fails. |
| Patient timeline | No API call from mounted `PatientTimeline` | Renders `mockTimeline` synthetic sample events; endpoint constant `/patients/me/timeline` exists but is unused. |
| Vitals and alerts | No API calls from `VitalsAlerts` | Uses hard-coded/mock `mockVitals`, `mockAlerts`, and generated chart series; `/alerts` is an unused endpoint constant. Not live monitoring. |
| Health records (mounted) | `GET /patients/me/clinical-records`, `GET /patients/me/prescriptions`, `GET /patients/me/prescriptions/{id}/download` | API-backed. Download expects JSON with base64. No route writes records from patient side in this screen. Clinical-record response conflicts with an unmounted component. |
| Health records (alternate component, not mounted) | Same clinical-record and prescription GET routes; `POST /patients/me/vitals`; helper-based prescription download | Source-only component `features/timeline/HealthRecords.tsx` is not imported by App. It expects a different clinical-record response bundle and implements patient vital entry. Do not count it as reachable UI without confirming intended use. |
| Consent management | `GET /doctors/directory`, `GET /patients/me/consents`, `POST /patients/me/consents`, `POST /patients/me/consents/{id}/revoke` | UI knows scopes `profile`, `medical_history`, `vitals`; history shows status. Exact server scope semantics and relationship checks are unknown. |
| Provider service | None in current `App.tsx` feature wiring | `providerService.searchProviders` returns `mockProviders` with a 400ms delay. It is not imported by current source callers. Exported `Provider` model aligns with these mocks, not the live doctor directory component. |

## High-level route dependency list

- Auth: `/auth/register`, `/auth/register/doctor`, `/auth/login`, `/auth/me`.
- Patient profile: `/patients/me` (GET and POST).
- Doctor directory/availability: `/doctors/directory`, `/doctors/{doctor_id}/availability`.
- Patient appointments: `/patients/me/appointments` (GET and POST), `/patients/me/appointments/{id}/cancel` (POST).
- Doctor appointments: `/doctors/me/appointments` (GET), `/doctors/me/appointments/{id}` (PATCH).
- Symptoms: `/symptoms/catalog`, `/patients/me/symptoms`, `/patients/me/symptoms/structured`.
- Consent: `/patients/me/consents` (GET and POST), `/patients/me/consents/{id}/revoke` (POST).
- Doctor workspace: `/doctors/me/profile`, `/doctors/me/patients`, `/doctors/me/patients/{patient_id}/records`, `/prescriptions`, `/followups`.
- Patient records: `/patients/me/clinical-records`, `/patients/me/prescriptions`, `/patients/me/prescriptions/{id}/download`.
- Unmounted extra write: `/patients/me/vitals` (POST).

## Features not established by frontend source

There is no admin workflow, user management page, appointment search, live notifications service, profile editing flow, password reset, email verification, refresh token, server logout, audit history, or real-time monitoring. The existence of a string/type/endpoint constant alone is not evidence of an implemented feature.
