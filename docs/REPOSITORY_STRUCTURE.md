# 3D_Lite Repository Structure

## Public runtime
- `index.html` — GitHub Pages production entry point
- `latest.html` — redirect/helper entry point
- `.github/workflows/pages.yml` — authoritative Pages build/deploy pipeline

## Core source
- `src/` — main 3DLite source/reference build
- `3dlite/` — 3DLite runtime/core modules
- `litepix/` — LitePix renderer source and runtime modules

## Patches
- `patches/releases/v3.99/` — ordered public v3.99 release patch chain used by GitHub Pages
- `patches/3dlite/` — Main Core / editor architecture work
- `patches/litepix/` — LitePix development patches
- `patches/v4.00.0/` — preserved next-major-version work

## Validation and documentation
- `tests/` — automated and regression tests
- `reports/` — diagnostics, generated evidence, and development reports
- `docs/` — architecture and project documentation

## Other preserved project material
- `webgl-viewer/` — separate viewer/reference material
- `r3d/` — preserved project material; not part of the 3DLite Pages release chain

## Release rule
The public Pages workflow must use only the authoritative patch chain under `patches/releases/<version>/`. Root-level duplicate release patch scripts should not be recreated.

The root remains intentionally small because GitHub Pages publishes directly from the repository artifact and requires `index.html` to stay at the top level in the current deployment workflow.
