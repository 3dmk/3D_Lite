# 3DLite AI Handoff — START HERE

## Purpose
This branch is the handoff entry point for another AI/developer continuing 3DLite.

## Repository
Authoritative GitHub repository: `3dmk/3D_Lite`.
Handoff branch: `ai-transfer-v4.46.0`.
The repository `main` branch may contain development newer than the archived v4.46.0 transfer snapshot. Never downgrade or overwrite newer verified work merely because this handoff is labeled v4.46.0.

## Required receiving-AI capability
The receiving AI should have GitHub/repository or filesystem access that can recursively enumerate, search, read and modify repository files. ZIP/archive binary access is NOT required when using GitHub.

## First actions — mandatory
1. Read this file completely.
2. Read `AI_HANDOFF/MASTER_HANDOFF.md` and `AI_HANDOFF/RELEASE_GATES.md`.
3. Recursively inventory the actual repository before making architecture claims.
4. Determine the current version and current authoritative files from the actual branch/commit being worked on.
5. Compare any requested change against the latest known-good build.
6. Work on a new branch/versioned copy. Do not destroy recovery baselines.
7. Run startup/release gates before promotion.

## Authority rules
- Actual inspected source code outranks historical descriptions.
- Newer browser-confirmed working versions outrank older transfer snapshots unless explicitly recovering/regressing.
- One authoritative mutable application state owner is the architectural target: 3DLite Main Core.
- LitePix owns rendering responsibilities through a stable render-scene contract; it must not become owner of editable application scene state.
- UI/viewport/tools must communicate through stable Main Core APIs/contracts rather than hidden cross-system mutation.

## Historical transfer snapshot
The original transfer source supplied by the user was `3DLite_v4.46.0_COMPLETE_SOFTWARE_ALL_FILES.zip`. It contained 3,985 ZIP entries. Most entries were generated dependency/build outputs under `node_modules` and Rust `target`; those are reproducible artifacts and are not architectural authority.

The meaningful v4.46.0 source snapshot consisted of the versioned HTML editor builds, `dist` browser builds, package metadata, Tauri Rust source/configuration, schemas, icons, and NSIS installer sources. Use Git history/current repository source rather than assuming generated build caches are required.

## Development method
Preserve the user's Gen3/Len3/L3N cumulative-development rules. Improve cleanly rather than stacking patches. Preserve proven behavior unless fixing a confirmed bug. Record failures and repairs so later passes do not repeat them.

## Before changing code
Report: current branch/commit, current visible version, authoritative entry points, subsystem ownership, startup path, build/run path, known regressions relevant to the requested change, and tests/release gates that will be run.

## After changing code
Report: files changed, behavior changed, bugs fixed, tests performed, regressions checked, new version, commit/branch/PR link, and remaining work.
