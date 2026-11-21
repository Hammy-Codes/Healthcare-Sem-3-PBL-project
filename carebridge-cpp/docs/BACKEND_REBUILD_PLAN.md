# Backend rebuild plan

## Why rebuild

The reference implementation contains a Drogon/PostgreSQL backend and historical migration work. The new educational direction is a small C/C++ backend with file-based storage. This workspace keeps only the frontend and selected contract/history documentation; it does not carry over the old backend implementation or database artifacts.

## Responsibilities

- **C modules (DSA):** small, independently testable algorithms and structures such as appointment interval overlap checks, bounded search/filter helpers, and simple queues or indexes where they make the design clearer. Define ownership and memory rules explicitly; do not force every feature into a data structure.
- **C++ modules (OOP):** domain models and services such as `User`, `Patient`, `Doctor`, `Appointment`, `Consent`, and `FileStore`; validation and HTTP request orchestration should remain readable and straightforward.
- **Storage:** use human-auditable, synthetic-only local files with a documented format, versioning, atomic writes, backups, and locking. Do not store real health data. File storage has weaker concurrency and recovery properties than a production database and must be treated as demo-only.
- **HTTP/JSON:** choose the smallest maintained library that supports the required HTTP server and JSON parsing/serialization. Document why it is needed and pin it reproducibly. Avoid a large framework unless a reviewed prototype requirement justifies it.

## Possible simple design (not implemented)

A future design can separate `models`, `services`, `storage`, `http`, and `dsa` folders. C++ service classes validate domain operations and call narrow C functions for selected algorithms. A file repository owns serialization and persistence. HTTP handlers translate JSON to service calls and return stable JSON responses. Keep the call path explainable: request → validation → service → storage → response.

## Compatibility and risks

Before writing implementation, Phase 1 must inventory every API call, request/response type, validation rule, authentication/ownership/consent boundary, file transfer, timestamp rule, and UI expectation. The prior `REFERENCE_PYTHON_CPP_PARITY.md` is only a historical inventory and not a parity guarantee. Do not copy unsafe or incomplete legacy behavior by assumption.

Replacing PostgreSQL/authentication with file storage is a major security and concurrency change. Do not use real patient data or expose the prototype to a network. Define synthetic demo identities only after the API contract and test strategy are approved. Keep the frontend on its current API default until a later, explicit integration task.

## Not in this phase

No C or C++ source, server, storage format, migration, login implementation, or mock backend is created here. Those belong to the next implementation phase after contract review.
