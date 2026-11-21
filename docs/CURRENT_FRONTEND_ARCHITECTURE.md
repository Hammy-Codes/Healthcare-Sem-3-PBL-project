# Current frontend architecture

## Entry points

- `frontend/index.html` loads `frontend/src/main.tsx`.
- `main.tsx` creates the React root and renders `App.tsx`.
- `App.tsx` owns the top-level app experience and composes feature views.
- `App.css` and `src/index.css` provide application styling.

## Feature areas

The source is organized under `frontend/src/features/`: appointments, consent, doctors, monitoring, providers, records, symptoms, and timeline. Shared types are in `src/types/healthcare.ts`; image and icon assets are under `src/assets/` and `public/`.

## API communication

API helpers live in `src/services/`:

- `api.ts` wraps Fetch, attaches the in-memory bearer token, parses JSON errors, and downloads prescription files.
- `authService.ts`, `patientService.ts`, and `providerService.ts` group service operations.
- `endpoints.ts` lists common paths; some feature components also call the API directly.
- `mockdata.ts` and selected service methods supply demonstration data.

The current API base is `VITE_API_BASE_URL` when set, otherwise `http://127.0.0.1:8001`. Requests use JSON and the `Authorization: Bearer ...` header after login. API-backed features expect the route contracts represented by the services, endpoint constants, and `types/healthcare.ts`. The prior Python/Drogon parity inventory is kept at `docs/REFERENCE_PYTHON_CPP_PARITY.md` as historical reference only; it is not a specification for the replacement backend and contains stale status/configuration notes.

## Tests and build

`frontend/tests/timezone.test.mjs` runs with Node's built-in test runner through `npm run test:unit`. `frontend/e2e/carebridge.spec.ts` and `playwright.config.ts` describe a prior browser E2E flow, but the old flow expects a C++ API and external test setup. It is not evidence that a backend is present here. `npm run build` runs TypeScript project checks and Vite bundling; `npm run lint` runs Oxlint.

## Important dependencies

React/React DOM render the UI, Recharts renders charts, and Vite builds/serves it. Playwright is a development dependency for browser tests. Keep the package lockfile in sync and review any dependency addition carefully.
