# Backend

The backend is a C++17/cpp-httplib local HTTP server using nlohmann/json and a JSON file repository. C DSA source remains separate in `src/dsa/`; C and C++ are linked in the test targets. CMake builds the API and tests.

Run the full project with [`scripts/Start-CareBridge.ps1`](../scripts/Start-CareBridge.ps1). API tests are `tests/api-smoke.ps1`; the C and C++ unit tests are registered with CTest. See [architecture](../docs/ARCHITECTURE.md) and [verification](../docs/TESTING.md).

Storage defaults to `data/carebridge.json` (relative to the current working directory passed to the executable). `CAREBRIDGE_PROVISION_KEY` protects lab account provisioning. Runtime stores and generated keys are ignored by Git. JSON data is not encrypted or production safe.
