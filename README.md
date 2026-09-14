# 3D_Lite

Current GitHub Pages development build: **v3.99.10 — Fast First-Light Render Startup**

The visible editor version is owned by `ThreeDLiteVersion.version`.

Current GI implementation:
- Primary GI: Irradiance
- Secondary GI: Light Cache
- Brute Force removed from current GI settings/runtime labels

Render startup fix:
- pass 0 is a fast first-light pass
- first pass uses only 1 bounce
- first pass uses 8-pixel work batches for immediate yielding/progress
- Irradiance cache estimation is deferred until after the first visible pass starts
- first-ray status changes to `Rendering first rays` as soon as pixels begin tracing
- later passes restore the configured full path depth and Irradiance + Light Cache
- geometry uses 0–20%; tracing uses 20–99%; completion owns 100%
- deployment validation blocks publication if the old startup/stall path remains
