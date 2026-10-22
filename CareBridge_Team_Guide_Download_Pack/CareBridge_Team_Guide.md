# CareBridge Project Blueprint & Team Study Guide

This companion is a concise searchable version of the detailed DOCX. The DOCX includes diagrams, tables, model/schema references, file inventory, workflows, security explanations, debugging cases, roadmap and viva answers.

## Project
**Privacy-Aware Clinical Care Platform using Access-Controlled RAG and Continuous Patient Monitoring**

## Stack
- Frontend: React, TypeScript, Vite
- Backend: Python, FastAPI, Pydantic
- Persistence: SQLAlchemy ORM, PostgreSQL, Psycopg
- Schema evolution: Alembic configuration and migrations
- Auth: JWT-based bearer token flow and password hashing

## Key domain models in available source snapshot
- `User`
- `Patient`
- `Facility`
- `Doctor`
- `CareRelationship`
- `PatientConsent`
- `SymptomSubmission`
- `SymptomCatalog`
- `SymptomSubmissionItem`
- `Appointment`

## Pydantic schemas in available source snapshot
- `UserCreate`
- `UserResponse`
- `PatientCreate`
- `PatientResponse`
- `LoginRequest`
- `PatientConsentCreate`
- `PatientConsentResponse`
- `SymptomSubmissionCreate`
- `SymptomSubmissionResponse`
- `SymptomCatalogResponse`
- `StructuredSymptomSubmissionCreate`
- `StructuredSymptomSubmissionResponse`
- `DoctorDirectoryResponse`
- `AppointmentCreate`
- `AppointmentResponse`
- `DoctorRegister`
- `DoctorProfileResponse`
- `DoctorAppointmentResponse`
- `AppointmentDecision`
- `DoctorPatientResponse`

## API routes in available source snapshot
- `GET /`
- `GET /health`
- `POST /auth/login`
- `POST /auth/register/doctor", response_model=UserResponse, status_code=status.HTTP_201_CREATED`
- `GET /auth/me", response_model=UserResponse`
- `GET /patients/me", response_model=PatientResponse`
- `GET /doctors/patients/{patient_id}/profile", response_model=PatientResponse`
- `GET /doctors/directory", response_model=list[DoctorDirectoryResponse]`
- `POST /patients/me/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED`
- `GET /patients/me/appointments", response_model=list[AppointmentResponse]`
- `POST /patients/me/appointments/{appointment_id}/cancel", response_model=AppointmentResponse`
- `GET /doctors/me/profile", response_model=DoctorProfileResponse`
- `GET /doctors/me/appointments", response_model=list[DoctorAppointmentResponse]`
- `PATCH /doctors/me/appointments/{appointment_id}", response_model=DoctorAppointmentResponse`
- `GET /doctors/me/patients", response_model=list[DoctorPatientResponse]`

## Confirmed later runtime additions
- `ClinicalRecord`: doctor-authored patient record with patient/doctor IDs, record type, title, content and timestamp.
- `PrescriptionDocument`: prescription metadata and binary payload; Python attribute `file_base64` mapped to PostgreSQL column `file_data` using `LargeBinary`. Upload decodes Base64 to bytes; download encodes bytes to Base64 for JSON.
- Clinical-record table was missing in the local database; model metadata creation fixed the immediate local issue. A versioned Alembic migration is the repeatable long-term solution.

## Scope cautions
The project is an academic prototype. The Phase-II report describes synthetic/simulated data and lists permission-aware RAG, live device integration, Break Glass, richer monitoring and laboratory workflows as planned/stretch work unless the current repository proves otherwise. See the DOCX for detailed explanations and defence Q&A.

## Important source limitation
The available `carebridge-current.zip` predates some late October 21 changes discussed in conversation. Reconcile exact file-level details against the latest local repository before using this guide as definitive implementation documentation.
