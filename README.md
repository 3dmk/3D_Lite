# 3D_Lite

Current GitHub Pages development build: **v3.99.12 — Guided Low-Sample Denoiser**

The visible editor version is owned by `ThreeDLiteVersion.version`.

Current render defaults:
- Primary GI: Irradiance
- Secondary GI: Light Cache
- Adaptive sampling: 2–8 samples
- Maximum bounces: 4
- Denoise: Quality (default)
- Path Guiding: enabled by default

Guided denoiser v3.99.12:
- uses Beauty + Albedo + Normal + Depth AOV guidance
- two-stage edge-aware quality filtering for low-sample renders
- protects silhouette, material/color, depth and normal discontinuities
- retains a small original-detail contribution to avoid plastic/over-smoothed results
- Fast mode remains available as a lighter single-pass filter
- Quality is the default denoise mode

Render startup:
- pass 0 remains a fast first-light pass
- first pass uses 1 bounce and 8-pixel work batches
- full Irradiance + Light Cache resumes after startup
- deployment validation blocks publication if renderer/denoiser startup gates fail
