# Frontend healthcare data models

## Current backend persistence format

The API stores one JSON document at `data/carebridge.json`. The root object has `_schema_version: 1` and array buckets: `users`, `patients`, `appointments`, `symptoms`, `records`, `prescriptions`, `consents`, `lab_orders`, `lab_results`, `vitals`, `alerts`, and `audit`. Each stored record has a random `cb-` identifier. Timestamps are UTC ISO strings ending in `Z`. Malformed JSON, invalid buckets/records, duplicate bucket IDs, or unsupported schema versions prevent startup rather than silently replacing the file. Mutations write a sibling `.tmp` and replace the data file atomically on Windows.

Users store `password_hash` as `pbkdf2-sha256$200000$<salt hex>$<digest hex>`; API projections omit that field. Patient profiles reference user IDs. Appointments reference patient profile, patient user, and doctor IDs. Clinical records, prescriptions, consents, laboratory orders/results, symptoms, vitals and alerts reference the patient profile ID. Laboratory orders store doctor, assigned technician, department, test name, purpose, status and timestamps. A CBC result is stored as separate rows for Haemoglobin, WBC and Platelets; units are entered by the technician and reference range remains null unless entered.

Audit rows contain actor ID/role, action, resource ID/path, timestamp, success and a reason; passwords and bearer tokens are excluded. Runtime data is local plaintext JSON and the process-local mutex is not a cross-process transaction or production security boundary.

## How to read this audit

“Declared” means present in `frontend/src/types/healthcare.ts` or a component-local TypeScript type. “Used” describes fields read, rendered, or sent by current components. Component types are expectations, not proof of a server schema. The frontend workspace has no backend to verify them against. Optional (`?`) and nullable (`| null`) are recorded separately.

## Named shared types (`types/healthcare.ts`)

### User

Declared: `id: string`, `email: string`, `full_name: string`, `role: UserRole`, `is_active?: boolean`. `UserRole` is `'patient' | 'doctor' | 'admin' | (string & {})`, so it intentionally permits arbitrary strings. `App.tsx` uses `full_name` and `role`; `authService` returns this type. `is_active` is not used by the UI. ID format and role completeness are unknown.

### PatientProfile

Declared: `id: string`, `user_id: string`, `date_of_birth?: string | null`, `phone?: string | null`. Used by dashboard/profile setup. Date format is not documented as a contract; the input is HTML `date`, which submits `YYYY-MM-DD`. Phone validation/format is not specified.

### LoginRequest / LoginResponse

`LoginRequest` declares email/password strings. `LoginResponse` declares `access_token: string`, `token_type: 'bearer'`, and `expires_in: number`. `authService` separately declares a local response type with `token_type: string`; only access_token is actually consumed. No refresh token or token persistence is modeled.

### PatientProfileCreate

`date_of_birth?: string | null`, `phone?: string | null`. The registration completion form sends both fields, using null for blank input. Both optionality and nullability are supported by the type, but server behavior for omitted versus null is unknown.

### Provider

Declared: `id`, `full_name`, `specialty` required strings; optional `facility`, `location`, `services: string[]`, `availability`. This type is used by mock provider data and `providerService`, not by the mounted doctor-directory component. The live directory caller expects `facility_name` and `facility_address` instead. The intended canonical provider contract is unresolved.

### SymptomSubmission

Declared legacy/simple shape: `symptoms: string`, `duration?: string`, `notes?: string`. No current request call uses it. The mounted symptom UI uses `StructuredSymptomSubmission` instead.

### SymptomCatalogItem

Declared and used: `id: string`, `name: string`, `category: string`, `aliases: string[]`. Used to search/filter symptoms and construct symptom recommendations. ID format, catalog versioning, and whether aliases may be absent are unspecified.

### StructuredSymptomSubmission / SymptomSeverity

Request: `symptom_ids: string[]`, `duration: string`, `severity: 'mild' | 'moderate' | 'severe'`, `notes?: string | null`. UI limits selection to 20 and requires one or more, duration, and severity. Duration is a string selected from `Less than a day`, `1–3 days`, `4–7 days`, `More than a week`, `Recurring`; no string enum is declared in TypeScript.

### SymptomHistoryEntry

Declared: `id`, `patient_id`, `symptoms`, `duration`, `status`, `created_at` strings; `symptom_ids: string[]`; `symptom_names: string[]`; `severity: SymptomSeverity | null`; `notes: string | null`. `SymptomIntake` renders these in the patient's history and uses returned symptom names for local recommendation matching. It does not document timestamp offset rules or status values.

### ClinicalEvent

Declared mock timeline shape: `id: string`; `category: 'visit' | 'prescription' | 'lab_result' | 'vital'`; `title: string`; `date: string`; optional `source` and `description`. It is rendered from `mockTimeline`; no live endpoint is called by the mounted timeline. Date may lack a zone in fixtures.

### VitalReading

Declared mock shape: `id: string`, `type: string`, `value: string | number`, `unit: string`, `recorded_at: string`. Used by synthetic dashboard demo. It is not the shape used by the unmounted `/patients/me/clinical-records` bundle's vitals entries, which use measurement-specific numeric fields.

### PatientAlert / AlertSeverity

Declared: `id`, `reason`, `status`, `created_at` strings and `severity: 'low' | 'medium' | 'high' | 'critical'`. Currently populated from synthetic mock data, not `/alerts`.

## Component-local API types

| Model | Declared fields | Actual use / uncertainty |
|---|---|---|
| Doctor directory entry / `RecommendedDoctor` | `id`, `full_name`, `specialty`; optional nullable `facility_name`, `facility_address` | Search card/profile, consent name display, symptom recommendation. No email, location, service, or availability field is expected here. |
| Availability `SlotResponse` | `doctor_id`, `date`, `slots: string[]` | FindDoctor declares all three; SymptomIntake only reads `slots`. Slot labels appear to be local time but are not formatted or parsed beyond combining with chosen date. |
| Patient appointment | `id`, `doctor_id`, `doctor_name`, `specialty`, `scheduled_at`, `reason`, `created_at`; status union `booked | approved | cancelled | completed` | Rendered and canceled in patient appointment page. The app notification has a narrower, separately declared item and filters `rejected`, which is absent from this union. |
| Doctor appointment | `id`, `patient_id`, `patient_name`, `scheduled_at`, `reason`, `status: string`, `created_at` | Used by doctor appointment page. Runtime values tested in rendering logic include `booked`, `approved`, `rejected`, `completed`, `cancelled`. |
| Doctor profile | `id`, `full_name`, `email`, `specialty`, `registration_number`; optional nullable facility name/address | Rendered in clinician dashboard. Doctor registration requires a registration number, but no type encodes its format. |
| Doctor patient / symptom | patient: `patient_id`, `full_name`, `symptoms: Symptom[]`; optional nullable DOB/phone. Symptom: `id`, `symptoms`, `duration`, `created_at`; optional nullable notes/severity | Used in clinician workspace. Listing text says consent-shared patients, but the frontend cannot define authorization. |
| Consent | `id`, `doctor_id`, `scope`, `status`; optional nullable `revoked_at` | Rendered in ConsentManager. `scope` and `status` are plain strings in the local type; UI grants `profile`, `medical_history`, `vitals`, displays status, and allows revoke when status is `granted` and no revoked timestamp. |
| ClinicalRecord | `id`, `record_type`, `title`, `content`, `created_at` | Mounted patient records screen expects an array and labels only `diagnosis` specially; other values render as clinical note. |
| Prescription | `id`, `filename`, `content_type`, `created_at` | Listed in patient records. Upload uses base64 in JSON, not multipart. Actual size and MIME must be server-validated. |
| Prescription download | Mounted screen expects `{ filename, content_type, file_base64 }`; another helper expects `file_base64`, `content_type` and supplies its own filename | Same download path has different declared caller expectations. See API contract finding. |
| Clinical-record bundle (unmounted component) | `diagnoses[]` with id/diagnosis/optional notes/status/created_at; `notes[]` id/title/content/created_at; `prescriptions[]` id/filename/content_type/created_at; `vitals[]` with nullable measurement fields, notes and recorded_at | Expects an object from the same path where mounted component expects `ClinicalRecord[]`. Not used by App. |

## Relationships and formats inferable from use

- A user is classified in the UI by `role`; a patient profile is loaded separately from `/patients/me`.
- Appointments carry a doctor ID and are associated to patient or doctor by the route context. The frontend does not define database relationships.
- Patient symptom entries carry `patient_id`; doctor patient records carry `patient_id`; consent associates `doctor_id` and scope. All IDs are strings with no specified UUID or other format.
- Doctor patient data is described as consent-shared; no consent enforcement logic is present in the frontend.
- Appointment selection uses a clinic IANA zone configured by `VITE_CAREBRIDGE_TIMEZONE`. The frontend converts wall time to an instant, rejects nonexistent/ambiguous DST times, and sends ISO UTC timestamps. Availability query uses a date string and returns slot labels; exact serialization is unknown.
- DOB fields are date-only HTML form strings. Other real API timestamps are parsed with JavaScript `Date`, usually shown in browser local time. Mock timestamps sometimes have no UTC offset.

## Model questions for contract review

1. Should there be one doctor/provider response type or separate directory/profile shapes?
2. Is patient clinical-record retrieval an array of records or a grouped bundle? The current source asserts both.
3. Which appointment states are canonical, and can a patient ever see `rejected`?
4. Are download responses JSON base64 or raw bytes, and is `filename` always included?
5. What are the exact consent scope/status enums, date-time serialization rules, and ID format?
6. Is the old simple `SymptomSubmission` still part of intended behavior, or obsolete?
