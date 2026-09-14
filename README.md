# 3D_Lite

Current GitHub Pages development build: **v3.99.8 — Irradiance + Light Cache Renderer Update**

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
- deployment gate verifies GI options and JavaScript syntax before publish

Historical subsystem version strings are intentionally preserved where they identify subsystem generations.
