# CareBridge architecture

## Runtime

- React 19/TypeScript/Vite is under `frontend/` and talks to `http://127.0.0.1:8001` by default.
- C11 DSA library: `backend/src/dsa/` (linked list, queue, stack, searching and sorting).
- C++17 HTTP application: `backend/src/http/main.cpp`, using cpp-httplib 0.18.3 and nlohmann/json 3.11.3 single-header dependencies.
- C++ application layer: `backend/src/services/healthcare_application.hpp` owns laboratory request creation, assignment checks, task-scoped retrieval, valid start/completion transitions, CBC validation and atomic result persistence. Appointment and lab transitions use the C++ domain classes in `backend/src/domain/healthcare.hpp`.
- JSON file repository: `backend/src/storage/store.hpp`. A single JSON object contains arrays for users, patient profiles, appointments, symptoms, records, prescriptions, consent, lab orders/results, vitals, alerts and audit events. Runtime file defaults to `data/carebridge.json`; writes use a sibling `.tmp` and atomic replace.
- Password hashing uses Windows CNG PBKDF2-HMAC-SHA256 (200,000 iterations and random 16-byte salt); 256-bit bearer tokens are kept in memory for eight hours. Restart invalidates tokens.

## Implemented API

Auth: `POST /auth/register`, `POST /auth/register/doctor`, `POST /auth/register/lab-technician` (requires `CAREBRIDGE_PROVISION_KEY`), `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.

Patient: `GET/POST /patients/me`, `GET/POST /patients/me/appointments`, `POST /patients/me/appointments/{id}/cancel`, `GET /patients/me/symptoms`, `POST /patients/me/symptoms/structured`, `GET /symptoms/catalog`, consent GET/POST/revoke, clinical records GET, prescriptions GET/download, lab results GET, timeline GET, vitals GET/POST, alerts GET/acknowledge.

Doctor: directory and availability GET, profile/patient/appointment GET, appointment PATCH, clinician record/prescription/follow-up POST, lab-technician/lab-order/lab-result GET, and patient lab-order/record/prescription/follow-up POST.

Laboratory: `GET /lab/me/orders`, `GET /lab/me/orders/{id}`, `POST /lab/me/orders/{id}/start`, `POST /lab/me/orders/{id}/results`. Technician access is limited to assigned order ID and matching department; these routes return task-specific patient details only.

All routes are bound to loopback. CORS defaults to `http://127.0.0.1:5173`; override with `CAREBRIDGE_CORS_ORIGIN`. Demo alert thresholds can be set with `CAREBRIDGE_ALERT_HR_HIGH` and `CAREBRIDGE_ALERT_SPO2_LOW`.

## Limits

This is a local academic demo. The JSON file is not encrypted, the repository mutex protects only one process, there are no cross-process transactions/backups, no rate limiting, no token revocation database, and no medical-grade interpretation. Do not use real health information or expose the server to a network. No RAG/LLM is connected. Lab workflow rules are separated into `HealthcareApplication`; some auth, appointment, patient, consent, prescription, vital and alert orchestration still lives in HTTP route lambdas and would benefit from further service-layer extraction.
