> Historical reference only. Copied during workspace cleanup. Statuses, checkpoint, test counts, and deployment configuration may be stale. This document describes the old Python-to-Drogon migration, not the planned C/C++ file-storage backend. Verify every contract against retained frontend code and authoritative project sources before relying on it.
# CareBridge Python-to-C++ parity inventory

**Checkpoint:** started from `63d5bbc60d7f62e40b7662d1f9d9576781178616` on `codex/cpp-backend-migration`. **Scope:** static comparison of `backend/main.py`, `backend/schemas.py`, `backend/models.py`, Python Alembic revisions, `backend-cpp/src/main.cpp`, and the isolated schema/test suites. No `.env` file or database was read in this audit.

## Status meaning and result

- **MATCH** means equivalent contract and relevant success/error/authorization behavior has evidence across the supported cases.
- **PARTIAL** means a corresponding C++ route exists and representative synthetic behavior is tested, but complete edge-case parity is not established.
- **UNVERIFIED** means the handler or model correspondence is not sufficiently covered or compared.
- **BLOCKED** means parity with the deployed/shared schema cannot be established without an owner decision or verified deployed-schema evidence.
- **MISSING** means no corresponding C++ implementation was found.

Static path/method comparison found all **33** Python route operations in the C++ handler registry. C++ has one extra operation, `GET /health/db`. This proves route registration only; it does not prove behavior. No route is marked `MATCH`. Most API families have representative synthetic integration, differential, or browser tests; route-specific remaining gaps are shown below. Clinical/prescription storage is additionally **BLOCKED** for deployed-schema parity.

## Route operation matrix

Sources are Python `backend/main.py` / `backend/schemas.py` and C++ `backend-cpp/src/main.cpp`. “Test evidence” names test groups; Phase 11 counts were historical at this audit and were not rerun here. Any field rules refer to Pydantic schemas, not a claim that C++ validation matches every Pydantic error detail.

| Python operation | Contract / access boundary | C++ correspondence | Evidence / status |
| --- | --- | --- | --- |
| `GET /` | Static service JSON; public | Handler present | No focused parity case; **UNVERIFIED** |
| `GET /health` | Public health JSON | Handler present | No focused parity case; **UNVERIFIED** |
| `POST /auth/register` | `UserCreate(email,password,full_name)`; returns public `UserResponse`; 201; password 8–128 chars | Handler present | Auth integration/differential and E2E signup cover representative registration; **PARTIAL** |
| `POST /auth/login` | `LoginRequest(email,password)`; HS256 bearer token response | Handler present | Python Argon2 hash login, bad credentials, validation, JWT and differential tests; **PARTIAL** |
| `POST /auth/register/doctor` | `DoctorRegister` plus specialty and registration number; 201; creates user+doctor atomically | Handler present | Atomic doctor registration integration test and browser onboarding; **PARTIAL** |
| `GET /auth/me` | Authenticated user’s `UserResponse`; active account/token required | Handler present | Valid/invalid/expired token and inactive-user tests; mixed-case bearer regression added but DB-backed API execution was blocked; **PARTIAL** |
| `POST /patients/me` | Patient role; optional date of birth and phone ≤30; 201 | Handler present | Create/get/duplicate/validation integration and browser onboarding; **PARTIAL** |
| `GET /patients/me` | Patient role/profile owner only | Handler present | Profile integration tests; **PARTIAL** |
| `GET /doctors/patients/{patient_id}/profile` | Doctor role, active care relationship and valid `profile` consent | Handler present | Consent/profile access integration and differential cases; **PARTIAL** |
| `POST /patients/me/consents` | Patient role; doctor UUID; scope `profile`, `medical_history`, or `vitals`; optional expiry | Handler present | Grant/list/revoke/doctor-profile tests and E2E grant; **PARTIAL** |
| `GET /patients/me/consents` | Patient-owned consent list | Handler present | Consent integration and E2E consent read; **PARTIAL** |
| `POST /patients/me/consents/{consent_id}/revoke` | Patient owner; only own consent; revoke state/timestamp | Handler present | Consent revoke integration/differential; **PARTIAL** |
| `POST /patients/me/symptoms` | Patient role; free text symptoms 3–5000, duration 1–100, notes ≤3000 | Handler present | Free-text symptom integration/differential; **PARTIAL** |
| `GET /patients/me/symptoms` | Patient’s own symptom submissions | Handler present | No dedicated list contract matrix; **PARTIAL** via symptom family only |
| `POST /patients/me/symptoms/structured` | Patient role; 1–20 symptom IDs, severity enum, duration, optional notes; catalog validation | Handler present | Deduplication/inactive catalog tests and browser symptom intake; **PARTIAL** |
| `GET /symptoms/catalog` | Public active catalog search/category/limit (1–500) | Handler present | Catalog query integration/differential; whitespace-only category fix and limit empty/whitespace/large-integer regressions added; database-backed execution remains blocked; **PARTIAL** |
| `GET /doctors/directory` | Public active doctor list/search; facility fields nullable | Handler present | Directory/availability integration and browser discovery; **PARTIAL** |
| `GET /doctors/{doctor_id}/availability` | Public date query; business-zone opening hours and occupied slots | Handler present | Hourly availability and DST differential tests; **PARTIAL**; clinic-zone policy is unresolved |
| `POST /patients/me/appointments` | Patient role; doctor UUID, timezone-aware future date, reason 3–500; 201; active doctor, opening hours, availability/conflict checks | Handler present | Patient booking, invalid time, inactive doctor, conflict, concurrency and differential tests; **PARTIAL**; live timezone is unresolved |
| `GET /patients/me/appointments` | Patient’s appointments, ordered response | Handler present | Appointment integration/differential and browser list; **PARTIAL** |
| `POST /patients/me/appointments/{appointment_id}/cancel` | Owning patient; booked-only cancellation; write fence | Handler present | Cancel integration/differential and browser flow; **PARTIAL** |
| `GET /doctors/me/profile` | Doctor’s own profile with optional facility | Handler present | Doctor profile integration and browser workspace; **PARTIAL** |
| `GET /doctors/me/appointments` | Doctor-owned appointments, patient name and status | Handler present | Doctor appointment integration/differential and browser decision; **PARTIAL** |
| `PATCH /doctors/me/appointments/{appointment_id}` | Owning doctor; status enum approved/rejected/completed; legal transition checks; write fence | Handler present | Approval/completion/rejection tests and differential; **PARTIAL** |
| `GET /doctors/me/patients` | Active care relationship plus current profile consent; medical-history consent separately gates symptoms | Handler present | Consent/relationship disclosure tests and browser patient view; **PARTIAL** |
| `POST /doctors/me/patients/{patient_id}/records` | Doctor, relationship and medical-history consent; `ClinicalRecordCreate` type/title/content limits; 201 | Handler present | Clinical record integration/differential and E2E; **PARTIAL / BLOCKED** for deployed clinical table variant |
| `GET /doctors/me/patients/{patient_id}/records` | Same doctor/relationship/consent boundary; newest first | Handler present | Clinical record integration/differential and E2E; **PARTIAL / BLOCKED** for deployed clinical table variant |
| `POST /doctors/me/patients/{patient_id}/prescriptions` | Same boundary; supported PDF/JPEG/PNG, base64, size/type checks; 201 metadata | Handler present | File validation and browser upload; **PARTIAL / BLOCKED** for deployed storage variant |
| `GET /doctors/me/patients/{patient_id}/prescriptions` | Same boundary; metadata only, newest first | Handler present | Prescription integration/differential; **PARTIAL / BLOCKED** for deployed storage variant |
| `GET /patients/me/clinical-records` | Patient’s own records; newest first | Handler present | E2E patient-side records view; **PARTIAL / BLOCKED** for deployed clinical table variant |
| `GET /patients/me/prescriptions` | Patient’s own metadata; newest first | Handler present | E2E patient records view; **PARTIAL / BLOCKED** for deployed storage variant |
| `GET /patients/me/prescriptions/{document_id}/download` | Patient ownership enforced; returns file name/type/base64 | Handler present | E2E byte-for-byte download round trip; **PARTIAL / BLOCKED** for deployed storage variant |
| `POST /doctors/me/patients/{patient_id}/followups` | Doctor, relationship and medical-history consent; future zoned datetime/reason; approved appointment; write fence | Handler present | Follow-up integration/differential and E2E; **PARTIAL**; timezone policy unresolved |

Python’s sanitized validation handler removes Pydantic `input` values from error details. C++ intentionally returns sanitized validation errors, but exact error locations/order/type messages and malformed-body behavior are not proven for every request schema. No parity fix is made by echoing submitted values.

## Request schema inventory

| Python schema | Contract fields and constraints |
| --- | --- |
| `UserCreate` | email; password 8–128; full_name 1–150 |
| `LoginRequest` | email; password 1–128 |
| `DoctorRegister` | email; password 8–128; full_name 1–150; specialty 2–120; registration_number 3–100 |
| `PatientCreate` | date_of_birth optional date; phone optional ≤30 |
| `PatientConsentCreate` | doctor UUID; scope literal `profile`/`medical_history`/`vitals`; optional datetime expiry |
| `SymptomSubmissionCreate` | symptoms 3–5000; duration 1–100; notes optional ≤3000 |
| `StructuredSymptomSubmissionCreate` | 1–20 symptom IDs; duration 1–100; severity literal `mild`/`moderate`/`severe`; notes optional ≤3000 |
| `AppointmentCreate` | doctor UUID; scheduled datetime; reason 3–500 |
| `AppointmentDecision` | status literal `approved`/`rejected`/`completed` |
| `ClinicalRecordCreate` | record type literal `diagnosis`/`note`; title 2–200; content 2–10000 |
| `PrescriptionCreate` | filename 1–255; content type literal PDF/JPEG/PNG; base64 1–12,000,000; decoded file ≤8 MiB and signature checked |
| `FollowUpCreate` | scheduled datetime; reason 3–500 |

Response types are declared in `backend/schemas.py`. Key contracts include UUID identifiers; nullable profile/contact/facility fields; appointment status literal `booked`/`approved`/`cancelled`/`completed`; JSON arrays for symptom IDs/names; and prescription download base64 plus content type. Exact field/null/order/timestamp parity still requires complete response comparisons across all routes.

## Entity, foreign-key, and relationship matrix

Python declarations: `backend/models.py`; C++ uses parameterized SQL in `backend-cpp/src/main.cpp`; the test-only schema is `backend-cpp/tests/isolated_schema.sql`. Python models declare columns/FKs but do not declare ORM `relationship()` properties; the application traverses associations with explicit queries.

| Entity | Python model and declared links/constraints | C++/isolated-schema correspondence | Status / issue |
| --- | --- | --- | --- |
| `users` | UUID PK; unique indexed email; hash/name/role/active/timestamp; role check patient/doctor | Used for auth, user-role/activity checks; same selected columns and role check in test schema | **PARTIAL**; route tests cover representative auth and active checks |
| `patients` | UUID PK; unique required `user_id → users.id`; nullable DOB/phone; timestamp | Patient identity derived from authenticated user; test FK/unique preserved | **PARTIAL**; DOB is represented as timestamp in model while API exposes a date |
| `facilities` | UUID PK; name/address; nullable coordinates/phone | Joined for doctor directory/profile; test schema has same nullable fields | **PARTIAL**; no Python route mutates facilities |
| `doctors` | UUID PK; unique `user_id → users.id`; nullable `facility_id → facilities.id`; unique registration number | Joined to users/facilities; active flag is on user; test schema retains these keys | **PARTIAL** |
| `care_relationships` | UUID PK; required patient/doctor FKs; type/start/end; no unique-pair constraint in model | Relationship checks and appointment approval create/inspect relationship; test schema retains columns/FKs | **PARTIAL**; historical/inactive duplicates require semantic caution |
| `patient_consents` | UUID PK; required patient/doctor FKs and indexes; scope/status checks; grant/expiry/revoke timestamps | SQL checks latest consent, status, revoke and expiry; test schema matches selected representation | **PARTIAL**; distinct profile, medical-history, and vitals scopes must remain separate |
| `symptom_submissions` | UUID PK; patient FK/index; free-text, duration, notes, severity, status check, timestamp | Free-text and structured submission handlers; test schema includes selected columns/check | **PARTIAL** |
| `symptom_catalog` | string PK; unique name; category; JSON aliases; active flag | Search, active-ID validation and recommendations; synthetic schema same fields | **PARTIAL** |
| `symptom_submission_items` | composite PK `(submission_id,symptom_id)`; submission FK cascade; catalog FK/index | Structured many-to-many relation; test schema matches | **PARTIAL** |
| `appointments` | UUID PK; patient/doctor FKs/indexes; indexed zoned timestamp; reason; status check; timestamp | Transaction/doctor lock and status/conflict SQL; test schema has equivalent selected structure | **PARTIAL**; Python and C++ must not concurrently write; clinic timezone unresolved |
| `clinical_records` | Python model: patient/doctor FKs/indexes, type/title/content/time | C++ SQL targets this table; isolated schema creates it | **BLOCKED** for deployed schema: Alembic head `c7f4a1d9e2b6` creates `clinical_notes`, `patient_diagnoses`, and `vital_records` instead; `c4e5f6a7b8c9` creates `clinical_records` with different title length and FK delete action |
| `prescription_documents` | Python ORM maps attribute `file_base64` onto physical `file_data` as `LargeBinary`; patient/doctor FKs/indexes | C++ reads/writes physical `file_data BYTEA`; isolated schema includes both `file_data BYTEA` and nullable `file_base64 TEXT` | **BLOCKED** for deployed schema: Alembic heads disagree (`file_base64 TEXT NOT NULL` vs `file_data BYTEA NOT NULL`). The test-only dual-column schema does not settle deployed compatibility |
| `patient_diagnoses` | No SQLAlchemy model found; present only in migration head `c7f4a1d9e2b6` | No C++ handler or selected test-schema table | **UNVERIFIED / owner decision**: determine whether legacy/required data exists and how represented |
| `clinical_notes` | No SQLAlchemy model found; present only in migration head `c7f4a1d9e2b6` | No C++ handler or selected test-schema table | **UNVERIFIED / owner decision**: must be mapped losslessly if deployed/populated |
| `vital_records` | No SQLAlchemy model or route found; present only in migration head `c7f4a1d9e2b6` | No C++ handler or selected test-schema table; consent scope `vitals` exists | **UNVERIFIED / owner decision**: feature/data retention intent and handling of any deployed data are unknown |
| Alembic revision state | Two heads share parent `b0d1c2e3f4a5`; details in release checklist | No runtime migration support is used by C++ | **BLOCKED** pending database-owner read-only deployed revision/schema evidence and approved lossless reconciliation plan |

## Evidence run for this inventory

Newly run from this checkpoint:

| Check | Result |
| --- | --- |
| Read-only route extraction/comparison | 33 Python operations; no missing C++ method/path pair; one C++-only `GET /health/db` |
| MSYS2 UCRT64 `cmake .. -G Ninja` and `ninja -j1` in `backend-cpp/build` | Exit 0; build already up to date |
| `ctest --output-on-failure` | **4/4 passed** |
| Python regression: `.venv\Scripts\python.exe -m pytest -q tests`, dotenv disabled, generated process-only HS256 key; in-memory SQLite fixture | **19 passed**, 1 Starlette/httpx deprecation warning, exit 0 |
| `npm run test:unit` | **4/4 passed**, exit 0 |
| `npm run build` | Passed, 605 modules, exit 0; existing 644.48 kB chunk advisory |
| `npm run lint` | Exit 0; 8 existing `react(set-state-in-effect)` warnings, 0 errors |
| Focused Python test-file syntax check | `py_compile` passed for modified C++ API and differential test modules |
| `git diff --check` | Passed after source/test changes |
| C++ API integration / differential / guarded E2E | **Not run in this task**. Database identity/ownership was not re-attested at database level and the process-only test password is unavailable; do not infer readiness from an open port or old marker evidence. No connection, database write, reset, or cleanup was attempted. |

Historical Phase 11 evidence in `MIGRATION_STATUS.md` records 17/17 C++ API, 10/10 differential, and 2/2 guarded Playwright against the isolated synthetic cluster. It is not new verification in this audit. It included complete browser pathways, including prescription bytes, but does not prove live schema compatibility or every route/error variant.

## Safe fixes and remaining gaps

Three independently actionable contract gaps are now fixed across the latest two increments: C++ bearer-scheme parsing matches FastAPI's case-insensitive `HTTPBearer` scheme; catalog filtering distinguishes an omitted category from a non-empty whitespace category that trims to empty; and catalog `limit` parsing distinguishes an omitted parameter from `limit=`, accepts integer whitespace and large values that FastAPI clamps, and rejects malformed values. Focused CTest/API/differential regressions were added. Bearer and catalog parser unit tests ran; database-backed regressions did not run because database ownership could not be re-attested and process-only test passwords are unavailable. No claim is made that those API regressions passed.

The primary blocker is schema ownership: the clinical and prescription migration variants cannot be reconciled safely in application code without knowing the deployed objects and preserving existing data. Other parity gaps are exhaustive validation/error comparison, per-route response null/order/timezone comparisons, broader consent/ownership edge matrices, and tests for migration-only entities. Address independent behavioral gaps after a dedicated disposable database is re-attested and its test-only credential is available.

The normal frontend default remains `http://127.0.0.1:8000`; E2E uses an explicit temporary `http://127.0.0.1:8001` setting. No persistent demo accounts are seeded. Demo readiness and release gates remain as documented in `RELEASE_CHECKLIST.md`.

## Release disposition

- **Isolated synthetic testing:** prior Phase 11 database-backed results are historical; this task did not re-attest the database. New non-DB checks pass.
- **Shared-data staging:** **NO-GO** pending authoritative timezone policy, deployed-schema evidence, approved lossless preservation/reconciliation and restore rehearsal, route-level intended-scope evidence, and independent system-wide single-writer fencing.
- **Production:** **NO-GO** pending all shared-data gates plus security/privacy, monitoring, abort/recovery, Python-after-C++ compatibility (or continued write freeze), and authorized change approval.
