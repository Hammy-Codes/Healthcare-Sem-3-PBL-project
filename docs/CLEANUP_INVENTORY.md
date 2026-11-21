# Cleanup inventory and provenance

This clean workspace was created from `C:\projects\healthcare-platform-backup` using an explicit frontend allowlist. The original project `C:\projects\healthcare-platform` was not used as a source or modified. The reference project was inspected only; its files and Git state were not changed by workspace preparation.

## Retained

- Frontend application source, components, CSS, assets, public files, TypeScript types, API service files, package manifest and lockfile, Vite/TypeScript/Oxlint configuration.
- Existing frontend unit and Playwright test sources and Playwright configuration.
- The historical Python/C++ parity matrix, copied to `REFERENCE_PYTHON_CPP_PARITY.md` with a warning that its state is historical and not a specification for this rebuild.
- Root README, architecture/rebuild/overview documentation, and a conservative ignore file.

## Excluded from the new workspace

- Legacy C++/Drogon backend sources, headers, build files, binaries, object files, and build trees.
- Python backend implementation and Python virtual environments.
- PostgreSQL data directories, logs, dumps, credentials, runtime files, and database initialization/migration scripts.
- `node_modules`, `dist`, caches, coverage output, temporary files, and generated test artifacts.
- Duplicate `edits/` project copies, ZIP archives, generated team guide packs, and obsolete backend-specific documentation.
- Legacy E2E setup scripts that prepare/reset PostgreSQL or depend on the old backend. The test source/config is retained as a reference but cannot run against the pending backend without a future reviewed test setup.

No source files were deleted from either existing project. Exclusions above refer only to what was not copied into this newly created workspace.

## Uncertain items preserved

All frontend API services, endpoint constants, UI features, types, and tests were retained even where some service methods use demo data. They are needed for Phase 1 contract work. The historical parity matrix is retained with an explicit caution because it may contain stale statuses and backend-specific assumptions. No backend behavior was inferred from a route name alone.

## Reference Git state at inspection

- HEAD: `c85fe44606682ede0badbdabb2f7b984d6a92f1f`, branch `codex/cpp-backend-migration`.
- Working tree had pre-existing uncommitted modifications and deletions, including backend/Python source and historical duplicate packs. Those changes were preserved; no reset/checkout/restore was run.
- Remote: `origin` → `https://github.com/Hammy-Codes/Healthcare-Sem-3-PBL-project.git`; `origin/HEAD` pointed to `origin/main`. No fetch was performed, so remote-tracking data may be stale.
- Default branch: `origin/main` (`origin/HEAD` pointed there). Current source branch: `codex/cpp-backend-migration`.
- Local branch relationships as observed from existing local refs (no fetch performed):
  - `backup/full-project-checkpoint` tracks `origin/backup/full-project-checkpoint`; local and remote-tracking tips matched, with 15 commits not in `origin/main`.
  - `codex/cpp-backend-migration` has no upstream and contained 30 commits not in `origin/main`.
  - `feature/backend-frontend-integration` tracks its remote-tracking branch; tips matched, with 14 commits not in `origin/main`.
  - `feature/frontend` was 5 commits behind `origin/feature/frontend`; it contained 10 commits not in `origin/main`, while the remote-tracking branch contained 15.
  - `master` tracks `origin/master` and was 3 commits behind; `origin/master` contained 13 commits not in `origin/main`.
- The only observed local branch was `master`; no non-default branch was confirmed merged into `origin/main`. Local and remote-tracking refs may be stale because no fetch was performed. Every listed branch may contain useful work; none is recommended for deletion. No branch was deleted and no remote was changed.

The new workspace starts with separate local Git history and no remote configured. The reference repository remains the recovery source for its complete history and any working-tree changes.
