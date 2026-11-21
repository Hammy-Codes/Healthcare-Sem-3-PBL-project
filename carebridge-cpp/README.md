# CareBridge

CareBridge is an educational full-stack healthcare workflow demo. The React frontend is integrated with a local C++ HTTP API and JSON-file storage. Use synthetic records only; this is not a clinical or production service.

## One-command launch

From PowerShell in the repository root:

```powershell
.\scripts\Start-CareBridge.ps1
```

The script builds the C/C++ backend, starts API (`http://127.0.0.1:8001`) and Vite frontend (`http://127.0.0.1:5173`), and creates the local data directory and technician provisioning key. Stop both processes with:

```powershell
.\scripts\Stop-CareBridge.ps1
```

Requirements: Node.js, npm dependencies (installed by the launch script if missing), CMake, and MSYS2 UCRT64 GCC/G++ plus Ninja. The script prints the lab-technician provisioning key; keep it local. Patients and doctors register through the frontend. Technician accounts require that key.

## Roles and workflows

- Patient: register/login, create profile, browse doctors, book/cancel appointments, submit structured symptoms, manage doctor consent, view clinical records/prescriptions/lab results, and enter synthetic vitals.
- Doctor: register/login, view consent-shared patients and appointments, add records/prescriptions/follow-ups, assign lab requests to a technician, and view authorized lab results.
- Lab technician: provision with the local key, login, view only assigned work in the provisioned department, start an investigation, and enter Hb/WBC/platelet results for CBC orders.

## Tests

```powershell
$env:PATH = "C:\msys64\ucrt64\bin;$env:PATH"
cmake --build backend\build\ninja-ucrt --parallel 2
ctest --test-dir backend\build\ninja-ucrt --output-on-failure
cd frontend
npm run test:unit
npm run lint
npm run build
npm run test:e2e
```

See [backend/API architecture](docs/ARCHITECTURE.md), [data models](docs/DATA_MODELS.md), [API contract](docs/API_CONTRACT.md), and [test results](docs/TESTING.md).

## Storage and security limitations

Runtime data is written to `data/carebridge.json` as JSON. Passwords are PBKDF2-HMAC-SHA256 hashes via Windows CNG; bearer tokens live in server memory and expire after eight hours. The file is not encrypted, locking only coordinates threads in one process, and the project has no robust backup/recovery, cross-process transactions, rate limiting, or production security review. The backend listens on loopback only. Do not expose it to a network or enter real patient information.

The timeline, alert thresholds, and vitals are demonstration data/logic, not diagnosis or validated monitoring. The local retrieval/RAG extension is not implemented and no external LLM is connected. There are no universal demo credentials; create synthetic patient/doctor accounts from the app and provision a lab technician with the printed local key.
