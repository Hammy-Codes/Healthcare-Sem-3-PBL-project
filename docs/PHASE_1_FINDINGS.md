# Phase 1 frontend contract audit findings

## Scope and result

Audited all TypeScript/TSX under `frontend/src`, including shared services, endpoint constants, feature components, `App.tsx`, API/auth helpers, timezone utilities, types, and mock data. No source behavior was changed and no dependency was installed for this audit. The result is documentation only.

The source contains **28 distinct HTTP method/path templates** (including the unmounted patient vitals write in `features/timeline/HealthRecords.tsx`). Calls are routed through `services/api.ts`; no other raw `fetch`, Axios, cookie, localStorage, or sessionStorage usage was found. Endpoint status codes and some response contracts cannot be established without an authoritative backend or runtime test.

## Important inconsistencies

1. **Clinical records response conflict:** mounted `features/records/PatientHealthRecords.tsx` expects `GET /patients/me/clinical-records` to return an array of `{id, record_type, title, content, created_at}`. Unmounted `features/timeline/HealthRecords.tsx` expects an object with diagnoses/notes/prescriptions/vitals arrays from the same path.
2. **Appointment status inconsistency:** patient appointment status type excludes `rejected`, while notification and doctor logic know that state. A future contract needs one canonical enum and transition rules.
3. **Provider shape mismatch:** exported `Provider` and mock provider service use facility/location/services/availability. Live directory screens expect facility_name/facility_address. The provider mock service is currently unused.
4. **Prescription download shape differs:** mounted screen expects filename/content_type/file_base64; the unused download helper accepts only content_type/file_base64 plus a caller filename. Both imply JSON base64 rather than binary, but that is not confirmed server behavior.
5. **Unused endpoint constants:** `/health`, `/symptoms`, `/patients/me/timeline`, `/providers`, and `/alerts` have no request callers in the current source scan. `/patients/me/vitals` is used only by an unmounted component.
6. **Authentication state is transient:** access token is in module memory. Reload loses it; no refresh flow or logout endpoint is called. There is no automatic handling for 401 beyond displaying an error.
7. **Role gaps:** admin exists in the shared role union but has no admin behavior; every non-doctor role is shown patient navigation. Frontend role gating is not security enforcement.
8. **Multi-call consent writes can partially complete:** the symptom flow grants profile and medical-history permissions in separate sequential requests. If the second fails, the first may already be granted.
9. **Patient follow-up recognition depends on reason text:** doctor follow-up request sends `{scheduled_at, reason}` without adding a `Follow-up:` prefix, while patient UI filters reasons using that prefix. Whether a backend adds it is unknown.
10. **Error handling is narrow:** API helper exposes only string `detail`; validation arrays/field errors and other error shapes become generic status errors. Some availability failures are reduced to an empty slot list.
11. **Date/time contract is incomplete:** booking converts configured clinic-local wall time to UTC ISO strings and rejects DST gaps/overlaps. Availability takes a date-only value and returns slot strings. Exact offset/slot format and response timestamp conventions are not defined. DOB is date-only; mock event times may omit a zone.
12. **Field validation is client-only:** visible text limits and MIME checks exist for inputs/uploads, but backend requirements cannot be inferred from browser attributes. Client MIME claims are not trustworthy.
13. **Profile data is partial:** patient form collects DOB/phone only; profile menu says settings are not connected. The app displays doctor profile but no doctor profile edit operation is called.

## Questions to resolve before implementation

- Which API paths are retained for the file-backed replacement, and which unused constants should be removed later?
- What are canonical response/error envelopes and endpoint status codes? Are validation errors field-addressable?
- Is auth a bearer token, and should it survive reload? How are expiry, refresh, revocation, and logout handled?
- Are patient/doctor registration public and immediately active, or does doctor registration require approval?
- What is the canonical patient profile response and whether fields omitted differ from explicit null?
- What are canonical doctor directory/profile objects and ID format?
- What are appointment states, valid transitions, cancellation rules, sorting, and conflict responses?
- Is `GET /patients/me/clinical-records` a record array or grouped bundle? Is `HealthRecords.tsx` intended to be reconnected or retired?
- Should prescription download return JSON base64 or a binary file with content-disposition? Which response includes filename?
- What exact consent scopes exist, their meanings, and how do clinical actions enforce them?
- Are symptoms submitted as structured IDs only? What is the canonical duration vocabulary and history status?
- What is the authoritative clinic timezone and slot serialization? Which timezone applies if facilities differ?
- Are timeline/vitals/alerts meant to stay as synthetic prototype screens or eventually become backend data?

## Requirements for future backend design (derived from usage)

- Match the documented endpoint paths and JSON fields only after resolving the conflicts above; do not infer missing server behavior from a component label.
- Enforce authentication, account active state, role, patient ownership, doctor-patient relationship, consent scope, and appointment transitions in server-side application logic.
- Define input limits and validation on the server independently of HTML validation. Bound and validate prescription file size/type/content.
- Use stable IDs and explicitly documented timestamps: date-only versus offset-aware instants and clinic-local availability labels.
- Make appointment availability advisory and enforce conflict detection atomically at the write operation.
- Return consistent JSON errors, including a defined validation shape that frontend can present safely. Do not leak sensitive data in errors.
- Keep file storage demo-only until concurrency, atomic writes, backups/recovery, permissions, and data retention are deliberately addressed.

## Recommended implementation order after contract review

1. Approve endpoint and model contract, resolving the conflicts and marking unused/retired operations.
2. Choose the minimal HTTP/JSON library and define request routing/error serialization.
3. Implement synthetic-only file storage and serialization tests with versioning/atomic-write behavior.
4. Implement authentication/session behavior and server-side role/ownership/consent checks before healthcare data routes.
5. Add read/write routes in small groups: profiles and directory; symptoms; appointments; consent; clinician records and prescriptions.
6. Connect each frontend flow only after focused contract tests exist; label synthetic timeline/vitals clearly.

No backend implementation should begin until the API contract review chooses the unresolved behaviors. No claim of parity or operational backend is made by this audit.
