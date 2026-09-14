# 3D_Lite

Current GitHub Pages development build: **v3.99.9 — Render Progress + Irradiance/Light Cache Fix**

The visible editor version is owned by `ThreeDLiteVersion.version`.

Public version surfaces synchronized at startup:
- browser title
- top-right editor version label
- renderer diagnostics version
- `data-app-version`
- `window.__3DLiteAppVersion`
- live-build metadata

Current GI implementation:
- Primary GI: Irradiance cache/probe estimate at the first diffuse-dominant hit
- Secondary GI: Light Cache
- Brute Force removed from GI settings and current renderer labels
- Primary and secondary GI controls enabled
- Path renderer cache creation, progress text, metadata, telemetry, diagnostics and settings synchronized
- Specular/transmission paths continue through the path integrator

Render-progress fix:
- geometry preparation uses 0–20% instead of 0–95%
- path tracing uses 20–99%
- progress is reported inside every path-tracing pass/batch instead of only after a full 1280×720 pass
- first-pass traced pixels and in-pass percentage are exposed immediately
- 100% remains reserved for completed renders
- deployment gate verifies GI options, progress fix, and JavaScript syntax before publish

Historical subsystem version strings are intentionally preserved where they identify subsystem generations.
