# 3D_Lite

Current GitHub Pages development build: **v3.99.13 — Live Progressive Render Preview**

The visible editor version is owned by `ThreeDLiteVersion.version`.

Current render defaults:
- Primary GI: Irradiance
- Secondary GI: Light Cache
- Adaptive sampling: 2–8 samples
- Maximum bounces: 4
- Denoise: Quality (default)
- Path Guiding: enabled by default

Live render preview v3.99.13:
- progressive framebuffer preview begins during the first pass instead of waiting for pass completion
- the preview refreshes during active path-tracing batches with throttling to avoid excessive presentation cost
- first-light rendering is visible instead of a black frame
- completed passes still publish full preview frames
- the last valid framebuffer remains visible if a render is cancelled, stalls, or throws after preview data exists
- render progress, traced-pixel count, in-pass percentage and preview image advance together

Guided denoiser:
- uses Beauty + Albedo + Normal + Depth AOV guidance
- two-stage edge-aware quality filtering for low-sample renders
- protects silhouette, material/color, depth and normal discontinuities
- Quality is the default denoise mode

Render startup:
- pass 0 remains a fast first-light pass
- first pass uses 1 bounce and 8-pixel work batches
- full Irradiance + Light Cache resumes after startup
- deployment validation blocks publication if renderer/preview/denoiser gates fail
