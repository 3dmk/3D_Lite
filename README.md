# 3D_Lite

Current main development line: **v4.48**

Live editor: https://3dmk.github.io/3D_Lite/

## Active structure

- `index.html` — public editor entry point
- `latest.html` — stable redirect to the newest deployed editor
- `litepix/` — active LitePix renderer source
- `3dlite/` — active 3DLite application/editor source
- `src/` — shared source modules
- `tests/` — validation and regression tests
- `docs/` — maintained documentation
- `reports/` — current retained reports only
- `patches/` — release/transition patches still required by deployment
- `.github/workflows/pages.yml` — GitHub Pages deployment

## Current renderer defaults

- Primary GI: Irradiance
- Secondary GI: Light Cache
- Sparse camera/radiance budget: 1,000–4,000 probes
- Quality denoise by default
- Path Guiding enabled
- Renderer-native scene lights
- Scene Instances panel in the editor

## Repository policy

The repository keeps the current v4.48 development line, active renderer/editor source, regression tests, recovery-critical material, and deployment dependencies. Superseded standalone reports and obsolete debug/runtime artifacts are removed when they are no longer referenced.

Older v3.99 patch scripts remain only where the current deployment chain still depends on them. They should not be treated as the current product version.
