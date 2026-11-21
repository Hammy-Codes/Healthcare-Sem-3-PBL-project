# Frontend tests

The frontend's existing unit tests remain under `frontend/tests/` and are run with `npm run test:unit` from `frontend/`. Existing browser tests remain under `frontend/e2e/`; they describe a legacy backend-dependent flow and are not runnable as a standalone UI test until the replacement backend/test fixtures exist. No separate root test framework is introduced in this cleanup phase.
