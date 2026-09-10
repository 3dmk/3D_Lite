# 3DLite

Browser-based 3D editor with L3N iterative learning.

## Current development build
**v3.93.0 — L3N Runtime Learning**

Open `index.html` to run the editor.

### Runtime learning
The current build includes:
- browser frame/runtime measurements
- operation profiling
- workflow regression tests
- runtime baseline comparison
- L3N runtime-confirmed evidence ingestion
- JSON runtime report export

## Repository layout
- `index.html` — deployable/current browser entry point
- `src/3DLite.html` — current development source
- `builds/v3.93.0/` — versioned build snapshot
- `reports/runtime/` — L3N/runtime reports
- `docs/` — project/development notes

## Branch policy
- `main` — last browser-confirmed good build
- `l3n/*` — active L3N development
- `candidate/*` — release candidates

Do not promote a candidate if startup/runtime release gates fail.
