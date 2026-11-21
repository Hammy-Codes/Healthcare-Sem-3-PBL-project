# Verification

## Build environment

CMake 4.4.4 installed user-scoped with `winget install --id Kitware.CMake --scope user`. Build compiler: MSYS2 UCRT64 GCC/G++ 16.2.0 and Ninja.

From repository root:

```powershell
$env:PATH = "C:\msys64\ucrt64\bin;$env:PATH"
cmake -S . -B backend\build\ninja-ucrt -G Ninja `
  -DCMAKE_MAKE_PROGRAM=C:/msys64/ucrt64/bin/ninja.exe `
  -DCMAKE_C_COMPILER=C:/msys64/ucrt64/bin/gcc.exe `
  -DCMAKE_CXX_COMPILER=C:/msys64/ucrt64/bin/g++.exe
cmake --build backend\build\ninja-ucrt --parallel 2
ctest --test-dir backend\build\ninja-ucrt --output-on-failure
```

The final CMake build succeeded. CTest passed all 4 tests: C DSA, C++ domain/C-to-C++ integration, JSON persistence CRUD/reload/malformed-file handling, and API smoke/security/laboratory/persistence restart.

## API smoke coverage

`backend/tests/api-smoke.ps1` starts a real local API instance with a fresh synthetic store, then checks missing-token rejection; patient/doctor/technician registration and login; symptoms and timeline; appointment create/approval; record and prescription round trip; consent required for lab requests; assigned versus unassigned lab access and result submission; technician denial on clinician/clinical-note routes; doctor consent revocation; vitals and alerts; audit events; and persisted lab results after a server restart.

The lab browser flow tests clinician assignment through the technician's result-entry page and patient Health Records in `frontend/e2e/lab-workflow.spec.ts`.

## Frontend checks

- `npm run test:unit`: 4 passed, 0 failed.
- `npm run build`: passed (Vite warns that the main bundle exceeds 500 kB).
- `npm run lint`: exits 0; 10 React `set-state-in-effect` warnings remain (including data-loading effects in the new lab and monitoring views).
- `npm run test:e2e`: 3 passed (patient/doctor full browser workflow, lab technician workflow, auth/CORS checks).

Tests use synthetic accounts and content. No clinical validation is performed.
